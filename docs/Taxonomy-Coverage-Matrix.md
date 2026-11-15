# Taxonomy Coverage Matrix

Scope: the 12 sidebar modules (Admin, PIM, Leave, Time, Recruitment, My Info, Performance, Dashboard, Directory, Maintenance, Claim, Buzz) plus the sidebar Search box -- 109 menu units taken from a live click-through. Login and header items are outside this matrix (their existing TCs still run). Full cell-level detail (TC ids per cell, N/A reasons) lives in `docs/Taxonomy-Coverage-Matrix.xlsx`.

| Module | COVERED | GAP | N/A | Coverage of applicable |
|---|---:|---:|---:|---:|
| Admin | 728 | 368 | 608 | 66.4% |
| Buzz | 42 | 16 | 13 | 72.4% |
| Claim | 220 | 90 | 187 | 71.0% |
| Dashboard | 14 | 22 | 106 | 38.9% |
| Directory | 23 | 3 | 45 | 88.5% |
| Leave | 309 | 190 | 424 | 61.9% |
| Maintenance | 48 | 49 | 116 | 49.5% |
| My Info | 107 | 355 | 319 | 23.2% |
| PIM | 499 | 427 | 494 | 53.9% |
| Performance | 269 | 152 | 289 | 63.9% |
| Recruitment | 146 | 70 | 68 | 67.6% |
| Sidebar | 0 | 24 | 47 | 0.0% |
| Time | 288 | 194 | 370 | 59.8% |
| **Total** | **2693** | **1960** | **3086** | **57.9%** |

Weak TCs (not counted as coverage): 23 -- see the xlsx sheet "Weak TCs".

## Gap backlog by taxonomy item

| Item | Taxonomy | Units with GAP |
|---|---|---:|
| 1.1-C | Create valid | 8 |
| 1.1-R | Read / list | 5 |
| 1.1-U | Update valid | 55 |
| 1.1-D | Delete valid | 24 |
| 1.2 | Variasi input valid (opsional diisi/kosong) | 81 |
| 1.3 | State transition valid | 6 |
| 1.4 | Relasi antar-entity | 70 |
| 1.5 | Permission/role positif | 13 |
| 1.6 | Search/filter/sort valid | 28 |
| 1.8 | Notifikasi/feedback UI | 77 |
| 2.1 | Required field kosong | 45 |
| 2.2 | Format salah | 3 |
| 2.3 | Duplicate/unique conflict | 14 |
| 2.4 | Aksi tanpa permission (UI/API) | 6 |
| 2.5 | State transition invalid | 13 |
| 2.6 | Operasi pada record invalid/tak eksis | 35 |
| 2.8 | Reject/cancel tanpa alasan | 6 |
| 3.1 | Panjang karakter field | 8 |
| 3.3 | Ukuran file upload | 7 |
| 3.4 | Tanggal | 23 |
| 3.5 | Pagination | 25 |
| 3.6 | Jumlah hasil (0/1/limit) | 14 |
| 4.1 | Karakter tidak biasa (unicode/emoji/RTL/whitespace) | 79 |
| 4.2 | Aksi ganda/cepat (double submit) | 77 |
| 4.3 | Navigasi tidak biasa (back/refresh/tab baru) | 48 |
| 4.4 | Race condition | 17 |
| 4.5 | Session/koneksi terputus | 71 |
| 4.6 | Data kosong/null (empty state) | 61 |
| 4.7 | Konkurensi multi-user edit | 75 |
| 4.8 | Behavior non-obvious terdokumentasi | 14 |
| 5.1-SQLi | SQL Injection | 62 |
| 5.1-XSS-Stored | Stored XSS | 26 |
| 5.1-XSS-Reflected | Reflected XSS | 22 |
| 5.1-CmdPath | Command/Path injection | 14 |
| 5.1-SSRF | SSRF | 5 |
| 5.2-IDOR | IDOR | 10 |
| 5.2-PrivEsc | Privilege escalation | 25 |
| 5.2-MassAssign | Mass assignment | 82 |
| 5.3-BadExt | Upload ekstensi terlarang | 3 |
| 5.3-Rename | Upload file di-rename | 5 |
| 5.3-ContentType | Content-Type spoofing | 2 |
| 5.3-DoubleExt | Double extension | 10 |
| 5.3-Oversize | Oversized file | 7 |
| 5.3-Filename | Malicious filename | 11 |
| 5.4 | CSRF | 80 |
| 5.5 | Rate limit / brute force / spam | 58 |
| 5.6 | Security headers | 14 |
| 5.8 | Sensitive data exposure | 14 |
| 5.9 | Business logic abuse | 20 |
| 6.1 | Status code benar | 7 |
| 6.2 | Response schema/contract | 54 |
| 6.3 | Request method salah (405) | 59 |
| 6.4 | Auth/token (tanpa sesi / sesi user lain) | 62 |
| 6.5 | Parameter negatif (tipe salah/extra/null) | 59 |
| 6.6 | Pagination & sorting param | 25 |
| 6.7 | Idempotency | 51 |
| 7.1 | JS console error | 4 |
| 7.2 | Network anomali | 4 |
| 7.3 | Resource 404 | 4 |
| 7.4 | Warning log | 14 |
| 7.5 | Performance dasar | 14 |
| 8.1 | Responsive/layout | 14 |
| 8.2 | Cross-browser | 14 |
| 8.3 | Accessibility dasar | 14 |
| 8.4 | Konsistensi pesan | 83 |
