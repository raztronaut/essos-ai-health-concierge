#!/usr/bin/env python3
"""Generate Essos mock asset PDFs and preview PNGs from source Markdown."""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "mock-assets" / "source-docs"
OUT_DIR = ROOT / "mock-assets" / "pdf" / "essos"
PREVIEW_DIR = OUT_DIR / "previews"
TMP_DIR = ROOT / "tmp" / "pdfs"
MANIFEST_PATH = ROOT / "mock-assets" / "manifest.json"

SURFACE = colors.HexColor("#F5F1E5")
TEXT = colors.HexColor("#171715")
MUTED = colors.HexColor("#8D897D")
BORDER = colors.HexColor("#BCB6A7")
ACCENT = colors.HexColor("#46443F")


@dataclass
class SourceDoc:
    path: Path
    meta: dict[str, str]
    body: str

    @property
    def slug(self) -> str:
        return self.meta["slug"]

    @property
    def pdf_name(self) -> str:
        return self.meta["pdf"]


def parse_frontmatter(path: Path) -> SourceDoc:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not match:
        raise ValueError(f"{path} is missing YAML-style front matter")
    meta: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if not line.strip():
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip()
    required = ["id", "slug", "title", "kind", "phase", "source_type", "source_status", "answer_policy", "pdf"]
    missing = [key for key in required if key not in meta]
    if missing:
        raise ValueError(f"{path} missing front matter keys: {', '.join(missing)}")
    return SourceDoc(path=path, meta=meta, body=match.group(2).strip())


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def paragraph_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "EssosTitle",
            parent=base["Title"],
            fontName="Times-Roman",
            fontSize=28,
            leading=30,
            textColor=TEXT,
            spaceAfter=18,
            alignment=TA_LEFT,
        ),
        "h2": ParagraphStyle(
            "EssosH2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=TEXT,
            spaceBefore=14,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "EssosBody",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=TEXT,
            spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "EssosSmall",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=MUTED,
        ),
        "bullet": ParagraphStyle(
            "EssosBullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.25,
            leading=12.5,
            leftIndent=12,
            firstLineIndent=-8,
            textColor=TEXT,
            spaceAfter=4,
        ),
        "cell": ParagraphStyle(
            "EssosCell",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.6,
            leading=9.2,
            textColor=TEXT,
        ),
        "cell_header": ParagraphStyle(
            "EssosCellHeader",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.4,
            leading=8.8,
            textColor=TEXT,
        ),
    }


def inline(text: str) -> str:
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"`([^`]+)`", r"<font face='Courier'>\1</font>", text)
    return text


def markdown_to_story(doc: SourceDoc) -> list[Any]:
    styles = paragraph_styles()
    story: list[Any] = []
    lines = doc.body.splitlines()
    i = 0
    title_done = False

    badge = (
        f"Source: {doc.meta['source_type']} / {doc.meta['source_status']} | "
        f"Policy: {doc.meta['answer_policy']}"
    )
    story.append(Paragraph(inline(badge), styles["small"]))
    story.append(Spacer(1, 0.08 * inch))

    while i < len(lines):
        line = lines[i].rstrip()
        if not line.strip():
            i += 1
            continue

        if line.startswith("# "):
            if title_done:
                story.append(PageBreak())
            story.append(Paragraph(inline(line[2:].strip()), styles["title"]))
            title_done = True
            i += 1
            continue

        if line.startswith("## "):
            story.append(Paragraph(inline(line[3:].strip()).upper(), styles["h2"]))
            i += 1
            continue

        if line.startswith("- "):
            story.append(Paragraph("• " + inline(line[2:].strip()), styles["bullet"]))
            i += 1
            continue

        if line.startswith("|"):
            table_lines: list[str] = []
            while i < len(lines) and lines[i].startswith("|"):
                table_lines.append(lines[i])
                i += 1
            rows = []
            for raw in table_lines:
                cells = [c.strip() for c in raw.strip("|").split("|")]
                if all(set(c) <= {"-", " "} for c in cells):
                    continue
                rows.append(cells)
            if rows:
                data = []
                for row_index, row in enumerate(rows):
                    style = styles["cell_header"] if row_index == 0 else styles["cell"]
                    data.append([Paragraph(inline(cell), style) for cell in row])
                table = Table(data, repeatRows=1, hAlign="LEFT")
                table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EFE8D8")),
                            ("GRID", (0, 0), (-1, -1), 0.35, BORDER),
                            ("VALIGN", (0, 0), (-1, -1), "TOP"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 5),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                            ("TOPPADDING", (0, 0), (-1, -1), 4),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                        ]
                    )
                )
                story.append(table)
                story.append(Spacer(1, 0.08 * inch))
            continue

        paragraph_lines = [line]
        i += 1
        while i < len(lines):
            nxt = lines[i].rstrip()
            if not nxt.strip() or nxt.startswith(("# ", "## ", "- ", "|")):
                break
            paragraph_lines.append(nxt)
            i += 1
        story.append(Paragraph(inline(" ".join(paragraph_lines)), styles["body"]))

    return story


