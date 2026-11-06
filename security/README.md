# Security Scanning - OrangeHRM Source Code

This folder complements the existing functional/DAST-style security test
cases already in `tests/recruitment/security/` (which exercise the running
OrangeHRM demo application through Playwright). Those tests check runtime
behavior (IDOR, headers, rate limiting, race conditions).

This folder instead does **source-code-level** security scanning of
**OrangeHRM's own open-source repository**
(`github.com/orangehrm/orangehrm`, GPL-3.0, PHP/Symfony) - it looks at the
application's actual source code, not the live demo. The two approaches
are complementary: one is "does the running app behave securely", the
other is "does the published source have known-vulnerable dependencies,
risky code patterns, or leaked secrets".

## What gets scanned

| Scan | Tool | Checks |
|---|---|---|
| SCA | `snyk test` | Dependency libraries with known CVEs |
| SAST | `snyk code test` | Vulnerable code patterns (SQLi, XSS, etc.) |
| Secrets | `gitleaks git --redact` | Hardcoded passwords/tokens/keys across full git history |
| Config | `trivy config .` | Dockerfile misconfiguration (only run if a Dockerfile exists in the repo) |

`composer audit` and Semgrep are deliberately **not** included - the scope
here is intentionally narrower than a full PHP security toolchain.
`snyk monitor` (publishing to the Snyk dashboard) is also not used; this is
a one-off evidence-producing scan, not a continuously monitored project.

## One-time setup

```
npm install -g snyk          # Snyk CLI
scoop install gitleaks       # or: brew install gitleaks / apt install gitleaks
scoop install trivy           # or: brew install trivy
pip install -r security/scripts/requirements.txt
```

Set your Snyk token as an environment variable - **never** hardcode it:

```
[Environment]::SetEnvironmentVariable("SNYK_TOKEN", "<your token>", "User")
```

Close and reopen your terminal afterward so it picks up the new variable.

## Running

```
cd security/scripts
python scan_orangehrm.py          # Step 1: clone/update + scan, writes JSON evidence
python generate_report.py         # Step 2: JSON -> PDF evidence
```

By default, `scan_orangehrm.py` clones OrangeHRM to
`C:\Users\IT PDN\orangehrm` - **outside** this repository, on purpose (so a
large third-party GPL-3.0 codebase never gets committed here). Override
with `--repo-path` and `--branch` if needed:

```
python scan_orangehrm.py --repo-path "D:\scans\orangehrm" --branch main
```

The script self-tests `git`, `snyk`, `gitleaks`, `trivy` and the
`SNYK_TOKEN` environment variable *before* scanning anything. If a tool is
broken or missing, the scan aborts immediately with a clear reason rather
than producing an incomplete report. A failure in one scan step (e.g. a
Snyk timeout) does not stop the rest - it's recorded and the scan
continues.

## Folder structure

```
security/
├── scripts/
│   ├── scan_orangehrm.py
│   ├── generate_report.py
│   └── requirements.txt
├── evidence/
│   ├── json/<yyyyMMdd (n)>/
│   │   ├── RINGKASAN_<yyyyMMdd (n)>.txt
│   │   └── orangehrm (<branch>)/
│   │       ├── snyk_sca_result.json
│   │       ├── snyk_sast_result.json
│   │       ├── snyk_status.json
│   │       ├── gitleaks_result.json
│   │       └── trivy_result.json          (only if a Dockerfile was found)
│   └── pdf/<yyyyMMdd (n)>/
│       ├── RINGKASAN_<yyyyMMdd (n)>.pdf
│       └── orangehrm/<branch>/
│           ├── orangehrm_SCA.pdf           (only if there are findings)
│           ├── orangehrm_SAST.pdf          (only if there are findings)
│           ├── orangehrm_gitleaks.pdf      (only if there are findings)
│           └── orangehrm_trivy.pdf         (only if there are findings)
└── README.md
```

Each run creates a new numbered folder (`yyyyMMdd (1)`, `(2)`, ...) so
re-running on the same day never overwrites a previous result - useful for
comparing before/after a fix. A detail PDF is only generated when a tool
actually found something; a clean result is still recorded in the summary
PDF/txt, just without its own detail PDF.

## Latest scan results (run `20261106 (3)`)

| Scan | Result |
|---|---|
| SCA (`snyk test`) | 5 Critical, 36 High, 64 Medium, 4 Low |
| SAST (`snyk code test`) | 1 High, 11 Medium, 175 Low |
| Gitleaks | 358 secret-pattern hits -- on inspection, effectively all are test/fixture data (Symfony/OAuth test fixtures) and one well-known vendored-library false positive (`phpseclib`'s own docblock example code), not live credentials |
| Trivy config | 1 High, 1 Low |

Full evidence (JSON + PDF, matching this project's internal evidence-report style) is under `security/evidence/`.

## Planned next addition: OWASP ZAP (on hold)

DAST (dynamic scanning against a running app) is planned as the next addition, **currently on hold** pending execution time. Decided approach, so this doesn't need re-deciding later:

- **Target:** a **self-hosted OrangeHRM instance**, built via Docker from the same cloned source at `C:\Users\IT PDN\orangehrm` (it already has a `Dockerfile`, confirmed by the Trivy scan above) and run on `localhost` -- **not** the public demo (`opensource-demo.orangehrmlive.com`).
- **Why not the public demo:** ZAP's active scan mode sends real attack payloads (SQLi/XSS/etc.) against the target. Doing that against a shared public demo risks violating its ToS or disrupting other users. A baseline (passive-only) scan against the public demo would be safe but far more limited than what ZAP is normally used for.
- **Why self-host instead:** full active scan, zero risk to any third party, and it keeps the same OrangeHRM narrative running through the whole portfolio (E2E/functional testing on the public demo -> source-level scanning on the official repo -> DAST on a self-hosted instance of that same application).

## Ethics note

OrangeHRM is a third-party open-source project, not something we control or
are responsible for patching. Findings about it should be handled
responsibly:

- Dependency CVEs (SCA) shown here are already public in the NVD/CVE
  databases - Snyk only surfaces information that is already public, so
  there's nothing sensitive about reporting them.
- Do **not** publish exploit-level detail (working payloads, bypass steps)
  for an unpatched Critical/High finding. Severity + affected
  component/line is enough for a portfolio piece; a working exploit is not.
- Any secret found by gitleaks in this public repo's history is also
  already public (it's OrangeHRM's own repo, scanned read-only) - but
  treat it the same way you'd treat any leaked credential: don't amplify
  it, and don't attempt to use it.
