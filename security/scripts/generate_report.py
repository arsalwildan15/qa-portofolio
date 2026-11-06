#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_report.py - Step 2: turn the JSON evidence written by
scan_orangehrm.py into PDF evidence (reportlab): one summary PDF plus
one detail PDF per tool that had findings.

Simplified, single-repo version of the reference Snyk evidence PDF
generator (snyk_generate_pdf.py): same visual structure (severity count
cards, "KETERANGAN" scope & remediation table, SEVERITY / STATUS REPO
legend boxes, "ISTILAH PER TOOL" glossary, per-finding detail cards,
and a properly column-sized Gitleaks summary table) but without the
multi-repo "DAFTAR ISI" table of contents or cross-run comparison logic.

Usage:
    python generate_report.py
    python generate_report.py --scan-folder "...\\security\\evidence\\json\\20261106 (1)"
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ============================================================
# CONFIG
# ============================================================
SCRIPT_DIR = Path(__file__).resolve().parent
SECURITY_DIR = SCRIPT_DIR.parent

FOLDER_SCAN = SECURITY_DIR / "evidence" / "json"     # default: most recent run under here
FOLDER_OUTPUT = SECURITY_DIR / "evidence" / "pdf"     # PDF output root

# ============================================================
# STYLING (ported from the reference snyk_generate_pdf.py so the output
# looks like the real evidence PDFs instead of a bare table)
# ============================================================
SEV_ORDER = ["critical", "high", "medium", "low"]
SEV_ABBR = {"critical": "C", "high": "H", "medium": "M", "low": "L"}
SEV_COLOR = {
    "critical": colors.HexColor("#7F1D1D"),
    "high": colors.HexColor("#DC2626"),
    "medium": colors.HexColor("#F59E0B"),
    "low": colors.HexColor("#6B7280"),
}
# Snyk-style badge palette: light "number" box + dark "letter" box.
SNYK_DARK = {"critical": "#AB1A1A", "high": "#CE5019", "medium": "#946100", "low": "#5E6372"}
SNYK_LIGHT = {"critical": "#FCE4E4", "high": "#FDE8DD", "medium": "#FCF0D7", "low": "#E9EAF0"}
ZERO_NUM_BG, ZERO_NUM_FG, ZERO_LET_BG = "#EEEEF2", "#8A8A9A", "#6E6E80"

INK = colors.HexColor("#1F2933")
INK_SOFT = colors.HexColor("#52606D")
LINE = colors.HexColor("#E4E7EB")
CHIP_BG = colors.HexColor("#EEF1F4")
CARD_LINE = colors.HexColor("#E4E7EB")
JARAK_KARTU = 16  # vertical gap between finding cards (pt)

# Scan type: (pill label, color)
TYPE_INFO = {
    "SCA": ("SCA", "#2563EB"),
    "SAST": ("SAST", "#7C3AED"),
    "GITLEAKS": ("GITLEAKS", "#B45309"),
    "TRIVY": ("TRIVY", "#4D7C0F"),
}

STATUS = {
    "fix": ("PERLU DIPERBAIKI", colors.HexColor("#DC2626")),
    "safe": ("AMAN", colors.HexColor("#15803D")),
    "failed": ("GAGAL SCAN", colors.HexColor("#64748B")),
}
# Hex-string versions for use inside Paragraph markup.
STATUS_HEX = {
    "fix": "#DC2626",
    "safe": "#15803D",
    "failed": "#64748B",
}

styles = getSampleStyleSheet()
S_TITLE = ParagraphStyle("t", parent=styles["Title"], fontSize=17, textColor=INK,
                         spaceAfter=2, fontName="Helvetica-Bold")
S_SUB = ParagraphStyle("s", parent=styles["Normal"], fontSize=9.5, textColor=INK_SOFT, spaceAfter=1)
S_CAT = ParagraphStyle("cat", parent=styles["Normal"], fontSize=12, textColor=INK,
                       fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=5)
S_SECHDR = ParagraphStyle("sh", parent=styles["Normal"], fontSize=11, textColor=INK,
                          fontName="Helvetica-Bold", spaceBefore=8, spaceAfter=4)
S_ISSUE = ParagraphStyle("iss", parent=styles["Normal"], fontSize=12, textColor=INK,
                         fontName="Helvetica-Bold", spaceAfter=1, leading=15)
S_LABEL = ParagraphStyle("lbl", parent=styles["Normal"], fontSize=7.5, textColor=INK_SOFT,
                         fontName="Helvetica-Bold", spaceAfter=1)
S_BODY = ParagraphStyle("bd", parent=styles["Normal"], fontSize=9, textColor=INK, leading=13)
S_MONO = ParagraphStyle("mo", parent=styles["Normal"], fontSize=8, textColor=INK,
                        fontName="Courier", leading=12)
S_SMALL = ParagraphStyle("sm", parent=styles["Normal"], fontSize=8.5, textColor=INK_SOFT, leading=12.5)
S_CHIP = ParagraphStyle("ch", parent=styles["Normal"], fontSize=7.5, textColor=INK, leading=9)
S_BADGE = ParagraphStyle("bg", parent=styles["Normal"], fontSize=8.5, textColor=colors.white,
                         fontName="Helvetica-Bold", alignment=TA_LEFT)
S_CELL = ParagraphStyle("cell", parent=styles["Normal"], fontSize=8.5, textColor=INK, leading=11)
S_HCELL = ParagraphStyle("hcell", parent=S_CELL, textColor=INK_SOFT, fontName="Helvetica-Bold", fontSize=7.5)
S_NUM = ParagraphStyle("num", parent=S_CELL, alignment=1, fontName="Helvetica-Bold")
S_PILL = ParagraphStyle("pill", parent=S_CELL, fontSize=7, leading=8.5, alignment=1,
                        fontName="Helvetica-Bold", textColor=colors.white)
S_SEL = ParagraphStyle("sel", parent=S_SMALL, leading=10.5, textColor=INK)
S_SELM = ParagraphStyle("selm", parent=S_MONO, fontSize=7, leading=9)
S_CMD = ParagraphStyle("cmd", parent=S_CELL, fontName="Courier", fontSize=8, textColor=INK)
S_TGT = ParagraphStyle("tgt", parent=styles["Normal"], fontSize=10, textColor=INK,
                       fontName="Helvetica-Bold", leading=13)

# Scan type -> (badge label/color already in TYPE_INFO, Snyk product sub-label for the
# per-repo card, same wording as the reference's _type_label()).
TYPE_SUBLABEL = {"SCA": "Snyk Open Source", "SAST": "Snyk Code", "GITLEAKS": "local scan", "TRIVY": "local scan"}

BADGES_W = 4 * 34 + 3 * 4
WARNA_SECRET = "#B45309"


def esc(t) -> str:
    if t is None:
        return ""
    return str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def md_to_text(md: str, limit: int | None = None) -> str:
    """Strip markdown-ish syntax from Snyk description/help text into HTML-ish Paragraph markup."""
    if not md:
        return ""
    t = md.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r'\[([^\]]+)\]\((https?://[^\)]+)\)', r'\1', t)
    t = re.sub(r'#{1,6}\s*', '', t)
    t = t.replace("**", "").replace("`", "").replace("_", "")
    t = re.sub(r'^\s*Overview\s*\n+', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\n{3,}', '\n\n', t).strip()
    if limit and len(t) > limit:
        t = t[:limit].rstrip() + " ..."
    return esc(t).replace("\n", "<br/>")


# ------------------------------------------------------------
# Small reusable flowable builders (ported from the reference script)
# ------------------------------------------------------------

def sev_badge(sev: str) -> Table:
    c = SEV_COLOR.get(sev, colors.grey)
    txt_color = colors.white if sev in ("critical", "high") else INK
    style = ParagraphStyle("bd_" + sev, parent=S_BADGE, textColor=txt_color)
    tbl = Table([[Paragraph(esc(sev.upper()), style)]], colWidths=[54])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), c),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return tbl