def draw_page(canvas, doc):
    canvas.saveState()
    width, height = LETTER
    canvas.setFillColor(SURFACE)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.75)
    canvas.line(0.62 * inch, height - 0.55 * inch, width - 0.62 * inch, height - 0.55 * inch)
    canvas.setFillColor(TEXT)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(0.68 * inch, height - 0.38 * inch, "ESSOS")
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(width - 0.68 * inch, height - 0.38 * inch, "Mock asset pack | Work trial")
    canvas.drawRightString(width - 0.68 * inch, 0.36 * inch, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf(source: SourceDoc) -> dict[str, Any]:
    pdf_path = OUT_DIR / source.pdf_name
    pdf = SimpleDocTemplate(
        str(pdf_path),
        pagesize=LETTER,
        rightMargin=0.68 * inch,
        leftMargin=0.68 * inch,
        topMargin=0.82 * inch,
        bottomMargin=0.64 * inch,
        title=source.meta["title"],
        author="Essos",
    )
    story = markdown_to_story(source)
    pdf.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    return {
        "id": source.meta["id"],
        "slug": source.slug,
        "title": source.meta["title"],
        "patient_id": source.meta.get("patient_id") or None,
        "kind": source.meta["kind"],
        "phase": source.meta["phase"],
        "source_type": source.meta["source_type"],
        "source_status": source.meta["source_status"],
        "answer_policy": source.meta["answer_policy"],
        "markdown_path": str(source.path.relative_to(ROOT)),
        "pdf_path": str(pdf_path.relative_to(ROOT)),
        "sha256": sha256(pdf_path),
    }


def render_previews(pdf_paths: list[Path]) -> None:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    pdftoppm = shutil.which("pdftoppm")
    if not pdftoppm:
        print("warning: pdftoppm not found; skipping preview render")
        return
    for pdf_path in pdf_paths:
        prefix = PREVIEW_DIR / pdf_path.stem
        subprocess.run(
            [pdftoppm, "-png", "-r", "120", str(pdf_path), str(prefix)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.pdf"):
        old.unlink()
    if PREVIEW_DIR.exists():
        shutil.rmtree(PREVIEW_DIR)

    sources = [parse_frontmatter(path) for path in sorted(SOURCE_DIR.glob("*.md"))]
    entries = [build_pdf(source) for source in sources]
    render_previews([OUT_DIR / entry["pdf_path"].split("/")[-1] for entry in entries])

    manifest = {
        "generated_by": "mock-assets/scripts/generate_pdfs.py",
        "output_dir": "mock-assets/pdf/essos",
        "documents": entries,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"generated {len(entries)} pdfs")
    print(f"wrote {MANIFEST_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
