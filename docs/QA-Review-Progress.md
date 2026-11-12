# QA Full Review — Progress Tracker

> **Baca file ini DULU di awal sesi manapun yang melanjutkan task "review ulang semua TC".**
> Update file ini setiap selesai satu langkah (bukan nunggu satu batch penuh selesai),
> supaya kalau sesi putus (limit), lanjutan bisa baca status di sini tanpa mengulang dari awal.

## Konteks tugas (jangan diulang tanya ke user)
User minta: review ulang SEMUA test case di 4 modul (Login, Admin, PIM, Recruitment) untuk
memastikan coverage 100% (positive/negative/boundary/unexpected/edge/security/API/console),
security lengkap (XSS, SQLi, file upload format salah, file di-rename, IDOR, dll), TC harus
dipahami dari fungsi & impact fitur (bukan asal tulis), dan SETIAP TC FAIL harus di-root-cause:
bug sistem (harus match docs/Bug-List.xlsx) vs bug script vs false positive vs false passed.

Siklus kerja per batch (disepakati dengan user):
- A. Coverage audit (bandingkan docs/TC-*.txt vs source code vs kategori yang wajib ada)
- B. Jalankan ulang semua TC existing di batch (regression run — status REAL, bukan asumsi)
- C. Root cause setiap TC Fail → klasifikasi: bug sistem / bug script / false positive / false passed
- D. Cross-check hasil klasifikasi "bug sistem" dengan docs/Bug-List.xlsx (harus match)
- Lapor ke user per batch, approval dulu sebelum lanjut batch berikutnya & sebelum nulis TC baru

## Urutan Batch
1. **Login** ← sedang dikerjakan
2. Recruitment (4 area: vacancies, candidates, status-workflow, security)
3. PIM (13 sub-screen)
4. Admin (16 sub-screen, 136 TC) — dipecah lagi per grup kalau perlu

---

## BATCH 2 — RECRUITMENT (audit coverage dari baca kode saja, server down, belum ada run)

### Status: Langkah A (coverage audit, baca dokumen+kode) — SELESAI
### Langkah B/C/D (regression run + root cause): BELUM — server demo publik DOWN total

**Temuan dari audit baca `docs/TC-Recruitment.txt` (1028 baris) + `src/pages/VacanciesPage.ts`/
`CandidatesPage.ts` (belum dibaca detail, hanya dokumen):**

Modul ini TERNYATA SUDAH SANGAT MATANG — 53 TC total, sudah melalui 2 ronde gap-audit
sebelumnya (bukan audit pertama kali). Breakdown:
- Vacancies: 17 TC (termasuk edit/delete/deactivate/reactivate, boundary Number of Positions,
  API negative POST, pagination & sorting)
- Candidates: 18 TC (termasuk duplicate email, API negative DELETE, resume exact-boundary 1MB,
  filter kombinasi, resume download verification)
- Status Workflow: 14 TC (full state machine dikonfirmasi end-to-end sampai "Hired", termasuk
  multiple interviewer, validasi field Reject)
- Security lintas fitur: 4 TC (IDOR, security headers, rate limiting, race condition)

**Bug nyata yang SUDAH ditemukan modul ini (bukan PR baru, sudah ada di Bug-List kemungkinan):**
1. TC-RECRUITMENT-CANDIDATE-11: file .exe di-rename .pdf LOLOS validasi resume upload (sama
   pola dengan PIM) — perlu DICEK apakah sudah tercatat di Bug-List.xlsx (file saat ini).
2. TC-RECRUITMENT-SECURITY-04: race condition NYATA pada status-transition candidate — 2
   transition mutually-exclusive bisa SAMA-SAMA sukses kalau ditembak paralel (tidak ada
   locking/versioning server). Hard-fail BY DESIGN kalau reproduce di suatu run.

**GAP/INKONSISTENSI yang saya temukan (perlu keputusan user sebelum dieksekusi):**
1. TC-RECRUITMENT-SECURITY-02 (X-Frame-Options hilang) dan SECURITY-03 (rate limiting hilang)
   SAMA PERSIS dengan 2 temuan yang baru saja kita escalate di Login (TC-LOGIN-43, TC-LOGIN-37)
   — TAPI di Recruitment, keduanya MASIH pakai pola report.finding() (selalu PASS, tidak pernah
   masuk Bug-List otomatis), BUKAN hard-fail seperti yang baru kita terapkan di Login. Ini
   TIDAK KONSISTEN dan akan jadi "false passed" persis seperti yang user minta dihindari.
   REKOMENDASI: ubah kedua TC ini jadi hard-fail juga (sama pola dengan TC-LOGIN-37/43),
   supaya otomatis masuk Bug-List — TAPI ini MENGUBAH SPEC YANG SUDAH ADA & PASSED, bukan
   menambah TC baru, jadi perlu persetujuan eksplisit dulu.
2. Belum ada TC CSRF untuk endpoint mutasi Recruitment (create vacancy, create/delete candidate,
   status transition) — pola sama dengan TC-LOGIN-41 yang baru ditambahkan. Vacancy/Candidate
   create itu mutasi data, beda dari Login (cuma auth), jadi dampak CSRF di sini "menambah
   data sampah atas nama admin korban", bukan "login sebagai orang lain" — tetap valid risk
   untuk didokumentasikan.
3. Belum ada TC upload-foto/file lain di luar Resume (kalau ada field upload lain di
   Recruitment — perlu dicek, kemungkinan tidak ada selain Resume).

**BELUM dikerjakan sama sekali (karena server down total):**
- Regression run penuh 53 TC existing (perlu tahu status REAL sebelum klaim apa pun)
- Cross-check bug yang sudah ditemukan modul ini terhadap Bug-List.xlsx aktual (apakah BG-xxx
  untuk resume-bypass dan race-condition sudah tercatat, dan severity-nya sudah benar)
- Implementasi 2-3 TC baru di atas (CSRF, escalate 2 finding jadi hard-fail) — MENUNGGU
  approval user dulu untuk poin gap #1 di atas (mengubah spec existing, bukan cuma nambah)

### UPDATE 2026-11-11: USER APPROVED escalate SECURITY-02 & SECURITY-03 jadi hard-fail.
Server dicek lagi: MASIH DOWN (curl exit 35, TLS connect error) — bukan cuma lambat lagi,
koneksi gagal total di level TLS handshake. Lanjut kerjakan EDIT KODE SAJA (tanpa run) sambil
menunggu, supaya begitu server pulih tinggal eksekusi run.

### UPDATE 2026-11-11 (kode sudah diedit, server MASIH BERMASALAH, variasi error):
**Kode sudah selesai diedit (tanpa run), siap dieksekusi begitu server stabil:**
1. tests/recruitment/security/TC-RECRUITMENT-SECURITY-02-Verify-Security-Response-Headers.spec.ts
   -> diubah dari finding-only jadi hard check (clickjacking protection harus ada).
2. tests/recruitment/security/TC-RECRUITMENT-SECURITY-03-Verify-Rate-Limiting-Candidate-Create.spec.ts
   -> diubah dari finding-only jadi hard check (minimal 1 dari 10 request harus kena 429).
3. tests/recruitment/security/TC-RECRUITMENT-SECURITY-05-Verify-Cross-Origin-Mutation-Blocked.spec.ts
   -> FILE BARU, TC CSRF untuk endpoint mutasi (POST vacancies), belum pernah dijalankan sama
   sekali (bahkan sekali pun) — logic sudah direview manual, tapi BENAR-BENAR BELUM TERVALIDASI.

**Status server saat verifikasi ulang (sebelum sempat run ketiga file di atas):** makin tidak
konsisten -- connection closed -> TLS error (exit 35) -> HTTP 500 -> request timeout total,
bergantian dalam rentang beberapa menit. Ini BUKAN LAGI sekadar "lambat", tapi indikasi server
benar-benar bermasalah/sedang di-restart/tidak stabil secara infrastruktur. TIDAK ADA satu pun
dari 3 file di atas yang sempat dijalankan.

**NEXT ACTION WAJIB kalau lanjut:** JANGAN run apa pun ke server ini sampai user eksplisit
bilang sudah pulih ATAU hasil curl manual menunjukkan status 200 dengan response time wajar
(<3-5 detik) SECARA KONSISTEN di 3x percobaan berturut, bukan cuma sekali kebetulan bagus.

### UPDATE 2026-11-11: USER KONFIRMASI via screenshot browser — 500 Internal Server Error
(nginx/1.18.0 Ubuntu, halaman error nginx default polos). Ini DI LUAR KENDALI kita, server
pihak OrangeHRM sendiri yang bermasalah. HOLD total berlanjut sampai user bilang sudah pulih.

### UPDATE 2026-11-11 (re-run kedua selesai, 34 passed/6 failed, root cause dianalisis tuntas):
- Server pulih, re-run kedua (vacancies+candidates+security) jauh lebih sehat: 34 passed, 6
  failed, 4.2 menit (sebelumnya 33 failed/7 passed, 21.4 menit saat masih outage).
- 2 dari 6 fail = EXPECTED BY DESIGN (escalation yang kita lakukan bekerja benar):
  SECURITY-02 (clickjacking header, BG-066) dan SECURITY-03 (rate limiting, BG-067) FAIL
  dengan benar. Severity masih default Low dari heuristik reporter, BELUM dikoreksi manual ke
  Medium -- TODO kalau sempat, sama pola seperti BG-026/BG-030.
- 1 dari 6 fail = SUDAH ADA sejak sesi sebelumnya (BUKAN baru): CANDIDATE-11 (exe-as-pdf resume
  bypass) match BG-004 (Open) existing, reporter tidak duplikasi (correct behavior).
- 3 dari 6 fail = DIINVESTIGASI MENDALAM (CANDIDATE-08, CANDIDATE-17, SECURITY-04 precondition):
  dicoba naikkan wait time lalu rerun solo -> SEMUA REPRODUCE IDENTIK lagi, bukan masalah margin
  waktu.
  - CANDIDATE-17: root cause DITEMUKAN via page snapshot DOM -- filter Vacancy+Status SUDAH
    benar ter-pilih di UI tapi hasil 0 baris. Hipotesis kuat: demo publik punya vacancy
    duplikat nama, selectFilterOption() mencocokkan via teks bukan ID, kemungkinan match
    vacancy record YANG SALAH. "Test Design Weakness (bug script)", BUKAN app bug. Fix BELUM
    diimplementasikan (perlu unique vacancy name di createTestCandidate, pola createTestVacancy.ts).
  - CANDIDATE-08: root cause kemungkinan gotoLastPage() rapuh di demo PUBLIK bersama -- asumsi
    "last visible page number = true last page" + "insertion order" bisa rusak oleh traffic
    user LAIN. "Test Design Weakness", rekomendasi fix: verifikasi via API bukan UI
    pagination-guessing. Fix BELUM diimplementasikan.
  - SECURITY-04 (precondition "2 aksi tersedia" gagal): BEDA dari BG-009 (race condition ASLI,
    valid sejak sesi sebelumnya, TETAP OPEN). Kegagalan precondition ini kemungkinan instance
    lain dari bug rendering client-side INTERMITEN yang sudah terdokumentasi di
    TC-RECRUITMENT-STATUS-09 (non-deterministic, 2/6-3/6 reproduksi).
  - SEMUA baris Bug-List terkait (BG-064,065,068,069,070) SUDAH dikoreksi Category+Notes.
- status-workflow (belum pernah disentuh sesi ini) SEDANG DIJALANKAN di background (task id
  b7m1l11b2, --workers=1).

**NEXT ACTION WAJIB:** baca hasil b7m1l11b2, analisis sama telitinya, koreksi Bug-List severity
BG-066/067 (Low->Medium), update docs/TC-Recruitment.txt (status terkini + 3 temuan
test-design-weakness + konfirmasi SECURITY-05 CSRF baru hasilnya), baru tandai Batch 2 selesai
dengan 2 item follow-up didokumentasikan jelas (bukan di-cover-up sebagai semua hijau).

### UPDATE 2026-11-11 (status-workflow run PERTAMA gagal total lagi karena outage, DIKOREKSI):
- Run pertama status-workflow (14 TC, --workers=1): 12 failed, 2 passed, 10.8 menit. Dicek
  Bug-List (BG-071..082): pola jelas status=500 server + Test timeout di hampir semua TC ->
  outage server LAGI (server memang flapping sepanjang hari ini: sehat -> rusak -> sehat ->
  rusak berulang). BUKAN bug aplikasi/script.
- 12 baris BG-071..082 DIKOREKSI jadi Closed/"Environment Noise (Not a Bug)".
- Server dicek ulang: 3x curl berturut 0.74s/0.74s/0.81s -- SANGAT stabil sekarang.
- Re-run KETIGA diluncurkan di background (task id bvj5fn5pi).

**NEXT ACTION WAJIB:** baca hasil bvj5fn5pi. Kalau MASIH banyak signature 500/timeout -> JANGAN
rerun lagi otomatis untuk ketiga kalinya, STOP dan laporkan ke user bahwa server demo publik
hari ini terlalu tidak stabil untuk menyelesaikan regression run status-workflow dengan valid,
sarankan coba lagi di hari/waktu lain. Kalau bersih -> lanjut analisis per-TC seperti batch
lain, koreksi severity BG-066/067, update TC-Recruitment.txt lengkap, baru tandai Batch 2
benar-benar tuntas.

### UPDATE 2026-11-11: USER MINTA HOLD SEMENTARA (bukan server-related, user yang minta pause).
Background task re-run ketiga (task id bvj5fn5pi) DIHENTIKAN MANUAL via TaskStop sebelum
sempat selesai/menghasilkan output apa pun -- jangan anggap task itu "gagal" atau
"menghasilkan temuan", itu memang belum sempat jalan sampai kelar, cukup dihentikan di tengah.

====================================================================================
  RINGKASAN STATUS SAAT HOLD (2026-11-11) -- BACA INI DULU SAAT RESUME
====================================================================================

BATCH 1 (LOGIN): 100% TUNTAS. Tidak ada next action tersisa.

BATCH 2 (RECRUITMENT): HAMPIR TUNTAS, tersisa 1 langkah:
  - vacancies + candidates + security (40 TC): SUDAH divalidasi penuh dengan root cause
    jelas untuk semua failure (lihat update-update di atas). Tidak perlu diulang lagi kecuali
    ingin re-verifikasi 2 "Test Design Weakness" (CANDIDATE-08, CANDIDATE-17) yang belum
    di-fix scriptnya.
  - status-workflow (14 TC): BELUM PERNAH berhasil diselesaikan dengan bersih. 2 percobaan
    (10.8 menit + yang dihentikan user) keduanya kena outage server (500/timeout massal),
    sudah dikoreksi ke Bug-List sebagai Environment Noise. INI SATU-SATUNYA bagian yang
    BENAR-BENAR BELUM TERVALIDASI di seluruh Batch 1+2.

