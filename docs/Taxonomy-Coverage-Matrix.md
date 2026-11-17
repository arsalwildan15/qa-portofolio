# Taxonomy Coverage Matrix

Scope: the 12 sidebar modules (Admin, PIM, Leave, Time, Recruitment, My Info, Performance, Dashboard, Directory, Maintenance, Claim, Buzz) plus the sidebar Search box -- 109 menu units taken from a live click-through. Login and header items are outside this matrix (their existing TCs still run). Full cell-level detail (TC ids per cell, N/A reasons) lives in `docs/Taxonomy-Coverage-Matrix.xlsx`.

| Module | COVERED | GAP | N/A | Coverage of applicable |
|---|---:|---:|---:|---:|
| Admin | 798 | 298 | 608 | 72.8% |
| Buzz | 40 | 18 | 13 | 69.0% |
| Claim | 214 | 96 | 187 | 69.0% |
| Dashboard | 36 | 0 | 106 | 100.0% |
| Directory | 21 | 5 | 45 | 80.8% |
| Leave | 411 | 88 | 424 | 82.4% |
| Maintenance | 86 | 11 | 116 | 88.7% |
| My Info | 298 | 164 | 319 | 64.5% |
| PIM | 603 | 323 | 494 | 65.1% |
| Performance | 251 | 170 | 289 | 59.6% |
| Recruitment | 216 | 0 | 68 | 100.0% |
| Sidebar | 17 | 0 | 54 | 100.0% |
| Time | 271 | 211 | 370 | 56.2% |
| **Total** | **3262** | **1384** | **3093** | **70.2%** |

Weak TCs (not counted as coverage): 23 -- see the xlsx sheet "Weak TCs".

## Gap backlog by taxonomy item

| Item | Taxonomy | Units with GAP |
|---|---|---:|
| 1.1-C | Create valid | 3 |
| 1.1-R | Read / list | 29 |
| 1.1-U | Update valid | 28 |
| 1.1-D | Delete valid | 9 |
| 1.2 | Variasi input valid (opsional diisi/kosong) | 73 |
| 1.3 | State transition valid | 4 |
| 1.4 | Relasi antar-entity | 57 |
| 1.5 | Permission/role positif | 1 |
| 1.6 | Search/filter/sort valid | 24 |
| 1.7 | Upload file valid | 2 |
| 1.8 | Notifikasi/feedback UI | 48 |
| 2.1 | Required field kosong | 25 |
| 2.2 | Format salah | 62 |
| 2.3 | Duplicate/unique conflict | 6 |
| 2.4 | Aksi tanpa permission (UI/API) | 1 |
| 2.5 | State transition invalid | 9 |
| 2.6 | Operasi pada record invalid/tak eksis | 17 |
| 2.8 | Reject/cancel tanpa alasan | 5 |
| 3.1 | Panjang karakter field | 31 |
| 3.2 | Nilai numerik | 3 |
| 3.3 | Ukuran file upload | 5 |
| 3.4 | Tanggal | 22 |
| 3.5 | Pagination | 4 |
| 3.6 | Jumlah hasil (0/1/limit) | 4 |
| 4.1 | Karakter tidak biasa (unicode/emoji/RTL/whitespace) | 51 |
| 4.2 | Aksi ganda/cepat (double submit) | 52 |
| 4.3 | Navigasi tidak biasa (back/refresh/tab baru) | 52 |
| 4.4 | Race condition | 15 |
| 4.5 | Session/koneksi terputus | 57 |
| 4.6 | Data kosong/null (empty state) | 23 |
| 4.7 | Konkurensi multi-user edit | 49 |
| 4.8 | Behavior non-obvious terdokumentasi | 81 |
| 5.1-SQLi | SQL Injection | 41 |
| 5.1-XSS-Stored | Stored XSS | 21 |
| 5.1-XSS-Reflected | Reflected XSS | 16 |
| 5.1-CmdPath | Command/Path injection | 10 |
| 5.1-SSRF | SSRF | 5 |
| 5.2-IDOR | IDOR | 2 |
| 5.2-PrivEsc | Privilege escalation | 12 |
| 5.2-MassAssign | Mass assignment | 47 |
| 5.3-BadExt | Upload ekstensi terlarang | 3 |
| 5.3-Rename | Upload file di-rename | 4 |
| 5.3-ContentType | Content-Type spoofing | 8 |
| 5.3-DoubleExt | Double extension | 7 |
| 5.3-Oversize | Oversized file | 7 |
| 5.3-Filename | Malicious filename | 8 |
| 5.4 | CSRF | 65 |
| 5.5 | Rate limit / brute force / spam | 30 |
| 5.6 | Security headers | 2 |
| 5.8 | Sensitive data exposure | 1 |
| 5.9 | Business logic abuse | 13 |
| 6.2 | Response schema/contract | 22 |
| 6.3 | Request method salah (405) | 25 |
| 6.4 | Auth/token (tanpa sesi / sesi user lain) | 24 |
| 6.5 | Parameter negatif (tipe salah/extra/null) | 61 |
| 6.6 | Pagination & sorting param | 4 |
| 6.7 | Idempotency | 29 |
| 7.4 | Warning log | 2 |
| 7.5 | Performance dasar | 2 |
| 8.1 | Responsive/layout | 2 |
| 8.2 | Cross-browser | 2 |
| 8.3 | Accessibility dasar | 2 |
| 8.4 | Konsistensi pesan | 55 |
