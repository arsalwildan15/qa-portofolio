# Taxonomy Coverage Matrix

Scope: the 12 sidebar modules (Admin, PIM, Leave, Time, Recruitment, My Info, Performance, Dashboard, Directory, Maintenance, Claim, Buzz) plus the sidebar Search box -- 109 menu units taken from a live click-through. Login and header items are outside this matrix (their existing TCs still run). Full cell-level detail (TC ids per cell, N/A reasons) lives in `docs/Taxonomy-Coverage-Matrix.xlsx`.

| Module | COVERED | GAP | N/A | Coverage of applicable |
|---|---:|---:|---:|---:|
| Admin | 824 | 272 | 608 | 75.2% |
| Buzz | 38 | 20 | 13 | 65.5% |
| Claim | 217 | 93 | 187 | 70.0% |
| Dashboard | 36 | 0 | 106 | 100.0% |
| Directory | 21 | 5 | 45 | 80.8% |
| Leave | 289 | 210 | 424 | 57.9% |
| Maintenance | 42 | 55 | 116 | 43.3% |
| My Info | 298 | 164 | 319 | 64.5% |
| PIM | 601 | 325 | 494 | 64.9% |
| Performance | 261 | 160 | 289 | 62.0% |
| Recruitment | 135 | 81 | 68 | 62.5% |
| Sidebar | 17 | 0 | 54 | 100.0% |
| Time | 264 | 218 | 370 | 54.8% |
| **Total** | **3043** | **1603** | **3093** | **65.5%** |

Weak TCs (not counted as coverage): 23 -- see the xlsx sheet "Weak TCs".

## Gap backlog by taxonomy item

| Item | Taxonomy | Units with GAP |
|---|---|---:|
| 1.1-C | Create valid | 6 |
| 1.1-R | Read / list | 35 |
| 1.1-U | Update valid | 34 |
| 1.1-D | Delete valid | 14 |
| 1.2 | Variasi input valid (opsional diisi/kosong) | 82 |
| 1.3 | State transition valid | 6 |
| 1.4 | Relasi antar-entity | 71 |
| 1.5 | Permission/role positif | 1 |
| 1.6 | Search/filter/sort valid | 28 |
| 1.7 | Upload file valid | 3 |
| 1.8 | Notifikasi/feedback UI | 56 |
| 2.1 | Required field kosong | 30 |
| 2.2 | Format salah | 31 |
| 2.3 | Duplicate/unique conflict | 6 |
| 2.4 | Aksi tanpa permission (UI/API) | 1 |
| 2.5 | State transition invalid | 13 |
| 2.6 | Operasi pada record invalid/tak eksis | 23 |
| 2.8 | Reject/cancel tanpa alasan | 6 |
| 3.1 | Panjang karakter field | 35 |
| 3.2 | Nilai numerik | 1 |
| 3.3 | Ukuran file upload | 7 |
| 3.4 | Tanggal | 22 |
| 3.5 | Pagination | 8 |
| 3.6 | Jumlah hasil (0/1/limit) | 10 |
| 4.1 | Karakter tidak biasa (unicode/emoji/RTL/whitespace) | 57 |
| 4.2 | Aksi ganda/cepat (double submit) | 57 |
| 4.3 | Navigasi tidak biasa (back/refresh/tab baru) | 46 |
| 4.4 | Race condition | 17 |
| 4.5 | Session/koneksi terputus | 57 |
| 4.6 | Data kosong/null (empty state) | 36 |
| 4.7 | Konkurensi multi-user edit | 56 |
| 4.8 | Behavior non-obvious terdokumentasi | 96 |
| 5.1-SQLi | SQL Injection | 47 |
| 5.1-XSS-Stored | Stored XSS | 24 |
| 5.1-XSS-Reflected | Reflected XSS | 21 |
| 5.1-CmdPath | Command/Path injection | 14 |
| 5.1-SSRF | SSRF | 5 |
| 5.2-IDOR | IDOR | 2 |
| 5.2-PrivEsc | Privilege escalation | 14 |
| 5.2-MassAssign | Mass assignment | 56 |
| 5.3-BadExt | Upload ekstensi terlarang | 5 |
| 5.3-Rename | Upload file di-rename | 5 |
| 5.3-ContentType | Content-Type spoofing | 11 |
| 5.3-DoubleExt | Double extension | 10 |
| 5.3-Oversize | Oversized file | 9 |
| 5.3-Filename | Malicious filename | 11 |
| 5.4 | CSRF | 72 |
| 5.5 | Rate limit / brute force / spam | 33 |
| 5.6 | Security headers | 2 |
| 5.8 | Sensitive data exposure | 1 |
| 5.9 | Business logic abuse | 20 |
| 6.2 | Response schema/contract | 33 |
| 6.3 | Request method salah (405) | 36 |
| 6.4 | Auth/token (tanpa sesi / sesi user lain) | 37 |
| 6.5 | Parameter negatif (tipe salah/extra/null) | 74 |
| 6.6 | Pagination & sorting param | 8 |
| 6.7 | Idempotency | 30 |
| 7.4 | Warning log | 2 |
| 7.5 | Performance dasar | 2 |
| 8.1 | Responsive/layout | 2 |
| 8.2 | Cross-browser | 2 |
| 8.3 | Accessibility dasar | 2 |
| 8.4 | Konsistensi pesan | 62 |
