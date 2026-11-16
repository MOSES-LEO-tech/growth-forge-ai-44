"""Render the product overview DOCX to PDF without Word.

Word's COM automation hangs on SaveAs2/ExportAsFixedFormat when driven from a
script file on this machine (it succeeds from an inline -Command string, which is
useless for a repeatable build). This renders the document directly with
reportlab, reading structure — paragraphs, runs, tables, shading, page breaks —
out of the .docx so there is still exactly one source of truth for the copy.

Run: uv run --with python-docx --with reportlab python scripts/docs/docx_to_pdf.py
"""

from pathlib import Path

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph as RLParagraph,
    Table as RLTable,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[2]
DOCX = ROOT / "docs" / "client" / "Milestone-Product-Overview.docx"
PDF = ROOT / "docs" / "client" / "Milestone-Product-Overview.pdf"

GREEN = colors.HexColor("#215043")
INK = colors.HexColor("#1F2937")
MUTED = colors.HexColor("#55636B")

MARGIN_X = 2.3 * cm
MARGIN_TOP = 2.2 * cm
MARGIN_BOTTOM = 2.0 * cm


def rgb_of(run):
    try:
        rgb = run.font.color.rgb
        if rgb is None:
            return None
        return colors.HexColor(f"#{rgb}")
    except (AttributeError, ValueError):
        return None


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\u00b7", "&#183;")
        .replace("\u2014", "&#8212;")
        .replace("\u2013", "&#8211;")
    )


def para_markup(p: Paragraph) -> tuple[str, float, colors.Color | None]:
    """Rebuild inline markup (bold/italic/colour) and return size + colour."""
    size = 10.5
    colour = INK
    parts: list[str] = []
    for run in p.runs:
        if not run.text:
            continue
        if run.font.size:
            size = run.font.size.pt
        run_colour = rgb_of(run)
        if run_colour:
            colour = run_colour
        text = esc(run.text)
        if run.font.bold:
            text = f"<b>{text}</b>"
        if run.font.italic:
            text = f"<i>{text}</i>"
        parts.append(text)
    return "".join(parts), size, colour


def is_page_break(p: Paragraph) -> bool:
    return 'w:type="page"' in p._p.xml


def build_styles() -> dict:
    base = dict(fontName="Helvetica", textColor=INK, alignment=TA_LEFT)
    return {
        "body": ParagraphStyle("body", fontSize=10.5, leading=14.6, spaceAfter=7, **base),
        "bullet": ParagraphStyle(
            "bullet", fontSize=10.5, leading=13.8, spaceAfter=3.5, leftIndent=14, bulletIndent=4, **base
        ),
        "numbered": ParagraphStyle(
            "numbered", fontSize=10.5, leading=14, spaceAfter=4, leftIndent=16, **base
        ),
    }


def table_borders_disabled(tbl: Table) -> bool:
    """True when the DOCX table asked for no borders (cover metadata, contents)."""
    borders = tbl._tbl.tblPr.findall(
        "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tblBorders"
    )
    if not borders:
        return False
    edges = list(borders[0])
    return bool(edges) and all(
        edge.get("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val") == "nil"
        for edge in edges
    )