def chip(text: str) -> Table:
    p = Paragraph(esc(text), S_CHIP)
    t = Table([[p]])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CHIP_BG),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def chip_row(items, per_row=6):
    items = [i for i in items if i]
    if not items:
        return None
    cells = [chip(i) for i in items]
    rows = [cells[i:i + per_row] for i in range(0, len(cells), per_row)]
    for r in rows:
        while len(r) < per_row:
            r.append("")
    t = Table(rows, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def kv(label: str, value_flowable) -> Table:
    if isinstance(value_flowable, str):
        value_flowable = Paragraph(esc(value_flowable), S_BODY)
    t = Table([[Paragraph(esc(label), S_LABEL), value_flowable]], colWidths=[95, None], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def issue_card(inner_flowables, sev: str) -> Table:
    """Border card with a colored severity strip on the left. Each flowable is its own
    table row (not one big cell) so the card can split across pages for long content."""
    rows = [[f] for f in inner_flowables]
    card = Table(rows, colWidths=[None], splitByRow=1)
    card.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.75, CARD_LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 3, SEV_COLOR.get(sev, colors.grey)),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return card


def para_rows(text_html, style):
    """Split long text into several Paragraphs so it can break across pages safely."""
    if not text_html:
        return []
    hasil = []
    for b in text_html.split("<br/><br/>"):
        if not b.strip():
            continue
        baris = b.split("<br/>")
        for i in range(0, len(baris), 20):
            hasil.append(Paragraph("<br/>".join(baris[i:i + 20]), style))
    return hasil


def _kartu_utuh(items):
    """Keep short cards together (move to next page as a unit); long cards are left to
    split naturally so they don't leave a near-empty page behind them."""
    w, h = A4[0] - 30 * mm, A4[1] - 30 * mm - 12
    tinggi = sum(f.wrap(w, h)[1] for f in items)
    return [KeepTogether(items)] if tinggi <= h * 0.5 else list(items)


def _tabel(header, rows, widths, warna_baris=None):
    """Bordered summary table with a grey header row. `widths` MUST sum to the usable page
    width; any column holding long free text uses Paragraph cells so it wraps instead of
    overflowing into the next column."""
    data = [[Paragraph(esc(h), S_LABEL) for h in header]] + rows
    t = Table(data, colWidths=widths, hAlign="LEFT", repeatRows=1)
    st = [
        ("BACKGROUND", (0, 0), (-1, 0), CHIP_BG),
        ("BOX", (0, 0), (-1, -1), 0.75, CARD_LINE),
        ("LINEBELOW", (0, 0), (-1, -2), 0.25, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]
    t.setStyle(TableStyle(st + (warna_baris or [])))
    return t


def _info_scan(pasangan):
    cells = [[Paragraph(esc(k), S_LABEL), Paragraph(esc(v), S_BODY)] for k, v in pasangan if v not in ("", None)]
    rows = []
    for i in range(0, len(cells), 2):
        r = cells[i] + (cells[i + 1] if i + 1 < len(cells) else ["", ""])
        rows.append(r)
    t = Table(rows, colWidths=[75, 170, 75, None], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CHIP_BG),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def _badge(teks, warna, lebar=70):
    t = Table([[Paragraph(esc(teks), S_BADGE)]], colWidths=[lebar])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), warna),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def _pill(text, color, width):
    t = Table([[Paragraph(text, S_PILL)]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(color) if isinstance(color, str) else color),
        ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
    ]))
    return t


def _pill2(atas, warna_atas, bawah, warna_bawah, width):
    """Two-tone pill: top row = main status, bottom row = secondary note (e.g. a repo with
    findings where some other scan also failed), ported from the reference's _pill2()."""
    S_BAWAH = ParagraphStyle("pill2b", parent=S_PILL, fontSize=6, leading=7.5)
    t = Table([[Paragraph(atas, S_PILL)], [Paragraph(esc(bawah), S_BAWAH)]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(warna_atas) if isinstance(warna_atas, str) else warna_atas),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor(warna_bawah) if isinstance(warna_bawah, str) else warna_bawah),
        ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
    ]))
    return t


def _single_badge(s):
    t = Table([[Paragraph(SEV_ABBR[s], S_PILL)]], colWidths=[16])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(SNYK_DARK[s])),
                           ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                           ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5)]))
    return t


def _doc_header(story, title, target, project, issues):
    story.append(Paragraph(esc(title), S_TITLE))
    story.append(Paragraph(f"Target: {esc(target)}", S_SUB))
    story.append(Paragraph(f"Project: {esc(project)}", S_SUB))
    counts = {s: 0 for s in SEV_ORDER}
    for i in issues:
        counts[i.get("severity", "low")] = counts.get(i.get("severity", "low"), 0) + 1
    summ = " | ".join(f"{s.capitalize()}: {counts.get(s, 0)}" for s in SEV_ORDER)
    story.append(Paragraph(f"Total Issues: {len(issues)} &nbsp;&nbsp; ({esc(summ)})", S_SUB))
    story.append(HRFlowable(width="100%", color=LINE, spaceBefore=6, spaceAfter=4))


def _footer(canv, doc):
    canv.saveState()
    canv.setFont("Helvetica", 7.5)
    canv.setFillColor(INK_SOFT)
    canv.drawString(15 * mm, 9 * mm, "Security Scan Summary")
    canv.drawRightString(A4[0] - 15 * mm, 9 * mm, f"Page {canv.getPageNumber()}")
    canv.restoreState()


# ============================================================
# Find the latest (or specified) scan folder
# ============================================================

def find_latest_scan_folder(root: Path) -> Path | None:
    if not root.exists():
        return None
    candidates = [p for p in root.iterdir() if p.is_dir()]
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.stat().st_mtime)


# ============================================================
# PARSERS (same JSON shapes as Snyk/gitleaks/trivy CLI output)
# ============================================================

def load_json(path: Path):
    if not path.exists() or path.stat().st_size == 0:
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return None


def extract_sca_findings(json_path: Path) -> list[dict]:
    data = load_json(json_path)
    if data is None:
        return []
    findings, seen = [], set()
    projects = data if isinstance(data, list) else [data]
    for p in projects:
        for v in (p or {}).get("vulnerabilities", []) or []:
            # Dedup by Snyk vulnerability id alone (matches scan_orangehrm.py's own severity
            # count / RINGKASAN.txt), so the detail PDF totals agree with the recap .txt.
            key = v.get("id") or f"{v.get('title')}|{v.get('packageName')}|{v.get('version')}"
            if key in seen:
                continue
            seen.add(key)
            ident = v.get("identifiers", {}) or {}
            findings.append({
                "title": v.get("title", ""),
                "severity": (v.get("severity") or "low").lower(),
                "cvss": v.get("cvssScore"),
                "cve": ", ".join(ident.get("CVE", []) or []),
                "cwe": ", ".join(ident.get("CWE", []) or []),
                "snyk_id": v.get("id"),
                "package": f"{v.get('packageName', '')} {v.get('version', '')}".strip(),
                "fixedIn": ", ".join(v.get("fixedIn", []) or []) or "No fix available",
                "from": v.get("from", []) or [],
                "description": v.get("description", ""),
                "exploit": v.get("exploit"),
                "cvssSources": v.get("cvssSources", []) or [],
                "references": v.get("references", []) or [],
            })
    return findings


