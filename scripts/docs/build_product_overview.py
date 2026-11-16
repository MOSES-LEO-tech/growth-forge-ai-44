"""Build the client-facing Milestone product overview (.docx).

Run:  uv run --with python-docx python scripts/docs/build_product_overview.py
PDF:  uv run --with python-docx --with reportlab python scripts/docs/docx_to_pdf.py

The PDF is rendered from this .docx by reportlab (no Word / no COM): Word's
automation hangs on save-as-PDF when driven from a script file on this machine.

Content rule: every capability listed here exists in the codebase. No invented
metrics, testimonials, customer counts or roadmap items presented as shipped.
"""

from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

DEEP_GREEN = RGBColor(0x21, 0x50, 0x43)
INK = RGBColor(0x1F, 0x29, 0x37)
MUTED = RGBColor(0x55, 0x63, 0x6B)
GOLD = RGBColor(0x8A, 0x6D, 0x1F)

OUT = Path("docs/client")
OUT.mkdir(parents=True, exist_ok=True)
DOCX = OUT / "Milestone-Product-Overview.docx"


def shade(cell, hex_fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    tc_pr.append(shd)


def rule(paragraph, color="215043", size="8") -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), size)
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), color)
    borders.append(bottom)
    p_pr.append(borders)


def add_page_number(paragraph) -> None:
    run = paragraph.add_run()
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.text = "PAGE"
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_end)


