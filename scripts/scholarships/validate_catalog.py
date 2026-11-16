"""Validate a scholarship catalog CSV before import.

The catalog refuses to publish an entry without a source. This script catches the
problem earlier, at the desk, with a message that says which row and which field.

Usage:
    uv run python scripts/scholarships/validate_catalog.py docs/scholarships/catalog-template.csv
    uv run python scripts/scholarships/validate_catalog.py --self-test

Exit codes: 0 = clean (warnings allowed), 1 = at least one ERROR.
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

CATEGORIES = {
    "merit", "stem", "arts_sport", "bursary",
    "leadership", "inclusion", "school_internal", "external",
}
MODES = {"internal", "external"}
STATUSES = {"draft", "published", "archived"}
LEVELS = {"S1", "S2", "S3", "S4", "S5", "S6"}

REQUIRED_COLUMNS = [
    "title", "provider_name", "provider_contact", "category", "description",
    "application_mode", "application_url", "source_url", "verified_at", "verified_by_email",
    "award_min", "award_max", "currency", "award_type", "opens_at", "closes_at",
    "decision_by", "levels", "gender", "region", "subjects_any", "activities_any",
    "min_grade", "need_band", "renewal_terms", "steps", "status",
]

# Fields without which a listing must not be shown to students.
PUBLISH_REQUIRED = [
    "title", "provider_name", "provider_contact", "category",
    "source_url", "verified_at", "verified_by_email", "closes_at",
]

PLACEHOLDER_PATTERNS = ("example.org", "example.com", "EXAMPLE")


@dataclass
class Finding:
    row: int
    level: str   # ERROR | WARN
    field: str
    message: str

    def __str__(self) -> str:
        return f"row {self.row:>3}  {self.level:<5} {self.field:<22} {self.message}"


def _parse_dt(value: str) -> datetime | None:
    if not value:
        return None
    text = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def _num(value: str) -> float | None:
    text = (value or "").strip().replace(",", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _split(value: str) -> list[str]:
    return [part.strip() for part in (value or "").split(";") if part.strip()]


def validate_rows(rows: list[dict[str, str]]) -> list[Finding]:
    findings: list[Finding] = []
    seen: dict[tuple[str, str], int] = {}

    for index, raw in enumerate(rows, start=2):   # header is line 1
        row = {k: (v or "").strip() for k, v in raw.items() if k}
        title = row.get("title", "")

        def err(field: str, message: str) -> None:
            findings.append(Finding(index, "ERROR", field, f"{title or '(no title)'}: {message}"))

        def warn(field: str, message: str) -> None:
            findings.append(Finding(index, "WARN", field, f"{title or '(no title)'}: {message}"))

        if not title:
            err("title", "missing")
            continue

        status = row.get("status", "")
        if status not in STATUSES:
            err("status", f"must be one of {sorted(STATUSES)}")
        if row.get("category") not in CATEGORIES:
            err("category", f"must be one of {sorted(CATEGORIES)}")
        if row.get("application_mode") not in MODES:
            err("application_mode", f"must be one of {sorted(MODES)}")

        currency = row.get("currency", "")
        if currency and not re.fullmatch(r"[A-Z]{3}", currency):
            err("currency", "use a 3-letter code, e.g. UGX")

        opens = _parse_dt(row.get("opens_at", ""))
        closes = _parse_dt(row.get("closes_at", ""))
        for name, value, parsed in (
            ("opens_at", row.get("opens_at", ""), opens),
            ("closes_at", row.get("closes_at", ""), closes),
            ("verified_at", row.get("verified_at", ""), _parse_dt(row.get("verified_at", ""))),
            ("decision_by", row.get("decision_by", ""), _parse_dt(row.get("decision_by", ""))),
        ):
            if value and parsed is None:
                err(name, f"'{value}' is not an ISO date/time")
        if opens and closes and closes <= opens:
            err("closes_at", "must be after opens_at")

        award_min, award_max = _num(row.get("award_min", "")), _num(row.get("award_max", ""))
        if row.get("award_min") and award_min is None:
            err("award_min", "not a number")
        if row.get("award_max") and award_max is None:
            err("award_max", "not a number")
        if award_min is not None and award_max is not None and award_min > award_max:
            err("award_max", "lower than award_min")

        for level in _split(row.get("levels", "")):
            if level not in LEVELS:
                err("levels", f"'{level}' is not one of {sorted(LEVELS)}")

        need = row.get("need_band", "").lower()
        if need and need not in {"low", "medium", "high"}:
            err("need_band", "must be low, medium or high")

        key = (title.lower(), row.get("provider_name", "").lower())
        if key in seen:
            err("title", f"duplicate of row {seen[key]} (same title and provider)")
        else:
            seen[key] = index

        blob = " ".join(row.values())
        if any(pattern in blob for pattern in PLACEHOLDER_PATTERNS):
            if status == "published":
                err("provider_contact", "placeholder example data must not be published")
            else:
                warn("provider_contact", "looks like placeholder data — replace before publishing")

        if status == "published":
            for field in PUBLISH_REQUIRED:
                if not row.get(field):
                    err(field, "required to publish")
            if closes and closes <= datetime.now(timezone.utc):
                err("closes_at", "is in the past — publish a future cycle or archive it")
            if award_min is None and award_max is None and not row.get("award_type"):
                err("award_type", "state an amount or an award type before publishing")
            if not re.match(r"^https?://", row.get("source_url", "")):
                err("source_url", "must be an http(s) URL")
        else:
            if not row.get("source_url"):
                warn("source_url", "add the source before this can be published")

    return findings


def self_test() -> int:
    header = {column: "" for column in REQUIRED_COLUMNS}

    def row(**overrides: str) -> dict[str, str]:
        base = dict(header)
        base.update({
            "title": "Test award",
            "provider_name": "Test Provider",
            "provider_contact": "scholarships@provider.ac.ug",
            "category": "merit",
            "status": "draft",
            "currency": "UGX",
            "application_mode": "internal",
        })
        base.update(overrides)
        return base

    cases: list[tuple[str, list[dict[str, str]], str, str]] = [
        ("clean draft", [row()], "WARN", "source_url"),
        ("published without source", [row(status="published", closes_at="2030-01-31T23:59:00+03:00")], "ERROR", "source_url"),
        ("published but closed", [
            row(status="published", source_url="https://provider.ac.ug/call",
                verified_at="2026-11-13", verified_by_email="cworks@gmail.com",
                closes_at="2020-01-31T23:59:00+03:00", award_min="1000")
        ], "ERROR", "closes_at"),
        ("award range inverted", [row(award_min="900", award_max="100")], "ERROR", "award_max"),
        ("unknown level", [row(levels="S9")], "ERROR", "levels"),
        ("duplicate pair", [row(), row()], "ERROR", "title"),
        ("placeholder published", [
            row(title="Example thing", provider_contact="a@example.org", status="published",
                source_url="https://provider.ac.ug/call", verified_at="2026-11-13",
                verified_by_email="cworks@gmail.com", closes_at="2030-01-31T23:59:00+03:00",
                award_type="tuition")
        ], "ERROR", "provider_contact"),
    ]

    failures = 0
    for name, rows, level, field in cases:
        findings = validate_rows(rows)
        hit = [f for f in findings if f.level == level and f.field == field]
        if hit:
            print(f"PASS  {name}  -> {hit[0].message}")
        else:
            failures += 1
            print(f"FAIL  {name}  expected {level} on {field}, got: {[str(f) for f in findings] or 'none'}")

    print(f"\nself-test: {len(cases) - failures}/{len(cases)} passed")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a scholarship catalog CSV.")
    parser.add_argument("csv_path", nargs="?", help="path to the catalog CSV")
    parser.add_argument("--self-test", action="store_true", help="run built-in fixtures")
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    if not args.csv_path:
        parser.print_help()
        return 1

    path = Path(args.csv_path)
    if not path.exists():
        print(f"ERROR: no such file: {path}")
        return 1

    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        missing = [column for column in REQUIRED_COLUMNS if column not in (reader.fieldnames or [])]
        rows = list(reader)

    if missing:
        print("ERROR: missing columns: " + ", ".join(missing))
        return 1

    findings = validate_rows(rows)
    for finding in findings:
        print(finding)

    errors = [f for f in findings if f.level == "ERROR"]
    warns = [f for f in findings if f.level == "WARN"]
    print(f"\n{len(rows)} rows · {len(errors)} errors · {len(warns)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