def count_severity(findings: list[dict]) -> dict:
    counts = {s: 0 for s in SEV_ORDER}
    for f in findings:
        sev = f.get("severity", "low")
        if sev in counts:
            counts[sev] += 1
    return counts


LEVEL_TO_SEV = {"error": "high", "warning": "medium", "note": "low"}


def extract_sast_findings(json_path: Path) -> list[dict]:
    data = load_json(json_path)
    if data is None:
        return []
    runs = data.get("runs") or []
    if not runs:
        return []
    run = runs[0]
    rules = {r.get("id"): r for r in run.get("tool", {}).get("driver", {}).get("rules", []) or []}
    findings = []
    for res in run.get("results", []) or []:
        rule = rules.get(res.get("ruleId"), {})
        props = res.get("properties", {}) or {}
        sev = (props.get("severity") or LEVEL_TO_SEV.get(res.get("level", "note"), "low")).lower()
        loc = ""
        try:
            pl = res["locations"][0]["physicalLocation"]
            loc = f'{pl["artifactLocation"]["uri"]}:{pl.get("region", {}).get("startLine", "")}'
        except Exception:
            pass
        h = rule.get("help", {}) or {}
        findings.append({
            "title": (rule.get("shortDescription", {}) or {}).get("text") or res.get("ruleId", ""),
            "severity": sev,
            "message": (res.get("message", {}) or {}).get("text", ""),
            "location": loc,
            "rule_id": res.get("ruleId", ""),
            "help": h.get("text") or h.get("markdown") or "",
        })
    return findings


GITLEAKS_RULES = {
    "generic-api-key": ("Generic secret: identifier contains key/token/secret/password with a high-entropy value.",
                        "Verify it is not a dummy value. If valid: rotate at the issuer, then load from an "
                        "environment variable / secret manager."),
    "jwt": ("JSON Web Token. A token that has not expired can be used directly as a bearer credential for the "
            "associated user/service (session hijacking).",
            "Revoke / invalidate the token (rotate the signing key if needed). Remove the file from the repo if "
            "it came from a DB dump or log."),
    "private-key": ("Private key (RSA/EC/SSH/PGP). Whoever holds the key can impersonate, decrypt, or sign on "
                    "behalf of its owner.",
                    "Generate a new key pair, revoke the old public key on the server/service, store the new key "
                    "in a secret manager / KMS."),
    "aws-access-token": ("AWS access key.", "Deactivate the key in AWS IAM, issue a new key, audit CloudTrail for "
                                            "suspicious activity."),
    "gcp-api-key": ("Google Cloud API key.", "Delete/regenerate the key in Google Cloud Console and apply API key "
                                             "restrictions (API, IP, referrer)."),
    "github-pat": ("GitHub personal access token.", "Revoke the token in GitHub Settings > Developer settings."),
    "gitlab-pat": ("GitLab personal access token.", "Revoke the token in GitLab > User Settings > Access Tokens."),
    "slack-webhook-url": ("Slack webhook URL.", "Regenerate the webhook URL in the Slack app configuration."),
    "stripe-access-token": ("Stripe API key.", "Roll the API key in the Stripe Dashboard."),
}


def extract_gitleaks_groups(json_path: Path) -> tuple[list[dict], int, dict]:
    """Group gitleaks findings per (file, rule), mirroring the reference parse_gitleaks()."""
    data = load_json(json_path)
    if not isinstance(data, list):
        return [], 0, {"temuan_mentah": 0, "commit": 0, "file_total": 0}
    grup, unik, commits = {}, set(), set()
    for x in data:
        if not isinstance(x, dict):
            continue
        f, rule, baris = x.get("File", ""), x.get("RuleID", ""), x.get("StartLine")
        unik.add((f, baris, rule))
        commits.add(x.get("Commit", ""))
        penjelasan, saran = GITLEAKS_RULES.get(rule, ("", ""))
        g = grup.setdefault((f, rule), {
            "file": f, "rule": rule, "desc": x.get("Description", ""), "baris": {},
            "contoh": x.get("Match", "REDACTED"), "entropy": 0.0,
            "penjelasan": penjelasan, "saran": saran,
        })
        g["entropy"] = max(g["entropy"], x.get("Entropy") or 0)
        g["baris"].setdefault(baris, []).append({
            "commit": x.get("Commit", ""), "author": x.get("Author", ""),
            "waktu": (x.get("Date") or "").replace("T", " ").replace("Z", "")[:16],
            "kolom": f'{x.get("StartColumn", "")}-{x.get("EndColumn", "")}',
            "message": (x.get("Message") or "").splitlines()[0] if x.get("Message") else "",
        })
    hasil = sorted(grup.values(), key=lambda g: (-len(g["baris"]), g["file"]))
    info = {"temuan_mentah": len(data), "commit": len(commits - {""}), "file_total": len({g["file"] for g in hasil})}
    return hasil, len(unik), info


TRIVY_CONTOH = {
    "DS-0001": "# Pin a version, not :latest\nFROM alpine:3.20",
    "DS-0002": "# Alpine:\nRUN addgroup -S app && adduser -S app -G app\nUSER app",
    "DS-0026": "HEALTHCHECK --interval=30s --timeout=5s --retries=3 \\\n"
               "  CMD curl -f http://localhost:<port>/health || exit 1",
}


def extract_trivy_findings(json_path: Path) -> tuple[list[dict], dict]:
    data = load_json(json_path)
    if not isinstance(data, dict) or "SchemaVersion" not in data:
        return [], {"target": [], "versi": "", "lolos": {}}
    out, target, lolos = [], [], {}
    for r in data.get("Results") or []:
        if r.get("Class") != "config":
            continue
        t = r.get("Target", "")
        ms = r.get("MisconfSummary") or {}
        target.append((t, ms.get("Successes", 0), ms.get("Failures", 0)))
        for m in r.get("Misconfigurations") or []:
            if m.get("Status") == "PASS":
                lolos.setdefault(t, []).append((m.get("ID", ""), m.get("Title", ""), (m.get("Severity") or "").lower()))
                continue
            if m.get("Status") != "FAIL":
                continue
            cm = m.get("CauseMetadata") or {}
            awal = cm.get("StartLine")
            akhir = cm.get("EndLine") or awal
            baris = (f"{awal}" + (f"-{akhir}" if akhir and akhir != awal else "")) if awal else ""
            awal_line, konten = None, ""
            kode = (cm.get("Code") or {}).get("Lines") or []
            if kode:
                awal_line = kode[0].get("Number")
                konten = kode[0].get("Content", "")
            out.append({
                "title": m.get("Title", ""),
                "severity": (m.get("Severity") or "low").lower(),
                "id": m.get("ID", ""),
                "location": t + (f":{baris}" if baris else " (file-level: applies to the whole file)"),
                "message": m.get("Message", ""),
                "description": m.get("Description", ""),
                "resolution": m.get("Resolution", ""),
                "contoh": TRIVY_CONTOH.get(m.get("ID", ""), ""),
                "refs": [u for u in (m.get("References") or [])],
                "snippet": f"{awal_line}: {konten}" if awal_line else "",
            })
    return out, {"target": target, "versi": (data.get("Trivy") or {}).get("Version", ""), "lolos": lolos}


# ============================================================
# DETAIL PDF builders (per-finding card style, matching the reference)
# ============================================================

