# Taxonomy Coverage Matrix

Scope: the 12 sidebar modules (Admin, PIM, Leave, Time, Recruitment, My Info, Performance, Dashboard, Directory, Maintenance, Claim, Buzz) plus the sidebar Search box -- 109 menu units taken from a live click-through. Login and header items are outside this matrix (their existing TCs still run). Full cell-level detail (TC ids per cell, N/A reasons) lives in `docs/Taxonomy-Coverage-Matrix.xlsx`.

| Module | COVERED | GAP | N/A | Coverage of applicable |
|---|---:|---:|---:|---:|
| Admin | 440 | 656 | 608 | 40.1% |
| Buzz | 32 | 26 | 13 | 55.2% |
| Claim | 153 | 157 | 187 | 49.4% |
| Dashboard | 11 | 25 | 106 | 30.6% |
| Directory | 10 | 16 | 45 | 38.5% |
| Leave | 185 | 314 | 424 | 37.1% |
| Maintenance | 30 | 67 | 116 | 30.9% |
| My Info | 11 | 451 | 319 | 2.4% |
| PIM | 352 | 574 | 494 | 38.0% |
| Performance | 171 | 250 | 289 | 40.6% |
| Recruitment | 114 | 102 | 68 | 52.8% |
| Sidebar | 0 | 24 | 47 | 0.0% |
| Time | 170 | 312 | 370 | 35.3% |
| **Total** | **1679** | **2974** | **3086** | **36.1%** |

Weak TCs (not counted as coverage): 23 -- see the xlsx sheet "Weak TCs".

## Gap backlog by taxonomy item

| Item | Taxonomy | Units with GAP |
|---|---|---:|
| 1.1-C | Create valid | 12 |
| 1.1-R | Read / list | 56 |
| 1.1-U | Update valid | 61 |
| 1.1-D | Delete valid | 28 |
| 1.2 | Variasi input valid (opsional diisi/kosong) | 81 |
| 1.3 | State transition valid | 6 |
| 1.4 | Relasi antar-entity | 70 |
| 1.5 | Permission/role positif | 13 |
| 1.6 | Search/filter/sort valid | 62 |
| 1.7 | Upload file valid | 1 |
| 1.8 | Notifikasi/feedback UI | 83 |
| 2.1 | Required field kosong | 49 |
| 2.2 | Format salah | 22 |
| 2.3 | Duplicate/unique conflict | 14 |
| 2.4 | Aksi tanpa permission (UI/API) | 82 |
| 2.5 | State transition invalid | 13 |
| 2.6 | Operasi pada record invalid/tak eksis | 78 |
| 2.8 | Reject/cancel tanpa alasan | 6 |
| 3.1 | Panjang karakter field | 8 |
| 3.2 | Nilai numerik | 2 |
| 3.3 | Ukuran file upload | 7 |
| 3.4 | Tanggal | 26 |
| 3.5 | Pagination | 67 |
| 3.6 | Jumlah hasil (0/1/limit) | 38 |
| 4.1 | Karakter tidak biasa (unicode/emoji/RTL/whitespace) | 79 |
| 4.2 | Aksi ganda/cepat (double submit) | 77 |
| 4.3 | Navigasi tidak biasa (back/refresh/tab baru) | 48 |
| 4.4 | Race condition | 17 |
| 4.5 | Session/koneksi terputus | 71 |
| 4.6 | Data kosong/null (empty state) | 105 |
| 4.7 | Konkurensi multi-user edit | 75 |
| 4.8 | Behavior non-obvious terdokumentasi | 14 |
| 5.1-SQLi | SQL Injection | 62 |
| 5.1-XSS-Stored | Stored XSS | 27 |
| 5.1-XSS-Reflected | Reflected XSS | 22 |
| 5.1-CmdPath | Command/Path injection | 14 |
| 5.1-SSRF | SSRF | 5 |
| 5.2-IDOR | IDOR | 70 |
| 5.2-BFLAC | Broken function level access control | 62 |
| 5.2-PrivEsc | Privilege escalation | 29 |
| 5.2-MassAssign | Mass assignment | 82 |
| 5.3-BadExt | Upload ekstensi terlarang | 4 |
| 5.3-Rename | Upload file di-rename | 6 |
| 5.3-ContentType | Content-Type spoofing | 2 |
| 5.3-DoubleExt | Double extension | 10 |
| 5.3-Oversize | Oversized file | 7 |
| 5.3-Filename | Malicious filename | 11 |
| 5.4 | CSRF | 80 |
| 5.5 | Rate limit / brute force / spam | 58 |
| 5.6 | Security headers | 14 |
| 5.8 | Sensitive data exposure | 14 |
| 5.9 | Business logic abuse | 20 |
| 6.1 | Status code benar | 12 |
| 6.2 | Response schema/contract | 94 |
| 6.3 | Request method salah (405) | 105 |
| 6.4 | Auth/token (tanpa sesi / sesi user lain) | 107 |
| 6.5 | Parameter negatif (tipe salah/extra/null) | 102 |
| 6.6 | Pagination & sorting param | 65 |
| 6.7 | Idempotency | 51 |
| 7.1 | JS console error | 12 |
| 7.2 | Network anomali | 12 |
| 7.3 | Resource 404 | 12 |
| 7.4 | Warning log | 14 |
| 7.5 | Performance dasar | 14 |
| 8.1 | Responsive/layout | 109 |
| 8.2 | Cross-browser | 109 |
| 8.3 | Accessibility dasar | 103 |
| 8.4 | Konsistensi pesan | 83 |
