# Taxonomy Coverage Matrix

Scope: the 12 sidebar modules (Admin, PIM, Leave, Time, Recruitment, My Info, Performance, Dashboard, Directory, Maintenance, Claim, Buzz) plus the sidebar Search box -- 109 menu units taken from a live click-through. Login and header items are outside this matrix (their existing TCs still run). Full cell-level detail (TC ids per cell, N/A reasons) lives in `docs/Taxonomy-Coverage-Matrix.xlsx`.

| Module | COVERED | GAP | N/A | Coverage of applicable |
|---|---:|---:|---:|---:|
| Admin | 798 | 298 | 608 | 72.8% |
| Buzz | 58 | 0 | 13 | 100.0% |
| Claim | 279 | 31 | 187 | 90.0% |
| Dashboard | 36 | 0 | 106 | 100.0% |
| Directory | 21 | 5 | 45 | 80.8% |
| Leave | 411 | 88 | 424 | 82.4% |
| Maintenance | 86 | 11 | 116 | 88.7% |
| My Info | 354 | 108 | 319 | 76.6% |
| PIM | 904 | 22 | 494 | 97.6% |
| Performance | 413 | 8 | 289 | 98.1% |
| Recruitment | 216 | 0 | 68 | 100.0% |
| Sidebar | 17 | 0 | 54 | 100.0% |
| Time | 335 | 147 | 370 | 69.5% |
| **Total** | **3928** | **718** | **3093** | **84.5%** |

Weak TCs (not counted as coverage): 23 -- see the xlsx sheet "Weak TCs".

## Gap backlog by taxonomy item

| Item | Taxonomy | Units with GAP |
|---|---|---:|
| 1.1-C | Create valid | 1 |
| 1.1-R | Read / list | 17 |
| 1.1-U | Update valid | 17 |
| 1.1-D | Delete valid | 4 |
| 1.2 | Variasi input valid (opsional diisi/kosong) | 45 |
| 1.3 | State transition valid | 3 |
| 1.4 | Relasi antar-entity | 35 |
| 1.6 | Search/filter/sort valid | 24 |
| 1.7 | Upload file valid | 2 |
| 1.8 | Notifikasi/feedback UI | 20 |
| 2.1 | Required field kosong | 12 |
| 2.2 | Format salah | 33 |
| 2.3 | Duplicate/unique conflict | 5 |
| 2.5 | State transition invalid | 5 |
| 2.6 | Operasi pada record invalid/tak eksis | 6 |
| 2.8 | Reject/cancel tanpa alasan | 3 |
| 3.1 | Panjang karakter field | 16 |
| 3.2 | Nilai numerik | 2 |
| 3.3 | Ukuran file upload | 2 |
| 3.4 | Tanggal | 14 |
| 4.1 | Karakter tidak biasa (unicode/emoji/RTL/whitespace) | 30 |
| 4.2 | Aksi ganda/cepat (double submit) | 30 |
| 4.3 | Navigasi tidak biasa (back/refresh/tab baru) | 30 |
| 4.4 | Race condition | 10 |
| 4.5 | Session/koneksi terputus | 32 |
| 4.6 | Data kosong/null (empty state) | 7 |
| 4.7 | Konkurensi multi-user edit | 26 |
| 4.8 | Behavior non-obvious terdokumentasi | 47 |
| 5.1-SQLi | SQL Injection | 25 |
| 5.1-XSS-Stored | Stored XSS | 13 |
| 5.1-XSS-Reflected | Reflected XSS | 13 |
| 5.1-CmdPath | Command/Path injection | 3 |
| 5.1-SSRF | SSRF | 4 |
| 5.2-PrivEsc | Privilege escalation | 3 |
| 5.2-MassAssign | Mass assignment | 20 |
| 5.3-BadExt | Upload ekstensi terlarang | 1 |
| 5.3-Rename | Upload file di-rename | 2 |
| 5.3-ContentType | Content-Type spoofing | 2 |
| 5.3-DoubleExt | Double extension | 2 |
| 5.3-Oversize | Oversized file | 2 |
| 5.3-Filename | Malicious filename | 2 |
| 5.4 | CSRF | 34 |
| 5.5 | Rate limit / brute force / spam | 17 |
| 5.9 | Business logic abuse | 5 |
| 6.2 | Response schema/contract | 8 |
| 6.3 | Request method salah (405) | 9 |
| 6.4 | Auth/token (tanpa sesi / sesi user lain) | 8 |
| 6.5 | Parameter negatif (tipe salah/extra/null) | 27 |
| 6.7 | Idempotency | 11 |
| 8.4 | Konsistensi pesan | 29 |
