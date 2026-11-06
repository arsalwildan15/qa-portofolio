#!/usr/bin/env python3
"""
scan_orangehrm.py - Step 1: source-code-level security scan of OrangeHRM's
own open-source repository (github.com/orangehrm/orangehrm).

This is a SIMPLIFIED, SINGLE-REPO, PYTHON-ONLY toolchain. It is intentionally
scoped to four tools only:

    - snyk test        (SCA  - dependency vulnerabilities)
    - snyk code test   (SAST - static code analysis)
    - gitleaks git      (secret scanning, full git history, --redact)
    - trivy config      (Dockerfile misconfiguration, only if a Dockerfile exists)

`composer audit` and Semgrep are deliberately NOT included (narrower scope,
by design). `snyk monitor` is also NOT called (no dashboard snapshot needed
for a one-off portfolio scan).

Usage:
    python scan_orangehrm.py
    python scan_orangehrm.py --repo-path "C:\\Users\\IT PDN\\orangehrm" --branch main

Requires SNYK_TOKEN to be set as an environment variable (never hardcode it).
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    import psutil
except ImportError:
    psutil = None  # degrade gracefully; process-tree kill becomes best-effort


# ============================================================
# CONFIG - the only section you normally need to change
# ============================================================

# Where the OrangeHRM source is cloned to. Deliberately OUTSIDE qa-portofolio
# (this repo), mirroring the reference toolchain's "C:\Users\IT PDN\<repo>"
# clone convention. Override with --repo-path.
DEFAULT_REPO_PATH = r"C:\Users\IT PDN\orangehrm"

DEFAULT_REPO_URL = "https://github.com/orangehrm/orangehrm.git"

# OrangeHRM's actual default branch (verified via `git ls-remote --symref`).
# Override with --branch.
DEFAULT_BRANCH = "main"

# This script lives in qa-portofolio/security/scripts/ - evidence goes to
# qa-portofolio/security/evidence/json/<yyyyMMdd (n)>/
SCRIPT_DIR = Path(__file__).resolve().parent
SECURITY_DIR = SCRIPT_DIR.parent
EVIDENCE_JSON_ROOT = SECURITY_DIR / "evidence" / "json"

TIMEOUT_SECONDS = 600  # 10 minutes per tool call, matching the reference


# ============================================================
# Process execution with hard timeout + process-tree kill
# ============================================================

def _kill_process_tree(pid: int) -> None:
    """Kill a process and all its children. Best-effort without psutil."""
    if psutil is not None:
        try:
            parent = psutil.Process(pid)
            children = parent.children(recursive=True)
            for child in children:
                try:
                    child.kill()
                except psutil.NoSuchProcess:
                    pass
            try:
                parent.kill()
            except psutil.NoSuchProcess:
                pass
        except psutil.NoSuchProcess:
            pass
    else:
        # Fallback: kill only the direct process. On Windows this may leave
        # orphaned children, but it's better than hanging forever.
        try:
            if os.name == "nt":
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(pid)],
                    capture_output=True,
                    timeout=15,
                )
            else:
                os.kill(pid, 9)
        except Exception:
            pass


def run_tool(
    args: list[str],
    cwd: str | Path,
    timeout: int = TIMEOUT_SECONDS,
    env: dict | None = None,
) -> dict:
    """
    Run a tool with a hard timeout. Returns dict with:
        ok, exit_code, stdout, stderr, timed_out, reason
    Never raises on tool failure/timeout - the caller decides how to record it.
    """
    full_env = os.environ.copy()
    if env:
        full_env.update(env)

    try:
        proc = subprocess.Popen(
            args,
            cwd=str(cwd),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.DEVNULL,
            env=full_env,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except FileNotFoundError as e:
        return {
            "ok": False,
            "exit_code": None,
            "stdout": "",
            "stderr": str(e),
            "timed_out": False,
            "reason": f"tool not found / cannot be invoked: {e}",
        }
    except Exception as e:
        return {
            "ok": False,
            "exit_code": None,
            "stdout": "",
            "stderr": str(e),
            "timed_out": False,
            "reason": f"failed to start process: {e}",
        }

    try:
        stdout, stderr = proc.communicate(timeout=timeout)
        timed_out = False
    except subprocess.TimeoutExpired:
        _kill_process_tree(proc.pid)
        try:
            stdout, stderr = proc.communicate(timeout=15)
        except Exception:
            stdout, stderr = "", ""
        timed_out = True

    if timed_out:
        return {
            "ok": False,
            "exit_code": -1,
            "stdout": stdout or "",
            "stderr": stderr or "",
            "timed_out": True,
            "reason": f"TIMEOUT: process did not finish within {timeout} seconds, killed.",
        }

    return {
        "ok": proc.returncode == 0,
        "exit_code": proc.returncode,
        "stdout": stdout or "",
        "stderr": stderr or "",
        "timed_out": False,
        "reason": None,
    }


# ============================================================
# Self-test gate: verify tools can actually be invoked BEFORE scanning
# ============================================================

def self_test_tools(require_gitleaks: bool, require_trivy: bool) -> list[str]:
    """
    Check that required tools exist and respond to a version call.
    Returns a list of problem strings; empty list = all good.
    Fail-closed: any unexpected error counts as a problem, not a pass.
    """
    problems: list[str] = []

    def check(name: str, which_name: str, version_args: list[str], required: bool = True) -> None:
        path = shutil.which(which_name)
        if not path:
            if required:
                problems.append(f"{name} not found on PATH (expected command: {which_name})")
            return
        result = run_tool([path] + version_args, cwd=SCRIPT_DIR, timeout=60)
        if result["timed_out"]:
            problems.append(f"{name} hung when checking version (timeout)")
        elif result["exit_code"] not in (0, None) and not result["ok"]:
            problems.append(
                f"{name} could not be invoked correctly "
                f"(exit code {result['exit_code']}): {(result['stderr'] or result['stdout'])[:200]}"
            )

    check("git", "git", ["--version"])
    check("Snyk CLI", "snyk", ["--version"])
    check("gitleaks", "gitleaks", ["version"], required=require_gitleaks)
    check("trivy", "trivy", ["--version"], required=require_trivy)

    if not os.environ.get("SNYK_TOKEN"):
        problems.append(
            "SNYK_TOKEN environment variable is not set. Snyk calls would fail "
            "authentication. Set it as a USER environment variable, never hardcode it."
        )

    return problems


# ============================================================
# Git clone / update
# ============================================================

def ensure_repo(repo_path: Path, repo_url: str, branch: str) -> dict:
    """
    Clone the repo if it doesn't exist locally, otherwise fetch + pull the
    target branch. Returns a dict describing what happened (for the status
    JSON / summary), including warnings on failure - never raises.
    """
    info = {"cloned": False, "updated": False, "warning": None, "branch": branch}

    if not (repo_path / ".git").exists():
        repo_path.parent.mkdir(parents=True, exist_ok=True)
        print(f"Cloning {repo_url} -> {repo_path} ...")
        result = run_tool(
            ["git", "clone", "--branch", branch, repo_url, str(repo_path)],
            cwd=repo_path.parent,
            timeout=TIMEOUT_SECONDS,
        )
        if not result["ok"]:
            info["warning"] = f"git clone failed: {(result['stderr'] or result['reason'] or '')[:300]}"
            return info
        info["cloned"] = True
        return info

    print(f"Repo already present at {repo_path}, updating (git fetch + pull) ...")
    fetch = run_tool(["git", "fetch", "--all", "--prune"], cwd=repo_path, timeout=TIMEOUT_SECONDS)
    if not fetch["ok"]:
        info["warning"] = f"git fetch failed (check network): {(fetch['stderr'] or '')[:300]}"

    checkout = run_tool(["git", "checkout", branch], cwd=repo_path, timeout=120)
    if not checkout["ok"]:
        info["warning"] = (info["warning"] or "") + f" git checkout {branch} failed: {(checkout['stderr'] or '')[:300]}"
        return info

    pull = run_tool(["git", "pull", "--ff-only"], cwd=repo_path, timeout=TIMEOUT_SECONDS)
    if not pull["ok"] and not info["warning"]:
        info["warning"] = f"git pull failed (local changes/conflict?): {(pull['stderr'] or '')[:300]}"
    else:
        info["updated"] = True

    return info


# ============================================================
# Tool runners
# ============================================================

def get_failure_reason(stdout: str, stderr: str, exit_code: int | None, timed_out: bool, generic_reason: str | None) -> str:
    text = f"{stdout}\n{stderr}"
    if timed_out:
        return generic_reason or "TIMEOUT"
    if "monthly limit" in text:
        return "Snyk monthly test quota exhausted"
    if "Authentication error" in text or "401" in text:
        return "Snyk token invalid/expired"
    if "Could not detect supported target files" in text or "No supported files" in text:
        return "no supported dependency manifest found"
    first_line = next((l.strip() for l in text.splitlines() if l.strip()), None)
    if first_line:
        return f"{first_line[:200]} (exit code: {exit_code})"
    return f"exit code: {exit_code}"


def _snyk_path() -> str:
    # On Windows, the global npm install of Snyk CLI is a .cmd shim, which
    # subprocess.Popen cannot exec via the bare name "snyk" (WinError 2) -
    # it must be resolved to its full path (including extension) first.
    path = shutil.which("snyk")
    return path or "snyk"


def run_snyk_sca(repo_path: Path, out_json: Path) -> dict:
    args = [_snyk_path(), "test", "--all-projects", f"--json-file-output={out_json}"]
    result = run_tool(args, cwd=repo_path, timeout=TIMEOUT_SECONDS)
    json_ok = out_json.exists() and out_json.stat().st_size > 0
    # Snyk exit code 1 = vulnerabilities found (still success); >=2 = real failure.
    success = (result["exit_code"] in (0, 1)) and json_ok and not result["timed_out"]
    reason = None if success else get_failure_reason(
        result["stdout"], result["stderr"], result["exit_code"], result["timed_out"], result["reason"]
    )
    return {"success": success, "reason": reason, "exit_code": result["exit_code"]}


def run_snyk_sast(repo_path: Path, out_json: Path) -> dict:
    args = [_snyk_path(), "code", "test", f"--json-file-output={out_json}"]
    result = run_tool(args, cwd=repo_path, timeout=TIMEOUT_SECONDS)
    json_ok = out_json.exists() and out_json.stat().st_size > 0
    success = (result["exit_code"] in (0, 1)) and json_ok and not result["timed_out"]
    reason = None if success else get_failure_reason(
        result["stdout"], result["stderr"], result["exit_code"], result["timed_out"], result["reason"]
    )
    return {"success": success, "reason": reason, "exit_code": result["exit_code"]}


def run_gitleaks(repo_path: Path, out_json: Path) -> dict:
    gitleaks_path = shutil.which("gitleaks")
    if not gitleaks_path:
        return {"success": False, "reason": "gitleaks not installed", "exit_code": None}
    args = [
        gitleaks_path, "git", "--redact", "--no-banner", "--no-color",
        "--report-format", "json", "--report-path", str(out_json),
        "--exit-code", "0", ".",
    ]
    result = run_tool(args, cwd=repo_path, timeout=TIMEOUT_SECONDS)
    # --exit-code 0 means gitleaks always exits 0 (leaks or not); non-zero = tool failure.
    success = result["exit_code"] == 0 and not result["timed_out"]
    reason = None if success else get_failure_reason(
        result["stdout"], result["stderr"], result["exit_code"], result["timed_out"], result["reason"]
    )
    return {"success": success, "reason": reason, "exit_code": result["exit_code"]}


def run_trivy(repo_path: Path, out_json: Path) -> dict:
    trivy_path = shutil.which("trivy")
    if not trivy_path:
        return {"success": False, "reason": "trivy not installed", "exit_code": None, "applicable": True}
    args = [
        trivy_path, "config", "--format", "json", "--quiet",
        "--include-non-failures", "-o", str(out_json), ".",
    ]
    result = run_tool(args, cwd=repo_path, timeout=TIMEOUT_SECONDS)
    success = result["exit_code"] == 0 and out_json.exists() and not result["timed_out"]
    reason = None if success else get_failure_reason(
        result["stdout"], result["stderr"], result["exit_code"], result["timed_out"], result["reason"]
    )
    return {"success": success, "reason": reason, "exit_code": result["exit_code"], "applicable": True}


# ============================================================
# Severity parsing (for the RINGKASAN / summary text)
# ============================================================

def count_severity_from_snyk_test(json_path: Path) -> dict:
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    if not json_path.exists() or json_path.stat().st_size == 0:
        return counts
    try:
        raw = json_path.read_text(encoding="utf-8", errors="replace")
        data = json.loads(raw)
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


def count_gitleaks(json_path: Path) -> int | None:
    if not json_path.exists():
        return None
    try:
        raw = json_path.read_text(encoding="utf-8", errors="replace")
        if not raw.strip():
            return 0
        data = json.loads(raw)
        keys = set()
        for x in data or []:
            keys.add((x.get("File"), x.get("StartLine"), x.get("RuleID")))
        return len(keys)
    except Exception:
        return None


def count_trivy(json_path: Path) -> dict | None:
    if not json_path.exists():
        return None
    try:
        data = json.loads(json_path.read_text(encoding="utf-8", errors="replace"))
        if "SchemaVersion" not in data:
            return None
        result = {"critical": 0, "high": 0, "medium": 0, "low": 0, "has_config": False}
        for r in data.get("Results", []) or []:
            if r.get("Class") != "config":
                continue
            result["has_config"] = True
            for m in r.get("Misconfigurations", []) or []:
                if m.get("Status") != "FAIL":
                    continue
                sev = (m.get("Severity") or "").lower()
                if sev in result:
                    result[sev] += 1
        return result
    except Exception:
        return None


def severity_text(sev: dict) -> str | None:
    if not sev:
        return None
    parts = []
    if sev.get("critical"): parts.append(f"{sev['critical']} Critical")
    if sev.get("high"): parts.append(f"{sev['high']} High")
    if sev.get("medium"): parts.append(f"{sev['medium']} Medium")
    return " + ".join(parts) if parts else None


# ============================================================
# Folder numbering: yyyyMMdd (n)
# ============================================================

def make_output_dir(root: Path) -> tuple[Path, str]:
    today = datetime.now().strftime("%Y%m%d")
    n = 1
    while True:
        name = f"{today} ({n})"
        candidate = root / name
        if not candidate.exists():
            candidate.mkdir(parents=True, exist_ok=True)
            return candidate, name
        n += 1


# ============================================================
# Main
# ============================================================

def main() -> int:
    parser = argparse.ArgumentParser(description="Scan OrangeHRM's own source repo for security issues.")
    parser.add_argument("--repo-path", default=DEFAULT_REPO_PATH, help="Local path to clone/scan OrangeHRM (outside this repo).")
    parser.add_argument("--repo-url", default=DEFAULT_REPO_URL)
    parser.add_argument("--branch", default=DEFAULT_BRANCH)
    parser.add_argument("--skip-clone", action="store_true", help="Skip git clone/update, scan the repo as-is.")
    args = parser.parse_args()

    repo_path = Path(args.repo_path)

    print("=" * 70)
    print("OrangeHRM source-code security scan")
    print("=" * 70)

    # --- Self-test gate: abort before scanning if something fundamental is broken ---
    print("\nSelf-testing required tools...")
    problems = self_test_tools(require_gitleaks=True, require_trivy=True)
    if problems:
        print("\n[FAILED] Self-test found problems - scan ABORTED before any scanning:")
        for p in problems:
            print(f"  - {p}")
        print("\nFix the issue(s) above and re-run. Scanning anyway would produce an")
        print("incomplete / misleading report.")
        return 1
    print("  All required tools responded correctly.")

    # --- Clone / update target repo ---
    git_warning = None
    if not args.skip_clone:
        repo_info = ensure_repo(repo_path, args.repo_url, args.branch)
        git_warning = repo_info.get("warning")
        if git_warning:
            print(f"  [WARNING] {git_warning}")
    if not (repo_path / ".git").exists():
        print(f"\n[FAILED] Repo not found at {repo_path} and clone did not succeed. Aborting.")
        return 1

    # Resolve actual branch checked out (in case checkout fell back)
    branch_result = run_tool(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo_path, timeout=30)
    actual_branch = (branch_result["stdout"] or args.branch).strip() or args.branch
    safe_branch = "".join(c if c not in '\\/:*?"<>|[]' else "_" for c in actual_branch)

    # --- Output dirs ---
    out_root, run_name = make_output_dir(EVIDENCE_JSON_ROOT)
    repo_out_dir = out_root / f"orangehrm ({safe_branch})"
    repo_out_dir.mkdir(parents=True, exist_ok=True)
    print(f"\nEvidence output folder: {out_root}")

    # --- SCA ---
    print("\nRunning Snyk Test (SCA)...")
    sca_json = repo_out_dir / "snyk_sca_result.json"
    sca = run_snyk_sca(repo_path, sca_json)
    sev_sca = count_severity_from_snyk_test(sca_json)
    if not sca["success"]:
        print(f"  [FAILED] SCA: {sca['reason']}")

    # --- SAST ---
    print("Running Snyk Code Test (SAST)...")
    sast_json = repo_out_dir / "snyk_sast_result.json"
    sast = run_snyk_sast(repo_path, sast_json)
    sev_sast = count_severity_from_snyk_code(sast_json)
    if not sast["success"]:
        print(f"  [FAILED] SAST: {sast['reason']}")

    # --- Gitleaks ---
    print("Running Gitleaks (full git history, secrets redacted)...")
    gitleaks_json = repo_out_dir / "gitleaks_result.json"
    gitleaks = run_gitleaks(repo_path, gitleaks_json)
    secret_count = count_gitleaks(gitleaks_json) if gitleaks["success"] else None
    if not gitleaks["success"]:
        print(f"  [FAILED] Gitleaks: {gitleaks['reason']}")

    # --- Trivy (only if Dockerfile exists) ---
    dockerfile_candidates = list(repo_path.rglob("Dockerfile")) + list(repo_path.rglob("Dockerfile.*"))
    has_dockerfile = len(dockerfile_candidates) > 0
    trivy = None
    sev_trivy = None
    if has_dockerfile:
        print("Running Trivy config (Dockerfile misconfiguration)...")
        trivy_json = repo_out_dir / "trivy_result.json"
        trivy = run_trivy(repo_path, trivy_json)
        if trivy["success"]:
            sev_trivy = count_trivy(trivy_json)
        else:
            print(f"  [FAILED] Trivy: {trivy['reason']}")
    else:
        print("No Dockerfile found in repo - Trivy skipped (not applicable, not a failure).")

    # --- Status JSON ---
    status = {
        "org": None,
        "branch": actual_branch,
        "scaReason": None if sca["success"] else sca["reason"],
        "sastReason": None if sast["success"] else sast["reason"],
        "gitleaksReason": None if gitleaks["success"] else gitleaks["reason"],
        "trivyReason": (None if not has_dockerfile else (None if trivy and trivy["success"] else (trivy["reason"] if trivy else None))),
        "trivyApplicable": has_dockerfile,
        "gitWarning": git_warning,
    }
    (repo_out_dir / "snyk_status.json").write_text(
        json.dumps(status, indent=2), encoding="utf-8"
    )

    # --- RINGKASAN (summary) .txt ---
    summary_lines = []
    today_label = datetime.now().strftime("%d %B %Y")
    summary_lines.append(f"OrangeHRM source-code security scan recap - {today_label}")
    summary_lines.append(f"Repo: orangehrm/orangehrm (branch: {actual_branch})")
    summary_lines.append("")
    summary_lines.append("Summary (medium severity and above):")
    summary_lines.append("")
    findings_lines = []
    sca_text = severity_text(sev_sca)
    if sca_text:
        findings_lines.append(f"   - SCA: {sca_text}")
    sast_text = severity_text(sev_sast)
    if sast_text:
        findings_lines.append(f"   - SAST: {sast_text}")
    if secret_count:
        findings_lines.append(f"   - Gitleaks: {secret_count} secret(s)")
    if sev_trivy:
        trivy_text = severity_text(sev_trivy)
        if trivy_text:
            findings_lines.append(f"   - Trivy: {trivy_text}")
    if findings_lines:
        summary_lines.append(f"- orangehrm/orangehrm/{actual_branch}:")
        summary_lines.extend(findings_lines)
    else:
        summary_lines.append("- No medium+ findings across completed scans.")

    failed = []
    if not sca["success"]:
        failed.append(f"   - SCA -- {sca['reason']}")
    if not sast["success"]:
        failed.append(f"   - SAST -- {sast['reason']}")
    if not gitleaks["success"]:
        failed.append(f"   - Gitleaks -- {gitleaks['reason']}")
    if has_dockerfile and trivy and not trivy["success"]:
        failed.append(f"   - Trivy -- {trivy['reason']}")
    if failed:
        summary_lines.append("")
        summary_lines.append("Failed scans (results INCOMPLETE, NOT the same as safe):")
        summary_lines.append(f"   - orangehrm/orangehrm/{actual_branch}:")
        summary_lines.extend(failed)

    if git_warning:
        summary_lines.append("")
        summary_lines.append(f"Note: {git_warning}")

    summary_text = "\n".join(summary_lines) + "\n"
    summary_path = out_root / f"RINGKASAN_{run_name}.txt"
    summary_path.write_text(summary_text, encoding="utf-8")

    print("\n" + "=" * 70)
    print(summary_text)
    print("=" * 70)
    print(f"\nJSON evidence: {repo_out_dir}")
    print(f"Run this next:  python generate_report.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
