#!/usr/bin/env python3
"""
generate_report.py - Step 2: turn the JSON evidence written by
scan_orangehrm.py into PDF evidence (reportlab), one summary PDF plus
one detail PDF per tool that had findings.

Simplified, single-repo version of the reference PDF generator: no
category grouping, no multi-repo comparison logic.

Usage:
    python generate_report.py
    python generate_report.py --scan-folder "...\\security\\evidence\\json\\20261106 (1)"
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
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

STATUS = {
    "fix": ("NEEDS ATTENTION", colors.HexColor("#DC2626")),
    "safe": ("SAFE", colors.HexColor("#15803D")),
    "failed": ("FAILED", colors.HexColor("#64748B")),
}

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=18, spaceAfter=10)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13, spaceAfter=6)
BODY = ParagraphStyle("Body", parent=styles["Normal"], fontSize=9.5, leading=13, alignment=TA_LEFT)
MONO = ParagraphStyle("Mono", parent=styles["Normal"], fontName="Courier", fontSize=8, leading=11)
SMALL = ParagraphStyle("Small", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#555555"))


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
# Severity helpers
# ============================================================

def count_severity_from_snyk_test(json_path: Path) -> dict:
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    if not json_path.exists() or json_path.stat().st_size == 0:
        return counts
    try:
        data = json.loads(json_path.read_text(encoding="utf-8", errors="replace"))
        projects = data if isinstance(data, list) else [data]
        seen = set()
        for p in projects:
            for v in (p or {}).get("vulnerabilities", []) or []:
                vid = v.get("id") or f"{v.get('title')}|{v.get('packageName')}|{v.get('version')}"
                if vid in seen:
                    continue
                seen.add(vid)
                sev = v.get("severity")
                if sev in counts:
                    counts[sev] += 1
    except Exception:
        pass
    return counts


def extract_sca_findings(json_path: Path) -> list[dict]:
    findings = []
    if not json_path.exists() or json_path.stat().st_size == 0:
        return findings
    try:
        data = json.loads(json_path.read_text(encoding="utf-8", errors="replace"))
        projects = data if isinstance(data, list) else [data]
        seen = set()
        for p in projects:
            for v in (p or {}).get("vulnerabilities", []) or []:
                vid = v.get("id") or f"{v.get('title')}|{v.get('packageName')}|{v.get('version')}"
                if vid in seen:
                    continue
                seen.add(vid)
                findings.append({
                    "id": v.get("id", ""),
                    "title": v.get("title", ""),
                    "severity": v.get("severity", ""),
                    "package": v.get("packageName", ""),
                    "version": v.get("version", ""),
                    "cve": ", ".join(v.get("identifiers", {}).get("CVE", [])) if v.get("identifiers") else "",
                })
    except Exception:
        pass
    return findings


def count_severity_from_snyk_code(json_path: Path) -> dict:
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    if not json_path.exists() or json_path.stat().st_size == 0:
        return counts
    try:
        data = json.loads(json_path.read_text(encoding="utf-8", errors="replace"))
        runs = data.get("runs")
        if runs:
            for issue in runs[0].get("results", []) or []:
                level = issue.get("level")
                if level == "error":
                    counts["high"] += 1
                elif level == "warning":
                    counts["medium"] += 1
                else:
                    counts["low"] += 1
    except Exception:
        pass
    return counts


def extract_sast_findings(json_path: Path) -> list[dict]:
    findings = []
    if not json_path.exists() or json_path.stat().st_size == 0:
        return findings
    try:
        data = json.loads(json_path.read_text(encoding="utf-8", errors="replace"))
        runs = data.get("runs")
        if not runs:
            return findings
        rules = {r.get("id"): r for r in runs[0].get("tool", {}).get("driver", {}).get("rules", []) or []}
        for issue in runs[0].get("results", []) or []:
            level = issue.get("level")
            severity = {"error": "high", "warning": "medium", "note": "low"}.get(level, "low")
            loc = (issue.get("locations") or [{}])[0].get("physicalLocation", {})
            path = loc.get("artifactLocation", {}).get("uri", "")
            line = loc.get("region", {}).get("startLine", "")
            rule = rules.get(issue.get("ruleId"), {})
            findings.append({
                "ruleId": issue.get("ruleId", ""),
                "severity": severity,
                "message": (issue.get("message", {}) or {}).get("text", ""),
                "file": path,
                "line": line,
                "name": rule.get("name", issue.get("ruleId", "")),
            })
    except Exception:
        pass
    return findings


def extract_gitleaks_findings(json_path: Path) -> list[dict]:
    findings = []
    if not json_path.exists():
        return findings
    try:
        raw = json_path.read_text(encoding="utf-8", errors="replace")
        if not raw.strip():
            return findings
        data = json.loads(raw)
        seen = set()
        for x in data or []:
            key = (x.get("File"), x.get("StartLine"), x.get("RuleID"))
            if key in seen:
                continue
            seen.add(key)
            findings.append({
                "file": x.get("File", ""),
                "line": x.get("StartLine", ""),
                "rule": x.get("RuleID", ""),
                "commit": (x.get("Commit") or "")[:10],
                "secret": x.get("Secret", "REDACTED"),  # already --redact'ed by gitleaks itself
            })
    except Exception:
        pass
    return findings


def extract_trivy_findings(json_path: Path) -> list[dict]:
    findings = []
    if not json_path.exists():
        return findings
    try:
        data = json.loads(json_path.read_text(encoding="utf-8", errors="replace"))
        for r in data.get("Results", []) or []:
            if r.get("Class") != "config":
                continue
            target = r.get("Target", "")
            for m in r.get("Misconfigurations", []) or []:
                if m.get("Status") != "FAIL":
                    continue
                findings.append({
                    "target": target,
                    "id": m.get("ID", ""),
                    "title": m.get("Title", ""),
                    "severity": (m.get("Severity") or "").lower(),
                    "message": m.get("Message", ""),
                })
    except Exception:
        pass
    return findings


def severity_badge_text(sev: dict) -> str:
    parts = []
    if sev.get("critical"): parts.append(f"{sev['critical']}C")
    if sev.get("high"): parts.append(f"{sev['high']}H")
    if sev.get("medium"): parts.append(f"{sev['medium']}M")
    if sev.get("low"): parts.append(f"{sev['low']}L")
    return " ".join(parts) if parts else "0"


SEV_COLOR = {
    "critical": colors.HexColor("#7F1D1D"),
    "high": colors.HexColor("#DC2626"),
    "medium": colors.HexColor("#D97706"),
    "low": colors.HexColor("#65A30D"),
}


# ============================================================
# PDF builders
# ============================================================

def build_findings_table(rows: list[list[str]], header: list[str], col_widths=None) -> Table:
    data = [header] + rows
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F2937")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F5F5")]),
    ]))
    return t


def build_tool_pdf(out_path: Path, title: str, subtitle: str, header: list[str], rows: list[list[str]], col_widths=None, note: str | None = None):
    doc = SimpleDocTemplate(str(out_path), pagesize=A4,
                             leftMargin=15 * mm, rightMargin=15 * mm,
                             topMargin=15 * mm, bottomMargin=15 * mm)
    elements = [Paragraph(title, H1), Paragraph(subtitle, SMALL), Spacer(1, 8)]
    if note:
        elements.append(Paragraph(note, BODY))
        elements.append(Spacer(1, 6))
    elements.append(build_findings_table(rows, header, col_widths))
    doc.build(elements)


def build_summary_pdf(out_path: Path, run_name: str, branch: str,
                       sev_sca, sev_sast, secret_count, sev_trivy, has_dockerfile,
                       status: dict, generated_pdfs: dict):
    doc = SimpleDocTemplate(str(out_path), pagesize=A4,
                             leftMargin=15 * mm, rightMargin=15 * mm,
                             topMargin=15 * mm, bottomMargin=15 * mm)
    elements = []
    elements.append(Paragraph("Security Scan Summary", H1))
    elements.append(Paragraph(f"OrangeHRM (orangehrm/orangehrm) &mdash; branch: {branch}", BODY))
    elements.append(Paragraph(f"Scan run: {run_name}", SMALL))
    elements.append(Spacer(1, 10))

    # overall status badge
    has_findings = bool(
        (sev_sca and (sev_sca.get("critical") or sev_sca.get("high") or sev_sca.get("medium"))) or
        (sev_sast and (sev_sast.get("critical") or sev_sast.get("high") or sev_sast.get("medium"))) or
        secret_count or
        (sev_trivy and (sev_trivy.get("critical") or sev_trivy.get("high") or sev_trivy.get("medium")))
    )
    any_failed = any([status.get("scaReason"), status.get("sastReason"), status.get("gitleaksReason"),
                       status.get("trivyReason")])
    if has_findings:
        badge_text, badge_color = STATUS["fix"]
    elif any_failed:
        badge_text, badge_color = STATUS["failed"]
    else:
        badge_text, badge_color = STATUS["safe"]
    if has_findings and any_failed:
        badge_text += " (some scans failed)"

    badge_table = Table([[badge_text]], colWidths=[90 * mm])
    badge_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), badge_color),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(badge_table)
    elements.append(Spacer(1, 14))

    def row_for(name, sev_or_count, applicable, reason, pdf_key):
        if reason:
            result_text = "FAILED"
        elif not applicable:
            result_text = "-"
        elif isinstance(sev_or_count, dict):
            result_text = severity_badge_text(sev_or_count)
        elif sev_or_count is None:
            result_text = "0"
        else:
            result_text = f"{sev_or_count} secret(s)" if sev_or_count else "0"
        pdf_note = generated_pdfs.get(pdf_key, "-")
        return [name, result_text, reason or "-", pdf_note]

    rows = [
        row_for("SCA (snyk test)", sev_sca, True, status.get("scaReason"), "sca"),
        row_for("SAST (snyk code test)", sev_sast, True, status.get("sastReason"), "sast"),
        row_for("Secrets (gitleaks)", secret_count, True, status.get("gitleaksReason"), "gitleaks"),
        row_for("Trivy config (Dockerfile)", sev_trivy, has_dockerfile, status.get("trivyReason"), "trivy"),
    ]
    header = ["Scan type", "Result (C/H/M/L)", "Failure reason", "Detail PDF"]
    elements.append(build_findings_table(rows, header, col_widths=[55 * mm, 35 * mm, 60 * mm, 30 * mm]))
    elements.append(Spacer(1, 14))

    elements.append(Paragraph("How to read this", H2))
    elements.append(Paragraph(
        "NEEDS ATTENTION = findings at Medium severity or above (or secrets) exist in at least one scan. "
        "SAFE = all applicable scans completed with no Medium+ findings and no secrets. "
        "FAILED = a scan could not complete; this does NOT mean the code is safe, it means that aspect "
        "was not actually checked. '-' means the scan was not applicable (e.g. no Dockerfile for Trivy).",
        BODY,
    ))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(
        "Dependency CVEs shown here (SCA) are already public in the NVD/CVE databases; Snyk only "
        "surfaces information that is already public. No exploit-level detail is included for any "
        "unpatched critical finding.",
        SMALL,
    ))

    if status.get("gitWarning"):
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(f"Note: {status['gitWarning']}", SMALL))

    doc.build(elements)


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

    generated_pdfs = {}

    # --- SCA ---
    sca_json = repo_dir / "snyk_sca_result.json"
    sev_sca = count_severity_from_snyk_test(sca_json)
    sca_findings = extract_sca_findings(sca_json)
    if sca_findings:
        rows = [[f["severity"].upper(), f["title"][:60], f["package"], f["version"], f["cve"][:40]] for f in sca_findings]
        out = pdf_repo_dir / "orangehrm_SCA.pdf"
        build_tool_pdf(
            out, "Snyk Test - Dependency Vulnerability Scan (SCA)",
            f"orangehrm/orangehrm ({branch}) &mdash; {len(sca_findings)} finding(s)",
            ["Severity", "Title", "Package", "Version", "CVE"], rows,
            col_widths=[22 * mm, 60 * mm, 38 * mm, 25 * mm, 35 * mm],
        )
        generated_pdfs["sca"] = out.name
        print(f"  Wrote {out}")
    else:
        print("  SCA: no findings, no detail PDF generated.")

    # --- SAST ---
    sast_json = repo_dir / "snyk_sast_result.json"
    sev_sast = count_severity_from_snyk_code(sast_json)
    sast_findings = extract_sast_findings(sast_json)
    if sast_findings:
        rows = [[f["severity"].upper(), f["name"][:40], f["file"][:45], str(f["line"]), f["message"][:60]] for f in sast_findings]
        out = pdf_repo_dir / "orangehrm_SAST.pdf"
        build_tool_pdf(
            out, "Snyk Code - Static Code Analysis (SAST)",
            f"orangehrm/orangehrm ({branch}) &mdash; {len(sast_findings)} finding(s)",
            ["Severity", "Rule", "File", "Line", "Message"], rows,
            col_widths=[18 * mm, 35 * mm, 50 * mm, 12 * mm, 65 * mm],
        )
        generated_pdfs["sast"] = out.name
        print(f"  Wrote {out}")
    else:
        print("  SAST: no findings, no detail PDF generated.")

    # --- Gitleaks ---
    gitleaks_json = repo_dir / "gitleaks_result.json"
    gitleaks_findings = extract_gitleaks_findings(gitleaks_json)
    secret_count = len(gitleaks_findings) if gitleaks_json.exists() else None
    if gitleaks_findings:
        rows = [[f["file"][:50], str(f["line"]), f["rule"], f["commit"], "REDACTED"] for f in gitleaks_findings]
        out = pdf_repo_dir / "orangehrm_gitleaks.pdf"
        build_tool_pdf(
            out, "Gitleaks - Secret Scan (full git history)",
            f"orangehrm/orangehrm ({branch}) &mdash; {len(gitleaks_findings)} secret(s) found",
            ["File", "Line", "Rule", "Commit", "Value"], rows,
            col_widths=[55 * mm, 12 * mm, 30 * mm, 20 * mm, 30 * mm],
            note="Secret values are always redacted (gitleaks --redact). Any secret found, even if only "
                 "in git history, must be rotated - deleting it from the current code is not enough.",
        )
        generated_pdfs["gitleaks"] = out.name
        print(f"  Wrote {out}")
    else:
        print("  Gitleaks: no findings, no detail PDF generated.")

    # --- Trivy (only if Dockerfile applicable) ---
    has_dockerfile = status.get("trivyApplicable", False)
    sev_trivy = None
    if has_dockerfile:
        trivy_json = repo_dir / "trivy_result.json"
        trivy_findings = extract_trivy_findings(trivy_json)
        if trivy_json.exists():
            try:
                data = json.loads(trivy_json.read_text(encoding="utf-8", errors="replace"))
                sev_trivy = {"critical": 0, "high": 0, "medium": 0, "low": 0}
                for r in data.get("Results", []) or []:
                    if r.get("Class") != "config":
                        continue
                    for m in r.get("Misconfigurations", []) or []:
                        if m.get("Status") == "FAIL":
                            sev = (m.get("Severity") or "").lower()
                            if sev in sev_trivy:
                                sev_trivy[sev] += 1
            except Exception:
                sev_trivy = None
        if trivy_findings:
            rows = [[f["severity"].upper(), f["id"], f["title"][:45], f["target"][:30], f["message"][:50]] for f in trivy_findings]
            out = pdf_repo_dir / "orangehrm_trivy.pdf"
            build_tool_pdf(
                out, "Trivy - Dockerfile Misconfiguration Scan",
                f"orangehrm/orangehrm ({branch}) &mdash; {len(trivy_findings)} finding(s)",
                ["Severity", "ID", "Title", "File", "Message"], rows,
                col_widths=[18 * mm, 25 * mm, 40 * mm, 30 * mm, 47 * mm],
            )
            generated_pdfs["trivy"] = out.name
            print(f"  Wrote {out}")
        else:
            print("  Trivy: no findings, no detail PDF generated.")
    else:
        print("  Trivy: not applicable (no Dockerfile in repo).")

    # --- Summary PDF ---
    summary_pdf = pdf_run_dir / f"RINGKASAN_{run_name}.pdf"
    build_summary_pdf(summary_pdf, run_name, branch, sev_sca, sev_sast, secret_count, sev_trivy,
                       has_dockerfile, status, generated_pdfs)
    print(f"\nWrote summary: {summary_pdf}")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