def body(doc, text, *, size=10.5, color=INK, space_after=8, italic=False, bold=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.16
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.italic = italic
    run.font.bold = bold
    return p


def bullet(doc, text, *, bold_lead=None):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.12
    if bold_lead:
        lead = p.add_run(bold_lead)
        lead.font.bold = True
        lead.font.size = Pt(10.5)
        lead.font.color.rgb = INK
    run = p.add_run(text)
    run.font.size = Pt(10.5)
    run.font.color.rgb = INK
    return p


def h1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.size = Pt(19)
    run.font.bold = True
    run.font.color.rgb = DEEP_GREEN
    rule(p, "D9D6CC", "6")
    return p


def h2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.size = Pt(12.5)
    run.font.bold = True
    run.font.color.rgb = DEEP_GREEN
    return p


def no_borders(t):
    tbl = t._tbl
    tbl_pr = tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        element = OxmlElement(f"w:{edge}")
        element.set(qn("w:val"), "nil")
        borders.append(element)
    tbl_pr.append(borders)


def table(doc, headers, rows, widths=None):
    t = doc.add_table(rows=1, cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.style = "Table Grid"
    t.autofit = True

    hdr = t.rows[0].cells
    for i, name in enumerate(headers):
        hdr[i].text = ""
        p = hdr[i].paragraphs[0]
        run = p.add_run(name)
        run.font.bold = True
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        shade(hdr[i], "215043")

    # Repeat the header when a table crosses a page boundary, and stop rows
    # from splitting mid-sentence.
    tr_pr = t.rows[0]._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)

    for row in rows:
        cells = t.add_row().cells
        row_pr = t.rows[-1]._tr.get_or_add_trPr()
        cant_split = OxmlElement("w:cantSplit")
        row_pr.append(cant_split)
        for i, value in enumerate(row):
            cells[i].text = ""
            p = cells[i].paragraphs[0]
            run = p.add_run(str(value))
            run.font.size = Pt(9.5)
            run.font.color.rgb = INK

    if widths:
        for row in t.rows:
            for i, width in enumerate(widths):
                row.cells[i].width = Cm(width)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t


doc = Document()

# ---- base styles -----------------------------------------------------------
normal = doc.styles["Normal"]
normal.font.name = "Calibri"
normal.font.size = Pt(10.5)
normal.font.color.rgb = INK

section = doc.sections[0]
section.page_width = Cm(21)
section.page_height = Cm(29.7)
section.top_margin = Cm(2.2)
section.bottom_margin = Cm(2.0)
section.left_margin = Cm(2.3)
section.right_margin = Cm(2.3)

section.different_first_page_header_footer = True

footer_p = section.footer.paragraphs[0]
footer_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
add_page_number(footer_p)
for run in footer_p.runs:
    run.font.size = Pt(8.5)
    run.font.color.rgb = MUTED

# ---- cover -----------------------------------------------------------------
doc.add_paragraph().paragraph_format.space_after = Pt(60)

kicker = doc.add_paragraph()
kicker.paragraph_format.space_after = Pt(6)
kr = kicker.add_run("CWORKS LTD  ·  PRODUCT OVERVIEW")
kr.font.size = Pt(9.5)
kr.font.bold = True
kr.font.color.rgb = GOLD

title = doc.add_paragraph()
title.paragraph_format.space_after = Pt(4)
tr = title.add_run("Milestone")
tr.font.size = Pt(46)
tr.font.bold = True
tr.font.color.rgb = DEEP_GREEN

sub = doc.add_paragraph()
sub.paragraph_format.space_after = Pt(14)
sr = sub.add_run("Verified student growth, beautifully organized.")
sr.font.size = Pt(15)
sr.font.color.rgb = MUTED
rule(sub, "B8860B", "10")

body(
    doc,
    "A portfolio and school-presence platform for secondary schools: students document real work, "
    "schools verify it, parents see it, and the school publishes a credible public page — all in one "
    "system with role-appropriate access.",
    size=11.5,
    space_after=28,
)

meta = [
    ("Prepared for", "Prospective school clients and education partners"),
    ("Prepared by", "CWORKS LTD, Kampala, Uganda"),
    ("Issued", "November 2026  ·  version 1.0"),
    ("Contact", "cworks@gmail.com  ·  +256 788 368 997 (phone and WhatsApp)"),
]
meta_table = doc.add_table(rows=0, cols=2)
no_borders(meta_table)
for label, value in meta:
    row = meta_table.add_row().cells
    row[0].width = Cm(3.2)
    row[1].width = Cm(13.0)
    label_run = row[0].paragraphs[0].add_run(label)
    label_run.font.size = Pt(9.5)
    label_run.font.bold = True
    label_run.font.color.rgb = DEEP_GREEN
    value_run = row[1].paragraphs[0].add_run(value)
    value_run.font.size = Pt(9.5)
    value_run.font.color.rgb = MUTED
    for cell in row:
        cell.paragraphs[0].paragraph_format.space_after = Pt(4)

# Contents — fills the cover's lower half with something a reader can use.
spacer = doc.add_paragraph()
spacer.paragraph_format.space_before = Pt(34)
spacer.paragraph_format.space_after = Pt(0)

contents_kicker = doc.add_paragraph()
contents_kicker.paragraph_format.space_after = Pt(6)
ck = contents_kicker.add_run("CONTENTS")
ck.font.size = Pt(9)
ck.font.bold = True
ck.font.color.rgb = GOLD
rule(contents_kicker, "D9D6CC", "6")

contents = [
    "1.  Executive summary",
    "2.  The problems it solves",
    "3.  What Milestone does",
    "4.  Who it serves",
    "5.  How it serves each person",
    "6.  What is inside the product",
    "7.  Trust, privacy and control",
    "8.  Getting a school live",
    "9.  Why a school should choose Milestone",
    "10.  Next steps",
]
contents_table = doc.add_table(rows=5, cols=2)
no_borders(contents_table)
for index, entry in enumerate(contents):
    cell = contents_table.rows[index % 5].cells[index // 5]
    run = cell.paragraphs[0].add_run(entry)
    run.font.size = Pt(10)
    run.font.color.rgb = INK
    cell.paragraphs[0].paragraph_format.space_after = Pt(5)

cover_footer = doc.add_paragraph()
cover_footer.paragraph_format.space_before = Pt(46)
cover_footer.paragraph_format.space_after = Pt(2)
rule(cover_footer, "B8860B", "6")

cover_note = doc.add_paragraph()
cn = cover_note.add_run("Milestone  ·  cworks@gmail.com  ·  +256 788 368 997  ·  Kampala, Uganda")
cn.font.size = Pt(8.5)
cn.font.color.rgb = MUTED

doc.add_page_break()

# ---- 1. executive summary --------------------------------------------------
h1(doc, "1.  Executive summary")
body(
    doc,
    "Schools produce remarkable student work every term — projects, performances, competitions, "
    "community service — and most of it disappears into exercise books, WhatsApp groups and a filing "
    "cabinet. When a parent asks what their child actually did this term, or a university asks for "
    "evidence, the school has to reconstruct it from memory.",
)
body(
    doc,
    "Milestone gives a school one place to capture that work as it happens, have it verified by the "
    "people responsible, and present it credibly to the outside world. Students build a structured "
    "portfolio. Teachers and administrators approve what is published. Parents get a clear view of "
    "their own child. The school gets a public page that looks and reads like it was professionally "
    "produced — because it is generated from verified records rather than written by hand.",
)
body(
    doc,
    "The platform is already built and deployed. It runs in a browser, installs as an app on phones "
    "and tablets, and separates every role's access at the database level. This document explains "
    "what it does, who it serves, and why a school would choose it.",
)

# ---- 2. the problem --------------------------------------------------------
h1(doc, "2.  The problems it solves")
body(
    doc,
    "Four failures show up in almost every school, and they compound each other.",
)
table(
    doc,
    ["Problem", "What it costs the school"],
    [
        (
            "Achievements are scattered",
            "Photos on a staff phone, certificates in a drawer, project files on one teacher's laptop. "
            "Nothing is searchable and most of it is lost within a year.",
        ),
        (
            "Claims cannot be verified",
            "Any student can write 'award-winning robotics project' on an application. Without a "
            "school-backed record, admissions officers and sponsors have no reason to believe it.",
        ),
        (
            "Parents are outside the loop",
            "Parents see a report card at the end of term and little else. Engagement drops, and "
            "concerns arrive too late to act on.",
        ),
        (
            "The school's public presence is improvised",
            "A Facebook page updated irregularly, a website nobody maintains, and photos used without "
            "permission. The school looks less capable than it is.",
        ),
    ],
    widths=[6.2, 10.2],
)

# ---- 3. what it is ---------------------------------------------------------
h1(doc, "3.  What Milestone does")
body(doc, "The product rests on four pillars, each useful on its own and stronger together.")

h2(doc, "3.1  A real portfolio, not a photo album")
body(
    doc,
    "Students record projects with descriptions, files and status, log achievements, and keep a "
    "gallery of their work. Their profile becomes a structured record of what they have actually "
    "done, term by term — not a social feed.",
)
h2(doc, "3.2  Verification by the school")
body(
    doc,
    "Every project and achievement passes through an approval step. A teacher or school "
    "administrator approves, rejects with a reason, or leaves it pending. Only verified work carries "
    "the school's endorsement, and the record shows who approved it and when. This is the difference "
    "between a claim and evidence.",
)
h2(doc, "3.3  A public page the school controls")
body(
    doc,
    "Each school gets a public profile: an about page, news, events, resources, a gallery, contact "
    "details and a badge. Content is written and published by the school's own staff through a "
    "content editor, and appears on the public page only when published. No developer, no web agency, "
    "no waiting for someone else to update the site.",
)
h2(doc, "3.4  Guidance and opportunity in one place")
body(
    doc,
    "A built-in guidance assistant (SmartBuddy) helps students think through projects and next steps, "
    "and a scholarships directory lets them find opportunities and track their applications. Usage is "
    "visible to the school so it can see whether the tools are actually being used.",
)

# ---- 4. who it serves ------------------------------------------------------
h1(doc, "4.  Who it serves")
body(
    doc,
    "Milestone has five roles. Each one sees a different application, and the separation is enforced "
    "in the database, not merely hidden in the interface.",
)
table(
    doc,
    ["Role", "Who this is", "What they get"],
    [
        (
            "Student",
            "A learner at a partner school (or one applying to join)",
            "A personal portfolio: projects, achievements, gallery, profile, scholarships, guidance.",
        ),
        (
            "Parent / guardian",
            "A parent or guardian of a student",
            "A dedicated workspace showing their child's activity, plus direct messages and "
            "subscription management.",
        ),
        (
            "Teacher",
            "Teaching staff at a school",
            "A workspace to review and approve student work, and to draft content for the school site.",
        ),
        (
            "School administrator",
            "Head teacher, deputy, ICT lead or bursar",
            "The full school console: approvals, announcements, academic structure, moderation, "
            "analytics, public page, badge and gallery.",
        ),
        (
            "Platform administrator",
            "CWORKS LTD operations",
            "Approval of new schools and accounts, moderation, audit logs and platform-wide settings.",
        ),
    ],
    widths=[3.4, 5.4, 7.6],
)

# ---- 5. per-person detail --------------------------------------------------
h1(doc, "5.  How it serves each person")

h2(doc, "5.1  For the student")
bullet(doc, " every subject, with a description, supporting files and a status that tracks it from idea to completion.", bold_lead="A portfolio that builds itself:")
bullet(doc, " with the school's approval attached, so the record means something to a university or sponsor.", bold_lead="Achievements that are verified")
bullet(doc, " of their own work, kept apart from the school's public gallery.", bold_lead="A personal gallery")
bullet(doc, ", and a shared profile link they can send to anyone.", bold_lead="One profile with their story")
bullet(doc, " — a directory to find funding and a tracker for applications already submitted.", bold_lead="Scholarships in the same place")
bullet(doc, " that helps them plan a project or decide what to do next, instead of staring at a blank page.", bold_lead="Guidance on demand")

h2(doc, "5.2  For the parent")
bullet(doc, " showing what their child has published, approved and completed — not a term-end surprise.", bold_lead="A clear view of their child")
bullet(doc, " with the school and with teachers, inside the platform rather than scattered across phone contacts.", bold_lead="Direct messages")
bullet(doc, " for the services they choose, in one place, with the plan they are on visible.", bold_lead="Subscription management")
bullet(doc, " addressed to parents are delivered to their account, so nothing depends on a paper letter reaching home.", bold_lead="School announcements")

h2(doc, "5.3  For the teacher")
bullet(doc, " and rejection with a written reason, which keeps the standard consistent across classes.", bold_lead="Review student work")
bullet(doc, " for the school's public page; nothing goes live without a publisher.", bold_lead="Draft content")
bullet(doc, " on completion rates and class activity, so intervention happens during the term.", bold_lead="See their classes")

h2(doc, "5.4  For the school administrator")
bullet(doc, " for new schools and accounts, in one queue with the evidence attached.", bold_lead="Approvals")
bullet(doc, " to students, parents or staff, with notification delivery to each recipient.", bold_lead="Announcements")
bullet(doc, " — years, classes and subjects — defined once and used everywhere.", bold_lead="Academic structure")
bullet(doc, " before publication, with a documented decision for each item.", bold_lead="Content moderation")
bullet(doc, " on users, projects, pending approvals and verification activity — every figure read from the database, never a placeholder.", bold_lead="Analytics")
bullet(doc, " — about, news, events, resources — plus the school badge and photo/video gallery, all editable without technical help.", bold_lead="The public page")
bullet(doc, " that shows when things are used and when they are not.", bold_lead="Settings and governance")

h2(doc, "5.5  For the platform administrator")
bullet(doc, " before any of their data becomes public.", bold_lead="Approve schools")
bullet(doc, " across the platform, with audit logging of sensitive actions.", bold_lead="Moderate content")
bullet(doc, " for support: find an account by email, reset onboarding, inspect a link history.", bold_lead="Support tooling")

# ---- 6. inventory ----------------------------------------------------------
h1(doc, "6.  What is inside the product")
table(
    doc,
    ["Area", "Capabilities"],
    [
        (
            "Accounts and access",
            "Five roles; school and account approval workflow; onboarding per role; protected fields "
            "that a user cannot change on themselves.",
        ),
        (
            "Student portfolio",
            "Projects with files and folders, task tracking, achievements, personal gallery, profile, "
            "visibility settings.",
        ),
        (
            "Verification",
            "Teacher and administrator approval or rejection with a recorded reason; verified badge on "
            "approved work; moderation queue.",
        ),
        (
            "School website",
            "About, news, events and resources pages with draft/publish states; hero image or video; "
            "tagline; founding year; badge; photo and video gallery.",
        ),
        (
            "Communication",
            "School announcements to students, parents or staff; in-app notifications; parent messages.",
        ),
        (
            "Guidance and opportunity",
            "SmartBuddy assistant; scholarships directory; application tracking; recommendations.",
        ),
        (
            "Operations",
            "School analytics, academic structure, audit logs, platform settings, account support tools.",
        ),
        (
            "Delivery",
            "Browser-based web app; installable on phones and tablets; responsive layout; no local "
            "installation or IT project required.",
        ),
    ],
    widths=[4.2, 12.2],
)

# ---- 7. trust --------------------------------------------------------------
h1(doc, "7.  Trust, privacy and control")
body(
    doc,
    "A school's reputation rests on what it publishes, so the platform is built to make accidental "
    "disclosure difficult.",
)
bullet(doc, " — a student cannot read another family's records, a parent sees only their own child, and a teacher sees only their school.", bold_lead="Access is enforced in the database")
bullet(doc, " — work reaches the public page or the verified record only after a named staff member approves it.", bold_lead="Nothing is public by default")
bullet(doc, " — figures shown to staff come from live queries. Where data is missing, the interface shows a dash instead of a zero or an estimate.", bold_lead="Numbers are never invented")
bullet(doc, " alone can change a role, school assignment or approval status; those fields are blocked for everyone else.", bold_lead="Privileged fields are locked")
bullet(doc, " — images up to 10 MB, video up to 100 MB, stored in the school's own folder and deletable by the school.", bold_lead="Media stays under school control")
bullet(doc, " and account changes are recorded, so an incident can be reconstructed.", bold_lead="Sensitive actions are logged")

# ---- 8. onboarding ---------------------------------------------------------
h1(doc, "8.  Getting a school live")
body(doc, "A school can be running the same day. The sequence is deliberately short.")
steps = [
    ("Register the school", "The administrator creates the school profile; it enters as pending."),
    ("Approval", "CWORKS LTD reviews and approves the school. Only then does it appear publicly."),
    ("Identity", "Upload the school badge, write the description, add location and founding year."),
    ("Structure", "Set academic years, classes and subjects once; staff and students inherit them."),
    ("People", "Invite teachers and students; accounts are approved before any data is visible."),
    ("Publish", "Add photos and video to the gallery, publish the first announcement, and the public page is live."),
]
for index, (title_text, detail) in enumerate(steps, start=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.left_indent = Cm(0.6)
    num = p.add_run(f"{index}.  ")
    num.font.bold = True
    num.font.color.rgb = DEEP_GREEN
    num.font.size = Pt(10.5)
    head = p.add_run(f"{title_text} — ")
    head.font.bold = True
    head.font.size = Pt(10.5)
    rest = p.add_run(detail)
    rest.font.size = Pt(10.5)
    rest.font.color.rgb = INK

# ---- 9. why ----------------------------------------------------------------
h1(doc, "9.  Why a school should choose Milestone")
reasons = [
    (
        "It produces evidence, not marketing.",
        "The public page is generated from verified student work. A visitor can see who approved what, "
        "which is a stronger claim than any brochure sentence.",
    ),
    (
        "It replaces several tools at once.",
        "Portfolio, school website, announcement channel, approval workflow and parent communication "
        "live in one system with one set of accounts.",
    ),
    (
        "It respects the school's authority.",
        "Staff decide what is published and what is verified. The platform provides the structure and "
        "the record; it does not speak for the school.",
    ),
    (
        "It is usable by non-technical staff.",
        "Publishing a news item or adding gallery photos is a form, not a deployment. If a member of "
        "staff can use email, they can run the school's page.",
    ),
    (
        "It works on the phones people already own.",
        "No computer lab required. The app installs to a home screen and works on low-cost Android "
        "devices over ordinary mobile data.",
    ),
    (
        "It grows with the school.",
        "Start with one class or one department; add years, subjects and staff as confidence grows. "
        "The same system serves a single campus or a group of schools.",
    ),
]
for title_text, detail in reasons:
    h2(doc, title_text)
    body(doc, detail, space_after=6)

# ---- 10. next steps --------------------------------------------------------
h1(doc, "10.  Next steps")
body(
    doc,
    "We suggest a bounded pilot rather than a school-wide rollout: one term, one department or year "
    "group, a small number of teachers and a defined set of projects. At the end of the term the "
    "school has a verified record of that group's work and a public page it can show to parents — "
    "enough evidence to decide whether to extend it.",
)
body(
    doc,
    "To discuss a pilot, contact CWORKS LTD: cworks@gmail.com or +256 788 368 997 (phone and "
    "WhatsApp). We are based in Kampala, Uganda.",
)
closing = doc.add_paragraph()
closing.paragraph_format.space_before = Pt(14)
cr = closing.add_run(
    "Milestone — verified student growth, beautifully organized."
)
cr.font.size = Pt(10.5)
cr.font.italic = True
cr.font.color.rgb = MUTED

doc.save(DOCX)
print(f"WROTE {DOCX.resolve()}")
