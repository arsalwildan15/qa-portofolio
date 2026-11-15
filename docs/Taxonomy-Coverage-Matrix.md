# Taxonomy Coverage Matrix

Generated from the live menu inventory (107 units) and all spec files. Full cell-level detail (TC ids per cell, N/A reasons) lives in `docs/Taxonomy-Coverage-Matrix.xlsx`.

| Module | COVERED | GAP | N/A | Coverage of applicable |
|---|---:|---:|---:|---:|
| Admin | 440 | 656 | 608 | 40.1% |
| Buzz | 32 | 26 | 13 | 55.2% |
| Claim | 153 | 157 | 187 | 49.4% |
| Dashboard | 11 | 25 | 106 | 30.6% |
| Directory | 10 | 16 | 45 | 38.5% |
| Header | 21 | 93 | 241 | 18.4% |
| Leave | 185 | 314 | 424 | 37.1% |
| Login | 35 | 58 | 120 | 37.6% |
| Maintenance | 30 | 67 | 116 | 30.9% |
| My Info | 11 | 30 | 30 | 26.8% |
| PIM | 352 | 574 | 494 | 38.0% |
| Performance | 171 | 250 | 289 | 40.6% |
| Recruitment | 114 | 102 | 68 | 52.8% |
| Sidebar | 0 | 24 | 47 | 0.0% |
| Time | 170 | 312 | 370 | 35.3% |
| **Total** | **1735** | **2704** | **3158** | **39.1%** |

Weak TCs (not counted as coverage): 23 -- see the xlsx sheet "Weak TCs".

## Gap backlog by taxonomy item

| Item | Taxonomy | Units with GAP |
|---|---|---:|
| 1.1-C | Create valid | 6 |
| 1.1-R | Read / list | 54 |
| 1.1-U | Update valid | 55 |
| 1.1-D | Delete valid | 22 |
| 1.2 | Variasi input valid (opsional diisi/kosong) | 75 |
| 1.3 | State transition valid | 6 |
| 1.4 | Relasi antar-entity | 63 |
| 1.5 | Permission/role positif | 9 |
| 1.6 | Search/filter/sort valid | 53 |
| 1.8 | Notifikasi/feedback UI | 77 |
| 2.1 | Required field kosong | 45 |
| 2.2 | Format salah | 17 |
| 2.3 | Duplicate/unique conflict | 14 |
| 2.4 | Aksi tanpa permission (UI/API) | 76 |
| 2.5 | State transition invalid | 13 |
| 2.6 | Operasi pada record invalid/tak eksis | 68 |
| 2.7 | Kredensial/auth salah | 3 |
| 2.8 | Reject/cancel tanpa alasan | 6 |
| 3.1 | Panjang karakter field | 2 |
| 3.2 | Nilai numerik | 1 |
| 3.3 | Ukuran file upload | 6 |
| 3.4 | Tanggal | 22 |
| 3.5 | Pagination | 58 |
| 3.6 | Jumlah hasil (0/1/limit) | 29 |
| 4.1 | Karakter tidak biasa (unicode/emoji/RTL/whitespace) | 74 |
| 4.2 | Aksi ganda/cepat (double submit) | 73 |
| 4.3 | Navigasi tidak biasa (back/refresh/tab baru) | 43 |
| 4.4 | Race condition | 17 |
| 4.5 | Session/koneksi terputus | 67 |
| 4.6 | Data kosong/null (empty state) | 102 |
| 4.7 | Konkurensi multi-user edit | 69 |
| 4.8 | Behavior non-obvious terdokumentasi | 10 |
| 5.1-SQLi | SQL Injection | 57 |
| 5.1-XSS-Stored | Stored XSS | 21 |
| 5.1-XSS-Reflected | Reflected XSS | 26 |
| 5.1-CmdPath | Command/Path injection | 13 |
| 5.1-SSRF | SSRF | 5 |
| 5.2-IDOR | IDOR | 60 |
| 5.2-BFLAC | Broken function level access control | 62 |
| 5.2-PrivEsc | Privilege escalation | 20 |
| 5.2-MassAssign | Mass assignment | 76 |
| 5.2-OpenRedirect | Open redirect | 1 |
| 5.3-BadExt | Upload ekstensi terlarang | 3 |
| 5.3-Rename | Upload file di-rename | 5 |
| 5.3-ContentType | Content-Type spoofing | 1 |
| 5.3-DoubleExt | Double extension | 9 |
| 5.3-Oversize | Oversized file | 6 |
| 5.3-Filename | Malicious filename | 10 |
| 5.4 | CSRF | 74 |
| 5.5 | Rate limit / brute force / spam | 55 |
| 5.6 | Security headers | 8 |
| 5.7 | Session security | 2 |
| 5.8 | Sensitive data exposure | 9 |
| 5.9 | Business logic abuse | 19 |
| 6.1 | Status code benar | 5 |
| 6.2 | Response schema/contract | 92 |
| 6.3 | Request method salah (405) | 103 |
| 6.4 | Auth/token (tanpa sesi / sesi user lain) | 105 |
| 6.5 | Parameter negatif (tipe salah/extra/null) | 93 |
| 6.6 | Pagination & sorting param | 56 |
| 6.7 | Idempotency | 45 |
| 7.1 | JS console error | 5 |
| 7.2 | Network anomali | 5 |
| 7.3 | Resource 404 | 5 |
| 7.4 | Warning log | 10 |
| 7.5 | Performance dasar | 10 |
| 8.1 | Responsive/layout | 107 |
| 8.2 | Cross-browser | 107 |
| 8.3 | Accessibility dasar | 99 |
| 8.4 | Konsistensi pesan | 80 |