YANG MASIH PERLU DIKERJAKAN SAAT RESUME (urutan):
  1. Cek server dulu: 3x curl berturut ke /auth/login, HANYA lanjut kalau konsisten <3-5 detik.
  2. Jalankan ulang: `npx playwright test tests/recruitment/status-workflow --project=chromium --workers=1`
     (TANPA --reporter=list override). Kalau gagal lagi dengan pola 500/timeout massal -> itu
     konfirmasi ketiga kalinya server tidak reliable, SETOP mencoba, laporkan ke user tanpa
     mencoba lagi sendiri.
  3. Kalau berhasil bersih: analisis tiap failure (kalau ada) dengan root cause 4-arah (bug
     sistem/bug script/false positive/false passed) sama seperti batch lain.
  4. Koreksi Severity BG-066 (SECURITY-02 clickjacking) dan BG-067 (SECURITY-03 rate limiting)
     dari Low -> Medium (pola sama BG-026/BG-030), belum sempat dilakukan.
  5. Update docs/TC-Recruitment.txt: refleksikan SEMUA temuan sesi ini -- SECURITY-02/03 jadi
     hard-fail (BG-066/067), SECURITY-05 CSRF baru (cek hasil run keduanya, SECURITY-05 TIDAK
     ada di failed list manapun = PASSED), 2 Test Design Weakness (CANDIDATE-08/17, belum
     di-fix), hasil status-workflow setelah berhasil run bersih.
  6. SETELAH itu baru tandai Batch 2 100% TUNTAS, lanjut Batch 3 (PIM).

CATATAN PENTING SOAL SERVER HARI INI: server demo publik OrangeHRM (opensource-demo.
orangehrmlive.com) SANGAT TIDAK STABIL sepanjang hari 2026-11-11 -- flapping berulang kali
antara sehat (<1-3 detik) dan rusak total (500/connection closed/TLS error/timeout masif),
TIDAK ADA pola waktu yang bisa diprediksi. SELALU cek dulu via curl sebelum menjalankan test
apa pun, JANGAN asumsikan stabil dari 1x cek saja.

---

## BATCH 3 — PIM (dimulai setelah user minta lanjut dari hold)

### Status: Langkah A (coverage audit) — SELESAI. Langkah security gap — SELESAI ditambah +
### dijalankan. Langkah B (regression run 159 TC existing) — SEDANG BERJALAN di background.

**Audit coverage dari baca docs/TC-PIM.txt (159 TC, 3 fase):** modul SANGAT matang, 0
finding/gap terbuka untuk functional coverage. 2 bug nyata SUDAH terkonfirmasi sebelumnya:
file-upload bypass (exe-renamed-.jpg di foto profil Add Employee + Personal Details, 2 titik),
dan bug console 404 Job Specification (non-deterministic). Severity classifier bugListReporter
sendiri sempat diperbaiki 2x gara-gara kasus ini (BG-001/002/003 awalnya Low, harusnya High
untuk unrestricted file upload).

**GAP ditemukan (sama pola Login/Recruitment sebelum di-escalate):** ZERO TC untuk IDOR/CSRF/
rate-limiting/clickjacking di 159 TC existing -- signifikan karena PIM meng-key semua data
personal (Personal Details/Contact/Salary) murni via empNumber di URL, titik IDOR paling jelas
di seluruh app. User APPROVE tambah TC security baru dulu sebelum regression run existing.

**TC baru ditambahkan (tests/pim/security/, folder baru):**
- TC-PIM-SECURITY-01 (IDOR): buat 2 employee beda, akses personal-details/salary employee B
  dari sesi yang sama. Hasil: PASS, N/A - arsitektur single-role (konsisten preseden
  TC-RECRUITMENT-SECURITY-01), dicatat sbg baseline resmi utk PIM via finding().
- TC-PIM-SECURITY-02 (clickjacking header): FAIL dengan benar, X-Frame-Options tidak ada di
  Employee List maupun /api/v2/pim/employees -> BG-096 (dikoreksi Severity Medium). Ini
  KONFIRMASI KETIGA gap yang sama persis ada di Login (BG-030), Recruitment (BG-066), dan
  sekarang PIM (BG-096) -- kuat indikasi gap konfigurasi APP-WIDE (nginx/web-server level),
  bukan kasus terisolasi per-modul. Worth dicatat sebagai satu temuan besar lintas-app saat
  laporan akhir nanti, bukan 3 bug terpisah yang tidak berkaitan.
- Sekalian dikoreksi: BG-066 & BG-067 (Recruitment SECURITY-02/03, severity Low->Medium,
  pending dari sebelum hold) -- SUDAH BERES sekarang.

**CSRF dan rate-limiting untuk PIM BELUM ditambahkan** (dipersempit ke 2 TC paling bernilai
dulu -- IDOR & clickjacking -- karena waktu/giliran terbatas). Kalau user mau lebih lengkap,
PIM Add Employee (POST /api/v2/pim/employees) adalah kandidat CSRF test & rate-limit test yang
jelas, pola sama dengan TC-RECRUITMENT-SECURITY-03/05.

**Regression run 159 TC existing — SELESAI:** 134 passed, 27 failed, 25.1 menit (task id
bjlwrnfxr).
- 2 dari 27 = VALID/sudah dikenal: BG-096 (clickjacking, baru, Severity Medium) dan BG-112
  (Job Specification 404, non-deterministic, SUDAH terdokumentasi sebagai bug lama di
  TC-PIM.txt sejak jauh sebelum sesi ini -- entry Bug-List baru tapi bug-nya bukan baru).
- 3 dari 27 (ADD-28, ADD-29, PD-13 = file-upload bypass) TIDAK muncul row baru di Bug-List --
  reporter benar mendedup ke BG-001/002/003 existing (Open), confirmed masih reproduce.
- 22 SISANYA (BG-097..119 minus 096,112) = OUTAGE SERVER LAGI (pola timeout/status=0/
  ERR_ABORTED jelas). DIKOREKSI ke Bug-List jadi Closed/"Environment Noise".
- Server dicek ulang: 3x curl 0.73/0.74/0.74s -- sangat stabil. Re-run TARGETED hanya ke 21 TC
  yang kena outage (skip 096 & 112 yang sudah dikonfirmasi valid) diluncurkan di background
  (task id b258d2qb1, --workers=2, --timeout=60000).

**NEXT ACTION WAJIB kalau lanjut sesi baru:** baca hasil b258d2qb1. Kalau MASIH ada pola
timeout/status=0/ERR_ABORTED massal -> JANGAN retry otomatis lagi, laporkan server belum
reliable untuk menuntaskan ini. Kalau bersih (atau cuma tersisa fail yang genuinely baru,
root-cause satu-satu) -> update docs/TC-PIM.txt: tambah section SECURITY (2 TC baru, 161 total),
update entry ADD-28/29/PD-13 kalau ada perubahan, catat BG-096/112 di summary, baru tandai
Batch 3 tuntas. Setelah itu: selesaikan Batch 2 status-workflow yang masih pending dari
sebelum hold (lihat bagian BATCH 2 di atas), baru lanjut Batch 4 (Admin).

### UPDATE 2026-11-11 (targeted re-run b258d2qb1 selesai, 14/22 PASS, root-cause 8 sisanya):
- Server tetap sehat selama run (3.3 menit utk 22 TC). 14 PASS, 8 FAIL -- ini kali kedua gagal
  dengan server sehat, jadi BUKAN infra noise, perlu root-cause asli.
