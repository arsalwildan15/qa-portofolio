# Taxonomy Coverage Matrix

Scope: the 12 sidebar modules (Admin, PIM, Leave, Time, Recruitment, My Info, Performance, Dashboard, Directory, Maintenance, Claim, Buzz) plus the sidebar Search box -- 109 menu units taken from a live click-through. Login and header items are outside this matrix (their existing TCs still run). Full cell-level detail (TC ids per cell, N/A reasons) lives in `docs/Taxonomy-Coverage-Matrix.xlsx`.

| Module | COVERED | GAP | N/A | Coverage of applicable |
|---|---:|---:|---:|---:|
| Admin | 824 | 272 | 608 | 75.2% |
| Buzz | 38 | 20 | 13 | 65.5% |
| Claim | 229 | 81 | 187 | 73.9% |
| Dashboard | 12 | 24 | 106 | 33.3% |
| Directory | 21 | 5 | 45 | 80.8% |
| Leave | 290 | 209 | 424 | 58.1% |
| Maintenance | 42 | 55 | 116 | 43.3% |
| My Info | 85 | 377 | 319 | 18.4% |
| PIM | 480 | 446 | 494 | 51.8% |
| Performance | 261 | 160 | 289 | 62.0% |
| Recruitment | 136 | 80 | 68 | 63.0% |
| Sidebar | 17 | 0 | 54 | 100.0% |
| Time | 265 | 217 | 370 | 55.0% |
| **Total** | **2700** | **1946** | **3093** | **58.1%** |

Weak TCs (not counted as coverage): 23 -- see the xlsx sheet "Weak TCs".

## Gap backlog by taxonomy item

| Item | Taxonomy | Units with GAP |
|---|---|---:|
| 1.1-C | Create valid | 8 |
| 1.1-R | Read / list | 40 |
| 1.1-U | Update valid | 44 |
| 1.1-D | Delete valid | 21 |
| 1.2 | Variasi input valid (opsional diisi/kosong) | 81 |
| 1.3 | State transition valid | 6 |
| 1.4 | Relasi antar-entity | 70 |
| 1.5 | Permission/role positif | 12 |
| 1.6 | Search/filter/sort valid | 27 |
| 1.7 | Upload file valid | 2 |
| 1.8 | Notifikasi/feedback UI | 58 |
| 2.1 | Required field kosong | 40 |
| 2.2 | Format salah | 20 |
| 2.3 | Duplicate/unique conflict | 6 |
| 2.4 | Aksi tanpa permission (UI/API) | 6 |
| 2.5 | State transition invalid | 13 |
| 2.6 | Operasi pada record invalid/tak eksis | 35 |
| 2.8 | Reject/cancel tanpa alasan | 6 |
| 3.1 | Panjang karakter field | 44 |
| 3.2 | Nilai numerik | 1 |
| 3.3 | Ukuran file upload | 7 |
| 3.4 | Tanggal | 24 |
| 3.5 | Pagination | 25 |
| 3.6 | Jumlah hasil (0/1/limit) | 20 |
| 4.1 | Karakter tidak biasa (unicode/emoji/RTL/whitespace) | 63 |
| 4.2 | Aksi ganda/cepat (double submit) | 59 |
| 4.3 | Navigasi tidak biasa (back/refresh/tab baru) | 37 |
| 4.4 | Race condition | 17 |
| 4.5 | Session/koneksi terputus | 56 |
| 4.6 | Data kosong/null (empty state) | 60 |
| 4.7 | Konkurensi multi-user edit | 56 |
| 4.8 | Behavior non-obvious terdokumentasi | 98 |
| 5.1-SQLi | SQL Injection | 48 |
| 5.1-XSS-Stored | Stored XSS | 26 |
| 5.1-XSS-Reflected | Reflected XSS | 21 |
| 5.1-CmdPath | Command/Path injection | 14 |
| 5.1-SSRF | SSRF | 5 |
| 5.2-IDOR | IDOR | 10 |
| 5.2-PrivEsc | Privilege escalation | 25 |
| 5.2-MassAssign | Mass assignment | 63 |
| 5.3-BadExt | Upload ekstensi terlarang | 4 |
| 5.3-Rename | Upload file di-rename | 5 |
| 5.3-ContentType | Content-Type spoofing | 11 |
| 5.3-DoubleExt | Double extension | 10 |
| 5.3-Oversize | Oversized file | 7 |
| 5.3-Filename | Malicious filename | 11 |
| 5.4 | CSRF | 80 |
| 5.5 | Rate limit / brute force / spam | 39 |
| 5.6 | Security headers | 13 |
| 5.8 | Sensitive data exposure | 13 |
| 5.9 | Business logic abuse | 20 |
| 6.1 | Status code benar | 6 |
| 6.2 | Response schema/contract | 53 |
| 6.3 | Request method salah (405) | 58 |
| 6.4 | Auth/token (tanpa sesi / sesi user lain) | 61 |
| 6.5 | Parameter negatif (tipe salah/extra/null) | 82 |
| 6.6 | Pagination & sorting param | 25 |
| 6.7 | Idempotency | 36 |
| 7.1 | JS console error | 3 |
| 7.2 | Network anomali | 3 |
| 7.3 | Resource 404 | 3 |
| 7.4 | Warning log | 13 |
| 7.5 | Performance dasar | 13 |
| 8.1 | Responsive/layout | 13 |
| 8.2 | Cross-browser | 13 |
| 8.3 | Accessibility dasar | 13 |
| 8.4 | Konsistensi pesan | 64 |
