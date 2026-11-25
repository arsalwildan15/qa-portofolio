# Taxonomy Coverage Matrix

Scope: the 12 sidebar modules (Admin, PIM, Leave, Time, Recruitment, My Info, Performance, Dashboard, Directory, Maintenance, Claim, Buzz) plus the sidebar Search box -- 109 menu units taken from a live click-through. Login and header items are outside this matrix (their existing TCs still run). Full cell-level detail (TC ids per cell, N/A reasons) lives in `docs/Taxonomy-Coverage-Matrix.xlsx`.

| Module | COVERED | GAP | N/A | Coverage of applicable |
|---|---:|---:|---:|---:|
| Admin | 922 | 174 | 608 | 84.1% |
| Buzz | 58 | 0 | 13 | 100.0% |
| Claim | 310 | 0 | 187 | 100.0% |
| Dashboard | 36 | 0 | 106 | 100.0% |
| Directory | 21 | 5 | 45 | 80.8% |
| Leave | 411 | 88 | 424 | 82.4% |
| Maintenance | 86 | 11 | 116 | 88.7% |
| My Info | 354 | 108 | 319 | 76.6% |
| PIM | 904 | 22 | 494 | 97.6% |
| Performance | 413 | 8 | 289 | 98.1% |
| Recruitment | 216 | 0 | 68 | 100.0% |
| Sidebar | 17 | 0 | 54 | 100.0% |
| Time | 482 | 0 | 370 | 100.0% |
| **Total** | **4230** | **416** | **3093** | **91.0%** |

Weak TCs (not counted as coverage): 23 -- see the xlsx sheet "Weak TCs".

## Gap backlog by taxonomy item

| Item | Taxonomy | Units with GAP |
|---|---|---:|
| 1.1-C | Create valid | 1 |
| 1.1-R | Read / list | 9 |
| 1.1-U | Update valid | 13 |
| 1.1-D | Delete valid | 1 |
| 1.2 | Variasi input valid (opsional diisi/kosong) | 23 |
| 1.3 | State transition valid | 2 |
| 1.4 | Relasi antar-entity | 16 |
| 1.6 | Search/filter/sort valid | 22 |
| 1.7 | Upload file valid | 1 |
| 1.8 | Notifikasi/feedback UI | 13 |
| 2.1 | Required field kosong | 6 |
| 2.2 | Format salah | 13 |
| 2.3 | Duplicate/unique conflict | 3 |
| 2.5 | State transition invalid | 2 |
| 2.6 | Operasi pada record invalid/tak eksis | 4 |
| 2.8 | Reject/cancel tanpa alasan | 1 |
| 3.1 | Panjang karakter field | 9 |
| 3.2 | Nilai numerik | 1 |
| 3.3 | Ukuran file upload | 1 |
| 3.4 | Tanggal | 6 |
| 4.1 | Karakter tidak biasa (unicode/emoji/RTL/whitespace) | 18 |
| 4.2 | Aksi ganda/cepat (double submit) | 21 |
| 4.3 | Navigasi tidak biasa (back/refresh/tab baru) | 21 |
| 4.4 | Race condition | 4 |
| 4.5 | Session/koneksi terputus | 23 |
| 4.6 | Data kosong/null (empty state) | 5 |
| 4.7 | Konkurensi multi-user edit | 18 |
| 4.8 | Behavior non-obvious terdokumentasi | 22 |
| 5.1-SQLi | SQL Injection | 16 |
| 5.1-XSS-Stored | Stored XSS | 7 |
| 5.1-XSS-Reflected | Reflected XSS | 7 |
| 5.1-CmdPath | Command/Path injection | 2 |
| 5.1-SSRF | SSRF | 4 |
| 5.2-PrivEsc | Privilege escalation | 1 |
| 5.2-MassAssign | Mass assignment | 11 |
| 5.3-Rename | Upload file di-rename | 1 |
| 5.3-ContentType | Content-Type spoofing | 1 |
| 5.3-DoubleExt | Double extension | 1 |
| 5.3-Oversize | Oversized file | 1 |
| 5.3-Filename | Malicious filename | 1 |
| 5.4 | CSRF | 14 |
| 5.5 | Rate limit / brute force / spam | 12 |
| 5.9 | Business logic abuse | 2 |
| 6.2 | Response schema/contract | 5 |
| 6.3 | Request method salah (405) | 6 |
| 6.4 | Auth/token (tanpa sesi / sesi user lain) | 5 |
| 6.5 | Parameter negatif (tipe salah/extra/null) | 15 |
| 6.7 | Idempotency | 6 |
| 8.4 | Konsistensi pesan | 19 |