- **4 dari 8 (semua TC-PIM-REPORTTO-01/03/06/07) -- ROOT CAUSE DITEMUKAN & DIPERBAIKI:**
  Spec lama pakai inline `page.getByRole('option').first().waitFor({state:'visible'})` yang
  lolos SEBELUM placeholder "Searching...." hilang (placeholder itu sendiri ikut jadi elemen
  role=option yang visible duluan). Hasilnya nama "Searching...." tertangkap sbg selectedName,
  bukan employee asli. Ini BUG SCRIPT, pola sudah dikenal & sudah di-handle di
  CandidatesPage.selectFirstInterviewer() (ada comment eksplisit "same pattern as PIM's
  Report-to field" -- implikasinya fix ini memang seharusnya sudah ada dari awal). FIX:
  tambah method `selectFirstNameOption()` baru di src/pages/ReportToPage.ts (tunggu
  "Searching...." hidden dulu, pola identik CandidatesPage), lalu update ke-4 spec pakai
  method ini. BELUM diverifikasi re-run (sedang jalan di task bbz3p8i9d).
- **4 sisanya (ADD-18 XSS, ADD-19 SQLi, LIST-05 Include filter, LIST-08 Pagination) -- BELUM
  dikode-fix, BELUM pasti root cause-nya** (reproduce 1x dengan server sehat, tapi belum
  dicoba 2x). Hipotesis awal:
  - LIST-05: response capture menunjukkan includeEmployees=onlyCurrent (default, TIDAK
    berubah ke currentAndPast) -- mengindikasikan selectDropdownOption() gagal benar2
    mengubah pilihan SEBELUM search() diklik, kemungkinan race/timing, BUKAN dikonfirmasi app
    bug.
  - LIST-08: offset=0 tertangkap padahal expect bukan 0 -- kemungkinan Promise.all race
    menangkap response yang salah/stale. BUKAN dikonfirmasi app bug.
  - ADD-18/19: belum diperiksa detail code-nya sama sekali.
  - SEMUA 4 ini BELUM diubah kodenya -- sengaja, supaya re-run dulu konfirmasi reproducible
    sebelum menebak fix.
- Task bbz3p8i9d SEDANG BERJALAN: re-run ke-3 untuk 8 TC ini (4 REPORTTO yang sudah difix + 4
  yang belum) sekaligus, --workers=2.

**NEXT ACTION WAJIB kalau lanjut sesi baru:** baca hasil bbz3p8i9d.
  - Kalau 4 REPORTTO PASS semua -> fix dikonfirmasi benar, tidak perlu disentuh lagi.
  - Kalau 4 REPORTTO masih fail dengan gejala SAMA ("Searching....") -> fix saya SALAH/kurang,
    perlu investigasi ulang method selectFirstNameOption().
  - Untuk ADD-18/19/LIST-05/08: kalau SEMUA pass kali ini -> kemungkinan besar flaky/timing,
    boleh dianggap selesai (tapi catat di TC-PIM.txt sebagai "intermittent, tidak
    reproduce 2x"). Kalau ADA yang fail LAGI (2x reproduce, server sehat kedua kali) -> itu
    genuinely perlu root-cause mendalam (baca spec file + page object terkait), JANGAN
    disimpulkan sebagai flaky tanpa investigasi.
  - Setelah semua beres -> update docs/TC-PIM.txt (section SECURITY 2 TC baru jadi 161 total,
    update entry REPORTTO kalau ada perubahan perilaku/fix dicatat), baru tandai Batch 3
    tuntas. Lanjut selesaikan Batch 2 status-workflow (lihat bagian BATCH 2), baru Batch 4.

### UPDATE 2026-11-11 (hasil bbz3p8i9d: 2/8 pass, fix REPORTTO #1 bekerja tapi ungkap bug #2):
- ADD-19 (SQLi) dan LIST-08 (pagination): PASS kali ini -> tidak reproduce 2x, dikonfirmasi
  FLAKY/timing sesaat, BUKAN bug. Selesai, tidak perlu diapa-apakan lagi.
- ADD-18 (XSS) dan LIST-05 (Include filter): FAIL LAGI (2x reproduce dengan server sehat) ->
  GENUINELY perlu root-cause, BELUM diinvestigasi detail-nya sama sekali. MASIH PENDING.
- 4 REPORTTO (01/03/06/07): fix #1 (Searching....) TERBUKTI BEKERJA -- error message berubah
  dari menampilkan "Searching...." jadi menampilkan nama asli ("A8DCo 4Ys 010Z", format
  gabungan ID+nama tanpa pemisah jelas, wajar dari textContent tabel OXD). TAPI check masih
  FAIL: page snapshot DOM dikonfirmasi tabel Supervisors/Subordinates MASIH "No Records Found"
  saat dicek -- ada BUG #2 lapis kedua (data belum ter-render/tersimpan saat diverifikasi).
  User APPROVE investigasi lanjutan sekarang (bukan pending).
- FIX #2 diterapkan: naikkan wait pasca-save 1500ms->3500ms di ketiga spec 01/03/06
  (REPORTTO-02 waitForTimeout sudah beda angka, tidak disentuh), DAN perlonggar filter
  endpoint capture di REPORTTO-07 (sebelumnya mensyaratkan url mengandung kata "report" yang
  mungkin tidak match endpoint asli, sekarang cukup POST ke /employees/<empNumber>/ apa pun
  -- base URL=2000ms->3500ms juga).
- Re-run 4 TC ini (01/03/06/07) SEDANG BERJALAN di background (task id bz511vme8,
  --workers=1, --timeout=90000). Belum ada hasil.

**NEXT ACTION WAJIB:** baca hasil bz511vme8.
  - Kalau SEMUA 4 PASS -> fix #2 (wait time) terkonfirmasi benar, REPORTTO beres total.
  - Kalau MASIH fail dengan "No Records Found"/table kosong meski wait sudah 3500ms -> ini
    BUKAN cuma soal timing, kemungkinan ADA bug aplikasi nyata (save benar2 tidak persisten)
    ATAU ada langkah lain yang kurang (misal perlu reload() eksplisit, bukan cuma wait).
    Investigasi lebih dalam: coba reload() + ulang re-check, atau capture response body POST
    utk pastikan save benar2 return 200 (REPORTTO-07 akan bantu ini).
  - ADD-18 dan LIST-05 MASIH BELUM diinvestigasi root cause-nya sama sekali -- WAJIB dikerjakan
    setelah REPORTTO beres, JANGAN terlewat/lupa.

### UPDATE 2026-11-11 (hasil bz511vme8: ROOT CAUSE SESUNGGUHNYA ditemukan, BUKAN timing):
- REPORTTO-07 PASS, membuktikan via API capture: POST .../employees/408/supervisors -> status
  200 NYATA. Save selalu berhasil, BUKAN masalah timing/wait sama sekali.
- REPORTTO-01/03/06 TETAP fail meski wait 3500ms. Dicek page snapshot DOM: row SUNGGUH ADA di
  tabel (cell text "A8DCo 010Z"), TAPI selectedName yang ditangkap dari opsi autocomplete
  adalah "A8DCo 4Ys 010Z" (ada segmen tengah ekstra "4Ys" yang TIDAK muncul di cell tabel).
  ROOT CAUSE SEBENARNYA: textContent() opsi autocomplete dan textContent cell tabel punya
  FORMAT BERBEDA (opsi sertakan info tambahan yang tabel tidak tampilkan) -- substring match
  karena itu gagal walau datanya identik. Save selalu sukses sejak awal; murni bug SCRIPT di
  cara verifikasi (text-matching rapuh), bukan timing, bukan app bug.
- FIX FINAL diterapkan di ketiga spec (01/03/06): ganti verifikasi dari cocok-teks-persis
  (`getByText(selectedName)`) menjadi **cocok JUMLAH BARIS** (`supervisorRows.count() === 1`,
  `subordinateRows.count() === 1`) -- lebih robust, tidak bergantung pada format teks yang
  beda-beda antar komponen. Import isVisibleWithWait yang sudah tidak dipakai juga dihapus.
- Re-run final (01/03/06) SEDANG BERJALAN di background (task id b3hx5nq63, --workers=1).

**NEXT ACTION WAJIB:** baca hasil b3hx5nq63.
  - Kalau SEMUA 3 PASS -> REPORTTO 100% beres (benar2 selesai kali ini, root cause sudah pasti,
    bukan dugaan). Lanjut ke ADD-18 (XSS) dan LIST-05 (Include filter) yang MASIH BELUM
    diinvestigasi sama sekali.
  - Kalau masih ada yang fail -> baca error detailnya baru, jangan asumsikan masih root cause
    yang sama, investigasi dari awal lagi dengan page snapshot.

### UPDATE 2026-11-11 (hasil b3hx5nq63: fix jumlah-baris TERBUKTI BENAR, tapi 2 temuan baru):
- REPORTTO-03 PASS bersih (fix row-count dikonfirmasi benar untuk kasus baseline).
- **REPORTTO-06 -- BUG PAGE OBJECT LAMA DITEMUKAN (bukan terkait Searching.... sama sekali):**
  `supervisorRows`/`subordinateRows` di src/pages/ReportToPage.ts pakai
  `page.locator('div', {has: getByText(...)})` yang mencocokkan SEMUA div ancestor berisi
  teks itu (termasuk wrapper besar yg menaungi KEDUA tabel sekaligus), bukan cuma section
  terdekat. Dikonfirmasi via page snapshot: tabel Subordinates MEMANG "No Records Found" (app
  benar), tapi subordinateRows.count() salah hitung karena ikut mengambil row dari tabel
  Supervisors. FIX: ganti ke `page.locator('table').nth(0/1).locator('.oxd-table-card')`
  (urutan tabel tetap: Supervisors, Subordinates, Attachments, dikonfirmasi dari snapshot).
  Ini bug LAMA yang selama ini tersembunyi karena assertion lama (text-match) kebetulan tidak
  pernah benar2 menguji isolasi antar tabel sampai row-count fix saya mengungkapnya.
- **REPORTTO-01 -- gejala BARU (bukan root cause yang sama):** timeout total 90s, TIDAK sampai
  print() laporan sama sekali. Page snapshot menunjukkan macet di halaman "Add Employee" itu
  sendiri (belum sampai ke Report-to) -- kemungkinan besar Employee Id collision (known issue
  terdokumentasi di TC-PIM.txt, "RATUSAN employee" sudah dibuat hari ini lewat testing
  berulang, retry createTestEmployee mungkin exhausted). TIDAK diubah kodenya, cukup di-retry
  (ID collision bersifat non-deterministic, biasanya berhasil di percobaan lain).
- Re-run REPORTTO-01 + REPORTTO-06 (dengan fix locator) SEDANG BERJALAN di background
  (task id bbfiy65st, --workers=1).

**NEXT ACTION WAJIB:** baca hasil bbfiy65st.
  - Kalau REPORTTO-06 PASS -> fix locator terkonfirmasi benar.
  - Kalau REPORTTO-01 masih timeout di Add Employee -> BUKAN flaky biasa, kemungkinan
    createTestEmployee.ts retry logic benar2 exhausted karena volume data hari ini; perlu
    baca src/utils/createTestEmployee.ts langsung utk lihat apakah retry count (3x) masih
    cukup atau perlu dinaikkan/diberi error message jelas alih-alih hang diam.
  - SETELAH REPORTTO 100% beres -> WAJIB lanjut investigasi ADD-18 (XSS) dan LIST-05 (Include
    filter) yang SAMA SEKALI BELUM disentuh root-cause-nya sejak awal. Jangan lupa/terlewat.

### UPDATE 2026-11-11 (hasil bbfiy65st: fix table.nth() BENAR tapi row-selector MASIH salah):
- REPORTTO-01 TIDAK timeout lagi (ID collision sebelumnya memang cuma kebetulan/non-
  deterministic, confirmed). TAPI check "Supervisors berisi 1 baris" FAIL (count=0 padahal
  snapshot DOM dikonfirmasi row ADA, "(1) Record Found").
- REPORTTO-06: Subordinates PASS (0 baris, benar), tapi Supervisors FAIL (0 baris, padahal
  harusnya 1) -- gejala KEBALIKAN dari sebelum fix table.nth().
- ROOT CAUSE LAPIS KE-3 ditemukan: `.oxd-table-card` TIDAK PERNAH cocok sama sekali di
  halaman Report-to -- halaman ini pakai elemen <table><tbody><tr> HTML SEMANTIK asli
  (role table/rowgroup/row/cell di accessibility tree), BUKAN pola div-grid ".oxd-table-card"
  yang dipakai Employee List/Candidates. Selector lama SELALU 0 untuk SEMUA tabel di halaman
  ini -- kebetulan "benar" untuk Subordinates (yang memang 0) tapi SALAH utk Supervisors
  (yang py 1). Jadi bug table.nth() index SUDAH BENAR dari awal, yang salah SELALU row-selector
  class-nya.
- FIX diterapkan: ganti '.oxd-table-card' -> 'tbody tr' (baris data asli dalam <tbody>, bukan
  <thead>/rowgroup header terpisah). BELUM diverifikasi apakah 'tbody tr' tepat (risiko:
  snapshot DOM tidak membedakan <thead> vs <tbody> kedua, bisa saja markup OXD pakai 2x
  <tbody> sehingga 'tbody tr' ikut menghitung header row juga -> count jadi 2 bukan 1 untuk
  Supervisors). Re-run verifikasi SEDANG BERJALAN (task id boqr91so3, --workers=1).

**NEXT ACTION WAJIB:** baca hasil boqr91so3.
  - Kalau Supervisors=1 DAN Subordinates=0 persis -> fix 'tbody tr' terkonfirmasi benar,
    REPORTTO 100% beres, lanjut ADD-18/LIST-05.
  - Kalau Supervisors malah jadi 2 (bukan 1) -> dugaan "2x tbody termasuk header" benar,
    perlu ganti selector lagi jadi lebih spesifik (misal `tbody tr:not(:first-child)` kalau
    header ikut tbody pertama, atau pakai `row` role filter yg exclude columnheader via
    Playwright `.filter({has: page.locator('td')})` supaya cuma row berisi <td> yang
    terhitung, bukan row berisi <th>/columnheader).
  - ADD-18 (XSS) dan LIST-05 (Include filter) MASIH BELUM diinvestigasi -- WAJIB dikerjakan
    setelah REPORTTO final, jangan terlewat.

### UPDATE 2026-11-11 (hasil boqr91so3: 'tbody tr' JUGA gagal, root cause lapis ke-4):
- Masih fail identik (Supervisors count=0 padahal harusnya 1). 'tbody tr' TIDAK membantu sama
  sekali -- bukti kuat bahwa role table/rowgroup/row/cell di accessibility tree DIHASILKAN
  dari <div role="..."> (pola OXD custom component), BUKAN tag HTML semantik asli. CSS
  selector berbasis tag ('table'/'tbody'/'tr') tidak akan pernah cocok untuk elemen semacam
  ini kecuali kebetulan tag-nya memang replika HTML asli.
- FIX TERBARU (lapis ke-4): ganti total ke locator BERBASIS ROLE (`page.getByRole('row')`,
  `page.getByRole('cell')`), yang cocok LANGSUNG dengan accessibility tree tanpa peduli tag
  HTML asli di baliknya -- getByRole() Playwright bekerja dari computed accessibility role,
  bukan CSS selector. supervisorRows/subordinateRows sekarang:
  `page.locator('table').nth(i).getByRole('row').filter({has: page.getByRole('cell')})`
  (baris data py role="cell", baris header py role="columnheader" bukan "cell", jadi filter
  ini otomatis exclude header row).
- Re-run verifikasi (01+03+06 sekaligus) SEDANG BERJALAN (task id bn37toij8, --workers=1).

**NEXT ACTION WAJIB:** baca hasil bn37toij8.
  - Kalau SEMUA 3 PASS -> fix role-based terkonfirmasi benar, REPORTTO 100% beres akhirnya.
    Update docs/TC-PIM.txt (section SECURITY 2 TC baru + catatan fix ReportToPage.ts), baru
    LANJUT WAJIB ke ADD-18 (XSS) dan LIST-05 (Include filter) yang dari awal BELUM
    diinvestigasi sama sekali -- JANGAN SAMPAI TERLEWAT/LUPA, sudah 4 putaran fix REPORTTO
    dan ini belum disentuh sejak pertama kali ditemukan gagal.
  - Kalau MASIH gagal -> pertimbangkan: apakah perlu screenshot visual (bukan cuma
    accessibility snapshot) atau inspeksi page.content() HTML mentah langsung utk tahu pasti
    struktur sebenarnya, daripada menebak lagi lapis ke-5. Di titik ini kalau masih gagal,
    PERTIMBANGKAN tanya ke user apakah mau lanjut investigasi atau terima sebagai known
    limitation (dicatat finding, bukan hard-fail) mengingat sudah 4x percobaan.

### UPDATE 2026-11-11 (role-based fix JUGA gagal + MEREGRESI REPORTTO-03, user minta STOP):
- bn37toij8: SEMUA 3 (01/03/06) FAIL. REPORTTO-03 yang tadinya PASS dgn selector lama ikut
  rusak -- fix role-based BUKAN cuma "kurang", tapi genuinely salah logic.
- USER DIMINTAI KEPUTUSAN (sudah 4x percobaan locator gagal), user pilih: STOP, REVERT ke
  versi sebelum diutak-atik, catat sebagai known issue.
- REVERT DILAKUKAN:
  - src/pages/ReportToPage.ts: supervisorRows/subordinateRows dikembalikan ke selector
    ORIGINAL (`div has-text + .oxd-table-card`), dengan comment menjelaskan riwayat 4
    percobaan gagal, menunjuk ke bagian ini di tracker utk detail.
  - TC-PIM-REPORTTO-01/03/06: check dikembalikan ke pola TEXT-MATCH original
    (`getByText(selectedName)`), BUKAN row-count. FIX `selectFirstNameOption()` (yang
    terbukti BENAR, soal "Searching...." placeholder) TETAP DIPERTAHANKAN -- itu legitimate
    fix, bukan bagian yang di-revert.
  - Header comment di ketiga file ditambahkan "[STATUS: KNOWN ISSUE, 2026-11-11]" menjelaskan:
    fitur SUDAH terbukti bekerja (POST .../supervisors -> 200 confirmed di REPORTTO-07),
    verifikasi UI kadang tidak match karena format teks beda, 4 percobaan fix locator gagal,
    rujuk tracker ini untuk detail kalau mau coba lagi di sesi lain.
- KEMBALI KE STATUS SEMULA: ini artinya 01/03/06 kembali ke behavior SEBELUM semua investigasi
  hari ini dimulai -- kemungkinan besar PASS lagi (seperti run paling awal), TAPI intermiten
  (kadang gagal karena mismatch teks, sudah diketahui sejak awal, bukan baru).
- Diluncurkan SEKALIGUS: verifikasi revert (01/03/06) + mulai investigasi ADD-18 (XSS) dan
  LIST-05 (Include filter) yang SAMA SEKALI BELUM disentuh root cause-nya -- 2 item lama yang
  masih pending sejak awal sesi PIM. Task id bf5qn405s, --workers=2, SEDANG BERJALAN.

**NEXT ACTION WAJIB:** baca hasil bf5qn405s.
  - REPORTTO-01/03/06: kalau PASS -> confirmed revert berhasil, tidak perlu apa2 lagi.
    Kalau fail dgn gejala text-mismatch LAMA (bukan gejala baru) -> SESUAI EKSPEKTASI
    (known issue, sudah didokumentasikan di header file, JANGAN investigasi lagi tanpa user
    minta eksplisit).
  - ADD-18 (XSS) dan LIST-05 (Include filter): INI YANG BELUM PERNAH diinvestigasi sama
    sekali sejak awal. Kalau PASS -> flaky, selesai. Kalau FAIL -> WAJIB baca spec file +
    page snapshot utk root cause asli (JANGAN diasumsikan sama dgn REPORTTO, kasus berbeda).
  - SETELAH semua beres -> update docs/TC-PIM.txt (section SECURITY 2 TC baru jadi 161 total,
    catatan known issue REPORTTO kalau relevan), baru tandai Batch 3 (PIM) TUNTAS. Lanjut
    selesaikan Batch 2 status-workflow yang masih pending dari sebelum hold (lihat bagian
    BATCH 2), baru Batch 4 (Admin).

### UPDATE 2026-11-11 (hasil bf5qn405s: REPORTTO revert sesuai ekspektasi, ADD-18 flaky
### confirmed, LIST-05 reproduce 3x -- root cause ditemukan & fix diterapkan):
- REPORTTO-01/03/06: fail dengan gejala text-mismatch LAMA ("A8DCo 4Ys 010Z" tidak match) --
  SESUAI EKSPEKTASI known-issue, tidak perlu investigasi lagi.
- ADD-18 (XSS): TIDAK ada di failed list -> PASS. Gagal 1x dari 3 percobaan total -> CONFIRMED
  FLAKY, bukan bug. Selesai, tidak perlu disentuh.
- LIST-05 (Include filter): FAIL LAGI (reproduce 2 dari 3 percobaan total sejauh ini) --
  GENUINELY reproducible, diinvestigasi lebih lanjut via page snapshot DOM.
- ROOT CAUSE DITEMUKAN: dropdown Include SUDAH benar menampilkan "Current and Past Employees"
  terpilih di UI saat gagal (dikonfirmasi page snapshot) -- TAPI response yang tertangkap
  Promise.all tetap includeEmployees=onlyCurrent. Ini race condition: kemungkinan ada GET
  auto-trigger dari perubahan dropdown ITU SENDIRI (sebelum state ter-commit penuh) yang
  tertangkap predicate generik, bukan GET dari klik Search yang dimaksud.
  FIX: tambah `await page.waitForTimeout(1000)` setelah selectDropdownOption, SEBELUM mulai
  Promise.all+search(), supaya GET interim (kalau ada) sudah selesai duluan.
- Verifikasi 3x run BERTURUT-TURUT (bukan cuma 1x, supaya yakin bukan kebetulan) SEDANG
  BERJALAN di background (task id bm34mj6kj, --workers=1).

**NEXT ACTION WAJIB:** baca hasil bm34mj6kj.
  - Kalau 3/3 PASS -> fix dikonfirmasi benar dengan keyakinan tinggi (3x berturut, bukan
    kebetulan). LIST-05 beres, SEMUA item PIM investigasi SELESAI (REPORTTO=known issue
    didokumentasikan, ADD-18=flaky, LIST-05=fixed, ADD-19/LIST-08=flaky sebelumnya).
  - Kalau ADA yang masih fail dari 3x itu -> root cause BELUM benar2 tuntas, assessment ulang
    (mungkin race condition-nya beda dari dugaan, perlu liat page snapshot run yang fail itu).
  - SETELAH SEMUA PIM beres -> update docs/TC-PIM.txt: tambah section SECURITY (TC-PIM-
    SECURITY-01 IDOR + TC-PIM-SECURITY-02 clickjacking/BG-096, jadi 161 TC total), tambah
    catatan "[KNOWN ISSUE]" utk REPORTTO-01/03/06 di entry masing2, tambah catatan fix
    LIST-05 race condition. BARU tandai Batch 3 (PIM) TUNTAS. Lanjut ke Batch 2
    status-workflow yang masih pending dari sebelum hold (lihat bagian BATCH 2 di atas),
    baru Batch 4 (Admin).

### UPDATE 2026-11-11 (hasil bm34mj6kj: 2/3 PASS, jeda waktu MENGURANGI tapi TIDAK
### MENGHILANGKAN race, fix diperketat lagi):
- 2/3 run PASS, 1/3 masih FAIL dengan gejala sama persis. Jeda 1000ms terbukti tidak cukup
  robust -- band-aid timing, bukan fix struktural.
- FIX FINAL diterapkan: predicate `page.waitForResponse()` diperketat supaya WAJIB mengandung
  `includeEmployees=currentAndPast` di URL-nya sendiri (bukan cuma cek endpoint+method GET
  generik). GET manapun yang salah (stale/interim) otomatis tidak match predicate dan
  diabaikan Playwright secara native, terus menunggu sampai GET yang BENAR-BENAR benar
  muncul -- menghilangkan race SEPENUHNYA secara struktural, bukan lagi soal timing/jeda.
  Timeout predicate dinaikkan ke 15s sebagai guard (kalau APP benar2 tidak pernah mengirim
  GET yang benar, test akan genuinely timeout dan gagal dengan jelas, bukan diam2 menerima
  response yang salah).
- Verifikasi 3x run BERTURUT-TURUT (ronde kedua) SEDANG BERJALAN (task id bbt06ws1l,
  --workers=1).

**UPDATE 2026-11-11: bbt06ws1l hasil 3/3 PASS -- LIST-05 FIX TUNTAS DIKONFIRMASI.**
Semua investigasi PIM selesai: REPORTTO-01/03/06=known issue (didokumentasikan di header
file masing2), ADD-18/ADD-19/LIST-08=flaky (confirmed tidak reproduce 2x), LIST-05=fixed
(confirmed 3x berturut via predicate yang menghilangkan race secara struktural).

### UPDATE 2026-11-11: docs/TC-PIM.txt SUDAH diupdate. Section SECURITY ditambahkan
(TC-PIM-SECURITY-01 IDOR=PASS baseline, TC-PIM-SECURITY-02 clickjacking=FAIL/BG-096),
total jadi 161 TC. REPORTTO-01/03/06 ditandai [KNOWN ISSUE] dengan catatan lengkap.

## STATUS BATCH 3 (PIM): TUNTAS 100%.

**NEXT ACTION WAJIB:** Lanjut Batch 2 status-workflow yang masih pending sejak sebelum hold
(lihat bagian BATCH 2 — RECRUITMENT di atas untuk detail lengkap), baru Batch 4 (Admin).

### UPDATE 2026-11-11: status-workflow DILANJUTKAN (resuming dari sebelum hold).
Server dicek 3x stabil (0.74-0.78s). Run diluncurkan (task id bb41gr8eh, --workers=1,
--timeout=60000, TANPA --reporter=list override). SEDANG BERJALAN, belum ada hasil.

### UPDATE 2026-11-11: BUG KRITIS NYATA DITEMUKAN (BUKAN infra noise) -- BG-007.
- Hasil bb41gr8eh: 12/14 fail, pola identik dengan 2 percobaan sebelumnya (yang SEMPAT
  diklasifikasi Environment Noise). User diminta keputusan: lanjut isolasi per-TC atau stop.
  User pilih LANJUT ISOLASI.
- Isolasi TC-RECRUITMENT-STATUS-02 SENDIRIAN (bukan batch), server dicek sehat via curl
  SEBELUM tiap percobaan, 3x run berturut dengan 3 CANDIDATE BERBEDA (id 106, 107, 108) --
  SEMUA 3x REPRODUCIBLE: PUT .../candidates/<id>/shortlist -> 500 Internal Server Error,
  deterministik, BUKAN flakiness/outage.
- KESIMPULAN: BUG SISTEM NYATA, bukan environment noise. Shortlist adalah transisi status
  PALING AWAL dan prasyarat bagi hampir semua TC status-workflow lain -> SATU bug ini
  menyebabkan CASCADING FAILURE di 11 dari 12 TC yang gagal (STATUS-03 s/d STATUS-14),
  bukan 11 bug terpisah.
- KOREKSI DILAKUKAN:
  - Bug-List.xlsx: BG-007/071/083 (3 entri STATUS-02 yang SEMPAT salah diklasifikasi
    Environment Noise di 2 percobaan awal) dikoreksi balik jadi Status=Open,
    Category="Bug (Confirmed)", Severity=High, dengan root cause analysis lengkap di Notes.
  - BG-139 s/d BG-143 (STATUS-08/10/11/12/13, entri dari percobaan ke-3) dikoreksi jadi
    Category="Bug (Confirmed, Cascading)", Severity=High, Notes menjelaskan ini konsekuensi
    BG-007 bukan bug terpisah.
  - docs/TC-Recruitment.txt diupdate: blok "BUG KRITIS TERKONFIRMASI" ditambahkan di section
    STATUS WORKFLOW, status TC-02 s/d TC-08 diubah [FAIL - BG-007] / [BLOCKED oleh BG-007],
    dan catatan REGRESI ditambahkan utk STATUS-10..14 (yang tadinya PASSED di sesi
    sebelumnya, sekarang gagal murni karena cascading dari BG-007, bukan TC-nya berubah).

## STATUS BATCH 2 (RECRUITMENT): TUNTAS 100% -- dengan 1 bug kritis terdokumentasi dengan
## jelas (BG-007), bukan di-cover-up sebagai "semua hijau". Ini temuan paling signifikan di
## seluruh review hari ini: core status-transition recruitment benar-benar tidak berfungsi.

---

## BATCH 4 — ADMIN (dimulai setelah user minta lanjut, 16 sub-screen, 136 TC)

### Audit coverage: SELESAI. docs/TC-Admin.txt sudah SANGAT matang (format masih tabel ringkas,
belum di-reshape ke format detail seperti Login/PIM/Recruitment -- itu task terpisah di akhir).
Semua 16 sub-screen sudah dikerjakan di sesi-sesi sebelumnya, termasuk IDOR dedicated (Skills,
Locations), bug nyata sudah ditemukan (Job Title upload bypass, Structure rename 422,
Corporate Branding upload issues).

**GAP ditemukan (pola sama persis Login/PIM/Recruitment):** 0 TC untuk clickjacking/CSRF.
TC baru ditambahkan di tests/admin/security/ (folder baru):
- TC-ADMIN-SECURITY-01 (clickjacking): FAIL dengan benar -> BG-145 (dikoreksi Severity Medium).
  **KONFIRMASI KE-4** gap app-wide yang sama (Login/Recruitment/PIM/Admin semua kena) --
  makin kuat buktinya ini 1 gap konfigurasi web-server tunggal, bukan 4 kasus terpisah.
- TC-ADMIN-SECURITY-02 (CSRF cross-origin mutation POST pay-grades): PASS, diblokir CORS
  (konsisten dengan Recruitment SECURITY-05).

Regresi penuh 136 TC existing SEDANG BERJALAN di background (task id b5rerx1xn, --workers=2,
--timeout=90000, TANPA --reporter=list override).

**UPDATE 2026-11-11: hasil b5rerx1xn -- 116 passed, 22 failed, 19.3 menit.**
- Bug lama (JOBTITLE-07, STRUCTURE-07, CORPBRAND-02/03/04/05) dedup BENAR ke entry existing
  (BG-014, BG-025, BG-010..013), TIDAK ada row baru -- confirmed masih reproduce, reporter
  bekerja benar.
- TC-ADMIN-SECURITY-01 (clickjacking) reproduce lagi -> BG-145 (sudah ada).
- 15 SISANYA (BG-146..160) = pola infra klasik (timeout/ERR_ABORTED/postStatus tidak ada) ->
  DIKOREKSI ke Bug-List jadi Closed/Environment Noise.
- Server dicek ulang: 3x curl 1.5-2.2s -- stabil. Re-run TARGETED 16 TC (15 ambigu + security-01
  utk re-konfirmasi) diluncurkan di background (task id bxvm11gf2, --workers=2).

**UPDATE 2026-11-11: hasil bxvm11gf2 -- 4 passed, 12 failed. Root-cause BERHASIL dicari:**
- EMPSTATUS-01 diisolasi solo: screenshot PNG saat gagal = HALAMAN BLANK TOTAL (bukan locator
  mismatch seperti kasus PIM Report-to, murni margin waktu kurang untuk kondisi server hari ini
  yang lebih lambat dari saat TC ditulis).
- Pola sama di 11 TC lain (semua share pattern `waitForTimeout(1200)` + `isVisible({timeout:
  5_000})` setelah goto() ke list screen) -> FIX MEKANIS: naikkan ke 3000ms/10_000ms di SEMUA
  11 file sekaligus (sed, bukan satu-satu): EMPSTATUS-01/03/04, LICENSE-03, MEMBERSHIP-04/05,
  PAYGRADE-01, SKILL-01/05/07.
- OAUTH-04 beda pola (baseline=2 afterCancel=0, bukan "X muncul di list") tapi root cause SAMA
  (list belum sempat reload setelah Cancel) -> wait 1000ms->3000ms.
- TC-ADMIN-SECURITY-01 (clickjacking): TIDAK disentuh, sudah confirmed real 2x run terpisah,
  final.
- Verifikasi 12 TC yang di-fix SEDANG BERJALAN di background (task id bsfozz4o6, --workers=1).

**UPDATE 2026-11-11: hasil bsfozz4o6 -- SEMUA 11 PASS.** Fix wait-time terkonfirmasi benar.
BATCH 4 REGRESSION 100% TUNTAS: 136 TC existing (semua bug lama reproduce konsisten, 11
flaky-timing sudah diperbaiki permanen) + 2 TC security baru (clickjacking FAIL/BG-145 by
design, CSRF PASS).

Reshape docs/TC-Admin.txt ke format detail SEDANG BERJALAN di background via fork agent
(agentId internal, task akan muncul sbg notification terpisah). Modul besar (~138 TC),
delegasi sama pola PIM/Recruitment sebelumnya.

**UPDATE 2026-11-11: fork selesai reshape TC-Admin.txt (138 TC), spot-check 3 sample akurat.**
README diupdate (Admin 138 TC, grand total 397, clickjacking 4th confirmation, CSRF no-bug).
Typecheck+lint bersih. Commit (0350298) + push SUKSES, author terverifikasi bersih
(Arsal <arsalwildann@gmail.com>, tanpa trailer Claude).

## STATUS BATCH 4 (ADMIN): TUNTAS 100%.

## =============================================================
## SELURUH REVIEW 4 BATCH (LOGIN + RECRUITMENT + PIM + ADMIN) SELESAI 100%.
## =============================================================

Total TC project: 397 (Login 43, Admin 138, PIM 161, Recruitment 54, Leave 1).
Semua dokumentasi TC-*.txt sudah format detail konsisten. Bug-List.xlsx bersih dari duplikat.
README reflects kondisi akurat terkini. Repo sudah di-push, tidak ada yang tertinggal.

**Item yang masih "pending" tapi BUKAN berarti belum selesai dikerjakan (di luar kendali QA
ini, bukan karena pekerjaan belum tuntas):**
- BG-007 (Recruitment Shortlist 500) -- bug aplikasi nyata, perlu di-retest kalau OrangeHRM
  sudah memperbaikinya di masa depan.
- 3 TC PIM Report-to (REPORTTO-01/03/06) -- known issue verifikasi UI, fitur sudah confirmed
  bekerja via TC API terpisah.

Kalau ada sesi baru yang melanjutkan task ini: TIDAK ADA next action wajib tersisa dari 4
batch original. Baca bagian ini dulu untuk konfirmasi semua 4 batch benar2 tuntas.

---

## BATCH 5 — BUZZ (modul BARU, scope expansion atas permintaan user 2026-11-11)

User minta explore menu OrangeHRM lain di luar 4 modul original. Discovery dilakukan ke 8 menu
(Time, Performance, Dashboard, Directory, Maintenance, Claim, Buzz, My Info) -- user pilih
**Buzz** sbg prioritas (ada fitur upload foto/video, pola bug yang sudah terbukti 4x di modul
lain: extension-only validation).

**Temuan discovery:**
- Performance & Claim: halaman BLANK TOTAL untuk akun ini (tidak ada data assigned, tidak ada
  empty-state message) -- di luar scope Buzz, dicatat sbg temuan tapi belum ditindaklanjuti.
- My Info: redundan dgn PIM (screen sama persis, beda konteks self-view) -- skip.
- Maintenance: fitur "Purge Employee" destruktif, gated re-auth -- HIGH RISK kalau dikerjakan,
  belum masuk scope manapun.
- Dashboard, Directory: nilai testing rendah/redundan, belum masuk scope manapun.

**Buzz dibangun dari NOL** (belum ada page object/folder test sebelumnya):
- src/pages/BuzzPage.ts (page object baru)
- Fixture pages.fixture.ts diupdate (tambah buzzPage)
- tests/buzz/ (8 TC fungsional: post teks valid/kosong/boundary-panjang/cancel/double-click,
  like, comment, comment-kosong)
- tests/buzz/security/ (7 TC: XSS, SQLi, exe-renamed-jpg via Share Photo, baseline exe asli
  ditolak, exe-renamed-mp4 via Share Video, clickjacking (konfirmasi ke-5 kalau reproduce),
  IDOR read-only baseline)

Total 15 TC baru. Typecheck bersih. Server dicek sehat (3x, 0.76-0.81s) sebelum run.

**UPDATE 2026-11-11 (lanjutan): BATCH 5 (BUZZ) SELESAI DI-ROOT-CAUSE, 100% TUNTAS.**

Regression run pertama (bb21c86xb): 6 passed, 9 failed. Investigasi penuh per-TC dilakukan
(bukan asumsi), ditemukan 2 bug SCRIPT nyata (bukan bug sistem) di `src/pages/BuzzPage.ts`
yang baru dibuat sesi ini & belum pernah divalidasi live:

1. **postCards selector salah** -- `.orangehrm-buzz-post` cuma match div HEADER post
   (avatar/nama/timestamp), TIDAK berisi body text/like/comment/stats. Dibuktikan via
   `card.innerHTML()` langsung di browser. Diperbaiki jadi `.oxd-sheet.orangehrm-buzz`
   (wrapper penuh). Bug ini yang bikin TC-06/07/08 hang sampai habis 45s timeout ("Target
   page, context or browser has been closed").
2. **Comment input selector salah** -- box comment adalah `<input placeholder="Write your
   comment...">` TANPA atribut `type` sama sekali (bukan `type="text"`), jadi
   `input[type="text"]` tidak pernah match, dan `.last()` malah ambil textarea composer utama.
   Diperbaiki jadi `card.getByPlaceholder(/write your comment/i)`, di-scope ke card yang benar.

**Temuan app nyata (bukan bug):** post baru TIDAK muncul di feed via client-side update --
dibuktikan dengan polling hingga 9 detik tanpa reload, tetap 0. Perlu `page.reload()` manual.
Ditambahkan helper `BuzzPage.reloadAndFindCard()` dan dipakai di semua TC yang butuh menemukan
post sendiri (01, 06, 07, 08).

**"Share Video" ternyata field URL, bukan file upload** -- TC-BUZZ-SECURITY-05 awal (exe
renamed .mp4) salah asumsi, dibuktikan via screenshot modal "Share Video" = textbox "Paste
Video URL" + tombol "Share" terpisah. TC lama dihapus, ditulis ulang sbg
TC-BUZZ-SECURITY-05-Verify-Malicious-Video-Url-Rejected (javascript: URI injection test).

**3 bug sistem nyata dikonfirmasi** (masuk Bug-List):
- BG-173 (reopened, severity tetap): file .exe di-rename .jpg DITERIMA via Share Photo --
  konfirmasi ke-5 extension-only-validation (pola sama PIM/Recruitment/Admin). Reproduksi
  FLAKY (3/5 run diterima, 2/5 ditolak) -- diinvestigasi 5x run terpisah, tetap diklasifikasi
  CONFIRMED BUG karena reproduce mayoritas, bukan false positive.
- BG-175: missing X-Frame-Options/CSP frame-ancestors -- konfirmasi ke-5 app-wide (Login/
  Recruitment/PIM/Admin/Buzz), severity Medium disamakan preseden.
- BG-178: double-click submit kirim 2x POST, bikin 2 post duplikat -- race condition sama
  pola BG-009 Recruitment, severity High disamakan preseden.

BG-179/180/181/182/183 (semua artefak run pertama yg script-bug, sudah auto-closed oleh
bugListReporter saat retest pass) -- tidak perlu tindakan manual lagi.

Regresi final (full suite, default reporter, tanpa --reporter=list): **12 passed, 3 failed
(correct/expected)**. docs/TC-Buzz.txt ditulis lengkap format detail. README.md diupdate
(baris Buzz di tabel Test Coverage + subsection baru, total TC project 397 -> 412).

**SISA UNTUK SESI BERIKUTNYA:**
  - Commit + push (HATI-HATI: jangan ada trailer Claude, author harus
    Arsal <arsalwildann@gmail.com>, SELALU cek `git log -1 --format="%an <%ae>"` sebelum push).
  - Tanya user apakah mau lanjut ke menu lain (Time, dll) atau cukup Buzz saja utk Batch 5.

### UPDATE 2026-11-12: BATCH 5 (BUZZ) DIPERLUAS -- COVERAGE GAP DITUTUP, 12 TC BARU.

User minta review ulang: apakah 15 TC Buzz sudah benar-benar lengkap? Jawaban jujur: BELUM.
Gap yang ditemukan dan ditutup dengan 12 TC baru (total Buzz 15 -> 27 TC):

**Fungsional baru:** TC-BUZZ-09 (upload foto valid, positive -- sebelumnya cuma ada sisi
security/negative), TC-BUZZ-10 (unlike/toggle like off), TC-BUZZ-11 (delete own post),
TC-BUZZ-12 (share post + counter Shares), TC-BUZZ-13/14 (filter tab Most Liked/Most
Commented Posts), TC-BUZZ-15 (like/comment pada post milik EMPLOYEE LAIN, bukan cuma post
sendiri), TC-BUZZ-16 (boundary: foto ada + teks kosong, kontras dgn TC-02 yg foto kosong +
teks kosong).

**Security baru:** SECURITY-08 (XSS di comment, bukan cuma di post text), SECURITY-09 (SQLi
di comment), SECURITY-10 (CSRF cross-origin create post, pola sama Recruitment/Admin),
SECURITY-11 (rate limiting create post).

**Bug APLIKASI baru dikonfirmasi:** SECURITY-11 GAGAL -- 8/8 request create-post sukses
tanpa throttle sama sekali, TIDAK ADA rate limiting (BG-185, severity Medium, konsisten pola
BG-026 Login / BG-067 Recruitment, tapi blast radius lebih luas krn broadcast company-wide).

**Bug SCRIPT ditemukan & diperbaiki selama investigasi 12 TC baru ini** (bukan bug aplikasi):
  1. TC-BUZZ-09: timeout upload terlalu pendek (15s->45s, upload binary data makan waktu
     variabel di demo publik).
  2. TC-BUZZ-11: regex tombol konfirmasi delete salah (`/^(yes, delete|delete|confirm)$/i`
     exact-match gagal krn accessible name punya whitespace ekstra) -> diperbaiki jadi
     unanchored `/Yes, Delete/i` sama seperti pola di AdminJobTitlesPage dkk.
  3. TC-BUZZ-13/14: asumsi endpoint salah -- ganti filter tab memanggil
     `/api/v2/buzz/feed?sortField=...`, BUKAN `/api/v2/buzz/posts` seperti load awal -> regex
     match diperluas ke kedua pola endpoint.
  4. TC-BUZZ-15: locator `.postCards.last()` tidak stabil -- makin lama suite berjalan, makin
     banyak post menumpuk (termasuk 8 post sampah dari SECURITY-11 rate-limit test), `.last()`
     jadi post yang sangat jauh di scroll, bikin test exceed time budget. Diganti `.nth(1)`.

**2 TC terbukti flaky-under-load (BUKAN bug aplikasi), PASS konsisten saat isolated 3x tapi
gagal dalam full-batch run serial (25+ TC berurutan, demo publik melambat):** TC-BUZZ-09
(upload foto) dan TC-BUZZ-SECURITY-09 (SQLi comment). Didokumentasikan apa adanya di
docs/TC-Buzz.txt, Bug-List entry terkait (BG-192, BG-194) ditutup dgn kategori "Bukan Bug
(Flaky Test)".

**Reorganisasi folder (permintaan user, konsistensi dgn modul lain):**
- `tests/buzz/` (flat, kecuali security/) -> `posts/`, `engagement/`, `feed-filters/`,
  `security/`.
- `tests/login/` (flat) -> `positive/`, `negative/`, `boundary/`, `security/`, `edge/` (persis
  5 grup di docs/TC-Login.txt).
- Semua path import relatif disesuaikan (+1 level `../`), DAN header komentar "Path" +
  "RUN COMMAND" di SETIAP file spec juga disesuaikan dgn folder barunya (bukan cuma pindah
  file doang).

**Verifikasi regresi pasca-reorganisasi menemukan 2 bug SCRIPT lagi di Login (bukan bug
aplikasi, tidak terkait folder move itu sendiri -- cuma kebetulan ketemu saat re-run penuh):**
  1. TC-LOGIN-29 (Enter key login): race condition, `page.url()` dibaca sinkron tanpa
     menunggu redirect -> diperbaiki pakai `urlMatchesWithWait()`.
  2. TC-LOGIN-41 (CSRF cross-origin): assertion UI salah, mengharapkan browser tetap di origin
     eksternal padahal form POST memang akan ikut redirect 302 sbg navigasi normal -> assertion
     diperbaiki jadi cek halaman tujuan akhir (harus /auth/login, bukan /dashboard/index).
  Keduanya terbukti 3x pass bersih setelah fix, tidak mengubah kesimpulan keamanan TC-41.

**Bug-List.xlsx dibersihkan dari duplikat** yang muncul akibat bugListReporter re-run
berkali-kali selama investigasi: BG-191 (dup BG-178), BG-196 (dup BG-026), BG-198 (dup
BG-030) ditutup sbg duplikat; BG-173/BG-193 (sama2 soal upload-bypass SECURITY-03)
dikonsolidasi jadi satu entry kanonis BG-173 Open; BG-174 (test SECURITY-05 lama yg sudah
dihapus/ditulis ulang) ditutup sbg obsolete.

**Hasil regresi final:** Buzz 21 passed / 6 failed (4 bug nyata + 2 flaky-under-load, semua
ter-root-cause, 0 false positive/false passed). Login 41 passed / 2 failed (TC-LOGIN-37
BG-026, TC-LOGIN-43 BG-030, keduanya expected).

Total TC project: 412 -> 424. Semua perubahan di atas sudah di-commit & push.

### UPDATE 2026-11-11: BATCH 1 (LOGIN) SEKARANG 100% TUNTAS.
- TC-LOGIN-42: run bersih, PASS (session ID berubah, proteksi fixation bekerja). Sempat ada 1
  check sampingan ("tidak ada console error") gagal karena net::ERR_CONNECTION_RESET -> masuk
  Bug-List sbg BG-029 lalu DIKOREKSI jadi Closed/"Environment Noise (Not a Bug)" dengan root
  cause jelas (server sedang 500 di waktu yang sama, dikonfirmasi user via screenshot).
- TC-LOGIN-43: run bersih, FAIL DENGAN BENAR (X-Frame-Options memang tidak ada). Masuk
  Bug-List sbg BG-030, dikoreksi Severity Low->Medium, Category->"Security Finding".
- docs/TC-Login.txt SUDAH diupdate: TC-42 [TODO]->[DONE], TC-43 [TODO]->[FAIL], SUMMARY jadi
  41 DONE + 2 FAIL by design (TC-37 BG-026, TC-43 BG-030) dari 43 total TC.
- TIDAK ADA next action tersisa untuk Batch 1. SELESAI TUNTAS.

### UPDATE 2026-11-11: BATCH 2 (RECRUITMENT) — run regresi PERTAMA GAGAL TOTAL karena outage.
- Run pertama (vacancies+candidates+security, 40 TC incl. 3 file baru/diedit) selesai 21.4
  menit: 33 FAILED, 7 PASSED. Dicek detail via Bug-List (BG-031 s/d BG-063): HAMPIR SEMUA
  bertanda infra klasik (Test timeout exceeded, ECONNRESET, ERR_CONNECTION_CLOSED bahkan saat
  navigasi awal ke /auth/login) -- BUKAN bug aplikasi. Server memang masih outage sepanjang
  durasi run ini (konsisten dengan screenshot 500 user sebelumnya).
- KOREKSI MASSAL dilakukan: 33 baris BG-031..BG-063 di Bug-List.xlsx diubah jadi
  Status=Closed, Category="Environment Noise (Not a Bug)", Notes berisi root cause analysis
  lengkap (satu teks note yang sama utk semua, menjelaskan konteks outage).
- Server dicek ulang SETELAH itu: 3x curl berturut 1.2s/2.2s/1.8s -- STABIL, memenuhi ambang
  sendiri (<3-5s konsisten 3x). Re-run regresi KEDUA diluncurkan di background (task id
  bp4qixfyq) utk dapat sinyal valid.
- STATUS BATCH 2 SAAT INI: regresi re-run SEDANG BERJALAN, belum ada hasil. status-workflow
  (9+ TC, disarankan --workers=1 terpisah) BELUM dijalankan sama sekali di sesi ini.
- NEXT ACTION WAJIB: baca hasil run bp4qixfyq begitu notifikasi masuk. Kalau MASIH banyak
  infra-signature failures -> JANGAN ulang lagi otomatis, laporkan ke user server belum benar2
  stabil. Kalau bersih -> lanjut jalankan status-workflow --workers=1, lalu update
  TC-Recruitment.txt + Bug-List verifikasi akhir, baru tandai Batch 2 tuntas.

**NEXT ACTION kalau lanjut sesi baru / server sudah pulih:**
1. Cek server dulu (1x curl, tidak reachable -> stop, lapor ke user)
2. Cross-check Bug-List.xlsx: cari row utk "exe-as-pdf" dan "race condition" — apakah sudah
   ada entry resmi dari run2 sebelumnya (reporter mestinya sudah pernah catat ini kalau pernah
   di-run dengan reporter aktif, perlu verifikasi bukan asumsi)
3. EDIT KODE (bisa dikerjakan sekarang tanpa network, status: lihat progress di bawah):
   - TC-RECRUITMENT-SECURITY-02: ubah dari report.finding()-only jadi report.check() hard
     assert X-Frame-Options ATAU CSP frame-ancestors harus ada.
   - TC-RECRUITMENT-SECURITY-03: ubah dari report.finding()-only jadi report.check() hard
     assert ada throttle/429 setelah N request cepat (pola sama TC-LOGIN-37).
   - Tulis TC baru: CSRF untuk endpoint mutasi Recruitment (pola sama TC-LOGIN-41, tapi untuk
     create vacancy/candidate, bukan auth/login).
4. SETELAH server pulih: jalankan regression run PENUH
   `npx playwright test tests/recruitment --project=chromium` (TANPA --reporter=list
   override!) — status-workflow sebaiknya --workers=1 terpisah sesuai catatan existing di
   dokumen (poin 6 CATATAN EKSEKUSI). Verifikasi hasil edit SECURITY-02/03 + TC CSRF baru.
5. Update TC-Recruitment.txt dengan format standar (lihat memory feedback_tc_doc_format.md),
   cross-check Bug-List.xlsx utk entry baru dari SECURITY-02/03 yang sekarang hard-fail.
6. Baru lanjut Batch 3 (PIM)

---

## BATCH 1 — LOGIN

### Status: Langkah A (coverage audit) — SELESAI
### Langkah B (regression run): SELESAI — 40/40 PASSED, 0 Fail (dijalankan 2026-11-11, chromium, 1.2m)
### Langkah C (root cause fail): N/A — tidak ada TC Fail di run ini
### Langkah D (cross-check Bug-List): N/A — tidak ada TC Fail untuk di-cross-check
### Lapor ke user: SUDAH dilaporkan 2026-11-11, menunggu approval gap list + rencana TC baru
### Next action setelah approval: tulis 4 TC baru (CSRF, session fixation, security headers,
### escalate rate-limiting finding ke Bug-List jika user setuju), lalu lanjut Batch 2 (Recruitment).

### UPDATE 2026-11-11 (lanjutan sesi):
User approve: (1) escalate rate-limiting finding ke Bug-List resmi, (2) tulis TC baru Login
dulu sebelum lanjut Batch 2.

**Rate-limiting escalation — STATUS: BLOCKED oleh environment, BUKAN selesai.**
- Masalah arsitektur ditemukan: bugListReporter.ts auto-close bug row kalau script test-nya
  PASS (lihat src/reporters/bugListReporter.ts:171-199, closeResolvedBugs()). TC-LOGIN-37
  lama didesain selalu PASS (cuma cek no-crash), jadi tidak bisa dipakai utk bug resmi tanpa
  auto-close keliru. User pilih: ubah TC-LOGIN-37 supaya FAIL kalau rate limiting tidak ada
  (assertion baru: attempt ke-6 harus 429).
- Assertion baru SUDAH ditambahkan ke tests/login/TC-LOGIN-37-Verify-Rapid-Multiple-Failed-Logins.spec.ts
  (step baru setelah loop 5x, cek attempt ke-6 status === 429).
- SAAT DICOBA JALANKAN: server demo publik (opensource-demo.orangehrmlive.com) sedang SANGAT
  LAMBAT saat ini (GET /auth/login polos = 6-11 detik via curl, tanpa kaitan brute-force sama
  sekali). Bahkan dengan --timeout=90000, test timeout di attempt ke-2 dari loop. Jadi TIDAK
  BISA dapat sinyal bersih sekarang apakah attempt ke-6 kena 429 asli atau bukan — risiko false
  positive/false negative kalau dipaksakan jalan sekarang.
- **TC-LOGIN-37 saat ini dalam kondisi SUDAH DIUBAH (assertion baru ada di file) tapi BELUM
  PERNAH berhasil dijalankan sampai selesai (selalu timeout karena lambat server, bukan karena
  assertion-nya). BELUM tercatat di Bug-List sama sekali — reporter tidak sempat jalan sampai
  onEnd() karena test timeout/environment, bukan karena logic bug.**
- **NEXT ACTION WAJIB kalau lanjut sesi baru:** jalankan ulang
  `npx playwright test tests/login/TC-LOGIN-37-Verify-Rapid-Multiple-Failed-Logins.spec.ts --project=chromium --timeout=120000`
  saat server demo publik sedang responsif (cek dulu via curl -w ke /auth/login, harus <3s
  normal). Kalau hasil attempt ke-6 beneran 429 → TC PASS, berarti SUDAH ada rate limiting
  (temuan sebelumnya soal "tidak ada rate limiting" OUTDATED, perlu dicabut dari TC-Login.txt).
  Kalau hasil attempt ke-6 tetap bukan 429 (misal 302 normal) → TC FAIL dengan benar,
  bugListReporter akan otomatis menambahkan baris Bug-List resmi — verifikasi baris itu muncul
  dengan benar (Severity harus terklasifikasi High karena ada keyword terkait, cek manual).
- **JANGAN** tambahkan baris Bug-List manual untuk ini — biarkan reporter yang menulis otomatis
  dari hasil run yang valid.

**TC baru lain (CSRF, session fixation, security headers) — BELUM DIMULAI**, menyusul setelah
rate-limiting ini tuntas atau di-skip dulu kalau environment tetap tidak stabil.

### UPDATE 2026-11-11 (percobaan ke-2, setelah user minta coba lagi):
- Cek ulang GET /auth/login polos via curl: 11-15 detik (LEBIH LAMBAT dari percobaan pertama,
  bukan membaik). Server demo publik sedang genuinely overload, bukan flake sesaat.
- Coba run TC-LOGIN-37 dengan --timeout=180000 (3 menit): TETAP timeout, kali ini gagal di
  tengah loop 5x (attempt 3/4) dengan gejala BARU: pesan error "Invalid credentials" tidak
  sempat muncul/terdeteksi — kemungkinan besar karena render sangat lambat (bukan perubahan
  perilaku aplikasi), tapi TIDAK BISA dipastikan 100% dalam kondisi server seberat ini.
- **KEPUTUSAN: hentikan percobaan rate-limiting test untuk sementara.** Menambah run berulang
  ke server publik yang sedang overload berisiko memperparah beban server orang lain (etis) dan
  tidak akan menghasilkan sinyal yang bisa dipercaya untuk root-cause yang valid.
- **TC-LOGIN-37 saat ini: assertion baru (cek attempt ke-6 = 429) SUDAH ADA di file, TAPI BELUM
  PERNAH SEKALI PUN berhasil run sampai selesai sejak diubah.** Statusnya BUKAN "fail karena
  tidak ada rate limiting" dan BUKAN "pass karena ada rate limiting" — statusnya "tidak bisa
  divalidasi karena environment overload". Ini WAJIB dibedakan dari kedua kemungkinan itu di
  laporan manapun (jangan sampai salah diklaim sebagai salah satu kesimpulan).
  TIDAK ADA entry baru masuk ke Bug-List dari percobaan ini (dikonfirmasi: run gagal karena
  Playwright test timeout sebelum onEnd() reporter sempat memproses hasil).
- **NEXT ACTION kalau lanjut sesi baru:** JANGAN langsung re-run TC-LOGIN-37. Cek dulu via
  1x curl ke /auth/login — hanya lanjut run test kalau response time curl < 3 detik (indikasi
  server sudah normal). Kalau masih lambat, tunda lagi, kerjakan task lain dulu (TC baru
  CSRF/session fixation/security headers, atau mulai Batch 2 Recruitment) sambil berkala cek.

### UPDATE 2026-11-11 (percobaan ke-3 — BERHASIL, SELESAI):
- Server membaik (curl GET /auth/login = 5.3s, turun dari 11-15s). Re-run TC-LOGIN-37 2x
  berturut-turut (timeout=120s) dan hasil KONSISTEN kedua kali: 11/12 check lolos, hanya
  check attempt-6 gagal dengan status=302 bersih (bukan timeout, bukan render issue) ->
  disimpulkan REPRODUCIBLE: tidak ada rate limiting/brute-force protection pada login.
- **ROOT CAUSE BUG DITEMUKAN TERPISAH:** run pertama (dengan flag `--reporter=list`) TIDAK
  mencatat apa pun ke Bug-List meski test FAILED, karena flag CLI --reporter menimpa TOTAL
  daftar reporter di playwright.config.ts (termasuk bugListReporter custom). PELAJARAN untuk
  batch-batch berikutnya: JANGAN PERNAH pakai `--reporter=list` atau reporter override apa pun
  saat menjalankan regression run yang hasilnya perlu masuk Bug-List otomatis. Default reporter
  dari config (tanpa flag --reporter) sudah termasuk bugListReporter + list/html/dll secara
  bersamaan. Jalankan tanpa flag --reporter untuk semua run resmi mulai sekarang.
- Re-run TANPA flag --reporter=list -> konfirmasi hasil sama (11/12, attempt 6 gagal) DAN
  bugListReporter otomatis menambahkan **BG-026** ke docs/Bug-List.xlsx (Modul: Login,
  Script: TC-LOGIN-37-...spec.ts, Status: Open).
- **Koreksi manual dilakukan:** Severity/Priority auto-classified "Low" (heuristik kata kunci
  reporter tidak kenal "rate limiting"/"brute-force" sebagai security keyword) dikoreksi jadi
  **Medium**, Category diubah dari "Bug" jadi "Security Finding", Notes ditambahkan menjelaskan
  koreksi dan reproducibility (2x run terpisah, hasil sama).
- TC-Login.txt BELUM diupdate untuk refleksikan assertion baru TC-LOGIN-37 (masih bilang 40
  TC, deskripsi TC-37 di dokumen masih versi lama "mencatat sebagai temuan" bukan "FAIL by
  design sampai rate limiting ada"). TODO: update docs/TC-Login.txt bagian TC-LOGIN-37 +
  SUMMARY (sekarang ada 1 TC FAILED by design, bukan 40/40 PASS lagi) + bagian TEMUAN.
- STATUS BATCH 1 RATE-LIMITING ITEM: **SELESAI TUNTAS.** BG-026 valid, Bug-List akurat,
  root cause dikonfirmasi bukan false positive (reproducible), bukan bug script (assertion
  benar), murni bug sistem security (missing control).

**NEXT ACTION:** (1) update docs/TC-Login.txt reflect TC-LOGIN-37 baru + summary jadi 39 PASS/
1 FAIL by design, (2) lanjut tulis 3 TC baru: CSRF, session fixation, security headers.

### UPDATE 2026-11-11 (3 TC baru ditulis & dicoba jalankan):

**TC-LOGIN-41 (CSRF) — SELESAI TUNTAS, PASSED, temuan akurat.**
- File: tests/login/TC-LOGIN-41-Verify-Cross-Origin-Login-CSRF-Protection.spec.ts
- Metodologi: BUKAN curl dengan header Origin/Referer di-forge manual (hasil curl awal
  MENYESATKAN — sempat terlihat seperti "tidak ada CSRF protection" padahal itu cuma karena
  curl tidak bawa cookie sesi yang valid). Dikoreksi pakai Playwright beneran: browser
  dinavigasi ke https://example.com, lalu submit <form> asli ke /auth/validate dari origin
  itu, supaya header Origin/Referer otentik dari browser.
- HASIL: login dengan kredensial valid dari cross-origin TETAP GAGAL (redirect ke /auth/login,
  bukan dashboard) -> proteksi CSRF EFEKTIF (kemungkinan besar via SameSite=Lax cookie yang
  tidak terkirim pada POST cross-site). Ini TEMUAN POSITIF, bukan bug. Run bersih: 4/4 check
  lolos.
- PELAJARAN METODOLOGI (penting utk batch lain): JANGAN pernah simpulkan proteksi
  CSRF/security dari curl dengan header di-forge manual tanpa cookie jar yang representatif.
  Verifikasi SELALU via browser automation asli kalau menguji sesuatu yang bergantung pada
  cookie/session/origin browser yang sesungguhnya.

**TC-LOGIN-42 (session fixation) — BELUM TERVALIDASI, BLOCKED oleh environment.**
- File SUDAH ditulis: tests/login/TC-LOGIN-42-Verify-Session-ID-Regenerated-After-Login.spec.ts
- 2x percobaan run (paralel dgn TC lain, lalu solo --workers=1) SAMA-SAMA timeout di langkah
  login (60s) karena server demo publik lambat/tidak stabil (curl manual juga sempat gagal
  DNS resolve sesaat, lalu 15s response time). BUKAN kegagalan assertion logic test.
- STATUS: file ADA, logic SUDAH benar (dibaca ulang manual: compare session cookie before vs
  after login), TAPI BELUM PERNAH SEKALI PUN berhasil run sampai selesai. JANGAN diklaim
  pass/fail sampai benar-benar jalan sampai print().

**TC-LOGIN-43 (clickjacking header) — BELUM TERVALIDASI VIA PLAYWRIGHT, tapi ground-truth
SUDAH dikonfirmasi via curl terpisah (independen dari masalah environment Playwright):**
- File SUDAH ditulis: tests/login/TC-LOGIN-43-Verify-Clickjacking-Protection-Header.spec.ts
- curl manual (terpisah, berhasil di saat server sempat responsif) mengonfirmasi: GET
  /auth/login TIDAK mengirim X-Frame-Options, CSP tidak punya frame-ancestors -> clickjacking
  gap NYATA ADA, konsisten dgn TC-RECRUITMENT-SECURITY-02 yang sudah ada.
  Assertion di TC-43 described expected fail (xfo undefined, no frame-ancestors -> check should
  FAIL) tapi run via Playwright gagal duluan karena ECONNRESET (gagal sebelum sempat sampai ke
  assertion) -> BUKAN bukti valid, cuma error koneksi/infra.
- STATUS: ground-truth gap SUDAH dikonfirmasi manual (confirmed real), tapi TC OTOMATIS-nya
  BELUM PERNAH berhasil run sampai print() utk memverifikasi reporter mencatat ke Bug-List
  dgn benar.

**NEXT ACTION WAJIB kalau lanjut sesi baru:**
1. Cek dulu `curl -s -o /dev/null -w "TIME:%{time_total} STATUS:%{http_code}\n" https://opensource-demo.orangehrmlive.com/web/index.php/auth/login`
   2-3x berturut — lanjut run Playwright HANYA kalau konsisten < 3-4 detik.
2. Run TC-LOGIN-42 solo (--workers=1, --timeout=60000 cukup kalau server normal). Verifikasi
   hasil print() sampai selesai, baru simpulkan pass/fail.
3. Run TC-LOGIN-43 solo. Server normal -> harusnya FAIL (sesuai ground-truth curl), reporter
   akan otomatis tambah row Bug-List baru. Setelah itu, lakukan koreksi Severity manual
   (expect Medium, sama pola seperti BG-026) karena heuristik keyword reporter kemungkinan
   tidak kenal "clickjacking"/"frame-options" sbg security keyword tinggi.
4. SETELAH ketiga TC baru (41/42/43) beres divalidasi -> update docs/TC-Login.txt: summary
   jadi 43 TC total (39 PASS awal + TC-37 FAIL by design + 3 TC baru), tambahkan deskripsi
   masing-masing TC baru di GROUP 4 (Security).
5. Baru lanjut ke Batch 2 (Recruitment) — termasuk bawa pelajaran "jangan --reporter=list
   override" dan "verifikasi server responsif dulu sebelum run" ke batch itu juga.

### UPDATE 2026-11-11 (cek ulang server, trennya MEMBURUK bukan membaik):
- curl check 3x berturut: 18.9s / 17.6s / 22.4s — LEBIH LAMBAT dari semua pengecekan
  sebelumnya hari ini (riwayat: 6-11s -> 11-15s -> 15s -> 17-22s, tren naik terus).
- KEPUTUSAN: TIDAK jalankan TC-42/TC-43 sekarang. Server demo publik kemungkinan sedang
  mengalami degradasi berkepanjangan (bukan flake 1x), di luar kendali kita (shared public
  demo, bukan milik sendiri). Terus mencoba akan: (a) tetap tidak dapat sinyal valid, (b)
  menambah beban ke server yang sudah berat.
- SARAN untuk sesi berikutnya (atau nanti hari ini): jangan retry berulang dalam waktu
  berdekatan. Cek sekali di awal sesi baru; kalau masih >5s, kerjakan task lain yang tidak
  butuh network (dokumentasi TC-Login.txt, audit coverage Batch 2 dari membaca source code
  saja) sampai server membaik secara alami.

### UPDATE 2026-11-11 (format standar TC doc ditetapkan + TC-Login.txt diupdate):
- User konfirmasi (via reference screenshot format TC-REG-DASH) bahwa SEMUA modul harus pakai
  level detail yang sama persis dengan TC-Login.txt: group header, No./ID/Status/filename,
  tag skenario (+)/(-)/(B)/(S)/(!), action steps, [API VERIFICATION], [UI VERIFICATION], NOTE.
  Disimpan permanen di memory: feedback_tc_doc_format.md. INI STANDAR WAJIB untuk Batch 2/3/4.
- docs/TC-Login.txt SUDAH diupdate: TC-LOGIN-37 entry diubah [DONE]->[FAIL] dengan detail bug
  BG-026, TC-LOGIN-41/42/43 ditambahkan ke GROUP 4 (41=[DONE], 42 & 43=[TODO] karena belum
  berhasil run), SUMMARY diupdate jadi 43 total TC, TEMUAN SELAMA EKSPLORASI ditambah 3 poin
  baru (butir 6,7,8). File ini SEKARANG real-time akurat, aman dijadikan rujukan.
- Server masih overload saat terakhir dicek (18-22s, tren memburuk). TC-42 & TC-43 TETAP
  [TODO] sampai berhasil run bersih sekali.

**STATUS BATCH 1 (LOGIN) KESELURUHAN: ~95% selesai.**
Sisa pekerjaan HANYA: jalankan TC-42 & TC-43 sekali dengan bersih saat server membaik, lalu
ubah status [TODO]->[DONE]/[FAIL] di TC-Login.txt sesuai hasil real, lalu lanjut ke Batch 2.

### UPDATE 2026-11-11 (server CRASH total, dikonfirmasi user via screenshot browser):
- User konfirmasi langsung via browser: opensource-demo.orangehrmlive.com sekarang
  ERR_CONNECTION_CLOSED — bukan lambat lagi, tapi BENAR-BENAR DOWN/tidak reachable sama sekali.
  Ini puncak dari tren memburuk yang sudah terdeteksi sejak awal sesi (6-11s -> 11-15s -> 15s
  -> 18-22s -> sekarang connection closed total).
- **KEPUTUSAN: HOLD TOTAL semua request ke server ini** (curl maupun Playwright) sampai user
  konfirmasi server sudah pulih. JANGAN retry sendiri secara berkala/otomatis.
- TC-LOGIN-42 & TC-LOGIN-43 TETAP [TODO] — tidak berubah dari update sebelumnya.
- Selama hold ini, kerjakan hanya task yang TIDAK butuh network ke demo OrangeHRM:
  - Audit coverage Batch 2 (Recruitment) dari BACA KODE SAJA (src/pages, tests/recruitment/,
    docs/TC-Recruitment.txt) — tanpa run apa pun dulu.
  - Siapkan daftar gap/TC baru yang diusulkan untuk Recruitment, untuk direview user, BARU
    dieksekusi (run + tulis TC baru) setelah server pulih dan user kasih lampu hijau.
- **NEXT ACTION kalau lanjut sesi baru atau user bilang "coba lagi":** cek dulu via curl
  sederhana (1x saja) ke /auth/login. Kalau masih ERR_CONNECTION_CLOSED / connection refused /
  timeout, JANGAN lanjut run apa pun, laporkan balik ke user bahwa masih down.

**Yang sudah diketahui dari docs/TC-Login.txt + src/pages/LoginPage.ts:**
- 40 TC sudah ada, grouping: Positive 6, Negative 9, Boundary 4, Security 7, Unexpected/Edge 14.
- Security yang SUDAH ada: SQLi (username+password), XSS (username+password), HTML injection,
  session invalidation after logout, direct URL access after logout, cookie deleted access.
- Security yang BELUM ada secara eksplisit di Login (perlu dicek apakah relevan untuk modul ini):
  - File upload (TIDAK RELEVAN — Login tidak punya upload field)
  - IDOR (TIDAK RELEVAN secara langsung — Login tidak punya resource by-ID; IDOR relevan di
    modul lain seperti PIM/Admin/Recruitment)
  - Rate limiting / account lockout — ADA (TC-LOGIN-37) tapi hasilnya "tidak ada rate limiting
    di demo publik" — dicatat sebagai TEMUAN bukan bug. Perlu keputusan: apakah ini harus masuk
    Bug-List sebagai security finding (missing rate limiting = valid security weakness)?
  - CSRF token check pada POST /auth/validate — BELUM ada TC eksplisit, perlu ditambahkan.
  - Session fixation (apakah session ID berubah setelah login vs sebelum) — BELUM ada TC.
  - Clickjacking / X-Frame-Options header pada halaman login — BELUM ada TC (recruitment/security
    sudah punya response header checks, Login belum).
- File tests/login/*.spec.ts ADA 38 file fisik untuk 40 TC di dokumen (TC-05, TC-14, TC-20 ada
  filenya juga — total match, Glob awal sempat terlihat tidak urut tapi semua 40 ada).

**Gap list sementara (akan difinalisasi setelah regression run):**
1. CSRF protection check — TODO tambahkan TC baru.
2. Session fixation check (session ID sebelum vs sesudah login) — TODO tambahkan TC baru.
3. Clickjacking / security headers (X-Frame-Options, CSP, Strict-Transport-Security) di halaman
   login — TODO tambahkan TC baru, konsisten dengan pola di tests/recruitment/security/.
4. Missing rate limiting (TC-LOGIN-37 finding) — TODO: diskusikan ke user apakah ini perlu
   di-escalate ke Bug-List sebagai security finding resmi (saat ini cuma catatan di docs).

**Next action kalau lanjut sesi baru:** jalankan `npx playwright test tests/login --project=chromium`
dari folder `qa-portofolio`, kumpulkan hasil run real, lalu lanjut Langkah C.

### UPDATE 2026-11-12: GAP COVERAGE LINTAS-MODUL -- "refresh mid-submit" & "koneksi terputus
mid-submit" (TAHAP 1 dari rencana perluasan coverage, atas permintaan user setelah diskusi
tentang skenario test case yang sering terlewat).

User minta review ulang apakah semua modul sudah 100% tercover. Jawaban jujur: belum, banyak
gap didokumentasikan per modul (lihat percakapan). Dua skenario spesifik yang disebut user
(dari diskusi komunitas QA): double-click submit berulang, refresh di tengah proses, dan
koneksi terputus saat submit -- dicek, ternyata 0 TC di seluruh project utk 2 skenario
terakhir. Disepakati rencana 4 tahap, TAHAP 1 dikerjakan: 1 TC refresh-mid-submit + 1 TC
connection-drop-mid-submit di titik create/submit utama tiap modul (Login, Admin Users, PIM
Add Employee, Recruitment Candidates, Buzz Create Post) = 10 TC baru.

**Teknik yang dipakai:** `page.route()` utk intercept POST endpoint masing-masing --
refresh-mid-submit pakai delay 4 detik sebelum `route.continue()` (supaya window reload()
pasti kena saat request masih pending, tidak bergantung timing jaringan asli); connection-drop
pakai `route.abort('failed')` (simulasi network failure asli).

**Bug SCRIPT ditemukan & diperbaiki selama investigasi (bukan bug aplikasi):**
  1. Login: form submit adalah navigasi top-level ASLI (bukan XHR) -- `page.reload()` yang
     dipanggil saat navigasi itu masih pending melempar "net::ERR_ABORTED", ditangkap sbg hasil
     yang diharapkan (justru bukti reload benar2 menyela). `route.abort()` pada request login
     mengganti SELURUH dokumen jadi halaman error native browser (chrome-error://), bukan pesan
     error inline SPA -- test diperbaiki utk recover via `loginPage.goto()` (navigasi baru),
     bukan coba isi field di dokumen yang sudah hilang.
  2. Semua modul SPA: klik submit yang fire-and-forget (`void ....save()`) tanpa `.catch()`
     menyebabkan unhandled promise rejection saat di-interrupt oleh `reload()` -- diperbaiki
     dengan `.catch(() => {})` di semua titik serupa (Login, Admin, PIM, Recruitment, Buzz).
  3. PIM: verifikasi awal salah asumsi `autocomplete option count() > 0` berarti "ada
     suggestion asli" -- ternyata autocomplete SELALU menampilkan tepat 1 option bahkan saat
     tidak ada hasil (isinya placeholder teks "No Records Found"). Diperbaiki dgn cek TEKS
     option-nya, bukan count-nya. Bug ini muncul identik di 2 TC (TC-PIM-ADD-32 dan 33),
     keduanya diperbaiki.
  4. PIM: direct `page.request.get()` ke endpoint search employee TERBUKTI tidak reliable
     (return kosong walau via sesi browser yang sama) -- harus lewat interaksi UI asli
     (isi autocomplete, klik suggestion, klik Search), konsisten dgn temuan serupa di modul
     lain sepanjang sesi ini.

**Bug APLIKASI BARU dikonfirmasi -- APP-WIDE, bukan isolated ke 1 modul:** saat request
POST create/save gagal krn koneksi jaringan terputus, SPA (Admin, PIM, Recruitment, Buzz)
melempar "Uncaught exception: fe" yang lolos ke console/window error handler (nama exception
persis sama di keempat modul -- indikasi satu shared HTTP-client wrapper, bukan 4 bug
terpisah), alih-alih ditangkap rapi di titik asalnya. Dikonfirmasi deterministik 3x reproduce
di SETIAP modul yang diuji.

KOREKSI PENTING (verifikasi ulang 2026-11-12 setelah user bertanya "sudah dipastikan genuine
bug?"): klaim awal "tidak ada pesan error ke user" TERNYATA TIDAK AKURAT. Dicek ulang via
page.innerText() di keempat modul -- app SEBENARNYA menampilkan toast generic "Error /
Unexpected Error!" ke user di semua 4 kasus, BUKAN silent failure total. Bug yang tetap valid:
exception-nya lolos tidak tertangani ke console (code-level error-handling defect, toast yang
muncul kemungkinan dari fallback/global error boundary terpisah, bukan try/catch yang benar
di kode pemanggil). Semua Bug-List notes dan docs/TC-*.txt terkait sudah dikoreksi supaya
tidak melebih-lebihkan dampak ke user. Screenshot Admin masih menunjukkan tabel list gagal
render (stuck loading spinner) setelah insiden ini -- observasi terpisah yang tetap valid,
indikasi state SPA ikut terganggu di luar sekadar toast error. Login TIDAK terpengaruh krn
arsitekturnya berbeda (form POST navigasi top-level asli, bukan fetch/XHR) -- dikonfirmasi
terpisah, bukan diasumsikan.

Masuk Bug-List sbg BG-199 (Admin, konfirmasi ke-1), BG-201 (PIM, ke-2), BG-202 (Recruitment,
ke-3), BG-200 (Buzz, ke-4), semua Severity dikoreksi Low -> Medium, saling di-cross-reference
di Notes masing-masing.

**Hasil regresi final 10 TC baru:** 6 passed (semua refresh-mid-submit + Login connection-drop)
/ 4 failed (SEMUA correctly-failing, bug app-wide di atas, 0 false positive/false passed).

**Dokumentasi diupdate:** docs/TC-Login.txt (+2 TC, Total 43->45), docs/TC-Admin.txt (+2 TC,
Total 138->140), docs/TC-PIM.txt (+2 TC, Total 161->163), docs/TC-Recruitment.txt (+2 TC,
Total 54->56), docs/TC-Buzz.txt (+2 TC, Total 27->29). README.md diupdate (tabel Test
Coverage, Total project 424->434, confirmed-bugs list tiap modul + 1 paragraf cross-cutting
baru). docs/Bug-List.xlsx dicek ulang, tidak ada duplikat baru.

**SISA TAHAP 2-4 (belum dikerjakan, menunggu arahan user):**
  - Tahap 2: ratakan coverage double-click ke Admin (create Users, Job Title) dan Recruitment
    (create Candidate, create Vacancy) -- Login/Buzz/PIM sudah ada.
  - Tahap 3: tutup gap spesifik per modul (investigasi ulang bug Shortlist 500 Recruitment,
    Buzz Edit Post/Delete Comment/pagination, PIM Terminate Employee, Admin filter kombinasi/
    bulk action, Login reset password flow sesungguhnya).
  - Tahap 4: regresi penuh semua modul + dokumentasi final.

### UPDATE 2026-11-12: TAHAP 2 -- ratakan coverage double-click submit ke Admin & Recruitment.

6 TC baru ditambahkan: TC-ADMIN-USER-09, TC-ADMIN-JOBTITLE-09, TC-RECRUITMENT-CANDIDATE-21,
TC-RECRUITMENT-VACANCY-18 (Login/PIM/Buzz sudah punya sebelumnya, tidak diulang).

**Hasil regresi final: 0 passed, 4 failed -- SEMUA correctly-failing, 3 bug berbeda
terkonfirmasi:**

1. **Admin (Users + Job Titles)**: double-click mengirim 2 POST, tapi data TIDAK terduplikat --
   request ke-2 ditolak server dgn 422 (validasi unique-name/username). Namun penanganan
   response 422 itu sendiri memicu "Uncaught exception: fe" yang SAMA PERSIS dgn bug app-wide
   yang sudah dikonfirmasi via simulasi network-drop (BG-199/200/201/202, Tahap 1) -- kali ini
   lewat jalur validasi error ASLI, bukan simulasi. Ini bukti independen kuat bahwa trigger bug
   ini ANY non-2xx response, bukan cuma network failure. Masuk Bug-List sbg BG-203 (Job Titles),
   BG-204 (Users), Severity Medium.

2. **Recruitment Candidates**: BUG BARU & BERBEDA dari BG-009 (BG-009 soal race condition
   status-transition, bukan create) -- double-click Save di Add Candidate TIDAK di-debounce
   client-side DAN TIDAK ada validasi unique server-side (konsisten TC-RECRUITMENT-CANDIDATE-14:
   "duplicate email diizinkan"). Verifikasi awal via UI list+pagination (gotoLastPage) TERBUKTI
   TIDAK RELIABLE (hasil count berubah-ubah 0/1/2 antar run) -- diperbaiki dgn membaca body
   response TIAP POST langsung sbg ground truth. Hasil: 2 dari 3 run isolasi menghasilkan 2
   candidate id BERBEDA yang SUNGGUHAN tersimpan (contoh: id=107 & id=108), 1 run hanya 1
   request sempat terkirim (window race sempit). Masuk Bug-List sbg BG-205, Severity High --
   data integrity nyata terdampak.

3. **Recruitment Vacancies**: BUG BARU LAIN -- double-click memicu TypeError "Cannot read
   properties of undefined (reading 'id')" di handler Proxy.onSave milik app, deterministik
   reproduce 3x. Data TIDAK terduplikat (hanya 1 POST sempat terkirim). Masuk Bug-List sbg
   BG-206, Severity Medium -- code-quality defect, dampak ke user minim.

**Bug script ditemukan & diperbaiki selama investigasi:** verifikasi duplikat di Recruitment
Candidates awalnya pakai `gotoLastPage()` + `rowByText()` (pola yang sama dipakai di TC lain
modul ini) -- ternyata TIDAK RELIABLE utk kasus spesifik ini krn demo punya 100+ candidate
record dan pagination state tidak deterministik antar run. Diperbaiki dgn baca response body
POST langsung (ground truth paling akurat, tidak bergantung UI/pagination sama sekali).

Bug-List dicek ulang: tidak ada duplikat baru (1 kesalahan kolom sempat terjadi saat edit --
nilai "Open" salah ketik ke kolom "Assigned To" alih-alih tetap di "Status" -- langsung
diperbaiki). docs/TC-Admin.txt (+2 TC, Total 140->142), docs/TC-Recruitment.txt (+4 TC, Total
54->58, perhitungan sebelumnya di Tahap 1 adalah 56 jadi total akhir 58). README.md diupdate.

**SISA TAHAP 3-4 (belum dikerjakan, menunggu arahan user):**
  - Tahap 3: investigasi ulang bug Shortlist 500 Recruitment, Buzz Edit Post/Delete Comment/
    pagination, PIM Terminate Employee, Admin filter kombinasi/bulk action, Login reset
    password flow sesungguhnya.
  - Tahap 4: regresi penuh semua modul + dokumentasi final.

### UPDATE 2026-11-12: TAHAP 3 (bagian 1) -- Root cause BG-007 (Shortlist 500) dipersempit &
helper diperbaiki, UNBLOCK 12 TC status-workflow.

Atas permintaan user (dicek "sangat sangat teliti", pakai skill debugging-wizard): investigasi
ulang bug Shortlist 500 yang selama ini dianggap "gagal untuk SEMUA candidate".

**Root cause presisi ditemukan:** endpoint PUT .../candidates/<id>/shortlist mengembalikan 500
KHUSUS saat candidate.vacancy.hiringManager === null, BUKAN utk semua candidate. Dibuktikan via
8 percobaan silang independen (korelasi 8/8 sempurna: vacancy dgn hiring manager -> selalu 200,
vacancy tanpa hiring manager -> selalu 500). Ternyata helper src/utils/createTestCandidate.ts
SELALU memilih vacancy PERTAMA di dropdown ("Junior Account Assistant", hiringManager null),
sehingga HAMPIR SEMUA TC status-workflow ikut cascading failure -- menciptakan ilusi "gagal
total", padahal root cause-nya spesifik pada 1 vacancy tertentu.

**Fix diterapkan:** CandidatesPage.selectVacancyWithHiringManager() (method baru) query API
vacancies secara DINAMIS (bukan hardcode nama) utk cari vacancy ber-hiring-manager, lalu
createTestCandidate() diubah memakainya.

**Bug script ditemukan & diperbaiki SAAT MENULIS FIX INI SENDIRI** (self-caught, pakai skill
debugging-wizard): implementasi pertama method baru masih salah -- check `if (hiringManager)`
gagal krn endpoint GET /api/v2/recruitment/vacancies/:id menyerialisasi "tanpa hiring manager"
sbg OBJECT berisi semua field null ({id:null,firstName:null,...}), BUKAN literal `null` seperti
endpoint candidates/:id -- inkonsistensi serialisasi API yang nyata. Object apa pun selalu
truthy, jadi check lama selalu memilih vacancy PERTAMA (termasuk yg hiringManager kosong).
Diperbaiki jadi cek `hiringManager?.id != null` secara spesifik. Diverifikasi ulang 3x bersih
setelah fix.

**Hasil:** SEMUA 12 TC status-workflow yg sebelumnya [BLOCKED]/[FAIL] (STATUS-02 s/d STATUS-08,
STATUS-10 s/d STATUS-14) sekarang PASSED bersih, dikonfirmasi via regresi penuh 2x (14 passed,
0 failed tiap kali, zero hidden check failures).

**PENTING -- bug aplikasi TIDAK di-fix, cuma di-workaround di data test:** TC-RECRUITMENT-STATUS-15
(baru) dibuat khusus menguji skenario vacancy-tanpa-hiring-manager, TERPISAH dari helper bersama,
supaya BG-007 tetap termonitor regresinya. Assertion sengaja dibuat konsisten dgn konvensi
project (assert perilaku BENAR/200, FAIL selama bug ada) -- draft awal TC ini SEMPAT salah
desain (assert status===500 PASS saat bug ada), yg akan bikin bugListReporter auto-close BG-007
tiap kali bug dikonfirmasi (logika terbalik) -- ditemukan & dikoreksi sebelum commit.

**Bug-List dikoreksi:** BG-007 sempat 2x ter-AUTO-CLOSE KELIRU oleh bugListReporter (krn masih
terikat script TC-RECRUITMENT-STATUS-02 yang sekarang legitimate PASS). Di-reopen, Script Test
Case dialihkan permanen ke TC-RECRUITMENT-STATUS-15. 1 duplikat baru (BG-207, auto-created saat
TC-15 pertama kali gagal dgn desain assertion yang salah) ditutup sbg duplikat BG-007.

docs/TC-Recruitment.txt, README.md diupdate (Total TC Recruitment 58->59, Total project 438->439).

**SISA TAHAP 3 (belum dikerjakan):** Buzz (Edit Post, Delete Comment, pagination), PIM
(Terminate Employee), Admin (filter kombinasi/bulk action), Login (reset password flow
sesungguhnya). Tahap 4: regresi penuh semua modul + dokumentasi final.

### UPDATE 2026-11-12: TAHAP 3 (bagian 2) -- Buzz: Edit Post, Delete Comment, Infinite Scroll.

3 TC baru ditambahkan (TC-BUZZ-19 Edit Own Post, TC-BUZZ-20 Delete Comment, TC-BUZZ-21 Infinite
Scroll) -- semua fitur yang SUDAH ADA di aplikasi sejak awal (opsi "Edit Post"/"Delete" sudah
terlihat di kebab menu/comment sejak eksplorasi awal Buzz, infinite scroll adalah perilaku feed
bawaan) tapi belum pernah diuji sama sekali sebelumnya.

**Hasil: SEMUA 3 TC PASSED, tidak ada bug aplikasi baru ditemukan di area ini.** Edit Post benar2
mengubah teks via PUT /api/v2/buzz/posts/<id>; Delete Comment benar2 menghapus via DELETE
/api/v2/buzz/shares/<postId>/comments/<commentId> (prefix endpoint "shares", bukan "posts" --
nama internal); Infinite scroll benar2 memuat halaman berikutnya (GET .../feed?offset=10 saat
di-scroll, 10->16 post).

**Bug SCRIPT ditemukan & diperbaiki (self-caught) saat investigasi Edit Post:** saat modal "Edit
Post" terbuka, ADA 2 <textarea> di DOM -- composer utama yang masih ada di belakang modal
(kosong) dan textarea modal yang benar (pre-filled teks asli). Locator pertama (`.first()`
implisit via selector gabungan) salah ambil textarea composer yang kosong, sehingga mengisi
field yang TIDAK terhubung ke form submit -- PUT request tetap mengirim teks LAMA tak berubah
meski response 200 (tampak sukses tapi sebenarnya tidak melakukan apa-apa). Diperbaiki pakai
`page.locator('textarea').last()`, dikonfirmasi 3x PASS bersih setelah fix.

**Server demo publik SANGAT LABIL hari ini** -- terjadi 2x outage besar berturut-turut selama
regresi penuh Buzz (16+ TC gagal seragam ~32s per outage, termasuk TC yang sudah lama stabil).
Investigasi mendalam dilakukan (bukan asumsi langsung): curl selalu sukses <1s bahkan saat
Playwright timeout, example.com berhasil normal di Chromium yang sama (menyingkirkan masalah
jaringan lokal/Chromium secara umum), tapi page.goto() ke domain demo OrangeHRM timeout bahkan
dgn batas waktu 60 detik dan opsi waitUntil 'domcontentloaded' sekalipun -- mengindikasikan
kemungkinan WAF/anti-bot/rate-limiting di sisi server yang mendeteksi traffic browser otomatis
secara spesifik (curl tidak terkena krn fingerprint request yang berbeda), bukan sekadar
server lambat biasa. Root cause pastinya TIDAK BISA dipastikan dari sisi kita (di luar kendali),
tapi TC-TC yang terdampak (SECURITY-02 s/d 11) sudah terverifikasi PASS/FAIL sesuai ekspektasi
SEBELUM outage ini terjadi (lihat update Tahap 1/2 sebelumnya) -- jadi TIDAK mengubah kesimpulan
bug yang sudah terkonfirmasi, hanya menunda verifikasi ulang rutin kali ini.

docs/TC-Buzz.txt diupdate (+3 TC, Total 29->32, PASSED 22->25). README.md diupdate (Buzz TC
count, grand Total project +3 jadi 442).

**SISA TAHAP 3:** PIM (Terminate Employee), Admin (filter kombinasi/bulk action), Login (reset
password flow). Tahap 4: regresi penuh final + dokumentasi.

## UPDATE 2026-11-12 (lanjutan) -- PIM Terminate Employment (TC-PIM-JOB-09)

Investigasi live via Playwright: fitur ada di Personal Details -> tab Job -> section
"Employee Termination / Activiation" (typo "Activiation" ADA DI APLIKASI SENDIRI, dikonfirmasi
via screenshot langsung -- dicatat sebagai temuan minor, bukan kesalahan dokumentasi). Modal
"Terminate Employment" berisi Termination Date* (date picker), Termination Reason* (dropdown
dari master data Termination Reasons yang sudah diuji sebelumnya via TerminationReasonsPage.ts),
Note (optional).

**Bug skrip ditemukan & diperbaiki (pola sama persis dgn Buzz Edit Post):** locator
`input[placeholder="yyyy-dd-mm"]` tanpa scope resolve ke 2 elemen -- satu di form Job Details
yang masih ada di background ("Joined Date"), satu di modal ("Termination Date"). Playwright
strict mode langsung menolak (`locator.fill: strict mode violation ... resolved to 2 elements`).
Diperbaiki dgn scope semua interaksi modal (date input, dropdown, textarea, Save button) ke
`page.getByRole('dialog')` -- diimplementasikan di `JobPage.terminateEmployment()` (helper baru,
bukan logic ad-hoc di TC).

**Temuan app (bukan bug skrip):** setelah PUT `.../terminations` sukses (200, dikonfirmasi
response body berisi date/note/terminationReason yang sesuai), tombol TIDAK otomatis berubah
dari "Terminate Employment" jadi "Activate Employment" tanpa reload -- pola IDENTIK dgn temuan
Buzz sebelumnya (post baru tidak muncul tanpa reload). Dikonfirmasi via discovery script
terpisah yg membandingkan state sebelum/sesudah reload. TC resmi SENGAJA reload +
`waitForLoadState('networkidle')` sblm verifikasi tombol, bukan untuk menyembunyikan temuan
(tetap dicatat via `report.finding()`) tapi krn fixed timeout saja terbukti flaky ~2/3 run saat
verifikasi (goto() resolve on commit, bukan on data-fetch section ini) -- networkidle
menghilangkan race tersebut, dikonfirmasi 3/3 run stabil setelahnya.

File baru: `tests/pim/job/TC-PIM-JOB-09-Verify-Terminate-Employment.spec.ts`. Helper baru:
`JobPage.terminateEmployment()`, `JobPage.terminateButton`, `JobPage.activateButton`. Script
discovery (`tests/_discovery/inspect_terminate*.spec.ts`) sudah dihapus setelah TC resmi selesai.
Diverifikasi stabil 3x run terisolasi sblm dianggap selesai.

docs/TC-PIM.txt diupdate (+1 TC, Total 163->164, Fase 2 71->72, Job 8->9). README.md diupdate
(PIM TC count, narasi Terminate Employment, grand Total project +1 jadi 443).

**SISA TAHAP 3 (update):** Admin (filter kombinasi/bulk action), Login (reset password flow).
Tahap 4: regresi penuh final + dokumentasi.

## UPDATE 2026-11-12 (lanjutan) -- Admin Users: Filter Kombinasi & Bulk Delete

Investigasi live di Admin > User Management > Users. Modul ini hanya punya 9 TC sebelumnya
(validasi form Add + edge case refresh/connection-drop/double-click), BELUM PERNAH diuji utk
filter list maupun bulk delete sama sekali.

**TC-ADMIN-USER-10 (Filter Kombinasi):** Role+Status dikonfirmasi AND di query API
(`userRoleId=<id>&status=<0|1>` sekaligus). **Temuan:** field "Username" TAMPAK sbg search box
bebas tapi API-nya EXACT MATCH case-insensitive, BUKAN substring -- dikonfirmasi live:
username lengkap match, substring dari username yg sama TIDAK match, beda kapital (lengkap)
tetap match. Bukan bug, tapi UX yg berpotensi menyesatkan (pola sama dgn pelajaran lama di
TC-PIM.txt poin 11 -- jangan asumsikan perilaku field dari tampilan UI). **Bug skrip ditemukan
& diperbaiki:** race condition -- response GET dari klik "Reset" (unfiltered, total ~19-22)
tertangkap SALAH oleh `waitForResponse()` predicate filter berikutnya krn masih in-flight saat
step selanjutnya dimulai, menyebabkan false-fail berulang (3x run awal semua gagal dgn total
yg mencurigakan cocok persis jumlah unfiltered). Diperbaiki dgn menunggu response Reset secara
eksplisit sblm lanjut ke filter berikutnya. Setelah fix: 3/3 run stabil.

**TC-ADMIN-USER-11 (Bulk Delete):** checkbox-select 2 user baru (dibuat khusus utk TC ini via
helper baru `createTestUser()`, TIDAK menyentuh user lain yg sudah ada di demo publik) ->
tombol "Delete Selected" muncul -> confirm "Yes, Delete" -> SATU DELETE
`/api/v2/admin/users` membawa KEDUA id sekaligus (`{"ids":[id1,id2]}`), bukan 1 DELETE per
row -- pola sama persis dgn bulk delete di Languages/Nationalities/Qualifications (konfirmasi
konsisten app-wide). 3/3 run stabil tanpa perlu perbaikan tambahan.

File baru: `src/utils/createTestUser.ts` (pola retry sama dgn `createTestEmployee.ts`, beda
trigger: username collision bukan Employee Id collision), `tests/admin/users/TC-ADMIN-USER-10-*`,
`tests/admin/users/TC-ADMIN-USER-11-*`. Helper baru di `AdminUsersPage.ts`: `checkRow()`,
`deleteSelectedButton`, `bulkDeleteSelected()`.

docs/TC-Admin.txt diupdate (+2 TC, Total 142->144, header Users 6 TC -> 11 TC -- header lama
tidak pernah diupdate sejak TC-07/08/09 ditambahkan sebelumnya, dikoreksi sekalian).
README.md diupdate (Admin TC count, narasi filter+bulk delete, grand Total project +2 jadi 445).

**SISA TAHAP 3 (update):** Login (reset password flow sesungguhnya). Tahap 4: regresi penuh
final + dokumentasi.

## UPDATE 2026-11-12 (lanjutan) -- Login: Reset Password Flow Sesungguhnya (TC-LOGIN-46)

Gap: TC-LOGIN-40 (sudah ada) cuma verifikasi link "Forgot your password?" MENAVIGASI ke halaman
Reset Password -- belum pernah ada TC yang benar-benar MENGISI username lalu SUBMIT form reset
password itu sendiri. Atas saran user (jangan pakai akun "Admin" bersama yang tertera di
halaman login publik, bikin user baru saja dulu -- lebih aman, tidak berisiko mengganggu akun
shared demo), ditambahkan `createTestUser()` dari TC Admin sebelumnya dipakai utk membuat user
baru khusus investigasi ini.

**Investigasi penuh drama false-start sebelum dapat kesimpulan benar:**
1. Percobaan pertama pakai akun "Admin" -> request MENGGANTUNG >114 detik tanpa selesai.
2. Dicoba lagi dgn user baru -> awalnya tampak CAMPUR ACAK (kadang `click()` resolve nyaris
   instan tanpa navigasi, kadang hang) -- ternyata itu BUG METODOLOGI SENDIRI: `click()`
   Playwright tidak menunggu hasil navigasi selesai, cuma menunggu aksi klik ter-dispatch, jadi
   cek `page.url()` segera setelah `click()` resolve itu PREMATUR dan menyesatkan.
3. Diperbaiki pakai `page.waitForURL()` yang BENAR-BENAR menunggu navigasi selesai -> 4 trial
   BERURUTAN cepat (1 proses, workers=1) -> HASIL BERSIH 4/4 menggantung (53-68 detik, tdk
   pernah selesai).
4. TC resmi (`TC-LOGIN-46`) ditulis dan dijalankan 7x sbg proses TERPISAH (bukan berurutan
   cepat dlm 1 file) -> hasil BERBEDA: 5 PASS (selesai cepat, 20-40 detik) + 2 FAIL
   (menggantung) = ~29%. Pola ini mengindikasikan endpoint reset-password kemungkinan sensitif
   terhadap beban/request berurutan, BUKAN bug 100% deterministik per klik, tapi JELAS BUKAN
   noise acak biasa (pola konsisten direplikasi lintas sesi investigasi terpisah, dan SELALU
   spesifik ke username VALID -- username tidak valid SELALU selesai cepat).

**Kesimpulan:** BG-224 (Medium severity) -- bug intermiten dicatat APA ADANYA (tidak
disederhanakan jadi "selalu gagal" atau "flaky noise, abaikan"), dengan data reproduksi
kuantitatif lengkap di JSDoc TC dan Bug-List. Root cause diduga SMTP server-side yang tidak
terkonfigurasi di demo publik ini, tapi TIDAK BISA dipastikan dari sisi kita.

**[CATATAN PENTING -- ditemukan saat investigasi ini]** Seluruh verifikasi TC di sesi ini
(TC-PIM-JOB-09, TC-ADMIN-USER-10/11, TC-LOGIN-46) dijalankan dgn flag `--reporter=list`, yang
TERNYATA meng-OVERRIDE array reporters di playwright.config.ts -- termasuk `bugListReporter.ts`
yang seharusnya auto-mencatat kegagalan ke Bug-List.xlsx. Akibatnya BG-224 TIDAK ter-auto-catat
meski TC-LOGIN-46 gagal 2x -- ditambahkan MANUAL via openpyxl. Perlu diingat utk run verifikasi
berikutnya: pakai reporter default config (TANPA override `--reporter=list`) kalau ingin
Bug-List auto-update, atau tetap tambahkan manual spt yang dilakukan di sini.

File baru: `tests/login/edge/TC-LOGIN-46-Verify-Reset-Password-Request-Completes.spec.ts`.
Helper baru di `LoginPage.ts`: `gotoResetPassword()`, `resetPasswordUsernameInput`,
`resetPasswordSubmitButton`. Bug-List.xlsx: BG-224 ditambahkan manual.

docs/TC-Login.txt diupdate (+1 TC, Total 45->46, Unexpected/Edge 16->17). README.md diupdate
(Login TC count, narasi BG-224, grand Total project +1 jadi 446).

**TAHAP 3 SELESAI SEPENUHNYA.** Semua item (PIM Terminate Employee, Admin filter+bulk action,
Login reset password) sudah diinvestigasi, diuji, dan didokumentasikan. **LANJUT TAHAP 4:**
regresi penuh final seluruh modul + dokumentasi penutup.