def flow_for_table(tbl: Table) -> RLTable:
    rows_xml = tbl._tbl.tr_lst
    data = []
    header_fill = None
    for r_index, tr in enumerate(rows_xml):
        row = []
        for tc in tr.tc_lst:
            text_parts = []
            for p in tc.xpath(".//w:p"):
                text = "".join((t.text or "") for t in p.xpath(".//w:t"))
                if text.strip():
                    text_parts.append(esc(text.strip()))
            row.append("<br/>".join(text_parts))
            if r_index == 0:
                shd = tc.xpath("./w:tcPr/w:shd")
                header_fill = shd[0].get(
                    "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}fill"
                ) if shd else None
        data.append(row)

    widths = [c.width.cm if c.width else 6.0 for c in tbl.rows[0].cells]
    total = sum(widths) or 1
    available = A4[0] - 2 * MARGIN_X
    scaled = [available * (w / total) for w in widths]

    cell_style = ParagraphStyle(
        "cell", fontName="Helvetica", fontSize=9.3, leading=12.6, textColor=INK
    )
    head_style = ParagraphStyle(
        "cellhead", fontName="Helvetica-Bold", fontSize=9.3, leading=12.6, textColor=colors.white
    )

    body_rows = []
    header_row = not table_borders_disabled(tbl)
    for r_index, row in enumerate(data):
        # Only real content tables have a shaded header; the borderless cover
        # blocks (metadata, contents) would otherwise render white on white.
        style = head_style if (r_index == 0 and header_row) else cell_style
        body_rows.append([RLParagraph(cell or "", style) for cell in row])

    t = RLTable(body_rows, colWidths=scaled, repeatRows=1, hAlign="LEFT")
    style_commands = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if table_borders_disabled(tbl):
        # Cover furniture: no rules, and no header fill to leak into it.
        style_commands.extend([("LEFTPADDING", (0, 0), (-1, -1), 0)])
    else:
        style_commands.append(("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C9CFD4")))
        if header_fill:
            style_commands.append(
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(f"#{header_fill}"))
            )
    t.setStyle(TableStyle(style_commands))
    return t


def flowables() -> list:
    doc = Document(DOCX)
    styles = build_styles()
    items: list[tuple[object, bool]] = []   # (flowable, keep_with_next)

    body = doc.element.body
    for child in body.iterchildren():
        tag = child.tag.split("}")[-1]
        if tag == "p":
            p = Paragraph(child, doc)
            if is_page_break(p):
                items.append((PageBreak(), False))
                continue
            markup, size, colour = para_markup(p)
            if not markup.strip():
                continue
            is_bullet = p.style.name == "List Bullet"
            style = ParagraphStyle(
                f"dyn{len(items)}",
                parent=styles["bullet" if is_bullet else "body"],
                fontSize=size,
                leading=size * 1.39,
                textColor=colour,
            )
            text = f"&bull;&nbsp;&nbsp;{markup}" if is_bullet else markup
            items.append((RLParagraph(text, style), bool(p.paragraph_format.keep_with_next)))
        elif tag == "tbl":
            items.append((flow_for_table(Table(child, doc)), False))

    # Honour Word's keep-with-next: a heading never ends a page by itself.
    out: list = []
    index = 0
    while index < len(items):
        flow, keep = items[index]
        if keep and index + 1 < len(items):
            group = [flow, items[index + 1][0]]
            cursor = index + 1
            while cursor < len(items) - 1 and items[cursor][1]:
                group.append(items[cursor + 1][0])
                cursor += 1
            out.append(KeepTogether(group))
            index = cursor + 1
        else:
            out.append(flow)
            index += 1

    return out


def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8.5)
    canvas.setFillColor(MUTED)
    # The cover carries no folio, matching the DOCX (different first page footer).
    if doc.page > 1:
        canvas.drawRightString(A4[0] - MARGIN_X, 1.35 * cm, str(doc.page))
    canvas.restoreState()


def main() -> None:
    if not DOCX.exists():
        raise SystemExit(f"Missing source document: {DOCX}")

    frame = Frame(
        MARGIN_X,
        MARGIN_BOTTOM,
        A4[0] - 2 * MARGIN_X,
        A4[1] - MARGIN_TOP - MARGIN_BOTTOM,
        id="main",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    doc = BaseDocTemplate(
        str(PDF),
        pagesize=A4,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title="Milestone — Product Overview",
        author="CWORKS LTD",
        subject="Verified student growth, beautifully organized.",
    )
    doc.addPageTemplates([PageTemplate(id="page", frames=[frame], onPage=on_page)])
    doc.build(flowables())
    print(f"WROTE {PDF}")


if __name__ == "__main__":
    main()