def build_sca_pdf(findings, target, project, out_path):
    doc = SimpleDocTemplate(str(out_path), pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm,
                            topMargin=15 * mm, bottomMargin=15 * mm)
    story = []
    _doc_header(story, "Snyk Test - Dependency Vulnerability Scan (SCA)", target, project, findings)

    by_sev = {s: [] for s in SEV_ORDER}
    for f in findings:
        by_sev.setdefault(f["severity"], []).append(f)

    for sev in SEV_ORDER:
        group = by_sev.get(sev, [])
        if not group:
            continue
        story.append(Spacer(1, 4))
        header = Paragraph(f"{sev.upper()} ({len(group)})", S_SECHDR)
        for idx, it in enumerate(group):
            inner = [sev_badge(sev), Spacer(1, 4),
                     Paragraph(esc(it["title"]), S_ISSUE),
                     Paragraph(f"Package: <b>{esc(it['package'])}</b>", S_BODY),
                     Spacer(1, 3)]
            chips = []
            if it.get("cvss") is not None:
                chips.append(f"CVSS {esc(it['cvss'])}")
            if it.get("cve"):
                chips.append(esc(it["cve"]))
            if it.get("cwe"):
                chips.append(esc(it["cwe"]))
            if it.get("snyk_id"):
                chips.append(esc(it["snyk_id"]))
            if it.get("exploit"):
                chips.append("Exploit: " + esc(it["exploit"]))
            cr = chip_row(chips)
            if cr:
                inner += [cr, Spacer(1, 4)]
            inner.append(kv("Fixed in", it["fixedIn"]))
            if it.get("from"):
                inner.append(kv("Introduced through",
                                Paragraph(" &rarr; ".join(esc(x) for x in it["from"][:8]), S_MONO)))
            if it.get("cvssSources"):
                inner += [Spacer(1, 4), Paragraph("Security information", S_LABEL),
                          cvss_breakdown_flow(it["cvssSources"])]
            desc = md_to_text(it.get("description", ""))
            if desc:
                inner += [Spacer(1, 4), Paragraph("Overview", S_LABEL)]
                inner.extend(para_rows(desc, S_SMALL))
            refs = _refs([(r.get("title", "Reference"), r.get("url", "")) for r in it.get("references", [])
                          if r.get("url")])
            if refs:
                inner += [Spacer(1, 4), Paragraph("References", S_LABEL), refs]
            card = issue_card(inner, sev)
            story += _kartu_utuh([header, card] if idx == 0 else [card])
            story.append(Spacer(1, JARAK_KARTU))
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)


def build_sast_pdf(findings, target, project, out_path):
    doc = SimpleDocTemplate(str(out_path), pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm,
                            topMargin=15 * mm, bottomMargin=15 * mm)
    story = []
    _doc_header(story, "Snyk Code (SAST)", target, project, findings)

    by_sev = {s: [] for s in SEV_ORDER}
    for f in findings:
        by_sev.setdefault(f["severity"], []).append(f)

    for sev in SEV_ORDER:
        group = by_sev.get(sev, [])
        if not group:
            continue
        story.append(Spacer(1, 4))
        header = Paragraph(f"{sev.upper()} ({len(group)})", S_SECHDR)
        for idx, it in enumerate(group):
            inner = [sev_badge(sev), Spacer(1, 4), Paragraph(esc(it["title"]), S_ISSUE)]
            if it.get("location"):
                inner.append(kv("Location", Paragraph(esc(it["location"]), S_MONO)))
            if it.get("rule_id"):
                inner.append(kv("Rule", it["rule_id"]))
            if it.get("message"):
                inner += [Spacer(1, 3), Paragraph(esc(it["message"]), S_BODY)]
            if it.get("help"):
                inner += [Spacer(1, 4), Paragraph("Details", S_LABEL)]
                inner.extend(para_rows(md_to_text(it["help"]), S_SMALL))
            card = issue_card(inner, sev)
            story += _kartu_utuh([header, card] if idx == 0 else [card])
            story.append(Spacer(1, JARAK_KARTU))
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)


def cvss_breakdown_flow(sources):
    """Compact "Security information" table from cvssSources: one row per CVSS version/source."""
    rows = [[Paragraph("Version", S_LABEL), Paragraph("Score", S_LABEL),
             Paragraph("Severity", S_LABEL), Paragraph("Vector", S_LABEL)]]
    for s in sources[:4]:
        ver = f"CVSS {esc(s.get('cvssVersion', ''))}"
        rows.append([
            Paragraph(ver, S_SMALL),
            Paragraph(esc(s.get("baseScore", "")), S_SMALL),
            Paragraph(esc((s.get("severity") or "").capitalize()), S_SMALL),
            Paragraph(esc(s.get("vector", "")), S_MONO),
        ])
    t = Table(rows, colWidths=[55, 32, 52, None], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def _refs(refs):
    """refs: list of (title, url) tuples -> clickable "References" Paragraph, or None."""
    if not refs:
        return None
    return Paragraph("<br/>".join(f'&bull; <link href="{esc(u)}" color="#1D4ED8">{esc(t)}</link>'
                                  for t, u in refs), S_SMALL)


def _blok_kode(teks, style):
    t = Table([[p] for p in para_rows(esc(teks).replace(" ", "&nbsp;").replace("\n", "<br/>"), style)],
              hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F3F4F6")),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
    ]))
    return t


def _kotak_saran(butir):
    t = Table([[Paragraph("REMEDIATION", S_LABEL)]] +
              [[Paragraph(f"&bull; {b}", S_SMALL)] for b in butir], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF7ED")),
        ("LINEBEFORE", (0, 0), (0, -1), 3, colors.HexColor("#C2410C")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return t


def build_gitleaks_pdf(grup, jumlah, info, target, project, out_path):
    doc = SimpleDocTemplate(str(out_path), pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm,
                            topMargin=15 * mm, bottomMargin=15 * mm)
    width = A4[0] - 30 * mm
    story = [Paragraph("Gitleaks (Secret Scan)", S_TITLE),
             Paragraph(f"Target: {esc(target)}", S_SUB),
             Paragraph(f"Project: {esc(project)}", S_SUB),
             Paragraph(f'Secrets found: <font color="#DC2626"><b>{jumlah}</b></font> (deduplicated per file, '
                       f'line, and rule) &nbsp;&middot;&nbsp; across {info["file_total"]} file(s)', S_SUB),
             Spacer(1, 6),
             _info_scan([("Raw findings", info["temuan_mentah"]), ("Affected commits", info["commit"]),
                         ("Scope", "full git history"), ("Secret value", "redacted")]),
             HRFlowable(width="100%", color=LINE, spaceBefore=8, spaceAfter=4),
             Paragraph("Gitleaks scans <b>the entire git history</b> (all commits), not just HEAD. A secret that "
                       "was committed and later deleted is still stored in the git objects and can be retrieved by "
                       "anyone with read access to the repo. Secret values in this report are redacted.", S_SMALL),
             Spacer(1, 4),
             _kotak_saran([
                 "<b>Treat as compromised:</b> rotate / revoke the password, token, or key first. Removing it "
                 "from the repo alone is not enough.",
                 "<b>Remove from code:</b> load the secret from an environment variable or secret manager.",
                 "<b>Prevent recurrence:</b> add .env, DB dumps (*.sql), and credential files to .gitignore; "
                 "commit only a template (e.g. .env.example) with dummy values. Consider a pre-commit gitleaks hook.",
                 "<b>Purge history</b> (git filter-repo / BFG) if needed, coordinated with the team since it "
                 "rewrites git history (force push).",
             ])]

    # Column widths chosen so long file paths get the remaining width and wrap inside
    # their own column instead of overflowing into Rule/Count/Status.
    if grup:
        rows, warna = [], []
        for i, g in enumerate(grup, start=1):
            rows.append([Paragraph(esc(g["file"]), S_SELM), Paragraph(esc(g["rule"]), S_SEL),
                         Paragraph(f'<b>{len(g["baris"])}</b>', S_SEL),
                         Paragraph('<font color="#B91C1C"><b>FOUND</b></font>', S_SEL)])
            warna.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#FEF2F2")))
        story += [Spacer(1, 6), Paragraph("SUMMARY PER FILE", S_SECHDR),
                  _tabel(["File", "Rule", "Count", "Status"], rows,
                         [width - 110 - 45 - 80, 110, 45, 80], warna)]

    header = Paragraph(f"FINDING DETAILS ({len(grup)} file &times; rule)", S_SECHDR)
    story.append(Spacer(1, 4))
    for idx, g in enumerate(grup):
        inner = [_badge("SECRET", SEV_COLOR["high"]), Spacer(1, 4),
                 Paragraph(esc(g["file"]), S_ISSUE), Paragraph(esc(g["desc"]), S_BODY), Spacer(1, 3)]
        cr = chip_row([g["rule"], f'{len(g["baris"])} line(s)', f'Entropy {g["entropy"]:.2f}' if g["entropy"] else ""])
        if cr:
            inner += [cr, Spacer(1, 4)]
        inner.append(kv("Match (redacted)", Paragraph(esc(g["contoh"]), S_MONO)))
        if g["penjelasan"]:
            inner += [Spacer(1, 3), Paragraph("Description", S_LABEL), Paragraph(esc(g["penjelasan"]), S_SMALL)]
        if g["saran"]:
            inner += [Spacer(1, 3), Paragraph("Remediation", S_LABEL), Paragraph(esc(g["saran"]), S_SMALL)]
        MAKS = 15
        semua = sorted(g["baris"].items(), key=lambda x: x[0] or 0)
        rows = []
        for baris, cs in semua[:MAKS]:
            c = sorted(cs, key=lambda c: c["waktu"])[0]
            rows.append([Paragraph(f'{baris}:{c["kolom"]}', S_SELM), Paragraph(esc(c["commit"][:10]), S_SELM),
                         Paragraph(esc(c["author"]), S_SEL), Paragraph(esc(c["waktu"]), S_SEL),
                         Paragraph(esc(c["message"] if len(c["message"]) <= 60
                                       else c["message"][:57].rstrip(" -") + "..."), S_SEL)])
        # Column widths sum to the usable page width; "Commit message" column gets the
        # remainder so long messages wrap in their own cell instead of overlapping.
        inner += [Spacer(1, 4), Paragraph("Location &amp; first introducing commit", S_LABEL),
                  _tabel(["Line:column", "Commit", "Author", "Date (UTC)", "Commit message"], rows,
                         [58, 56, 64, 70, width - 58 - 56 - 64 - 70 - 26])]
        if len(semua) > MAKS:
            sisa = ", ".join(str(b) for b, _ in semua[MAKS:])
            inner += [Spacer(1, 3), Paragraph(f"<b>{len(semua) - MAKS} other line(s)</b> in the same file: "
                                              f'<font face="Courier">{esc(sisa)}</font>', S_SMALL)]
        pertama = min((c for cs in g["baris"].values() for c in cs), key=lambda c: c["waktu"])
        inner += [Spacer(1, 4), Paragraph("Investigate in repo", S_LABEL),
                  _blok_kode(f'git log --oneline -- "{g["file"]}"\n'
                             f'git show {pertama["commit"][:10]} -- "{g["file"]}"', S_MONO)]
        card = issue_card(inner, "high")
        story += _kartu_utuh([header, card] if idx == 0 else [card])
        story.append(Spacer(1, JARAK_KARTU))
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)


def build_trivy_pdf(findings, info, target, project, out_path):
    doc = SimpleDocTemplate(str(out_path), pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm,
                            topMargin=15 * mm, bottomMargin=15 * mm)
    width = A4[0] - 30 * mm
    story = []
    _doc_header(story, "Trivy (Misconfiguration Scan)", target, project, findings)
    total_lolos = sum(s for _, s, _ in info["target"])
    story.append(_info_scan([("Files scanned", len(info["target"])), ("Trivy version", info.get("versi")),
                             ("Checks passed", total_lolos), ("Checks failed", len(findings))]))
    if info["target"]:
        rows = [[Paragraph(esc(t), S_SELM), Paragraph(str(s), S_SEL),
                 Paragraph(f'<b>{f}</b>' if f else "0", S_SEL)] for t, s, f in info["target"]]
        story += [Spacer(1, 6), Paragraph("SCANNED FILES", S_SECHDR),
                  Paragraph("Trivy evaluates each Dockerfile against security best-practice checks "
                            "(policy-as-code). <b>Pass</b> = check satisfied, <b>Fail</b> = misconfiguration that "
                            "needs remediation.", S_SMALL), Spacer(1, 3),
                  _tabel(["File", "Pass", "Fail"], rows, [width - 60 - 60, 60, 60])]

    by_sev = {s: [] for s in SEV_ORDER}
    for f in findings:
        by_sev.setdefault(f["severity"], []).append(f)
    for sev in SEV_ORDER:
        group = by_sev.get(sev, [])
        if not group:
            continue
        story.append(Spacer(1, 4))
        header = Paragraph(f"{sev.upper()} ({len(group)})", S_SECHDR)
        for idx, it in enumerate(group):
            inner = [sev_badge(sev), Spacer(1, 4), Paragraph(esc(it["title"]), S_ISSUE)]
            if it.get("id"):
                inner.append(chip(it["id"]))
            inner.append(kv("Location", Paragraph(esc(it["location"]), S_MONO)))
            if it.get("snippet"):
                inner += [Spacer(1, 3), Paragraph("Code snippet", S_LABEL),
                          Paragraph(esc(it["snippet"]), S_MONO)]
            if it.get("message"):
                inner += [Spacer(1, 3), Paragraph("Finding", S_LABEL), Paragraph(esc(it["message"]), S_BODY)]
            desc = md_to_text(it.get("description", ""))
            if desc:
                inner += [Spacer(1, 4), Paragraph("Description", S_LABEL)]
                inner.extend(para_rows(desc, S_SMALL))
            if it.get("resolution"):
                inner += [Spacer(1, 3), Paragraph("Remediation", S_LABEL), Paragraph(esc(it["resolution"]), S_SMALL)]
            if it.get("contoh"):
                inner += [Spacer(1, 3), Paragraph("Remediation example", S_LABEL), _blok_kode(it["contoh"], S_MONO)]
            refs = _refs([("Reference", u) for u in it.get("refs", [])])
            if refs:
                inner += [Spacer(1, 3), Paragraph("References", S_LABEL), refs]
            card = issue_card(inner, sev)
            story += _kartu_utuh([header, card] if idx == 0 else [card])
            story.append(Spacer(1, JARAK_KARTU))

    if info.get("lolos"):
        for t, checks in info["lolos"].items():
            if not checks:
                continue
            rows = [[Paragraph(esc(cid), S_SELM), Paragraph(esc(title), S_SEL),
                     Paragraph(esc(sv.capitalize()), S_SEL)] for cid, title, sv in checks]
            story += [Spacer(1, 10), Paragraph(f"PASSED CHECKS &mdash; {esc(t)} ({len(checks)})", S_SECHDR),
                      _tabel(["ID", "Check", "Severity"], rows, [45, width - 45 - 60, 60])]
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)


# ============================================================
# SUMMARY PDF: severity cards + KETERANGAN legend + ISTILAH PER TOOL glossary
# ============================================================

def _stat_cards(total, width):
    cells, style = [], [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]
    gap = 8
    w = (width - 3 * gap) / 4
    widths = []
    for i, s in enumerate(SEV_ORDER):
        n = total[s]
        fg = SNYK_DARK[s] if n else ZERO_NUM_FG
        c = len(cells)
        cells.append(Paragraph(
            f'<font size="22" color="{fg}"><b>{n}</b></font><br/>'
            f'<font size="8.5" color="{fg}"><b>{s.upper()}</b></font>',
            ParagraphStyle("st" + s, parent=S_CELL, alignment=1, leading=24)))
        widths.append(w)
        style += [("BACKGROUND", (c, 0), (c, 0), colors.HexColor(SNYK_LIGHT[s] if n else ZERO_NUM_BG)),
                  ("LINEABOVE", (c, 0), (c, 0), 3, colors.HexColor(SNYK_DARK[s] if n else ZERO_LET_BG))]
        if i < 3:
            cells.append("")
            widths.append(gap)
    t = Table([cells], colWidths=widths, hAlign="LEFT")
    t.setStyle(TableStyle(style))
    return t


def _legend(width):
    """Scan type, status, and severity explanation ("KETERANGAN" / scope & remediation
    table, plus the SEVERITY / STATUS REPO legend boxes) for the 4 tools used here."""
    rows = [[Paragraph("JENIS SCAN", S_HCELL), Paragraph("SCOPE &amp; REMEDIATION", S_HCELL),
             Paragraph("COMMAND", S_HCELL)]]
    jenis = [
        ("SCA", "Software Composition Analysis: the dependency tree from the manifest/lockfile (package.json, "
                "pom.xml, etc.) is matched against a vulnerability database (CVE). <b>Remediation:</b> upgrade to "
                "the version in \"Fixed in\" after checking the upgrade path on snyk.io. For a <b>transitive "
                "dependency</b> (see \"Introduced through\"), upgrade the direct dependency that pulls it in. "
                "Pick the nearest safe version, check for breaking changes, then regression test. If there is no "
                "fix / it is not exploitable, mitigate or ignore with a documented justification.",
         "snyk test --all-projects"),
        ("SAST", "Static Application Security Testing: the source code is analyzed with data-flow / taint "
                 "analysis for vulnerability patterns (SQL injection, XSS, path traversal, hardcoded secrets). "
                 "<b>Remediation:</b> validate the source &rarr; sink data flow at the reported location (it can "
                 "be a false positive), then fix it, e.g. parameterized queries, input validation, output "
                 "encoding. If it is a false positive, ignore with a documented justification.",
         "snyk code test"),
        ("GITLEAKS", "Secret scanning (regex + entropy) for passwords, tokens, API keys, and private keys across "
                     "<b>the entire git history</b>, including commits that have since been removed from HEAD. "
                     "Secret values are redacted. <b>Remediation:</b> treat as compromised: rotate/revoke first, "
                     "then move the secret into an environment variable / secret manager.",
         "gitleaks git --redact"),
        ("TRIVY", "<i>Repos with a Dockerfile.</i> IaC misconfiguration scanning: the Dockerfile is evaluated "
                  "against security best-practice checks, e.g. container running as root, unpinned base image "
                  "(:latest), no HEALTHCHECK. <b>Remediation:</b> follow the \"Resolution\" on each finding.",
         "trivy config ."),
    ]
    for tipe, ket, cmd in jenis:
        rows.append([_type_label_full(tipe), Paragraph(ket, S_CELL), Paragraph(cmd, S_CMD)])
    t1 = Table(rows, colWidths=[80, width - 80 - 130, 130], hAlign="LEFT")
    t1.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), CHIP_BG),
        ("BOX", (0, 0), (-1, -1), 0.75, CARD_LINE),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))

    sev_rows = [[Paragraph("SEVERITY", S_HCELL), ""]]
    for s in SEV_ORDER:
        sev_rows.append([_single_badge(s), Paragraph(f"<b>{s.capitalize()}</b>", S_CELL)])
    st_rows = [[Paragraph("STATUS REPO", S_HCELL), ""]]
    S_ST = ParagraphStyle("st_leg", parent=S_CELL, fontSize=7.5, leading=9.5)
    status_leg = [
        (STATUS["fix"][0], STATUS_HEX["fix"], "There is a Critical/High/Medium finding, or a secret."),
        (STATUS["safe"][0], STATUS_HEX["safe"], "No Medium+ finding and no secret found."),
        (STATUS["failed"][0], STATUS_HEX["failed"], "A scan could not complete; coverage is incomplete, not proven safe."),
    ]
    for label, color, arti in status_leg:
        st_rows.append([_pill(label, color, 92), Paragraph(arti, S_ST)])
    half = (width - 10) / 2
    ts = Table(sev_rows, colWidths=[44, half - 44], hAlign="LEFT")
    tt = Table(st_rows, colWidths=[100, half - 100], hAlign="LEFT")
    for t in (ts, tt):
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), CHIP_BG), ("SPAN", (0, 0), (-1, 0)),
            ("BOX", (0, 0), (-1, -1), 0.75, CARD_LINE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
    t2 = Table([[ts, "", tt]], colWidths=[half, 10, half], hAlign="LEFT")
    t2.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                            ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                            ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    return [t1, Spacer(1, 6), t2]


def _istilah(width):
    """Glossary of terms/fields used in the detail PDFs, for SCA/SAST/GITLEAKS/TRIVY only."""
    data = [
        ("UMUM", "Severity (C / H / M / L)",
         "Critical / High / Medium / Low, umumnya diturunkan dari CVSS score atau rule severity. Status repo "
         "dan ringkasan .txt memakai threshold <b>Medium+</b>; Low tetap tercantum di PDF detail."),
        ("", "CVE / CWE",
         "<b>CVE</b> = identifier publik untuk satu vulnerability spesifik pada versi software tertentu. "
         "<b>CWE</b> = kategori weakness (mis. CWE-89 SQL Injection, CWE-22 Path Traversal, CWE-798 "
         "Hard-coded Credentials)."),
        ("", "False positive",
         "Finding yang tidak benar-benar exploitable di konteks aplikasi. Wajib divalidasi manual sebelum "
         "di-ignore, dan ignore harus disertai justifikasi."),
        ("SCA", "Introduced through",
         "Dependency path dari project ke vulnerable package. Path lebih dari satu level = <b>transitive "
         "dependency</b>; remediation dilakukan dengan upgrade <b>direct dependency</b> yang membawanya."),
        ("", "Fixed in",
         "Versi minimum package yang sudah mengandung patch. Kosong = no fix available (mitigasi atau ganti "
         "library)."),
        ("", "CVSS score / vector",
         "Base score 0.0&ndash;10.0 beserta vector string (AV, AC, PR, UI, S, C/I/A) dari standar CVSS v3.x/v4."),
        ("", "Exploit maturity",
         "Ketersediaan exploit publik: No Known Exploit, Proof of Concept, Functional, Mature. Makin mature, "
         "makin tinggi likelihood exploitation."),
        ("SAST", "Location / data flow",
         "File:line yang rentan dan taint flow <b>source &rarr; sink</b> (input tidak tepercaya mencapai "
         "operasi berbahaya tanpa sanitasi)."),
        ("", "Rule",
         "ID rule Snyk Code yang terpicu, mis. javascript/Sqli, go/PT (Path Traversal)."),
        ("GITLEAKS", "Masih ada di kode",
         "File berisi secret masih ada di HEAD branch yang di-scan. <b>Prioritaskan</b> (rotate + remove)."),
        ("", "Hanya di history",
         "File sudah dihapus dari HEAD, tapi secret masih bisa di-retrieve dari git history. <b>Tetap harus "
         "di-rotate.</b>"),
        ("", "Rule / Entropy",
         "<b>Rule</b> = detector yang cocok (mis. generic-api-key, private-key, jwt). <b>Entropy</b> = Shannon "
         "entropy nilai yang cocok; makin tinggi, makin mungkin secret asli (bukan placeholder)."),
        ("", "First introducing commit",
         "Commit, author, dan timestamp saat secret pertama kali masuk ke history, untuk investigasi dan "
         "menentukan exposure window."),
        ("TRIVY", "Pass / Fail",
         "Jumlah policy check Dockerfile yang terpenuhi (PASS) dan yang dilanggar (FAIL)."),
        ("", "Check ID (DS-xxxx)",
         "ID policy Trivy untuk Dockerfile, mis. DS-0001 unpinned :latest, DS-0002 run as root, DS-0026 tanpa "
         "HEALTHCHECK."),
        ("", "File-level finding",
         "Finding tanpa line number karena yang dilanggar adalah instruksi yang tidak didefinisikan (mis. USER, "
         "HEALTHCHECK)."),
    ]
    S_UMUM = ParagraphStyle("umum", parent=S_CELL, fontSize=7.5, textColor=INK_SOFT)

    def label(t):
        if not t:
            return ""
        return Paragraph("<b>SEMUA SCAN</b>", S_UMUM) if t == "UMUM" else _type_label_full(t)

    rows = [[label(t), Paragraph(f"<b>{i}</b>", S_CELL), Paragraph(a, S_CELL)] for t, i, a in data]
    return _tabel(["Jenis scan", "Istilah", "Arti"], rows, [90, 125, width - 90 - 125])


def _badges(counts):
    """Four [number][letter] badge pairs, like the Issues column on snyk.io (ported from
    the reference's _badges())."""
    cells, style = [], [
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]
    widths = []
    for i, s in enumerate(SEV_ORDER):
        n = counts.get(s, 0)
        num_bg = SNYK_LIGHT[s] if n else ZERO_NUM_BG
        num_fg = SNYK_DARK[s] if n else ZERO_NUM_FG
        let_bg = SNYK_DARK[s] if n else ZERO_LET_BG
        c = len(cells)
        cells += [Paragraph(f'<font color="{num_fg}">{n}</font>', S_NUM),
                  Paragraph(SEV_ABBR[s], S_PILL)]
        widths += [21, 13]
        style += [("BACKGROUND", (c, 0), (c, 0), colors.HexColor(num_bg)),
                  ("BACKGROUND", (c + 1, 0), (c + 1, 0), colors.HexColor(let_bg))]
        if i < 3:
            cells.append("")
            widths.append(4)
    t = Table([cells], colWidths=widths, hAlign="RIGHT")
    t.setStyle(TableStyle(style))
    return t


def _type_label_full(tipe):
    """Colored tool pill + its Snyk product / local-scan sub-label underneath (ported
    from the reference's _type_label())."""
    label, color = TYPE_INFO.get(tipe, (tipe, "#52606D"))
    sub = TYPE_SUBLABEL.get(tipe, "local scan")
    return Table([[_pill(label, color, 64)],
                  [Paragraph(f'<font color="#52606D" size="6.5">{sub}</font>', S_CELL)]],
                 style=[("LEFTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 0),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 0)], hAlign="LEFT")


def _status_text(status_key, failed_reasons):
    """Plain status label text, matching the reference's wording: "PERLU DIPERBAIKI",
    "AMAN", or "GAGAL: <tool, tool>" when the status itself is "failed"."""
    if status_key == "failed" and failed_reasons:
        return "GAGAL: " + ", ".join(r.upper() for r in failed_reasons)
    return STATUS[status_key][0]


def _status_badge(status_key, failed_reasons, width):
    """Status pill for the per-repo card: two-tone (main status on top, "Gagal: ..." below)
    when there are findings AND a separate scan failed, a single pill otherwise -- ported
    from the reference's _status_badge()/_status_pill()."""
    label = _status_text(status_key, failed_reasons)
    if status_key == "fix" and failed_reasons:
        return _pill2(label, STATUS_HEX["fix"], "Gagal: " + ", ".join(r.upper() for r in failed_reasons),
                      STATUS_HEX["failed"], width)
    return _pill(label, STATUS_HEX[status_key], width)


def _target_card(target_label, branch, status_key, failed_reasons, total, tool_rows, width):
    """Per-repo/branch status card (ported from the reference's _target_block()): a header
    bar with the repo name, branch, status pill, and total severity badges, followed by one
    row per tool that ran (SCA/SAST/GITLEAKS/TRIVY), each with its own severity/secret count.

    tool_rows: list of (tipe, project_name, counts) where counts is either a severity dict
    (SCA/SAST/TRIVY) or {"secret": N} (GITLEAKS).
    """
    status_hex = STATUS_HEX[status_key]
    judul = esc(target_label)
    if branch:
        judul += f' <font color="#52606D" size="8.5" face="Helvetica">&nbsp;branch: {esc(branch)}</font>'
    pill_w, type_w, pad = 92, 78, 7
    badge_col = BADGES_W + 2 * pad
    mid_w = width - type_w - badge_col
    judul_w = type_w + mid_w - 2 * pad
    header = Table([[Paragraph(judul, S_TGT), _status_badge(status_key, failed_reasons, pill_w)]],
                   colWidths=[judul_w - pill_w, pill_w],
                   style=[("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                          ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                          ("VALIGN", (0, 0), (-1, -1), "MIDDLE")])
    rows = [[header, "", _badges(total)],
            [Paragraph("JENIS SCAN", S_HCELL), Paragraph("PROJECT", S_HCELL),
             Paragraph("ISSUES", ParagraphStyle("hi", parent=S_HCELL, alignment=2))]]
    style = [
        ("SPAN", (0, 0), (1, 0)),
        ("BACKGROUND", (0, 0), (-1, 0), CHIP_BG),
        ("LINEBEFORE", (0, 0), (0, -1), 3, colors.HexColor(status_hex)),
        ("LINEBELOW", (0, 1), (-1, 1), 0.5, LINE),
        ("BOX", (0, 0), (-1, -1), 0.75, CARD_LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), pad), ("RIGHTPADDING", (0, 0), (-1, -1), pad),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, 0), 7), ("BOTTOMPADDING", (0, 0), (-1, 0), 7),
    ]
    for tipe, proj, counts in tool_rows:
        if tipe == "GITLEAKS":
            n = counts.get("secret", 0)
            kanan = Paragraph(f'<font color="{WARNA_SECRET if n else STATUS_HEX["safe"]}"><b>{n} Secret</b></font>',
                              ParagraphStyle("glk", parent=S_CELL, alignment=2))
        else:
            kanan = _badges(counts)
        rows.append([_type_label_full(tipe), Paragraph(esc(proj), S_CELL), kanan])
        style.append(("LINEBELOW", (0, len(rows) - 1), (-1, len(rows) - 1), 0.25, LINE))
    t = Table(rows, colWidths=[type_w, mid_w, badge_col], hAlign="LEFT")
    t.setStyle(TableStyle(style))
    return t


def build_summary_pdf(out_path: Path, run_name: str, target: str, branch: str,
                       total: dict, status_key: str, failed_reasons: list[str],
                       tool_rows: list[tuple]):
    width = A4[0] - 30 * mm
    doc = SimpleDocTemplate(str(out_path), pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm,
                            topMargin=15 * mm, bottomMargin=15 * mm, title="Security Scan Summary")

    status_hex = STATUS_HEX[status_key]
    status_line = f'Status: <font color="{status_hex}"><b>{esc(_status_text(status_key, failed_reasons))}</b></font>'
    if status_key == "fix" and failed_reasons:
        status_line += (f' &nbsp;&middot;&nbsp; <font color="{STATUS_HEX["failed"]}">Gagal: '
                        f'{esc(", ".join(r.upper() for r in failed_reasons))}</font>')

    story = [
        Paragraph("Security Scan Summary", S_TITLE),
        Paragraph(f"Target: <b>{esc(target)}</b> &nbsp;&middot;&nbsp; branch: <b>{esc(branch)}</b>", S_SUB),
        Paragraph(f"Scan run: {esc(run_name)}", S_SUB),
        Paragraph(status_line, S_SUB),
        Spacer(1, 16), _stat_cards(total, width), Spacer(1, 10),
        Paragraph("KETERANGAN", S_CAT), *_legend(width),
        PageBreak(),
        Paragraph("ISTILAH PER TOOL", S_CAT),
        Paragraph("Glossary istilah dan field yang muncul di PDF detail tiap jenis scan.", S_SMALL),
        Spacer(1, 4), _istilah(width),
        PageBreak(),
        _target_card(target, branch, status_key, failed_reasons, total, tool_rows, width),
    ]
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)


# ============================================================
# Main
# ============================================================

def main() -> int:
    parser = argparse.ArgumentParser(description="Generate PDF evidence from scan_orangehrm.py JSON output.")
    parser.add_argument("--scan-folder", default=None, help="Specific scan folder to render (default: most recent).")
    args = parser.parse_args()

    scan_folder = Path(args.scan_folder) if args.scan_folder else find_latest_scan_folder(FOLDER_SCAN)
    if not scan_folder or not scan_folder.exists():
        print(f"[ERROR] Scan folder not found. Looked under: {FOLDER_SCAN}")
        print("Run scan_orangehrm.py first, or pass --scan-folder explicitly.")
        return 1

    run_name = scan_folder.name
    print(f"Reading scan evidence from: {scan_folder}")

    repo_dirs = [p for p in scan_folder.iterdir() if p.is_dir() and p.name.startswith("orangehrm")]
    if not repo_dirs:
        print(f"[ERROR] No 'orangehrm (<branch>)' folder found inside {scan_folder}")
        return 1
    repo_dir = repo_dirs[0]
    branch = repo_dir.name.split("(", 1)[1].rstrip(")") if "(" in repo_dir.name else "unknown"
    target = "orangehrm/orangehrm"
    project = "orangehrm"

    status_path = repo_dir / "snyk_status.json"
    status = {}
    if status_path.exists():
        try:
            status = json.loads(status_path.read_text(encoding="utf-8"))
        except Exception:
            status = {}

    pdf_run_dir = FOLDER_OUTPUT / run_name
    pdf_repo_dir = pdf_run_dir / "orangehrm" / branch
    pdf_repo_dir.mkdir(parents=True, exist_ok=True)

    total = {s: 0 for s in SEV_ORDER}
    failed_reasons = []
    has_findings = False
    tool_rows = []

    # --- SCA ---
    sca_json = repo_dir / "snyk_sca_result.json"
    sca_findings = extract_sca_findings(sca_json)
    sev_sca = count_severity(sca_findings)
    for s in SEV_ORDER:
        total[s] += sev_sca[s]
    if sev_sca["critical"] or sev_sca["high"] or sev_sca["medium"]:
        has_findings = True
    if status.get("scaReason"):
        failed_reasons.append("SCA")
    tool_rows.append(("SCA", project, sev_sca))
    if sca_findings:
        out = pdf_repo_dir / "orangehrm_SCA.pdf"
        build_sca_pdf(sca_findings, f"{target} ({branch})", project, out)
        print(f"  Wrote {out}")
    else:
        print("  SCA: no findings, no detail PDF generated.")

    # --- SAST ---
    sast_json = repo_dir / "snyk_sast_result.json"
    sast_findings = extract_sast_findings(sast_json)
    sev_sast = count_severity(sast_findings)
    for s in SEV_ORDER:
        total[s] += sev_sast[s]
    if sev_sast["critical"] or sev_sast["high"] or sev_sast["medium"]:
        has_findings = True
    if status.get("sastReason"):
        failed_reasons.append("SAST")
    tool_rows.append(("SAST", project, sev_sast))
    if sast_findings:
        out = pdf_repo_dir / "orangehrm_SAST.pdf"
        build_sast_pdf(sast_findings, f"{target} ({branch})", project, out)
        print(f"  Wrote {out}")
    else:
        print("  SAST: no findings, no detail PDF generated.")

    # --- Gitleaks ---
    gitleaks_json = repo_dir / "gitleaks_result.json"
    gitleaks_groups, secret_count, gitleaks_info = extract_gitleaks_groups(gitleaks_json)
    if secret_count:
        has_findings = True
    if status.get("gitleaksReason"):
        failed_reasons.append("Gitleaks")
    tool_rows.append(("GITLEAKS", project, {"secret": secret_count or 0}))
    if gitleaks_groups:
        out = pdf_repo_dir / "orangehrm_gitleaks.pdf"
        build_gitleaks_pdf(gitleaks_groups, secret_count, gitleaks_info, f"{target} ({branch})", project, out)
        print(f"  Wrote {out}")
    else:
        print("  Gitleaks: no findings, no detail PDF generated.")

    # --- Trivy (only if Dockerfile applicable) ---
    has_dockerfile = status.get("trivyApplicable", False)
    if has_dockerfile:
        trivy_json = repo_dir / "trivy_result.json"
        trivy_findings, trivy_info = extract_trivy_findings(trivy_json)
        sev_trivy = count_severity(trivy_findings)
        for s in SEV_ORDER:
            total[s] += sev_trivy[s]
        if sev_trivy["critical"] or sev_trivy["high"] or sev_trivy["medium"]:
            has_findings = True
        if status.get("trivyReason"):
            failed_reasons.append("Trivy")
        tool_rows.append(("TRIVY", project, sev_trivy))
        if trivy_findings:
            out = pdf_repo_dir / "orangehrm_trivy.pdf"
            build_trivy_pdf(trivy_findings, trivy_info, f"{target} ({branch})", project, out)
            print(f"  Wrote {out}")
        else:
            print("  Trivy: no findings, no detail PDF generated.")
    else:
        print("  Trivy: not applicable (no Dockerfile in repo).")

    # --- Summary PDF ---
    if has_findings:
        status_key = "fix"
    elif failed_reasons:
        status_key = "failed"
    else:
        status_key = "safe"

    summary_pdf = pdf_run_dir / f"RINGKASAN_{run_name}.pdf"
    build_summary_pdf(summary_pdf, run_name, target, branch, total, status_key, failed_reasons, tool_rows)
    print(f"\nWrote summary: {summary_pdf}")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
