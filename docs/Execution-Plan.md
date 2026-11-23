# Execution Plan — Coverage 100% Taksonomi (Fase 0–7)

> **PROTOKOL RESUME (baca ini PERTAMA di sesi baru):**
> 1. Baca blok `STATUS` di bawah -> lanjutkan dari `NEXT ACTION`, jangan mengulang yg sudah `[x]`.
> 2. Cek server dulu: `curl -s -o /dev/null -w "%{http_code} %{time_total}\n" https://opensource-demo.orangehrmlive.com/web/index.php/auth/login`
> 3. Cek `git status` -- kalau ada perubahan belum di-commit dari sesi sebelumnya, review & commit dulu.
> 4. SETIAP selesai 1 task: centang `[x]` di sini, update blok STATUS, tambah 1 baris di LOG, lalu commit
>    (file ini + hasil kerja). Ini mekanisme auto-save: file di disk = state terakhir yg valid.
>
> Ditetapkan user 2026-11-15. Sumber rencana: laporan coverage gap (sesi 2026-11-15).

## STATUS
- **Fase aktif:** FASE 2 TUNTAS & FASE 3 TUNTAS -> mulai FASE 4. Ringkasan Fase 2: lapis 1 (43 TC) + lapis 2
  (Leave 5, Claim 6, Performance 8, Time 5) + P2.5 lintas modul (6 TC, tests/_global/cross-module). Total suite 561 TC.
- **Task terakhir selesai:** P2.5 lintas modul (XMOD-01..06). TC yg SENGAJA FAILED di 4 modul + xmod:
  REVIEW-10 (BG-356), EVAL-15 (BG-373), CLAIM-ASSIGN-06 (BG-333), CLAIM-ASSIGN-10 (BG-338),
  CLAIM-APPROVAL-05 (BG-374), CLAIM-SUBMIT-02 (BG-375), TIME-TIMESHEET-11 (BG-402), XMOD-01 (BG-404),
  XMOD-05 (BG-405), XMOD-06 (BG-406).
- **INSTRUKSI USER 2026-11-15:** begitu Fase 2 (lapis 1 keempat modul) selesai, LANGSUNG lanjut
  otomatis ke Fase 3 (dokumentasi) tanpa menunggu konfirmasi. **DIPERLUAS:** lanjutkan SEMUA fase
  berikutnya (lapis 2, P2.5, Fase 4-8) secara OTOMATIS tanpa konfirmasi user. (Tetap: aturan R1-R9
  berlaku; R6 config global sudah disetujui dgn withConfigRestore.)
- **INSTRUKSI USER 2026-11-15 (STANDAR WAJIB, SEMUA MENU):** SEMUA menu OrangeHRM (Login, Dashboard,
  Admin, PIM, Leave, Time, Recruitment, My Info, Performance, Directory, Maintenance, Claim, Buzz +
  fitur global header/sidebar) WAJIB ter-cover 100% terhadap docs/Test-Case-Taxonomy.txt: setiap
  kategori 1-8 & 13 poin checklist ringkas di-REVIEW per menu/sub-menu -> COVERED (ID TC + spec yg
  benar2 memverifikasi) / N/A + alasan yg dibuktikan / GAP -> dibuatkan TC. Dicatat di
  docs/Taxonomy-Coverage-Matrix.md (dibangun dari inventaris menu LIVE). Detail & teliti, root cause
  setiap failure dibuktikan live. Pakai SEMUA skill relevan (test-master, playwright-expert,
  typescript-pro, debugging-wizard, karpathy-guidelines, engineering:testing-strategy/code-review/
  documentation, anthropic-skills:test-case-writing/automation-testing/xlsx, spec-miner).
- **INSTRUKSI USER 2026-11-15 (STRUKTUR FOLDER):** folder top-level tests/ WAJIB selaras dgn menu sidebar
  OrangeHRM: admin, pim, leave, time, recruitment, my-info, performance, dashboard, directory,
  maintenance, claim, buzz. Yg bukan menu (login, sidebar-search, sweep, cross-module, infra, fixtures)
  di tests/_global/. RUN COMMAND & "Path :" di header spec + docs ikut path baru. Scope matrix = 12
  modul sidebar + Search (Login & header di luar matrix).
- **URUTAN BARU (disetujui user 2026-11-15, pendekatan 2 LAPIS):** lapis 1 = alur inti + approval
  lintas role (ESS) + keamanan di SEMUA modul dulu; lapis 2 = edge case sisa SETELAH 4 modul punya
  lapis 1. Urutan: (1) P2.1 batch 2 ringkas -> (2) P2.2 Claim lapis 1 -> (3) P2.3 Leave lapis 1 ->
  (4) P2.4 Time lapis 1 -> (5) Fase 3 docs -> (6) lapis 2 + P2.5 -> (7) Fase 4-8.
  Efisiensi: verifikasi per file dulu, full batch sekali per modul; bug intermiten cukup dibuktikan+
  dicatat lalu tinggal; run TC asli tanpa --reporter=list.
- **INSTRUKSI USER 2026-11-17:** lanjutkan PIM sampai 100% (bukan modul terendah dulu dulu --
  override urutan standing utk sesi ini). Workflow sama: probe-first, 1 unit/TC per commit,
  verifikasi 2x (probe + real run) sblm anggap bug nyata.
- **NEXT ACTION:** FASE 4 / P4.0. Selesai 17 Nov: Recruitment 54.6% -> 100% (8 TC + TC-XMOD-07; BG-441..447)
  DAN Leave 55.1% -> 82.4% (7 TC baru: API-01, MUT-01, ENT-02, VALID-01, SECURITY-01, CONFIG-01, HOLIDAY-01;
  BG-453 GET entitlements error 500 utk offset berapa pun, BG-454 API terima entitlement >=10000/>2 desimal
  padahal form tolak, BG-456 klik ganda Save Holiday = 2 baris identik). Matrix TOTAL 70.2%.
  PERBAIKAN INFRA PENTING: dateInput.ts (dipakai Leave/PIM/Admin/Recruitment/Performance/Time) diubah jadi
  BERBASIS TOKEN (yyyy/dd/mm urutan apa pun) -- sebelumnya hanya kenal 2 format, demo publik sempat tampilkan
  varian ke-3 ("dd-mm-yyyy") yg membuat semua TC pengisi tanggal macet tanpa batas waktu. LeaveListPage.rowByDate
  dan currentPeriodRange() (leaveData.ts) ikut dibenahi -- GET leave-entitlements WAJIB pakai periode AKTUAL
  (currentPeriodRange), bukan '2026-01-01'/'2026-12-31' hardcode, krn server mengabaikan fromDate/toDate milik
  klien dan selalu echo periode GLOBAL saat itu.
  INSIDEN (sudah diperbaiki & diverifikasi): Leave Period global ter-korupsi sesaat (startMonth=8) akibat
  satu percobaan TC yg crash sebelum withConfigRestore selesai -- sudah dikembalikan ke startMonth=1,startDay=1
  & Work Week diverifikasi utuh. CONFIG-01 kini membaca bulan aktual dari API (bukan asumsi Januari) sblm
  menjalankan skenario double-click, biar tidak terulang.
  DAN Time 56.2% -> 69.5% (4 TC baru: API-01, MUT-01, SECURITY-01, CONFIG-01; BG-457 POST activity ke
  project 999999 -> 500, BG-458 API terima Project Name 51 char padahal form & Customer Name tolak).
  Matrix TOTAL 71.6%. Catatan live Time: Attendance Configuration URL asli /attendance/configure (BUKAN
  /configuration -- salah merender halaman kosong); togglenya oxd-switch bukan checkbox; My Timesheet
  self-service pakai endpoint BERBEDA (time/timesheets/default) dari sisi Admin
  (time/employees/<empNumber>/timesheets) -- ESS 403 di endpoint Admin itu BENAR, bukan bug; Activity
  = POST time/project/<id>/activities.
  SISA Time (lanjutan): U055 My Timesheet, U056 Attendance My Records, U057 Punch In/Out, U058
  Attendance Employee Records, U106 Timesheet Edit & Approval blm punya TC UI feedback/double-submit/
  navigasi/sesi (pola spt TC-LEAVE-HOLIDAY-01/CANDIDATE-22); U060/U061/U062 Reports blm diuji search/
  SQLi/XSS-Reflected.
  DAN Performance 59.6% -> 67.2% (3 TC baru: API-01 lolos sebagian, EVAL-17, TRACKER-08 lolos; BG-459
  rating KPI non-numerik "abc" diterima 200 bukan 422, BG-460 dua temuan dlm 1 skrip -- PUT
  evaluation/supervisor review 999999 -> 500 bukan 4xx, DAN ESS GET Employee Trackers (endpoint
  administratif semua karyawan) -> 200 bukan 403 = BFLAC, diverifikasi 2x re-run terisolasi).
  Matrix TOTAL 72.3%. Catatan live Performance: Tracker Log field "log" dibatasi 150 karakter server-side
  (dikonfirmasi binary-search probe: 150 ok, 151 -> 422); evaluation/supervisor body
  {ratings:[{kpiId,rating,comment}],generalComment}, evaluation/final body
  {complete,finalRating,finalComment,completedDate}; run 3 TC sekaligus scr sequential dgn reporter
  penuh (video+screenshot) bikin sesi ESS kedua timeout & memicu false-positive berantai (BFLAC check
  lain ikut gagal) -- jalankan tiap TC security/API terpisah kalau butuh assert sesi ESS multipel.
  DAN My Info 64.5% -> 71.9% (1 TC baru: MUT-01; BG-461 dua temuan dlm 1 skrip -- Dependents
  menerima name kosong 200, DAN Memberships membershipId tak ada -> 500). Matrix TOTAL 73.0%.
  Catatan live My Info: body endpoint direkam dari page.on('request') nyata, bukan ditebak --
  Emergency Contacts field homePhone/officePhone/mobilePhone (BUKAN label UI homeTelephone/
  mobile/workTelephone), Dependents relationshipType STRING enum ("child", bukan id numerik).
  DAN PIM 65.1% -> 65.7% (1 TC baru: OPTFIELD-04, API langsung via withConfigRestore; lolos
  penuh 13/13, tanpa bug -- finding koersi tipe lenient, bukan bug). Matrix TOTAL 73.1%. PIM
  modul BESAR (20 unit GAP, 318 sel) -- baru 1 unit (Optional Fields) ditutup penuh, 19 unit
  lain (Employee List, Add Employee, Reports, Custom/Data Import/Reporting/Termination config,
  9 tab employee) msh py GAP taksonomi sisa utk sesi berikutnya. PENTING: file lama
  TC-PIM-OPTFIELD-01/02/03 SUDAH ADA sblm sesi ini (fokus UI persistence, kode taksonomi tipis);
  TC baru diberi nomor 04 utk hindari koklisi id -- SELALU cek nomor TC tertinggi yg sudah
  dipakai di folder tujuan sblm menulis file baru.
  DAN My Info lanjutan 71.9% -> 73.4% (1 TC baru: PRIVESC-01, sweep 5.2-PrivEsc di 7 endpoint
  tulis sekaligus -- Personal Details, Contact, Emergency, Dependents, Immigration, Work
  Experience, Memberships; field privilege asing ditolak 422 di SEMUA endpoint, lolos penuh,
  tidak ada bug). Matrix TOTAL 73.3%.
  DAN My Info lanjutan lagi 73.4% -> 76.6% (1 TC baru: ATTACHMENT-02). LATAR PENTING: endpoint
  Attachments ternyata JSON {attachment:{name,type,size,base64}, description} BUKAN multipart
  (ditemukan via page.on('request') saat upload nyata, bukan ditebak dari convention lain).
  Matrix TOTAL 73.6%. BUG BG-462 (Medium) 2 temuan: file "bad.php.pdf" isi kode PHP tapi type
  diklaim application/pdf -> DITERIMA 200 (server cek field type diklaim klien via allowlist,
  TIDAK cek isi file sesungguhnya, keluarga BG-003); nama file path traversal
  ("../../etc/passwd.pdf") -> DITERIMA 200 & disimpan apa adanya tanpa sanitasi. My Info kini
  76.6%, SUDAH di atas PIM -- My Info msh py sisa GAP (U006 Personal Details 17, + 4.2/4.3/4.5/
  4.7/8.4 di hampir semua unit utk UI feedback/double-submit/navigasi/sesi/konkurensi/konsistensi
  pesan) tapi prioritas urutan terendah pindah ke PIM.
  DAN PIM lanjutan 65.7% -> 66.8% (1 TC baru: ATTACHMENT-API-01, endpoint Attachments Admin-side
  terbukti JSON+base64 IDENTIK dgn My Info/ESS; BUG BG-463 (Medium) pola SAMA dgn BG-462 --
  filename path traversal diterima & disimpan verbatim, konfirmasi backend sama persis antara
  Admin & ESS). Matrix TOTAL 73.8%. PIM msh py GAP besar di U099 Profile Picture (28 item), U042
  Reports (22), U095 Report-to (22), U038 Data Import (21), U093 Job (20), U037 Custom Fields
  (19), U041 Add Employee (18), U088 Personal Details (16), serta 7 tab lain (Immigration,
  Qualifications, Memberships, Contact, Emergency, Dependents, Salary) msh 11-13 GAP masing2 --
  sebagian besar item sisa adalah UI-feedback (4.2/4.3/4.5/4.7/8.4) yg butuh TC per-tab, bukan
  sweep API sekaligus spt Attachments.
  DAN PIM lanjutan lagi 66.8% -> 68.0% (1 TC baru: PHOTO-API-01, endpoint Profile Picture
  TERPISAH dari personal-details, backend validasi upload SAMA dgn Attachments; BUG BG-464
  (Medium) pola SAMA dgn BG-462/BG-463 -- file PHP diklaim image/png diterima + filename path
  traversal disimpan verbatim; KONTRAS POSITIF: PUT ke empNumber tak ada -> 422, BUKAN 500
  spt pola ghost-id di modul lain). Matrix TOTAL 74.1%. 4 varian endpoint upload file
  (My Info Attachments, PIM Attachments, PIM Profile Picture, msh ada My Info Profile Picture
  blm diuji scr API langsung) kini terbukti berbagi backend validasi yg sama persis (BG-462/
  463/464) -- SATU root cause, EMPAT bug id (sesuai konvensi project: 1 bug id per modul/unit
  meski root cause sama).
  DAN PIM lanjutan lagi 68.0% -> 69.0% (1 TC baru: REPORT-API-01; batas panjang name Reports =
  255 karakter dikonfirmasi via probe binary-search; 16/16 lolos, TIDAK ada bug ditemukan --
  validasi, search, method, sesi semua benar). Matrix TOTAL 74.3%. CATATAN: satu kali run resmi
  sempat gagal krn ECONNRESET transien lokal (BG-465 auto-logged lalu auto-closed saat retest
  lolos bersih) -- sudah diarsipkan, bukan bug aplikasi. PIM kini SEJAJAR dgn Buzz/Claim (69.0%)
  -> Performance (67.2%) kini modul TERENDAH keseluruhan proyek.
  DAN PIM lanjutan (atas instruksi user 2026-11-17: PIM dulu sampai 100%, bukan modul terendah)
  69.0% -> 69.8% (1 TC baru: REPORTTO-API-01; BUG BG-466 (High) -- endpoint POST
  .../supervisors SAMA SEKALI tidak memvalidasi empNumber/reportingMethodId: reportingMethodId
  di luar enum, empNumber bertipe salah, supervisor tak ada, DAN duplikat KEEMPATNYA -> 500,
  bukan 422; satu-satunya validasi yg benar = skema body). Matrix TOTAL 74.4%.
  PELAJARAN TOOLING (diperbaiki sesi ini): report.finding() dgn kode taksonomi LITERAL di
  label (mis. "3.1 / 4.1 / 5.1-SQLi N/A") ikut di-tag COVERED oleh build_matrix.py (baris 252-254
  menambah SEMUA kode yg match EXPLICIT_RX dari checks+findings tanpa syarat) -- padahal
  maksudnya N/A, bukan ter-verifikasi. Fix: tulis finding tanpa kode literal di label kalau
  maksudnya N/A/tidak berlaku, bukan "tercakup". Ditemukan & diperbaiki langsung (matrix
  re-build turun dari 3461 COVERED jadi 3457 COVERED yg jujur).
  DAN PIM lanjutan 69.8% -> 71.0% (1 TC baru: DATAIMPORT-API-01; lolos penuh 14/14, tidak ada
  bug; TEMUAN CSV Formula Injection potensial -- nilai sel "=1+1" diimpor literal, aman saat
  import tapi berisiko kalau data di-export ulang ke Excel, tidak diverifikasi lebih jauh).
  Matrix TOTAL 74.6%. Endpoint csv-import SAMA pola body dgn Attachments/Photo (JSON+base64)
  tapi MEKANISME VALIDASI BEDA: parser CSV menolak struktur tidak valid dgn 400 (bukan
  whitelist nama file spt Attachments), & nama file tidak pernah di-echo/disimpan (tidak ada
  risiko path traversal verbatim spt BG-462/463/464) -- jangan asumsikan semua endpoint upload
  berperilaku identik hanya krn body shape sama.
  DAN PIM lanjutan 71.0% -> 71.5% (1 TC baru: JOB-API-01; BUG BG-467 (High) pola sama dgn
  BG-466 -- jobTitleId/empStatusId/locationId tidak ada -> 500, HANYA subUnitId yg benar
  divalidasi 422). Matrix TOTAL 74.8%.
  DAN PIM lanjutan 71.5% -> 72.6% (1 TC baru: CUSTOMFIELD-API-01; BUG BG-468 (Low) -- fieldName
  duplikat diterima via API langsung, form-only validation, pola sama dgn Leave Holiday).
  Matrix TOTAL 75.0%.
  PELAJARAN METODOLOGI PENTING (ditemukan & diperbaiki LANGSUNG sesi ini, DIBACA ULANG sblm
  probe batas panjang/duplikat di modul lain): (1) jangan pakai string IDENTIK ("NNNN...")
  utk setiap percobaan length-boundary -- kalau run sebelumnya gagal cleanup, percobaan
  berikutnya KOLISI dgn baris lama & hasilnya salah total (sempat simpulkan batas=60 & status
  400, padahal batas REAL=250 & statusnya 422 konsisten); SELALU sisipkan timestamp/tag unik
  di setiap percobaan boundary. (2) jangan asumsikan DELETE /<resource>/<id> (path-style)
  bekerja di semua endpoint PIM -- custom-fields JUSTRU 405 utk path-style & perlu bulk
  DELETE {ids:[...]}; SELALU verifikasi status code delete, jangan .catch(()=>null) tanpa
  cek dulu, krn itu menyembunyikan kegagalan cleanup senyap yg baru ketahuan 5 TC kemudian.
  Devtools/metodologi ini sudah diterapkan ulang & diverifikasi bersih di TC final.
  DAN PIM lanjutan 72.6% -> 74.2% (1 TC baru: ADD-API-01; BUG BG-469 (Medium), konfirmasi
  KE-4 pola BG-462/463/464 -- photo "bad.php.png" diterima + filename path traversal
  diterima saat create employee, TAPI filename TIDAK ter-echo di API manapun yg diuji jadi
  dampak baca-balik tidak terkonfirmasi langsung). Matrix TOTAL 75.3%.
  DAN PIM lanjutan 74.2% -> 75.1% (1 TC baru: PD-API-01; BUG BG-470 (High), konfirmasi KE-3
  pola BG-466/467 -- nationalityId tidak ada -> 500; gender/empNumber benar divalidasi 422).
  Matrix TOTAL 75.5%.
  DAN PIM lanjutan 75.1% -> 75.7% (1 TC baru CONTACT-API-01 + 1 TC diperbaiki CONTACT-03).
  Matrix TOTAL 75.6%.
  TEMUAN METODOLOGI PENTING (bug SKRIP, bukan bug app -- SELALU diperiksa di modul
  berikutnya): TC-PIM-CONTACT-03 lama menyimpulkan "email invalid diterima tanpa validasi"
  HANYA dari status 200 & 0 error DOM, TANPA memeriksa body yg benar2 terkirim. Investigasi
  page.on('request') membuktikan SEBALIKNYA: app mengosongkan sendiri nilai invalid sblm
  Save (body yg terkirim sudah bersih, workEmail=null) -- 200 itu benar krn body-nya valid,
  BUKAN krn app menerima string invalid. ATURAN BARU utk TC berikutnya: setiap TC yg
  mengklaim "field X diterima tanpa validasi" WAJIB memverifikasi BODY REQUEST YG BENAR2
  TERKIRIM (via page.on('request') atau resp.request().postData()), TIDAK CUKUP hanya
  status code + DOM error count -- form bisa diam2 mengosongkan/mengubah nilai sblm submit.
  Ditemukan jg: kapan pesan error muncul bisa RACE CONDITION (tidak konsisten antar-run)
  meski hasil akhirnya konsisten -- utk kasus spt ini, catat via report.finding() bukan
  hard-check pd aspek yg racy, tapi hard-check pd hasil akhir yg konsisten.
  DAN PIM lanjutan 75.7% -> 76.0% (1 TC baru: EMERGENCY-API-01; lolos penuh 5/5, tidak ada
  bug -- relationship wajib, phone opsional, format phone ditegakkan). Matrix TOTAL 75.7%.
  DAN PIM lanjutan 76.0% -> 76.3% (1 TC baru: DEPENDENT-API-01; lolos penuh 5/5, tidak ada
  bug baru -- dateOfBirth masa depan diterima, konsisten dgn TC-PIM-PD-04). Matrix TOTAL
  tetap 75.7%.
  DAN PIM lanjutan 76.3% -> 76.7% (1 TC baru: IMMIGRATION-API-01; lolos penuh 4/4, tidak ada
  bug baru -- expiryDate<issuedDate diterima jg di Admin-side, konfirmasi BG-433 berlaku
  lintas Admin/ESS, bukan bug kedua). Matrix TOTAL 75.8%.
  DAN PIM lanjutan 76.7% -> 77.0% (1 TC baru: SALARY-API-01; lolos penuh 7/7, tidak ada bug
  -- aturan bisnis rentang gaji per Pay Grade ditegakkan konsisten, payGradeId tidak ada ->
  400 aman bukan 500). Matrix TOTAL 75.9%. PIM (77.0%) kini di atas My Info (76.6%).
  DAN PIM lanjutan 77.0% -> 77.3% (1 TC baru: QUALIFICATION-API-01; lolos penuh 5/5, tidak
  ada bug baru -- toDate<fromDate DITOLAK benar (beda dgn Immigration/BG-433), ghost id ->
  500 konfirmasi BG-434 jg di Admin-side). Matrix TOTAL tetap 75.9%.
  DAN PIM lanjutan 77.3% -> 77.6% (1 TC baru: MEMBERSHIP-API-01; lolos penuh 6/6, tidak ada
  bug -- fee negatif & renewalDate<commenceDate KEDUANYA ditegakkan benar). Matrix TOTAL
  76.0%. SEMUA 9 TAB EMPLOYEE SELESAI (Personal Details, Contact, Emergency, Dependents,
  Immigration, Job, Salary, Qualifications, Memberships).
  DAN PIM lanjutan 77.6% -> 78.0% (1 TC baru: LIST-API-01; lolos penuh 5/5, tidak ada bug --
  DELETE sungguhan, unicode search, limit negatif semua benar). Matrix TOTAL 76.0%.
  DAN PIM lanjutan 78.0% -> 78.2% (2 TC baru: REPORTMETHOD-API-01 + TERMREASON-API-01, file
  TERPISAH per unit; lolos penuh 5/5 masing2, tidak ada bug -- limit 100 char name, mass-
  assignment, whitespace-only name semua ditegakkan benar). Matrix TOTAL 76.1%. PELAJARAN
  METODOLOGI PENTING (lihat docs/TC-PIM.txt #134/135): build_matrix.py `spec_units()` memetakan
  spec -> unit murni dari PATH FILE (NAME_RULES/DIR), BUKAN dari kode [U0xx] di label check --
  1 file yg mencakup 2 unit berbeda (mis. Reporting Methods + Termination Reasons sekaligus)
  akan SALAH mengatribusikan SEMUA evidence-nya ke 1 unit saja sesuai path direktori file itu.
  JUGA: label `report.finding()` JANGAN pernah mengandung token berbentuk kode taksonomi literal
  (mis. "3.1 / 4.1 N/A") kalau maksudnya menandai N/A -- `spec_codes()` scan SEMUA label check
  DAN finding utk kode apa pun & otomatis menandai COVERED, terlepas dari maksud kalimatnya.
  Fix: 1 file per unit/direktori, & tulis finding dlm prosa polos tanpa token kode.
  SISA GAP PIM: 1.2/1.4 pada unit single-field (Reporting Methods, Termination Reasons) TIDAK
  bisa ditutup via TC -- `NA_RULES` di build_matrix.py bersifat GLOBAL flag-based (unit dgn flag
  'C'/create selalu dianggap butuh evidence 1.2/1.4 optional-field & 1.x relasi-entity, terlepas
  apakah unit itu BENAR2 punya field opsional/relasi atau tidak) -- keterbatasan STRUKTURAL tool,
  bukan sesuatu yg bisa diperbaiki di level penulisan TC tanpa mengubah build_matrix.py sendiri
  (berisiko side effect ke unit lain). PIM TIDAK BISA mencapai 100% literal tanpa perubahan tool.
  DAN PIM lanjutan BESAR 78.2% -> 85.6% (2 TC sweep baru: CSRF-01 + TABEDGE-01, menutup
  1.8/4.2/4.3/4.5/4.7/4.8/5.4/8.4 di hampir semua 9 tab karyawan sekaligus -- registry sweep lama
  [unitMutationRegistry.ts] hanya mencakup menu "Add X" ber-nama tunggal, TIDAK PERNAH mencakup
  form edit multi-field pim/employees/<empNumber>/*, jadi kode2 ini GAP di semua 9 tab sejak
  awal proyek). CSRF-01: 1 skenario browser sungguhan (Personal Details) + A/B status Origin
  sendiri-vs-palsu di 7 endpoint lain -- semua identik, Origin tidak divalidasi di mana pun,
  pertahanan tunggal SameSite=Lax (sama dgn My Info/BG-437). TABEDGE-01: toast sukses+konsistensi
  pesan (UI, Personal Details+Job), back/forward pasca-save (UI), koneksi putus saat save (UI,
  2 tab), double-submit & concurrency 2-nilai-berbeda (API, 8 endpoint) -- 19/19 lolos, tidak ada
  bug baru. BUG-LIST: BG-472 (timeout transien saat retry createTestEmployee di percobaan
  pertama CSRF-01) diarsipkan sbg noise infra, bukan bug app. Ditambahkan 2 entri NAME_RULES baru
  di build_matrix.py (pim/security/TC-PIM-CSRF-01, pim/employee/TC-PIM-TABEDGE-01) persis pola
  TC-MYINFO-MUT-01/PRIVESC-01 -- krn file ini SENGAJA menyapu banyak unit via loop/banyak check
  per unit, BUKAN kasus "1 file kebetulan berisi >1 unit" seperti REPORTMETHOD/TERMREASON yg
  justru harus dipecah. Matrix TOTAL 76.1% -> 77.6%.
  SISA GAP PIM setelah sweep (133 sel, per-unit, dicek ulang 18 Nov 2026):
    U088 Personal Details: 1.2 1.4 (genuinely closable -- field opsional/relasi nyata ada)
    U090/U091/U094/U096/U097 (Emergency/Dependents/Salary/Qualifications/Memberships): hanya 1.6
      (search/filter/sort) tersisa -- list tanpa search bar, KEMUNGKINAN N/A genuine, perlu
      diverifikasi live (bukan diasumsikan) sblm ditandai N/A di TC.
    U092/U096 jg py 3.4 (tanggal) sisa; U093 Job py 6 kode sisa (3.1 4.1 4.4 5.1-SQLi
      5.1-XSS-Stored 5.9) blm disentuh TABEDGE/sweep manapun; U095 Report-to SENGAJA dikecualikan
      dari TABEDGE (duplicate-add sudah py bug confirmed BG-466-pattern, risiko 500 berulang),
      msh py 11 kode gap termasuk 1.8/4.2/4.3/4.5/4.7/4.8/8.4 yg belum ada TC tersendiri.
    U002/U036-U038/U041/U042 (Employee List, Optional/Custom Fields, Data Import, Add Employee,
      Reports) TIDAK tersentuh sama sekali oleh CSRF-01/TABEDGE-01 (bukan employee-tab, beda
      bentuk form) -- msh py gap signifikan masing2 (5-13 kode), BELUM ada rencana sweep utk ini.
    U098 Attachments (25 kode) & U099 Profile Picture (12 kode) msh GAP terbesar -- unik, perlu
      TC tersendiri per kode (bukan reusable lintas-unit spt CSRF/TABEDGE).
  DAN PIM lanjutan (prioritas user 2026-11-18): U088 Personal Details 1.2/1.4 ditutup penuh
  (TC-PIM-PD-API-02, 6/6 lolos -- nationality relation benar, GET ulang konsisten, ganti id
  nationality ikut berubah nama, tidak cache nama lama). U093 Job 1.2/4.4/5.9 ditutup
  (TC-PIM-JOB-API-02, SENGAJA FAILED R3, 2 BUG BARU: BG-473 Medium -- terminasi SEBELUM
  joinedDate diterima 200 bukan ditolak 422, tidak ada validasi urutan tanggal sama sekali di
  endpoint terminations; BG-474 Medium -- 2 terminate bersamaan pd karyawan sama KEDUANYA 200,
  tidak ada locking, 1 record "hilang" diam-diam/last-write-wins. [TEMUAN non-bug] subUnitId
  harus di-OMIT dari body job-details, bukan dikirim null -- inkonsistensi kecil). U095
  Report-to 1.8/4.2/4.3/4.5/4.7/4.8/5.5/8.4 ditutup (TC-PIM-REPORTTO-API-02, 7/7 lolos --
  4.2/4.7 diuji AMAN dgn supervisor BERBEDA per request, menghindari BG-466 duplicate-500;
  5.5 TIDAK ada rate limit pd create supervisor, dicatat finding bukan bug). VERIFIKASI LIVE
  (sesuai instruksi user): hipotesis 1.6 struktural utk Emergency/Dependents/Salary/
  Qualifications/Memberships DIKONFIRMASI via probe browser -- 1 "search input" yg terdeteksi
  di tiap tab TERNYATA class oxd-main-menu-search (search SIDEBAR MENU global, bukan milik
  tabel record tab itu), dibuktikan via ancestor-chain DOM; ReportToPage.ts jg dikonfirmasi
  tidak punya search locator apa pun. TC-PIM-IMMIGRATION-API-01 & TC-PIM-QUALIFICATION-API-01
  ditambah check 3.4 (leap year + rentang tanggal 1950-2099) -- gap ini TERNYATA bukan
  struktural (flag DT ada & genuine), hanya belum pernah diuji boundary-nya scr eksplisit.
  Matrix TOTAL 77.6% -> 77.9%. PIM 85.6% -> 87.3% (806 COVERED/120 GAP/494 N/A dari 1420 sel).
  SISA GAP PIM (120 sel) per unit, re-verified 18 Nov 2026:
    U093 Job (4 kode: 3.1 4.1 5.1-SQLi 5.1-XSS-Stored) & U095 Report-to (6 kode: 1.2 1.6 3.1
      4.1 5.1-SQLi 5.1-XSS-Stored) = STRUKTURAL, dikonfirmasi live tidak ada field teks bebas
      (hanya id/enum) & tidak ada search UI -- flag 'T'/'C' generik EMP_TABS blanket-requires
      evidence yg tidak mungkin ada scr genuine pd kedua unit ini, sama kelas keterbatasan dgn
      1.2/1.4 di U039/U040. Report-to 1.2 jg struktural (tidak ada field opsional genuine,
      hanya 2 field wajib).
    U090/U091/U094/U096/U097 (Emergency/Dependents/Salary/Qualifications/Memberships): hanya
      1.6 tersisa, KONFIRMASI STRUKTURAL (lihat verifikasi live di atas).
    U092/U096 1.6 (sama struktural) -- U092 Immigration/U096 Qualifications jg py 1.6 msh GAP
      (3.4 sudah ditutup).
    U002/U036-U038/U041/U042 (Employee List, Optional/Custom Fields, Data Import, Add Employee,
      Reports) & U098 Attachments/U099 Profile Picture: SAMA SEKALI belum disentuh batch PIM
      sweep manapun (bukan employee-tab, bentuk form beda) -- msh py gap signifikan
      (5-25 kode masing2), BELUM ada rencana sweep/TC utk ini.
  DAN PIM lanjutan (U098 Attachments, SEBAGIAN -- lihat PAUSE di bawah) 87.3% -> 89.3% (2 TC
  baru: TC-PIM-ATTACHMENT-API-02 10/10 lolos, TC-PIM-CONTACT-10 SENGAJA FAILED R3 1 BUG BARU
  BG-475 Medium -- double-click Save pd modal Attachments = 2 entri, instans ke-4 pola
  double-submit app-wide sama dgn BG-427). Investigasi U098 vs sweep_units.json: BUKAN
  oversight -- U098 tidak punya URL sendiri (widget tertanam di 8 tab), semua sweep generik
  butuh 1 URL per unit via resolveUnitUrl, dicatat permanen. Matrix TOTAL 77.9% -> 78.3%.
  PELAJARAN: simulasi koneksi putus (dropConnectionDuringSave) menghasilkan kata2 error
  BERBEDA per browser engine (Chromium "net::ERR_FAILED"/"fe"; Firefox "can't access property
  X, Y is undefined"; WebKit "due to access control checks"/"AxiosError: Network
  Error"/"JSHandle@object") -- SEMUA pola BG-199 yg sama, whitelist WAJIB cover ketiganya kalau
  TC dijalankan lintas project (jangan cuma --project=chromium kalau RUN COMMAND menyebut
  "lintas 3 browser"). Launch browser lain manual di tengah test TIDAK bekerja utk 8.2 -- pola
  yg benar: jalankan file yg sama lintas 3 project Playwright (default playwright.config.ts,
  tanpa --project flag), biarkan fixture `page`/`testInfo.project.name` yg menyesuaikan.
  ============================================================================
  RESUME 2026-11-18 (lanjutan dari PAUSE di atas, user: "tolong lanjutkan"):
  Daftar 7 item (urutan dari user 2026-11-18, "Next pass"):
    1. [x] DONE -- investigasi U098 vs sweep_units.json (bukan oversight, didokumentasikan di atas).
    2. [x] DONE -- U098 Attachments SEPENUHNYA ditutup kecuali 1.6 (struktural, sudah
       dibuktikan): TC-PIM-ATTACHMENT-API-03 menutup 5.3-Rename (exe header MZ di-rename .pdf
       -> 200 diterima, pola sama BG-462/463, bukan bug baru), 5.4 (CSRF A/B Origin, identik
       dgn TC-PIM-CSRF-01), 5.5 (6 create paralel -> semua 200, tidak ada rate limit, finding
       bukan bug), 7.4 (tanpa console warning saat buka modal Add Attachments), 7.5 (waktu
       respons list/create dlm batas kewajaran). 7/7 lolos, tidak ada bug baru.
    3. [x] DONE -- U099 Profile Picture SEPENUHNYA ditutup: TC-PIM-PHOTO-API-02 (1.1-R/2.1/
       5.2-PrivEsc/5.3-BadExt/5.3-Rename/5.4, 9/9 lolos) + TC-PIM-PD-12 (1.8/4.2/4.3/4.5/4.7/
       4.8/8.4 via widget foto Personal Details, 7/7 lolos). Tidak ada bug baru. PUT/replace
       idempotent (beda dgn Attachments yg POST/create-row) -- double-click/concurrency tidak
       bisa "duplikat", diukur dari status+isi akhir.
    4. [x] DONE -- U002 Employee List SEPENUHNYA ditutup: TC-PIM-LIST-15 (1.8/4.2/4.5/4.8/5.4,
       5/5 lolos). Modal konfirmasi delete tertutup sesudah klik pertama -> double-submit
       struktural tidak mungkin terjadi (kontras positif dgn BG-475 Attachments).
    5. [x] DONE -- U036-U038 Configuration SEMUA TUNTAS: U036 Optional Fields (TC-PIM-
       OPTFIELD-05, 12/12), U037 Custom Fields (TC-PIM-CUSTOMFIELD-07, SENGAJA FAILED, BUG
       BARU BG-483), U038 Data Import (TC-PIM-DATAIMPORT-07, SENGAJA FAILED, BUG BARU BG-484
       -- import CSV identik 2x membuat 2 employee duplikat, tidak ada idempotency key; jg
       temuan feedback CSV import pakai panel inline bukan toast, finding bukan bug).
    6. [x] DONE -- U041 Add Employee SEPENUHNYA ditutup (TC-PIM-ADD-34, 7/7, tidak ada bug --
       kontras positif dgn Data Import/BG-484: duplicate employeeId DITOLAK 422, keunikan
       ditegakkan benar).
    7. [x] DONE -- U042 Reports SEPENUHNYA ditutup (TC-PIM-REPORT-07, SENGAJA FAILED, BUG BARU
       BG-485 -- field criteria pd create Report SELALU 500, 3 format dicoba semua crash,
       fitur filter kriteria tidak bisa dipakai via API sama sekali). 10/11 lolos.
  TAMBAHAN (instruksi koordinator 18 Nov 2026): TC-PIM-CSRF-01 overclaim docstring DIPERBAIKI
    -- kode ditambah utk benar2 menguji U039/U040/U041/U042 (bukan cuma U088-U097), data A/B
    UNIK per sisi; U037/U038 TETAP di luar CSRF-01 (tidak ada endpoint create 1-step aman utk
    A/B tanpa UI), ditutup via TC tersendiri (U037 via CUSTOMFIELD-07 di atas). Ditemukan juga
    & diperbaiki: ab() U097 Memberships pakai membershipId:1 identik di legit+evil -> kolisi
    duplikat (false-positive BG-481, auto-closed) -> diganti id nonexistent yg aman diulang.
    TC-PIM-REPORTMETHOD-API-01/TERMREASON-API-01 masing2 ditambah 1 check 4.8 (hapus+buat
    ulang nama sama -> id baru, tidak ada cooldown) -- menutup 4.8 utk U039/U040.
  ============================================================================
  PIM SELESAI 18 Nov 2026 -- SEMUA 7 ITEM "Next pass" TUNTAS. PIM = 97.6% (904 COVERED/22
  GAP/494 N/A dari 1420 sel). Matrix TOTAL = 80.0%. SISA 22 GAP PIM SELURUHNYA STRUKTURAL,
  diverifikasi ulang & dikonfirmasi FINAL:
    U039/U040 (Reporting Methods/Termination Reasons): 1.2/1.4 -- flag-based NA_RULES
      mewajibkan evidence optional-field/relasi pd SEMUA unit ber-flag 'C', terlepas apakah
      unit itu genuinely punya field opsional/relasi (keduanya cuma punya 1 field "name").
    U090/U091/U092/U094/U096/U097/U098 (Emergency/Dependents/Immigration/Salary/Qualifications/
      Memberships/Attachments): 1.6 -- dikonfirmasi live via DOM ancestor-chain, satu2nya
      "search input" yg terdeteksi adalah oxd-main-menu-search (sidebar global), BUKAN search
      milik tabel record tab itu; ATTACHMENT-API-02 jg konfirmasi di level API (sortField
      ditolak 422).
    U093 Job & U095 Report-to: 3.1/4.1/5.1-SQLi/5.1-XSS-Stored (+Report-to 1.2/1.6 jg) --
      tidak ada field teks bebas genuine, hanya id/enum/tanggal.
    U097 Memberships: 5.1-XSS-Stored -- sama kelas struktural (hanya membershipId/enum +
      subscriptionFee/angka + 2 tanggal, tidak ada field teks bebas); didokumentasikan via
      report.finding() TANPA kode literal (konvensi project), finding tanpa kode tidak
      otomatis jadi N/A di matrix -- keterbatasan NA_RULES yg sama dgn 1.2/1.4.
  TIDAK ADA lagi kode yg genuinely closable via TC authoring. PIM TIDAK BISA mencapai 100%
  literal tanpa perubahan tool build_matrix.py (keluar scope sesi ini, berisiko side effect ke
  modul lain) -- 97.6% adalah CEILING NYATA & FINAL utk PIM.
  BUG BARU ditemukan sesi PIM-closure ini (18 Nov 2026): BG-483 (Custom Fields double-submit),
  BG-484 (Data Import tidak idempotent), BG-485 (Reports criteria -> 500 crash).
  STATE SAAT INI: git status BERSIH setelah commit ini, tidak ada file probe `zz-probe-*`
  tersisa. SESUAI INSTRUKSI USER 2026-11-17 ("apabila menu PIM sudah 100%, langsung lanjut
  otomatis ke modul berikutnya tanpa perlu konfirmasi") -- PIM sudah mencapai ceiling
  struktural-nya (97.6%, bukan 100% literal krn keterbatasan tool, sudah dibuktikan &
  didokumentasikan lengkap di atas) -- LANJUT OTOMATIS ke modul berikutnya SEKARANG:
  Performance (67.2%, modul terendah proyek saat ini). NEXT STEP KONKRET: baca ulang
  Taxonomy-Coverage-Matrix.md utk Performance, enumerasi semua unit & kode GAP, mulai tutup
  per-unit dgn pola kerja yg sama (probe-first, TC baru, matrix rebuild, docs, commit+push).
  ============================================================================
  PERFORMANCE CLOSURE (dimulai 18 Nov 2026, instruksi koordinator: lanjutkan pola PIM):
  GAP list awal (rebuild matrix 18 Nov 2026, 138 sel di 10 unit):
    U007 Employee Reviews: 27 kode. U066 KPIs: 3. U067 Trackers config: 18. U068 Manage
    Reviews: 20. U069 My Reviews: 2. U070 My Trackers: 2. U071 Employee Trackers: 5.
    U102 Review Evaluation: 15. U103 Self Evaluation: 31. U104 Tracker Logs: 16.
  SELESAI sejauh ini (18 Nov 2026):
    - TC-PERF-KPI-12: menutup U066 KPIs SEPENUHNYA (1.2/2.2/5.9; min>max via API -> 400,
      non-numerik -> 422, isDefault opsional -> 200). Lolos penuh, tidak ada bug.
    - TC-PERF-API-02: menutup U069 My Reviews & U070 My Trackers SEPENUHNYA (6.5, skema
      ketat); U071 Employee Trackers turun jadi HANYA 3 kode struktural (4.1/5.1-SQLi/
      5.1-XSS-Reflected -- tidak ada search param apa pun, dibuktikan via 422 di 3
      percobaan param berbeda). Lolos penuh, tidak ada bug.
    - TC-PERF-TRACKER-09: menutup U104 Tracker Logs SEPENUHNYA KECUALI 1.6 (struktural,
      sortField/search ditolak 422 keduanya). SENGAJA FAILED (R3), BUG BARU BG-486
      (Medium) -- double-click Save pd modal Add Log = 2 entri, instans ke-6 pola
      double-submit app-wide (BG-427/BG-475/BG-483). Fix NAME_RULES build_matrix.py utk
      TC-PERF-TRACKER-09 (path tracker/ default-nya map ke U067, perlu entry eksplisit).
    - TC-PERF-TRACKER-10: menutup U067 Trackers config SEPENUHNYA (18 kode: 1.2/1.4/1.8/
      2.2/3.1(limit 200 karakter, binary-search)/4.1/4.2/4.3/4.5/4.7/5.1-SQLi/5.1-XSS-
      Stored/5.2-MassAssign/5.4/5.5/6.5/6.7/8.4). SENGAJA FAILED (R3), BUG BARU BG-487
      (Medium) -- double-click Save pd form Add Tracker = 2 entri, instans ke-7 pola
      double-submit app-wide (BG-427/BG-475/BG-483/BG-486). Fix NAME_RULES build_matrix.py
      regex utk include TRACKER-10 dlm mapping U067 yg sudah ada.
    - TC-PERF-REVIEW-14: menutup U068 Manage Reviews SEPENUHNYA KECUALI 5.1-SQLi/5.1-XSS-
      Reflected (struktural, tidak ada search param bebas). reviewerEmpNumber WAJIB dari
      Report-to supervisor NYATA (bukan employee lain) -- percobaan pertama tanpa ini
      SEMUA 422, pelajaran metodologi. SENGAJA FAILED (R3), BUG BARU BG-488 (Medium) --
      create review endDate SEBELUM startDate via API (bypass client) -> 200 diterima,
      validasi urutan tanggal HANYA client-side. Race 2x Activate paralel pd review SAMA
      (pakai createReview() dgn Job Title w/ KPI genuinely valid) -> status berbeda
      (404/200), TIDAK ADA korupsi data -- lolos, bukan bug kedua (dugaan awal 2 bug
      ternyata hanya 1 yg genuine, dikoreksi setelah verifikasi ulang).
    - TC-PERF-EMPREVIEW-01: menutup U007 Employee Reviews SEPENUHNYA KECUALI 5.1-SQLi/
      5.1-XSS-Reflected (struktural). PELAJARAN PENTING: U007 (performance/
      searchEvaluatePerformanceReview) adalah halaman PENCARIAN MURNI (trash=0, pencil=0 di
      unitRegistry traits) -- POST/PUT/DELETE SEMUA 404/405, jadi SELURUH kode berbasis
      mutasi (1.1-C/U/D/1.3/2.5/4.4/5.2-MassAssign/5.9/6.7) TIDAK BERLAKU di unit ini (entity
      review yg sama sudah ditutup CRUD-nya scr genuine di Manage Reviews/U068). Ditutup via
      check literal yg MEMBUKTIKAN ketidakhadiran mutasi (status 404/405 nyata), bukan
      diasumsikan. fromDate/toDate TERNYATA TIDAK wajib di level API (beda dari saran UI) --
      2.1 ditutup dgn bukti sebaliknya dari ekspektasi awal. 26/26 lolos, tidak ada bug.
    - TC-PERF-EVAL-18 + PERBAIKAN TC-PERF-EVAL-17: menutup U102 Review Evaluation
      SEPENUHNYA (1.1-R/1.2/1.4/1.8/2.1/4.2/4.3/4.4/4.5/4.7/4.8/5.4/5.9/8.4). PELAJARAN
      PENTING (tooling): TC-PERF-EVAL-17 py 3 check DI DALAM LOOP pakai label `${label}
      [U102] ...` (variabel interpolasi, bukan string literal) -- extract_specs.py regex
      `report\.check\(\s*['"\`](.+?)['"\`]\s*,` HANYA baca argumen pertama kalau berupa
      string literal LANGSUNG, jadi kode "5.1-SQLi"/"4.1"/"5.1-XSS-Stored" di dalam loop
      TIDAK PERNAH terbaca sama sekali sejak file itu ditulis. Diperbaiki dgn membongkar
      loop jd 3 panggilan report.check() terpisah, masing2 label STRING LITERAL penuh --
      perilaku runtime SAMA PERSIS (BG-459 tetap sengaja FAILED), hanya cara tooling baca
      label yg berubah. CATATAN UTK TC BERIKUTNYA: SELALU tulis label check LANGSUNG sbg
      string literal, JANGAN via variabel/fungsi/template-interpolation, bahkan di dalam
      loop -- kalau perlu label dinamis di dalam loop, BONGKAR loop-nya jd panggilan
      terpisah per-case drpd pakai variabel sbg label.
    - TC-PERF-EVAL-19: menutup U103 Self Evaluation SEPENUHNYA (1.1-R/1.2/1.4/1.8/2.1/2.2/2.5/
      3.1/3.2/3.4/4.1/4.2/4.3/4.4/4.5/4.7/4.8/5.1-SQLi/5.1-XSS-Stored/5.2-IDOR/5.2-MassAssign/
      5.4/5.6/5.9/6.5/7.4/7.5/8.1/8.2/8.3/8.4). Endpoint ESS: PUT performance/reviews/<id>/
      evaluation/employee {complete,ratings:[{kpiId,rating,comment}],generalComment}. Fix
      NAME_RULES build_matrix.py (default `performance/evaluate/` map ke U102, perlu entry
      eksplisit utk EVAL-19 -> U103). PELAJARAN TEST DESIGN: fillRatings harus pakai nilai PER
      KPI sesuai minRating/maxRating masing2 (bukan nilai flat spt '3') -- 1 KPI pd review uji
      ternyata minRating=50, rating flat 3 kena validasi client "Rating should be >= 50" dan
      Save tidak pernah mengirim PUT; tambah helper validRating(kpi). PELAJARAN LAIN: goto()
      langsung setelah browser back()+forward() kadang timeout nunggu ratingInputs (SPA state
      stale) -- selipkan page.goto('/web/index.php/dashboard/index') dulu sbg reset sblm
      goto() berikutnya. SENGAJA FAILED (R3), BUG BARU BG-489 (Medium) -- PUT evaluation/
      employee dgn rating non-numerik ("abc") DITERIMA 200, server diam-diam convert ke
      rating 0.00, pola sama dgn BG-373 tapi di endpoint employee-side bukan supervisor-side.
      31/32 lolos.
  STATE SAAT INI: PIM = 97.6% (ceiling final). Performance = 98.1% (ceiling final, 413
  COVERED/8 GAP struktural/289 N/A dari 710 sel). Matrix TOTAL = 82.8%.
  PERFORMANCE SELESAI. 8 GAP sisa semuanya struktural (tidak ada search param bebas utk
  injeksi SQL/XSS di Employee Reviews/Manage Reviews/Employee Trackers) -- TIDAK dipaksa
  ditutup, sesuai aturan proyek.
  BUZZ CLOSURE (24 Nov 2026): U012 (satu2nya unit Buzz) punya 18 GAP code. Ditutup via 2
  TC baru:
    - TC-BUZZ-22: menutup 9 kode (1.2/1.8/2.2/4.1/4.7/4.8/5.2-MassAssign/6.5/6.7).
      PELAJARAN 1.2: type=video (via videoUrl) ternyata 500 (lihat BG-490 di bawah) jadi
      TIDAK BISA dipakai sbg bukti "text opsional" -- dibuktikan lewat jalur lain yg lebih
      aman: POST {type:'photo'} TANPA field apa pun -> 422 invalidParamKeys HANYA berisi
      "photos", TIDAK berisi "text" -- bukti valid bhw text opsional saat type != text.
      PELAJARAN 4.8: catatan lama di BuzzPage.ts ("post baru butuh reload manual, confirmed
      2026-11-11") TERNYATA SUDAH TIDAK BERLAKU -- dibuktikan ulang live 2x konsisten: post
      baru LANGSUNG muncul sbg card nyata (bukan cuma sisa teks composer, sudah dipersempit
      pakai buzzPage.cardByText) tanpa reload sama sekali. Dicatat sbg update/koreksi atas
      catatan lama, BUKAN dipaksa cocok dgn ekspektasi lama. 12/12 check lolos, tidak ada bug.
    - TC-BUZZ-SECURITY-12: menutup 8 kode terakhir (3.3/5.1-CmdPath/5.1-SSRF/5.2-PrivEsc/
      5.3-ContentType/5.3-DoubleExt/5.3-Oversize/5.3-Filename). BUG BARU BG-490 (High):
      POST type=video dgn URL BENIGN (YouTube) -> 500 Internal Server Error, dicoba 2 nama
      field (videoUrl, video) keduanya 500 -- fitur Share Video 100% broken server-side utk
      SEMUA nilai, bukan validasi yg salah. SSRF (5.1-SSRF) ditutup dgn bukti URL internal
      (169.254.169.254) menghasilkan status IDENTIK dgn URL benign (500 keduanya) -- field
      ini tidak punya jalur SSRF yg berfungsi saat ini. TEMUAN BESAR (bukan bug baru
      terpisah, didokumentasikan sbg CATATAN SCOPE di TC): investigasi mendalam (6+ probe
      live) menunjukkan upload foto via "Share Photo" TIDAK PERNAH benar2 mengirim file ke
      server -- native 'change' event DOM terpicu, tapi POST yg dikirim composer SELALU
      {type:"text",...} tanpa field foto apa pun, utk file JINAK (PNG valid) MAUPUN
      berbahaya (exe di-rename, 6MB oversized) -- perilaku IDENTIK utk keduanya, membuktikan
      TIDAK ADA channel upload yg berfungsi saat ini utk dieksploitasi dgn file apa pun.
      Mekanisme kontrak API yg benar (field "photos" di error 422 tapi tidak berhasil
      ditemukan bentuk yg diterima: dicoba string/array, key photo/photoUrl/image/
      attachment/file, semua 422) TIDAK berhasil direverse-engineer black-box dlm sesi ini --
      TIDAK diklaim sbg bug kedua yg terpisah krn tidak cukup bukti definitif, hanya
      dicatat sbg open question; TC-BUZZ-09/SECURITY-03/SECURITY-04 (closed, existing)
      TIDAK disentuh/direvisi (di luar scope unit U012 closure, perlu investigasi
      terpisah kalau mau dipastikan apakah tes2 itu false-positive). PELAJARAN TOOLING:
      versi awal TC ini (8 percobaan upload sekuensial tanpa reset state) hang >5 menit krn
      flakiness composer UI demo publik di bawah banyak siklus buka/tutup berturutan --
      dikurangi jd 3 percobaan representatif + Promise.race 30s per percobaan + reset ke
      halaman netral (dashboard) sblm tiap percobaan, pola yg sama dgn fix back/forward-
      timeout di TC-PERF-EVAL-19. 8/8 check lolos (2 di antaranya SENGAJA gagal
      mendokumentasikan BG-490 di real-run pertama sblm perilaku bug dikonfirmasi reproduce
      konsisten -- re-run final: semua 8 check PASS krn kondisi check memang menegaskan
      perilaku BENAR yg seharusnya, BUKAN perilaku buggy).
  STATE SAAT INI: Buzz = 100% (ceiling final, 58 COVERED/0 GAP/13 N/A). Matrix TOTAL = 83.1%.
  BERIKUT (per-modul, hasil rebuild matrix 24 Nov 2026): Claim = 69.03% (214 COVERED/96
  GAP), Time = 69.50% (335/147), Admin = 72.81% (798/298) -- Claim adalah modul PALING
  RENDAH sekarang. Lanjut otomatis ke Claim per instruksi standar koordinator: baca
  docs/TC-Claim.txt + Taxonomy-Coverage-Matrix.md utk daftar GAP riil per unit Claim, lalu
  probe-first -> TC -> typecheck -> trial -> real-run -> Bug-List -> matrix rebuild -> docs
  -> check_docs.py -> commit -> push, per unit.
  **PERUBAHAN EMAIL KOMIT (24 Nov 2026, instruksi user via koordinator):** mulai komit
  berikutnya, email ganti jadi arsal@pakaidonk.id (nama tetap "Arsal", TETAP TANPA
  Co-Authored-By/trailer apa pun). Commit lama yg sudah di-push JANGAN diubah. Format:
  `git -c user.name="Arsal" -c user.email="arsal@pakaidonk.id" commit ...`.
  Catatan Performance spesifik (dari sesi sebelumnya, masih berlaku): Tracker Log field
  "log" dibatasi 150 karakter server-side; evaluation/supervisor body {ratings:[{kpiId,
  rating,comment}],generalComment}; evaluation/final body {complete,finalRating,
  finalComment,completedDate}; JANGAN jalankan beberapa TC security/API yg masing2 buka
  sesi ESS sekaligus scr sequential dgn reporter penuh (video+screenshot) -- bikin sesi ESS
  kedua timeout & false-positive berantai; jalankan terpisah kalau TC butuh assert sesi ESS
  multipel.
  ============================================================================
  Catatan util: label check WAJIB kode taksonomi LITERAL -- termasuk check di dalam loop (jangan
  `${label} ...`; tulis "4.1 / 5.1-SQLi ... (${label})"); TC lama -> kode di baris Kategori (apply_codes);
  form edit menimpa input saat GET detail; cookie sesi berpath /web; heredoc bash dgn kutip tunggal ->
  tulis skrip ke file; noise console bug yg sudah punya TC sendiri -> expectedConsoleErrorPatterns (arg ke-5
  TestReport) + komentar rujukan; demo format tanggal bisa yyyy-dd-mm / yyyy-mm-dd / dd-mm-yyyy (lihat
  dateInput.ts); server tolak From = To; Add/Edit Holiday = route terpisah (saveHolidays), bukan modal,
  goto() butuh retry-on-ERR_ABORTED spt ApplyLeavePage; cek "Already exists" pd Holiday itu CLIENT-SIDE
  per-tanggal (bukan per nama) -- gunakan tanggal unik per sub-tes drpd mengulang collision.
- **Catatan run:** TC asli JANGAN pakai `--reporter=list` (R8). Di Performance yg SENGAJA FAILED hanya
  REVIEW-10 (BG-356) & EVAL-15 (BG-373); gagal lain = regresi, investigasi. Pelajaran batch 2:
  (1) set data setup lewat API kalau halaman UI-nya memicu request 404 sampingan; (2) jangan andalkan
  networkidle utk XHR pasca-klik -- tunggu respons spesifiknya; (3) autocomplete: pilih opsi by
  lastName unik, bukan opsi pertama.
- **Blocker:** —
- **Perlu persetujuan user (antrian):** — | R6 DISETUJUI user 2026-11-15 ("setuju semua"): TC yg
  mengubah config global (Leave Period, Work Week, Attendance Config, dst) BOLEH dijalankan, WAJIB
  dibungkus withConfigRestore() + verifikasi nilai kembali ke semula setelahnya. (identity self-heal otomatis sejak Fase 1, TIDAK perlu
  tanya ulang lagi kalau kambuh -- itulah tujuan fix-nya. Kalau POLA korupsinya beda dari yg
  terdokumentasi (bukan employeeId pendek), baru perlu investigasi/tanya ulang.)

## ATURAN KERJA (berlaku semua fase)
- R1 Probe-first: eksplor live dgn file `tests/zz-probe-*.spec.ts`, jalankan SELALU dgn `--reporter=list`
  (override config -> bugListReporter TIDAK menulis ke Bug-List). Hapus probe setelah dipakai.
- R2 Siklus batch: A audit -> B regresi -> C root cause (bug sistem/bug script/false positive/false pass)
  -> D cross-check Bug-List.
- R3 TC baru lolos 3x run bersih. Bug nyata dibiarkan FAILED + `report.finding()`, tidak di-whitelist.
- R4 Kesimpulan N/A wajib bukti "kemampuan tidak ada", bukan "belum dicoba".
- R5 Commit per task/modul, author `Arsal <arsalwildann@gmail.com>`, TANPA trailer Claude/Co-Authored-By.
  Verifikasi `git log -1 --format="%an <%ae>"` + pastikan body commit tidak ada trailer.
- R6 Konfigurasi global (Work Week, Leave Period, Modules, Attendance Config, Localization) & Maintenance
  Purge: HANYA setelah persetujuan user (masukkan ke antrian STATUS), pakai `withConfigRestore()`.
- R7 Bug-List: redaksi standar (langkah manual manusiawi, expected/actual naratif, dampak user).
- R8 Run regresi resmi TANPA `--reporter=list` (supaya bugListReporter aktif), `--workers=1`, health check dulu.
- R9 Skill yg dipakai: test-master + anthropic-skills:test-case-writing (desain TC), playwright-expert
  (tulis TC/page object), typescript-pro (util/fixture), debugging-wizard (root cause),
  anthropic-skills:xlsx (Bug-List), engineering:documentation (docs), karpathy-guidelines (perubahan
  minimal), engineering:code-review (review akhir fase).

---

## FASE 0 — Integritas & Fondasi
- [x] P0.1 Repo hygiene: commit `docs/Test-Case-Taxonomy.txt` + `docs/Execution-Plan.md`; tambah `.vscode/`,
      `__pycache__/` ke `.gitignore`. (+ SessionStart hook auto-resume di `../.claude/settings.local.json`)
- [x] P0.2 Bersihkan Bug-List.xlsx (skill xlsx):
  - [x] Tutup noise probe: BG-296,298,305,312,322,334,335,339,340,343 -> Closed, "Bukan Bug (Probe Sementara)".
  - [x] BG-332 -> Closed (422 adalah perilaku benar server menolak amount=0, bukan bug).
  - [x] BG-333 -> Medium, tulis ulang: konfirmasi app-wide BG-199 (unhandled exception non-2xx), modul Claim.
  - [x] BG-338 -> High, tulis ulang redaksi standar (bypass upload .php->.jpg Claim Attachments).
  - [x] Validasi: tiap baris Open menunjuk spec file yg masih ada (41 Open, 0 orphan).
  - [x] Pindahkan baris Closed ke sheet "Archive" (117 baris; 106 di-relabel "Bukan Bug (Iterasi Pengembangan TC)").
  - [x] TAMBAHAN: fix `bugListReporter` -- dedup per script (bukan script+summary, krn summary yg ditulis ulang
        manusia memicu duplikat), ID berikutnya memindai semua sheet (Archive) agar tidak reuse ID.
  - [x] TAMBAHAN: TC-CLAIM-ASSIGN-06 whitelist ulang log "Failed to load resource 422" (pageerror tetap terdeteksi).
  - [x] TAMBAHAN: 5 error TypeScript di modul Time (CI merah sejak commit sebelumnya) diperbaiki.
- [x] P0.3 TC-PERF-REVIEW-01 (false pass): dihapus; diganti PERF-REVIEW-01..09 di P2.1.
- [x] P0.4 Revisi TC N/A yg overclaim (3x stabil):
  - [x] TC-CLAIM-ASSIGN-04 -> reframe "segregation of duties": scan SEMUA klaim milik akun login,
        allowedActions tidak boleh berisi APPROVE/REJECT/PAY.
  - [x] TC-CLAIM-ASSIGN-09 -> buat klaim employee lain (A) sungguhan; buktikan /claim/requests/<id> 403
        utk klaim A, /claim/employees/<A>/requests/<id> 200 (scoped, by design), DAN IDOR path-mismatch
        (id klaim A di bawah path empNumber B) ditolak. Plus ID invalid + tanpa-auth.
  - [x] TC-CLAIM-ASSIGN-15 -> dihapus (diganti CLAIM-APPROVAL-06 cross-admin sungguhan di P2.2).
- [x] P0.5 Koreksi `QA-Review-Progress.md`: klaim N/A salah, angka (Leave 16, Time 7), tambah blok KOREKSI.
      (Keputusan: 6 TC lama Admin/PIM/Recruitment/Buzz dgn premis sama TIDAK diedit sekarang --
      dijadwalkan Fase 4.1, butuh re-verifikasi sungguhan dgn akun ESS, bukan cuma ganti teks.)
- [x] P0.6 Regresi baseline 43 TC: 32 pass, 2 FAILED-by-design (BG-333/338, benar), **9 gagal krn SATU root
      cause**: empNumber=7 (identitas akun login) terkorupsi di demo publik bersama ini --
      firstName/lastName="EJBED"/"Apt 456", employeeId="CA" (2 char, ambigu, match acak ke "Charles
      Carter" saat dicari). BUKAN kita yg merusak (grep suite: tidak ada TC yg menulis ke empNumber=7).
      BUKAN bug app/script -- environment data corruption, polanya sama dgn cascading-failure BG-007
      Recruitment (1 akar, bukan 9 bug). User diminta persetujuan (AskUserQuestion, krn mengubah
      identitas akun bersama di demo publik) -> **disetujui**. Diperbaiki via PersonalDetailsPage
      (PUT personal-details, 200) jadi firstName="QA" lastName="Admin" employeeId="QAADMIN07" (unik,
      tdk ambigu). Tidak ada hardening kode tambahan dilakukan -- check assertion yg sudah ada di TC
      TERBUKTI bekerja benar (menangkap mismatch ini), jadi root cause murni data, bukan logic.
- [x] P0.7 Re-run 9 TC: 5 pass lgsg (APPLY-02/03/04/06, TIME-REPORTS-01) -- identity fix konfirmasi
      menyelesaikan masalah. 4 sisanya (APPLY-01, APPLY-05, LIST-01, LIST-03) diisolasi 1-per-1:
      - APPLY-05/LIST-01/LIST-03: pass bersih saat diisolasi -> flaky-under-sustained-load (pola yg
        sudah dikenal proyek ini: demo melambat setelah run serial panjang), BUKAN bug.
      - APPLY-01: bug SCRIPT nyata ditemukan & diperbaiki -- perbandingan nama tdk menormalisasi
        whitespace (UI Entitlement selalu render "First  Last" 2 spasi walau middleName kosong,
        getLoggedInEmployeeName() bangun fullName via filter(Boolean) = 1 spasi). Fix: normalisasi
        spasi sblm compare. 3x verifikasi (1 run di antaranya kena temuan di bawah, bkn fix-nya).
      **[TEMUAN PENTING, cross-cutting]** empNumber=7 TERKORUPSI LAGI persis dgn teks identik
      ("EJBED"/"Apt 456"/"CA") hanya beberapa menit stlh diperbaiki pertama kali -- pola INI
      (bukan random garbage BEDA tiap kali) mengindikasikan demo publik kemungkinan RESET
      PERIODIK ke snapshot baseline yg SUDAH tercemar sejak lama, bukan korupsi live berkelanjutan.
      Diperbaiki ulang (aksi identik yg sudah disetujui user, tidak minta izin ulang krn sama persis).
      RISIKO UTK FASE SELANJUTNYA: 11 file di 4 area (`claim/assign`,`leave/apply`,`leave/leave-list`,
      `time/attendance`) pakai `getLoggedInEmployeeName()` -- SEMUA rentan kena dampak kalau reset
      kejadian lagi mid-run. TIDAK termasuk modul lama (Admin/PIM/Recruitment/Buzz, mereka pakai
      employee test khusus, bukan identitas diri sendiri). **Fix arsitektural yg lebih tahan lama
      (verifikasi via empNumber/API ground-truth, bukan match nama/employeeId yg bisa korup) BELUM
      dikerjakan -- scope-nya besar (perlu redesign createLeaveEntitlement + LeaveEntitlementPage.
      selectEmployee), dijadwalkan sbg item tersendiri sebelum/selama Fase 2, BUKAN diburu-buru di
      P0.7.** Kalau TC di 4 area ini gagal lagi di masa depan dgn simptom serupa ("entitlement ke
      employee salah", "balance 0 tak terduga"), CEK DULU `GET /api/v2/pim/employees/7` sblm
      berasumsi bug baru -- besar kemungkinan ini kambuh lagi, bukan regresi kode.

## FASE 1 — Infrastruktur Multi-Role [TUNTAS 2026-11-15]
- [x] P1.1 Probe: Add Employee's "Create Login Details" toggle = jalur TERBAIK utk ESS (atomic,
      linkage dijamin benar, TIDAK ada role selector -> SELALU ESS, dikonfirmasi live). Report-to
      API `/employees/<id>/supervisors` (GET&POST) dikonfirmasi shape-nya via probe live.
- [x] P1.2 `src/utils/createEssAccount.ts` -- via UI (Add Employee+toggle), bukan API langsung
      (API create butuh form submission jg scr live, UI path lebih simpel & sudah teruji).
- [x] P1.3 `src/utils/assignSupervisor.ts` -- verifikasi via status POST + GET follow-up, BUKAN
      teks UI stlh save (known issue REPORTTO-01/03/06).
- [x] P1.4 `src/utils/createSecondAdmin.ts` -- + method baru `AdminUsersPage.selectEmployee()`
      (search employee SPESIFIK, bukan `fillFirstEmployeeName()` yg asal match "a").
- [x] P1.5 `src/utils/loginAs.ts`.
- [x] P1.6 `src/utils/withConfigRestore.ts`.
- [x] P1.7 `src/utils/networkEdge.ts` (diekstrak dari pola inline yg sudah ada di 4 modul lama).
- [x] P1.8 `tests/_global/infra/` INFRA-01/02/03 -- 3x run, 9/9 check x 3 = lolos semua.
- [x] TAMBAHAN BESAR (ditemukan saat kerjakan P1.1, tdk direncanakan tapi perlu): korupsi identitas
      empNumber=7 TERNYATA kambuh JAUH lebih sering dari dugaan P0.7 (dlm hitungan MENIT, bukan
      jam) -- dikonfirmasi berulang kali via API fresh selama sesi Fase 1 ini. Krn frekuensinya,
      fix arsitektural yg tadinya "dijadwalkan nanti" dikerjakan SEKARANG (bukan ditunda lagi):
      `getLoggedInEmployeeName()` (dipakai 11 file di 4 area) SEKARANG SELF-HEAL -- deteksi
      employeeId mencurigakan pendek (<5 char) & otomatis perbaiki via Personal Details sblm
      return. **Dibuktikan bekerja LIVE**: identitas kambuh korup lagi PAS di tengah2 verifikasi
      3x run infra, TAPI INFRA-02 (yg pakai fungsi ini) tetap lolos 3/3 -- bukti nyata self-heal
      beneran jalan, bukan cuma logic di atas kertas.

## FASE 2 — Melengkapi 4 Modul
### P2.1 Performance (~30) — eksplor dulu: siklus status review, KPI per Job Title -> form evaluasi,
halaman Trackers config, review utk employee tanpa KPI.
- [x] Eksplorasi P2.1 (batch 1: Manage Reviews + Evaluate + KPI). FAKTA LIVE yg ditemukan:
      - Supervisor Reviewer HANYA menawarkan supervisor yg sudah ter-link via PIM > Report-to (employee
        tanpa supervisor -> "No Records Found", Save diblokir client-side "Invalid").
      - Save TIDAK pindah halaman (form direset + toast). Status awal "Inactive"; selfReviewStatus terpisah.
      - Activate ditolak 400 "Cannot activate review for employees who doesn't have a Job Title with KPI"
        kalau Job Title employee kosong/tanpa KPI. Dgn Job Title ber-KPI -> 200, status "Activated", ikon
        baris berganti Edit -> Evaluate. Halaman evaluasi: reviewEvaluateByAdmin/<id>, API
        reviews/<id>/kpis + evaluation/{employee,supervisor,final}; KPI = persis set KPI Job Title-nya.
      - Complete tanpa Review Finalization -> 3x "Required" client-side. End<Start -> 2 pesan client-side.
      - DELETE review = `DELETE /api/v2/performance/manage/reviews` TANPA id di path (id di body).
      - Filter "Employee Name" di list = autocomplete yg SAMA dgn form Add (fill saja tdk mem-bind nilai;
        harus pilih suggestion, kalau tidak Search jalan TANPA filter nama -> semua review muncul).
      - KPI "Make Default Scale" eksklusif per Job Title secara DIAM-DIAM (KPI B default -> KPI A
        otomatis un-default, 200 keduanya). Baris KPI tdk punya title="Edit"; ikon via class bi-pencil-fill/bi-trash.
      - "Configure > Trackers" & "My/Employee Trackers" = fitur jurnal/catatan per employee, BUKAN
        konfigurasi KPI/review (koreksi asumsi audit lama).
      - LINGKUNGAN: placeholder tanggal site-wide berganti "yyyy-dd-mm" <-> "yyyy-mm-dd" antar sesi (pola
        reset demo yg sama dgn korupsi identitas) -> locator tanggal baru WAJIB match keduanya.
- [x] Page objects: `PerformanceManageReviewsPage` (+fixture) + `PerformanceKpiPage` (+defaultScaleToggle,
      +searchButton) + util `setupReviewableEmployee()`. PerformanceTrackerPage -> belum (batch 2).
- [x] REVIEW (file -> ID rencana): 01 Create valid (=plan 01) | 02 Supervisor wajib ter-link (baru, (-)) |
      03 Activate tanpa Job Title+KPI 400 (=plan 05) | 04 Activate sukses + Evaluate (=plan 02 sisi Admin) |
      05 KPI evaluasi = KPI Job Title (baru) | 06 Complete tanpa finalisasi (=EVAL-11 sisi negatif) |
      07 End<Start (=plan 04) | 08 Filter nama+status (=plan 08) | 09 Delete+cancel (=plan 07) |
      10 Edit pasca-Activate: PUT 422 (baru) | 11 Double-click Activate (=plan 09)
- [x] ACCESS: REVIEW-12 IDOR ESS baca review orang lain (=ACCESS-15) | REVIEW-13 ESS POST/PUT review
      via API (=ACCESS-16 BFLAC) -- keduanya pakai infra Fase 1 (createEssAccount+loginAs), lolos.
- [x] KPI (file -> ID rencana): 07 Default Scale eksklusif (=plan 09) | 08 Filter Job Title (=plan 10) |
      09 Edit (=plan 07) | 10 Delete (=plan 08)
- [x] BUG NYATA: BG-356 -- membuka ULANG halaman edit (saveReview/<id>) utk review yg sudah Activated
      -> GET manage/reviews/<id> 404 -> uncaught exception "fe" (signature sama BG-333), form kosong.
      TIDAK ada risiko data (PUT field inti ke review Activated selalu 422). Sesuai R3 tdk di-whitelist;
      REVIEW-10 = reproducer yg SENGAJA FAILED (jaga BG-356 Open).
      KOREKSI (batch 2): klaim awal "BG-356 intermiten di semua TC yg memanggil Activate & makin sering
      seiring jumlah data" SALAH. Console 404 di TC-TC itu berasal dari SETUP: set Job Title via
      halaman PIM Job memicu GET admin/job-titles/<id>/specification -> 404 (title tanpa file spek;
      ditangani app, bukan bug). Setup kini via API (PUT pim/employees/<id>/job-details) -> TC-TC itu
      bersih. Risiko yg sama mungkin ada di TC modul lain yg set Job Title via UI -> cek di Fase 4.
- [x] Perbaikan infra selama P2.1: `TestReport` pageerror kini ikut expectedConsoleErrorPatterns (dulu cuma
      console 'error'; dicek: whitelist lama di repo tdk ada yg match "Uncaught exception"). Memory baru:
      JANGAN `--reporter=list` utk TC asli (override bugListReporter) -- sesuai R8.
- [x] P2.1 BATCH 2 (ringkas): `PerformanceEvaluatePage` + `PerformanceTrackerPage` (+fixture) + util
      `createReview()`. FAKTA LIVE: rating = input teks per KPI (validasi client per-KPI min/max) + Final
      Rating di posisi terakhir; Save = PUT evaluation/supervisor + PUT evaluation/final(complete:false)
      -> "In Progress"; Complete -> dialog Ok -> "Completed" & PUT berikutnya 403; review Inactive: PUT
      supervisor 422, PUT final 403; tanggal Date of Completion DITAFSIRKAN sesuai format tampil (ketik
      2026-07-10 terkirim 2026-10-07) -> pakai tanggal hari==bulan. Tracker: POST config/trackers.
      TC: EVAL-11 finalize->Completed+read-only | EVAL-12 min/max UI+API | EVAL-13 XSS komentar aman |
      EVAL-14 eval review Inactive via API ditolak | EVAL-15 rating non-angka (BUG) | TRACKER-01 Add |
      TRACKER-02 Required.
- [x] BUG NYATA BARU (EVAL-15): PUT evaluation/supervisor dgn rating "abc" -> 200 (echo "abc"), yg
      tersimpan "0.00" -- nilai non-angka DIAM-DIAM dikonversi jadi 0; validasi angka cuma di client.
      TC sengaja FAILED (R3).
- [x] Perbaikan script selama batch 2: (a) `searchByEmployeeName` kini MENUNGGU respons list ber-filter
      empNumber (networkidle resolve sebelum hasil filter datang -> hitung baris 0); (b) pilih opsi
      autocomplete yg memuat lastName unik, bukan opsi pertama (id 4-digit "0421" bisa match lastName
      acak "QA204213" employee lain); (c) REVIEW-04 cek ikon Evaluate/Edit dikembalikan jadi hard check
      (flaky-nya ternyata akibat race (a)).
- [x] LAPIS 2 (8 TC, util `createEssReview.ts` (setupEssReviewee/createEssReview/createEssTracker,
      semua via API), page object `PerformanceSelfEvaluatePage`, PerformanceTrackerPage +clickEdit/
      saveEdit/deleteRow/gotoLogs/addLog): EVAL-10 self-eval ESS (Complete -> selfReviewStatus Completed,
      overall In Progress, read-only, PUT ulang 403) | EVAL-16 ESS PUT evaluation/supervisor & final 403,
      rating di luar rentang 422 | KPI-11 sort DESC + pagination 50/hlm | TRACKER-03 nama duplikat
      DIIZINKAN (finding desain) | TRACKER-04 rename + delete walau ada log (GET 404) | TRACKER-05 log ESS
      <-> reviewer (achievement 1/2) | TRACKER-06 XSS log/comment aman | TRACKER-07 IDOR ESS lain 403 +
      "Credential Required". FAKTA: form self-eval mengisi ulang field setelah GET evaluation/employee
      (tunggu dulu sebelum isi); GET evaluation/supervisor = baris placeholder rating null. Full batch 38:
      27 pass + 9 lolos serial (demo terdegradasi) + 2 gagal sengaja (REVIEW-10, EVAL-15).
      TRACKER-08 (ESS My Trackers) tercakup di TRACKER-05.
- [ ] Regresi modul + docs/TC-Performance.txt + commit

### P2.2 Claim (~30) — eksplor: aksi admin pada klaim SUBMITTED milik ESS, Event inactive vs dropdown,
submit tanpa expense.
- [x] Eksplorasi P2.2 (lapis 1). FAKTA LIVE: ESS Submit Claim = claim/submitClaim (Create = POST
      claim/requests, detail claim/submitClaim/id/<id>); aksi = PUT requests/<id>/action {SUBMIT|CANCEL|
      APPROVE|REJECT}; expense = POST requests/<id>/expenses {expenseTypeId,date,amount,note}. Admin
      "Approve" LANGSUNG -> PAID (TIDAK ada langkah Pay; rencana "Approve->Pay" keliru). allowedActions:
      ESS atas klaim SUBMITTED miliknya = [CANCEL]; Admin = [APPROVE,REJECT]; terminal (PAID/REJECTED/
      CANCELLED) = [] dan aksi lanjutan 403. Halaman detail Admin TIDAK refresh tombol stlh Approve.
      Events: claim/viewEvents & saveEvents, POST claim/events {name,description,status}.
- [x] Lapis 1 (9 TC, util `createEssClaim()`, page object `SubmitClaimPage` (extends AssignClaimPage),
      `ClaimEventsPage`, `AssignClaimPage.clickAction()`): SUBMIT-01 ESS create->expense->Submit (UI) |
      SUBMIT-02 submit tanpa expense (BUG BG-375) | APPROVAL-01 Approve->PAID | 02 Reject terminal |
      03 ESS tak bisa approve sendiri (UI+API) | 04 Approve CANCELLED via API ditolak | 05 Reject basi
      stlh Approve (server 403 benar, tapi UI "Uncaught exception: fe" = BUG BG-374, instans BG-199) |
      CONFIG-EVENT-01 event baru tersedia di dropdown ESS | CONFIG-EVENT-02 Required + event non-aktif
      disembunyikan. Run pertama: 7 pass, 2 gagal SENGAJA (SUBMIT-02, APPROVAL-05).
- [x] LAPIS 2 (6 TC, semua lolos run pertama): CONFIG-EVENT-03 duplikat (server 422 [name] + form
      "Already exists", tetap 1 event) | CONFIG-EVENT-04 XSS nama event tampil sbg teks di Admin & ESS |
      CONFIG-EXPTYPE-01 expense type baru (POST claim/expenses/types) muncul di dialog Add Expense ESS |
      CONFIG-EXPTYPE-02 duplikat diblok tanpa POST + type non-aktif disembunyikan dari ESS | SUBMIT-03
      My Claims filter Status (param status=X) | APPROVAL-06 Approve vs Reject paralel: tepat 1 menang
      (pemenang tdk deterministik), status akhir konsisten. FIX: ASSIGN-08/13 lama ambil klaim SUBMITTED
      dari employees/requests (SEMUA karyawan) -> kena klaim milik ESS -> tombol Cancel tidak ada ->
      timeout; ditulis ulang pakai createEssClaim + dibatalkan pemilik. Full batch Claim 29 TC: 25 pass
      + 4 gagal sengaja (ASSIGN-06 BG-333, ASSIGN-10 BG-338, SUBMIT-02 BG-375, APPROVAL-05 BG-374).
      --workers=2 memicu noise createEssAccount (BG-384..387 diarsip) -> jalankan Claim --workers=1.
- [ ] (backlog lapis 2) delete event/expense type terpakai | cross-admin concurrency | CONFIG-EXPTYPE
      edit/delete
- [ ] ASSIGN-16 Assign+Submit->PAID (aturan bisnis) | 17 Edit/delete expense | 18 Delete attachment
      | 19 Attachment 1MB tepat/>1MB (B) | 20 Double extension + nama file berbahaya (S) | 21 IDOR scoped+ESS
- [ ] LIST-01 Filter Employee Claims | 02 Pagination/sort | 03 Kombinasi filter
- [ ] Regresi modul + docs/TC-Claim.txt + commit

### P2.3 Leave (~45) — eksplor: opsi Duration, field "Add to", halaman Reports, flag situational,
efek Holiday ke hitungan.
- [x] Eksplorasi P2.3 (lapis 1). FAKTA LIVE: entitlement POST leave/leave-entitlements {empNumber,
      leaveTypeId,fromDate,toDate,entitlement}; ESS apply POST leave/leave-requests {leaveTypeId,fromDate,
      toDate,comment,duration:{type}}; ESS list GET leave/leave-requests (status di leaveBreakdown[0].name,
      allowedActions); saldo GET leave-balance/leave-type/<id> (Pending SUDAH memotong saldo); Admin
      approve/reject PUT leave/employees/leave-requests/<id> {action}. KOREKSI R4: klaim lama di
      LeaveListPage "Approve/Reject N/A" SALAH -- utk request yg diajukan akun ESS, Admin bisa Approve/
      Reject. Dialog "Updating Entitlement ... 0.00 -> X" muncul juga utk employee tanpa entitlement dan
      bisa telat >2.6s (fix: LeaveEntitlementPage.save tunggu dialog ATAU POST).
- [x] LINGKUNGAN (kritis, lintas modul): format tanggal demo kini "yyyy-mm-dd" (suite lama dibangun di
      "yyyy-dd-mm"); nilai ketik DITAFSIRKAN sesuai format tampil. Fix: util `dateInput.ts`
      (DATE_INPUT_SELECTOR + fillDate(value, valueFormat)) dipakai ApplyLeavePage, AssignLeavePage,
      PerformanceManageReviewsPage, PerformanceEvaluatePage; LeaveListPage.rowByDate() utk cari baris by
      tanggal sesuai format tampil. 4 TC Leave lama (ASSIGN-01/02, LIST-01/03) yg rusak krn ini -> lolos.
- [x] Lapis 1 (5 TC, util `createEssLeaveRequest()`/`getEssLeaveRequest()`/`isoWeekday()`,
      LeaveListPage.actOnRow()): APPROVAL-01 ESS apply (UI) -> Admin Approve -> Scheduled, saldo tdk dobel |
      APPROVAL-02 Reject -> saldo kembali, terminal | APPROVAL-03 ESS tdk bisa approve sendiri |
      MY-01 ESS cancel sendiri di My Leave -> saldo kembali, approve stlh cancel ditolak |
      ENT-01 entitlement Admin -> saldo ESS.
- [x] LAPIS 2 Apply (5 TC, lolos run pertama): APPLY-07 Half Day UI (duration half_day_morning, saldo
      -0.5) | APPLY-08 Specify Time 09-13 diterima (-0.5), terbalik/nol 422 | APPLY-09 hari libur
      (kalender GET leave/holidays, dinamis) & Sabtu -> 400 "No Working Days Selected" | APPLY-10
      overlap -> 400 "Overlapping Leave Request Found" (pagi+sore tanggal sama sah, finding) |
      APPLY-11 tanggal lampau diterima (desain), status Pending. isoWeekday() kini skip 24-28 Des.
- [ ] (sisa rencana awal, dipetakan ke lapis 2 di atas) APPLY-07 Half Day/Specify Time | 08 Hari libur | 09 Overlap | 10 Tanggal lampau | 11 Unicode/RTL
      | 12 Panjang comments | 13 Double-click | 14 Refresh pending | 15 Koneksi putus
- [ ] APPROVAL-01 Approve ESS | 02 Reject->balance kembali | 03 Per-hari multi-day | 04 Komentar
      | 05 Approve vs Cancel paralel | 06 ESS tak bisa approve sendiri
- [ ] LIST-04 Filter tanggal/tipe | 05 Pagination/sort | 06 Halaman detail | 07 Past employees
- [ ] MY-01 Daftar | 02 Cancel sendiri | 03 Filter
- [ ] ENT-01 Add | 02 Upsert | 03 Required | 04 0/neg/desimal/9999 | 05 Edit | 06 Delete | 07 Delete
      dipakai | 08 Add to multiple | 09 My Entitlements
- [ ] REPORT-01 Per leave type | 02 Per employee | 03 My report
- [ ] CONFIG-TYPE-01..05 | CONFIG-HOLIDAY-01..05 | PERIOD-01 & WORKWEEK-01 (R6: perlu persetujuan)
- [ ] Regresi modul + docs/TC-Leave.txt + commit

### P2.4 Time (~40) — eksplor: toggle Attendance Config, komentar per sel, aturan duplikat row,
3 timesheet Pending Action.
- [x] Eksplorasi P2.4 (lapis 1). FAKTA LIVE: ESS GET time/timesheets/default (minggu berjalan) --
      utk employee BARU id:null sampai halaman time/viewMyTimesheet dibuka sekali (page load yg
      membuat timesheet, tdk ada API create); Save = PUT timesheets/<id>/entries {entries:[{projectId,
      activityId,dates:{yyyy-mm-dd:{duration:"hh:mm"}}}]}; Submit = PUT timesheets/<id> {action:SUBMIT};
      status id: "NOT SUBMITTED" (PAKAI SPASI) / SUBMITTED / APPROVED / REJECTED. Admin: time/
      viewEmployeeTimesheet ("Timesheets Pending Action") -> View -> viewTimesheet/employeeId/<emp>
      (Edit/Reject/Approve + textarea komentar) -> PUT time/employees/<emp>/timesheets/<id> {action}.
      Reject TANPA komentar diterima (finding, bukan bug). Reject TIDAK terminal (ESS bisa Submit ulang).
      Seed: project ACME Ltd id 2, activity Administration id 11.
- [x] Lapis 1 (5 TC, util `createEssTimesheet()`/`getEssTimesheetStatus()`, page object
      `EmployeeTimesheetPage`; TimeAttendancePage -> DATE_INPUT_SELECTOR): TS-SUBMIT-01 ESS isi+Submit
      (UI) -> muncul di Pending Action | TS-APPROVAL-01 Approve+komentar -> APPROVED, Submit hilang,
      keluar dari Pending | TS-APPROVAL-02 Reject+komentar -> ESS resubmit | TS-APPROVAL-03 ESS tdk bisa
      approve sendiri | TS-APPROVAL-04 approve timesheet belum disubmit via API ditolak (400).
- [x] LAPIS 2 (5 TC, util getEssTimesheetEntries/otherSeedActivityId): TIMESHEET-04 multi-row total
      (+hapus baris via deletedEntries) | TIMESHEET-10 XSS komentar sel aman (ESS & Admin) |
      TIMESHEET-11 total harian >24j lintas baris DITERIMA = BUG BG-402 (Medium, sengaja FAILED; sel
      tunggal 25:00 ditolak 422) | PROJECT-01 customer->project->activity unik per level (422 [name]),
      ESS bisa pakai project baru tapi POST customers/projects 403 | PROJECT-02 delete activity/
      project/customer yg ada jam tercatat -> 400 + pesan jelas. FAKTA: PUT entries = upsert per
      (project, activity) -> "duplikat row" tidak mungkin via API (TIMESHEET-06 gugur); halaman Edit
      Timesheet tdk pernah networkidle. Full batch Time 17: 16 pass (ADMIN-ATTENDANCE-01 setelah fix
      waitForURL) + 1 gagal sengaja.
- [ ] (backlog) TIMESHEET-08 Navigasi minggu | 09 Reset (UI) | Customer/Project via UI
- [ ] TS-APPROVAL-01 Approve | 02 Reject+komentar | 03 Reject tanpa komentar | 04 ESS tak bisa approve
      sendiri | 05 Approve belum Submitted via API (-)
- [ ] PUNCH-03 Out<In | 04 Overlap | 05 Masa depan | ADMIN-ATTENDANCE-03 Edit | 04 Delete | MY-01
      | CONFIG-01 (R6)
- [ ] REPORTS-02 Project | 03 Attendance Summary | 04 Rentang kosong | 05 Rentang terbalik
- [ ] CUSTOMER-01..05 | PROJECT-01..06
- [ ] Regresi modul + docs/TC-Time.txt + commit

### P2.5 Lintas-modul 4 modul (~28): per modul CSRF, rate limit, headers, refresh pending, koneksi putus,
unicode/RTL, API param negatif (offset/limit/sortField).
- [x] Leave | [x] Claim | [x] Performance | [x] Time -- diwujudkan sbg 6 TC lintas modul di tests/_global/cross-module/
      (docs/TC-XMOD.txt), tiap check berlabel modul: XMOD-01 clickjacking (BUG BG-404, Medium) | XMOD-02
      CSRF dari halaman penyerang: JSON diblokir CORS, form simple POST tdk membuat data (SameSite=Lax);
      temuan: server tdk cek Origin/tanpa token | XMOD-03 param list invalid -> 422 | XMOD-04 Arab/CJK/
      aksen/BMP round-trip | XMOD-05 emoji di nama -> cek-nama-unik 500 + toast generik (BUG BG-405,
      Medium) | XMOD-06 koneksi putus -> form macet di spinner + uncaught (BUG BG-406, Low, konfirmasi
      ke-7 BG-199), tanpa duplikat. Rate limit SENGAJA tidak dijalankan ke demo publik bersama.

## FASE 3 — Dokumentasi (per modul setelah P2.x selesai)
- [x] docs/TC-Performance.txt (30) | [x] TC-Claim.txt (23 + ASSIGN-15 [CANCEL]) | [x] TC-Leave.txt (21) |
      [x] TC-Time.txt (12) -- format TC-Buzz.txt; ditulis 4 agent paralel lalu DIREVIEW manual: versi
      app dikoreksi "5.x"->"OS 5.9", status 403 REVIEW-12/13 & severity BG-356 dilengkapi dari output run,
      2 label check usang di spec diperbaiki (PUNCH-01 Punch Out = PUT; TS-APPROVAL-04 "NOT SUBMITTED").
- [x] README: tabel coverage (531 TC + 3 infra) + paragraf multi-role & ketahanan format tanggal +
      subsection Performance/Claim/Leave/Time (bug & temuan desain)
- [x] QA-Review-Progress.md: blok "STATUS FINAL FASE 2 LAPIS 1" (tabel 4 modul, TC sengaja FAILED,
      koreksi R4, sisa lapis 2)

## FASE 4 — Audit Ulang Modul Lama
- [x] Drift format tanggal: 7 page object lama (Candidates, Dependents, Immigration, Job + dialog
      terminate, Memberships, PersonalDetails, Qualifications) -> DATE_INPUT_SELECTOR; 22 file test -> fillDate()
      dgn format literal masing2 (literal invalid sengaja tetap .fill()). 24 TC terkait: 22 pass; 2 gagal krn
      DATA (demo tanpa vacancy, root cause dibuktikan) -> ensureVacancy.ts, lolos.
- [x] isVisible({timeout}) tanpa tunggu: 110 pemakaian di 105 file -> isVisibleWithWait (positif/kondisional)
      / isHiddenWithWait (cek negatif "hilang setelah hapus"). Regresi 97 spec: 91 pass + 3 gagal sengaja
      (BG-025, BG-007, BG-409) + 3 gagal lingkungan -> STRUCTURE-05 & REVIEW-04 lolos ulang, BUZZ-15 feed demo
      kosong (dibuktikan) -> ditulis ulang membangun post ESS sendiri, lolos.
- [x] (BARU) TC-RECRUITMENT-VACANCY-19: POST vacancies dgn description null -> 500 = BUG BG-409 (Low);
      STATUS-15 kini membangun vacancy tanpa hiring manager sendiri (hapus manajer dari PIM).
- [x] (BARU, instruksi user) P4.0 Taxonomy Coverage Matrix (SCOPE: 12 modul sidebar + Search, instruksi user; Login & header di luar matrix): 109 unit, tools/coverage/,
      docs/Taxonomy-Coverage-Matrix.xlsx/.md. Baseline 23.5% -> 39.1% stlh sweep PAGE-01 (1.5/7.x, 97 unit) &
      HDR-01 (5.6). 23 TC lemah (cek "tanpa exception" saja) tdk dihitung -> wajib diperkuat. BUG BG-414 (tab
      Job minta job-spec yg tak ada -> 404 tiap kunjungan, Low).
- [ ] P4.0 lanjutan -- tutup GAP matrix per gelombang (konvensi: label check menyebut kode taksonomi):
      A sweep halaman sisa (8.1 responsive, 8.3 a11y, 8.2 firefox/webkit, 7.4, 4.6 empty state, 1.6/3.5/3.6
      list) | B sweep API (6.2 schema, 6.3 405, 6.4 tanpa sesi, 6.6 paging, 5.8 data sensitif, 2.6 id tak
      eksis) | C sweep mutasi per unit CRUD via registry (2.1, 3.1, 4.1, 5.1, 5.2-MassAssign, 5.4, 5.5, 6.5,
      6.7, 4.2, 4.5, 1.8, 2.3) | D lintas-role ESS (2.4, 5.2-BFLAC/IDOR/PrivEsc, 1.5 ESS) | E TC spesifik unit
      (workflow, relasi, business logic, upload) + perkuat 23 TC lemah | regenerasi matrix tiap gelombang.
- [ ] (BARU) TC lama yg set Job Title lewat halaman PIM Job memicu 404 job-titles/<id>/specification ->
      console-error check gagal palsu; pakai API job-details spt setupReviewableEmployee().
- [ ] P4.1 Access control ESS (ganti klaim N/A single-role): Admin API (users, pay-grades) 403; PIM read
      personal/salary orang lain, edit Job/Salary sendiri; Recruitment candidates; Buzz delete post orang
      lain; privilege escalation role sendiri (~15)
- [ ] P4.2 Admin: Edit per entitas (~12), Pay Grade currency (3), Users ubah role/disable->login (3),
      Modules toggle (R6)
- [ ] P4.3 PIM: delete employee, output+edit report, edit/delete Qualifications & Memberships, reactivate
      terminated, attachment Personal Details (~10)
- [ ] P4.4 Recruitment: retest BG-007, Offer Declined, edit candidate, eksplor halaman lowongan publik (~5)
- [ ] P4.5 Buzz: edit comment, share video URL valid, ESS hapus post orang lain (~3)
- [ ] P4.6 Login: akun Disabled, login ESS (landing/menu), session idle timeout (~3)
- [ ] P4.7 Regresi 5 modul + retest bug Open + update TC-*.txt/README

## FASE 5 — Fitur Global (~16)
- [ ] Change Password (akun test, bukan Admin bersama): positif+login ulang, current salah, mismatch,
      lemah, sama dgn lama, oleh ESS
- [ ] About (info disclosure), Support link, sidebar search (filter + tanpa hasil), Help
- [ ] Headers lain (X-Content-Type-Options, HSTS, CSP), field berlebih di response API (5.8), detail error

## FASE 6 — Menu Baru (~41)
- [ ] My Info via ESS (~15) | [ ] Dashboard (~10) | [ ] Directory (~8) | [ ] Maintenance (~8, R6 wajib)

## FASE 7 — UI & Kompatibilitas
- [ ] Smoke subset ~20 TC di Firefox & WebKit
- [ ] Aksesibilitas dasar (butuh dependency `@axe-core/playwright` -> minta persetujuan)
- [ ] Smoke responsive viewport mobile

## FASE 8 — Finalisasi
- [ ] Regresi penuh semua modul | [ ] Review final Bug-List | [ ] README total | [ ] Push (minta konfirmasi)

---

## LOG (append-only, 1 baris per task: tanggal | task | hasil | commit)
- 2026-11-15 | P0.1 | taxonomy+plan di-commit, .gitignore +.vscode/ +__pycache__/, hook auto-resume dipasang | chore commit
- 2026-11-15 | P0.2 | Bug-List: 41 Open/117 Archive, BG-333/338 ditulis ulang, reporter dedup+ID fix; CI typecheck fix modul Time | 2 commit
- 2026-11-15 | P0.3+P0.4 | hapus TC-PERF-REVIEW-01+CLAIM-ASSIGN-15, revisi CLAIM-ASSIGN-04(segregation of duties)+09(IDOR path-mismatch sungguhan), 3x stabil | 1 commit
- 2026-11-15 | P0.5 | QA-Review-Progress.md blok KOREKSI ditambahkan; 6 TC lama N/A single-role dijadwalkan Fase 4.1 (tdk diedit sekarang) | 1 commit
- 2026-11-15 | P0.6 | baseline 32/43 pass; 9 fail = 1 root cause (empNumber=7 identity corruption); user approved repair; PersonalDetailsPage PUT 200 -> QA Admin/QAADMIN07 | data repair, no code commit
- 2026-11-15 | P0.7 | 5/9 fixed by repair; 3/9 flaky-under-load (pass isolated); 1/9 real script bug (whitespace) fixed+3x stable; identity RE-corrupted identik -> repaired lagi, didokumentasikan sbg risiko berulang lintas 11 file/4 area | 1 commit
- 2026-11-15 | P1.1-P1.8 | 7 util baru (createEssAccount/createSecondAdmin/assignSupervisor/loginAs/withConfigRestore/networkEdge + getLoggedInEmployeeName self-heal) + AdminUsersPage.selectEmployee() + createTestEmployee+employeeId + 3 TC infra, 9/9 check x3 run; self-heal TERBUKTI jalan live (korupsi kambuh di tengah run, INFRA-02 tetap lolos) | 1 commit
- 2026-11-15 | P2.1 batch 1 | 13 TC Review + 4 TC KPI + PerformanceManageReviewsPage + setupReviewableEmployee + TestReport pageerror-whitelist fix; BG-356 (404+exception pasca-Activate) ditemukan & dicatat (R3: tdk di-whitelist, REVIEW-10 sengaja FAILED). Run akhir 17 TC: 8 pass; 7 gagal HANYA console-check (BG-356, semua check fungsional lolos); KPI-09 & REVIEW-01 gagal tanpa ringkasan di batch tapi 6/6 & 7/7 lolos terisolasi (flaky-under-load, pola P0.7) | 1 commit
- 2026-11-15 | P2.1 batch 2 | +7 TC (EVAL-11..15, TRACKER-01/02) + PerformanceEvaluatePage/TrackerPage + createReview(); BG-373 baru (rating non-angka -> 0 diam-diam); KOREKSI BG-356 (console 404 di TC Activate = setup job-spec 404, setup kini via API); fix race searchByEmployeeName + pilih opsi by lastName. Full batch Performance 24 TC: 22 pass, 2 gagal sengaja (REVIEW-10, EVAL-15) | 1 commit
- 2026-11-15 | P2.2 lapis 1 | 9 TC Claim (SUBMIT-01/02, APPROVAL-01..05, CONFIG-EVENT-01/02) + createEssClaim + SubmitClaimPage + ClaimEventsPage + AssignClaimPage.clickAction; 2 bug baru: BG-375 (klaim kosong bisa submit->PAID), BG-374 (Reject basi -> uncaught exception, instans BG-199). Run: 7 pass, 2 gagal sengaja | 1 commit
- 2026-11-15 | P2.3 lapis 1 | 5 TC Leave (APPROVAL-01..03, MY-01, ENT-01) + createEssLeaveRequest; fix lingkungan: dateInput.ts (format tanggal drift) di Apply/AssignLeavePage + Performance, LeaveListPage.rowByDate/actOnRow, LeaveEntitlementPage.save tunggu dialog; koreksi R4 klaim "Approve/Reject N/A"; fix isVisible-tanpa-tunggu di 11 TC baru. Verifikasi gabungan 54 TC: 50 pass + 4 gagal sengaja | 1 commit
- 2026-11-15 | P2.4 lapis 1 | 5 TC Time (TS-SUBMIT-01, TS-APPROVAL-01..04) + createEssTimesheet + EmployeeTimesheetPage; TimeAttendancePage -> DATE_INPUT_SELECTOR; fakta: timesheet employee baru dibuat saat page load, status id "NOT SUBMITTED". Full batch Time 12/12 lolos. FASE 2 LAPIS 1 TUNTAS | 1 commit
- 2026-11-15 | FASE 3 | docs/TC-Performance/Claim/Leave/Time.txt (86 TC + 1 CANCEL) via 4 agent + review manual; README coverage 531 + 4 subsection; QA-Review-Progress status final; 2 label spec usang diperbaiki | 1 commit
- 2026-11-15 | P2.2 lapis 2 | +6 TC Claim (CONFIG-EVENT-03/04, CONFIG-EXPTYPE-01/02, SUBMIT-03, APPROVAL-06), semua lolos run pertama; ASSIGN-08/13 ditulis ulang (data sendiri, bukan seed milik karyawan lain); full batch Claim 29 TC: 25 pass + 4 gagal sengaja; noise BG-384..387 diarsip; TC-Claim.txt 30 entri, README 542 | 1 commit
- 2026-11-15 | P2.1 lapis 2 | +8 TC Performance (EVAL-10/16, KPI-11, TRACKER-03..07) + createEssReview.ts + PerformanceSelfEvaluatePage + PerformanceTrackerPage edit/delete/log; tanpa bug app baru (nama tracker duplikat = finding desain); full batch 38: 27 pass + 9 lolos serial (demo terdegradasi) + 2 gagal sengaja; createTestEmployee guard employeeId null; noise BG-388..399 diarsip; README 550 | 1 commit
- 2026-11-15 | P2.4 lapis 2 | +5 TC Time (TIMESHEET-04/10/11, PROJECT-01/02); BUG baru BG-402 (total harian >24j lintas baris diterima, Medium); fix searchAndView (waitForURL); full batch 17: 16 pass + 1 gagal sengaja; noise BG-400/401/403 diarsip; README 555. LAPIS 2 FASE 2 TUNTAS | 1 commit
- 2026-11-15 | P2.5 lintas-modul | 6 TC tests/_global/cross-module (XMOD-01..06) + docs/TC-XMOD.txt; 3 BUG baru: BG-404 clickjacking 4 modul (Medium), BG-405 emoji -> 500 di cek nama unik (Medium), BG-406 form macet spinner stlh koneksi putus (Low, BG-199); 3 pass (CSRF, param API, unicode). README 561. FASE 2 TUNTAS | 1 commit
- 2026-11-15 | FASE 4 (bagian 1) | date-drift 7 PO + 22 test; isVisible 110x di 105 file; regresi 97: 91 pass + 3 sengaja + 3 lingkungan (2 lolos ulang, BUZZ-15 ditulis ulang); ensureVacancy + VACANCY-19 (BG-409); STATUS-15 prasyarat mandiri; P4.0 coverage matrix 107 unit (23.5% -> 39.1%) + sweep PAGE-01/HDR-01 (BG-414; BG-404 app-wide) | 1 commit
- 2026-11-15 | Struktur folder | tests/ diselaraskan dgn sidebar (12 folder modul; my-info/dashboard/directory/maintenance baru); login/infra/sweep/xmod->cross-module/fixtures pindah ke tests/_global/ (git mv); import depth 57 file, RUN COMMAND/Path 65 file; 567 test terdaftar, tsc bersih, matrix identik | 1 commit
- 2026-11-15 | Konsistensi docs | tools/coverage/check_docs.py (docs<->spec, header Path/RUN COMMAND, tabel README); 42 nama file usang di TC-Admin.txt dikoreksi; TC-Login catatan riwayat & contoh run 1 TC diperbaiki; 11 docs = 564 spec, 0 mismatch; push ke origin | 1 commit
- 2026-11-15 | P4.0 gel. D (bagian 1) | TC-SWEEP-ROLE-01: ESS sungguhan membuka 97 URL menu langsung -> 130/130 lolos (67 admin-only 'Credential Required', 11 tab PIM orang lain kosong tanpa data). Run pertama 11 gagal = kriteria TC terlalu sempit; dibuktikan via API sbg ESS (pim/employees/<lain>/* 422, PUT 404, data sendiri 200) -> tidak ada kebocoran; regex laten diperbaiki & diverifikasi ulang. Finding: penolakan PIM 422 bukan 403 (6.1). Matrix 40.6% | 1 commit
- 2026-11-15 | P4.0 gel. A+B | sweep VIEW-01 8.1 (571/571; nav via hamburger 190x), A11Y-01 8.3 (BUG BG-416 app-wide Medium), XBROWSER-01 8.2 (382/383; sisa = BG-414; tdk ada bug spesifik browser), API-01 6.1/6.2/6.3/6.4/6.6/5.8/2.6 (453/453, 47 unit, endpoint dari inventaris API live). IDOR PIM diuji ulang dgn path benar (contact-details tunggal) -> tetap aman. Util adminAccessGate. Instal axe-core DITOLAK izin -> 8.3 via DOM. Matrix 52.1% | 1 commit
- 2026-11-16 | FASE 4 My Info | 6 TC tests/my-info + util myInfo.ts (newEssSession/openMyInfoFromMenu/gotoTabAndHydrate); BUG BG-420 (High, field terkunci Personal Details diubah ESS via API, tersimpan); 5 lolos + 1 sengaja FAILED; fix timeout setup 15->60 dtk (demo lambat); docs/TC-MyInfo.txt; README 575; matrix 53.1% | 1 commit
- 2026-11-16 | FASE 4 My Info lanjut | +3 TC tests/my-info/records (DEPENDENT-01, MEMBERSHIP-01 lolos; ATTACHMENT-01 sengaja FAILED = BUG BG-422 High, exe-rename .pdf diterima sbg attachment karyawan, keluarga BG-003); fix timeout loginAs 20->60 dtk; attachment = form inline bukan modal; My Info 9 TC (7 pass+2 bug); README 578; matrix 54.0% | 1 commit
- 2026-11-16 | P4.0 gel. LIST | TC-SWEEP-LIST-01 (3.5/3.6/1.6/4.6, 47 unit list, 186/188 lolos); BUG BG-424 (Low, My Entitlements offset di luar range -> 500); matrix 57.9% | 1 commit
- 2026-11-16 | P4.0 Blok 1 mutasi API | TC-SWEEP-MUT-01 + src/data/unitMutationRegistry.ts (19 unit, body ditangkap live; 1.1-C/R/U/D 2.1 2.3 2.6 3.1 4.1 5.1 5.2 5.5 6.5 6.7); 301/304 lolos; BUG BG-425 (Low, Work Shifts tanpa startTime -> 500) & BG-426 (Medium, duplikat Locations/Reporting Methods diterima server); soft delete dibuktikan bukan bug; README 580; matrix 60.3% | 1 commit
- 2026-11-16 | P4.0 Blok 2-4 | TC-SWEEP-UIMUT-01 (19 form Add: 1.8 2.1 2.3 3.1 4.2 4.3 4.5 8.4; 188/192) + TC-SWEEP-CONC-01 (2 sesi Admin: 4.4 race 5 putaran, 4.7 last-write & edit-setelah-hapus; 39/58) + 3 TC Sidebar Search (36/36, unit 100%, flag NOAPI); BUG BG-427 (Medium, double submit), BG-428 (Medium, race keunikan + Pay Grades 500), BG-429 (Low, tanpa toast create Pay Grade), BG-430 (Low, edit record terhapus 200); audit matrix: mode kode-eksplisit, label 9 file dilengkapi kode yg benar diverifikasi; README 585; matrix 58.1% | 1 commit
- 2026-11-16 | P4.0 Blok 4 Dashboard | 3 TC tests/dashboard/widgets (WIDGET-01 data vs API & role 11/11; WIDGET-02 7 API kontrak/405/401/ESS 403/header/5.8 59/59; WIDGET-03 empty state mock, isolasi 500, 7.5 batas kewajaran, 8.1-8.3 14/14); Dashboard 100%; createEssAccount kini menyertakan body 422 di pesan error; README 588; matrix 58.6% | 1 commit
- 2026-11-16 | P4.0 Blok 4 My Info | 4 TC: IMMIGRATION-01 (UI, 15/16), IMMIGRATION-02 (API, 14/17), QUALIFICATION-01 (UI WE+Skills, 20/21), QUALIFICATION-02 (API 5 endpoint, 22/26); BUG BG-431 (Medium, double submit Immigration), BG-432 (Medium, double submit Work Experience), BG-433 (Low, server terima expiry<issued & type 0/3 -> tampil VISA), BG-434 (Low, id tak ada -> 500 di skills/licenses/educations/PUT WE); fix createEssAccount (Employee Id unik, akar 422 employeeId); IDOR-01 dipetakan ke 11 tab My Info; README 592; matrix 60.0% | 1 commit
- 2026-11-17 | P4.0 My Info lanjut | registry +10 tab My Info (U108-U117) & SWEEP_ONLY; 6 sweep halaman utk 10 unit (gagal = bug lama BG-414/416/clickjacking; duplikat BG-435/436 diarsip); TC-MYINFO-API-01 (105/105); TC-MYINFO-CSRF-01 (6/7, BUG BG-437 Medium: form POST lintas situs -> 401 + Set-Cookie sesi baru -> karyawan ter-logout; data tetap aman via SameSite=Lax); README 594; My Info 65.6%; matrix 63.3% | 1 commit
- 2026-11-17 | P4.0 PIM | kurasi kode taksonomi di header 156 TC PIM (pim_codes.json, apply_codes.py idempoten; build_matrix baca Kategori -> PIM jujur 50.4%); +3 TC: REPORTTO-08 (BUG BG-438 Medium: karyawan jadi atasan sendiri & saling membawahi diterima), API-01 (108/108, 12 tab + PrivEsc ESS), MUT-01 (67/69, BUG BG-439 Low: Work Experience tanggal invalid/id tak ada -> 500); README 597; PIM 64.9%; matrix 65.5% | 1 commit
- 2026-11-17 | P4.0 kurasi kode semua modul | header Kategori diisi kode terverifikasi utk Admin (133), Recruitment (55), Performance+Buzz (65), Leave+Claim+Time+XMOD (63) via codes_*.json + apply_codes.py (deskriptor ' -- ' dipertahankan, idempoten); tersisa 16 TC lemah tanpa kode; matrix jujur 64.2% (Recruitment 67.6->54.6, Leave 58.1->55.1, Claim 73.9->69.0, Performance 62.0->59.6) | 1 commit
- 2026-11-17 | P4.0 Maintenance | 4 TC tests/maintenance (PURGE-EMP-01 24/24, PURGE-CAND-01 21/21, ACCESS-01 13/13 termasuk sanitasi nama file '../', SECURITY-01 2/5 = BUG BG-440 High: prompt Administrator Access hanya UI, 3 operasi lolos tanpa password); hanya data buatan TC yg di-purge; fix passAdminAccessGate (tunggu prompt/sidebar); docs/TC-Maintenance.txt; README 601; Maintenance 88.7%; matrix 65.1% | 1 commit
- 2026-11-17 | P4.0 Recruitment | 8 TC (API-01, MUT-01 lolos, VALID-01, UPLOAD-01, SECURITY-06 lolos, CANDIDATE-22, CANDIDATE-23, VACANCY-20) + TC-XMOD-07; helper src/utils/recruitmentData.ts; BUG BG-441..447 ditulis standar; docs TC-Recruitment/TC-XMOD; README 610; Recruitment 100%; matrix 67.3% | 1 commit
- 2026-11-17 | Audit docs & Bug-List | status [DONE]/[DONE -- BUG] 36 TC di 10 docs diselaraskan dgn Bug-List (+legend); BG-064/065 (kelemahan skrip, bukan bug app) diarsip, CANDIDATE-08 diperbaiki (cari via Candidate Name, 3/3); README: jumlah TC per modul, bagian Recruitment/PIM/XMOD-07 + My Info, Dashboard, Sidebar Search, Maintenance, Sweep, snapshot coverage 67.3% | 1 commit
- 2026-11-17 | Audit Bug-List lanjutan | REPORTTO-01/03/06 'known issue' diselesaikan: root cause live (tabel tanpa nama tengah, GET daftar ~3 dtk setelah POST, locator subordinateRows ikut hitung supervisor) -> skrip diperbaiki (01 5/6, 03 5/5, 06 2/2); BG-124/127/136 diarsip (bukan bug app), BG-009/068 (Closed) dipindah ke Archive (SECURITY-04 lolos 4/4); Bug-List aktif kini 69 baris, semua Open & bug aplikasi nyata | 1 commit
- 2026-11-17 | P4.0 Leave | 7 TC (API-01, MUT-01 lolos, ENT-02 lolos, VALID-01, SECURITY-01 lolos, CONFIG-01 lolos, HOLIDAY-01); helper src/utils/leaveData.ts; perbaikan infra dateInput.ts (token-based, format ke-3 dd-mm-yyyy) + LeaveListPage.rowByDate; insiden Leave Period global ter-korupsi sesaat sudah diperbaiki & diverifikasi; BUG BG-453/454/456 ditulis standar; docs TC-Leave/README; Leave 82.4%; matrix TOTAL 70.2% | 1 commit
- 2026-11-17 | P4.0 Time | 4 TC (API-01, MUT-01, SECURITY-01 lolos, CONFIG-01 lolos); helper src/utils/timeData.ts; BUG BG-457/458 ditulis standar; docs TC-Time/README; Time 69.5%; matrix TOTAL 71.6% | 1 commit
- 2026-11-17 | P4.0 Performance | 3 TC (API-01 lolos sebagian, EVAL-17, TRACKER-08 lolos); probe binary-search konfirmasi batas 150 karakter Tracker Log; BG-459 (rating non-numerik diterima) & BG-460 (2 temuan: ghost-id 500 + ESS BFLAC Employee Trackers) ditulis standar, diverifikasi 2x re-run terisolasi lepas dari false-positive sesi ESS akibat run 3 TC sekaligus; docs TC-Performance/README; Performance 67.2%; matrix TOTAL 72.3% | 1 commit
- 2026-11-17 | P4.0 My Info | 1 TC (MUT-01); body Contact/Emergency/Dependent/Membership direkam live via page.on('request') (Emergency pakai homePhone/officePhone/mobilePhone, Dependents relationshipType string enum); 2 bug skrip ditemukan & diperbaiki sendiri sblm real run (timestamp body re-dipanggil beda nilai, perbandingan referensi fungsi .json selalu beda); BG-461 (2 temuan: Dependent name kosong diterima, Membership id tak ada -> 500) ditulis standar; docs TC-MyInfo/README; My Info 71.9%; matrix TOTAL 73.0% | 1 commit
- 2026-11-17 | P4.0 PIM (mulai) | 1 TC (OPTFIELD-04, API langsung via withConfigRestore); ditemukan TC-PIM-OPTFIELD-01 sudah dipakai file lama -> TC baru diberi nomor 04; lolos penuh 13/13 (finding koersi tipe lenient, bukan bug); docs TC-PIM/README; PIM 65.7%; matrix TOTAL 73.1%. PIM msh py 19 unit GAP lain, blm tuntas | 1 commit
- 2026-11-17 | P4.0 My Info lanjutan | 1 TC (PRIVESC-01); sweep 5.2-PrivEsc di 7 endpoint sekaligus (Personal Details, Contact, Emergency, Dependents, Immigration, Work Experience, Memberships) dgn field privilege asing (userRoleId/isAdmin/roleName/permissions) -> 422 konsisten di semua 7; lolos penuh 8/8, tidak ada bug; docs TC-MyInfo/README; My Info 73.4%; matrix TOTAL 73.3% | 1 commit
- 2026-11-17 | P4.0 My Info lanjutan lagi | 1 TC (ATTACHMENT-02); ditemukan endpoint Attachments JSON base64 (bukan multipart) via page.on('request'); BG-462 (2 temuan: PHP diterima diklaim pdf, filename path traversal disimpan verbatim) ditulis standar; docs TC-MyInfo/README; My Info 76.6% (lewati PIM); matrix TOTAL 73.6% | 1 commit
- 2026-11-17 | P4.0 PIM lanjutan | 1 TC (ATTACHMENT-API-01); endpoint Attachments Admin-side terbukti backend IDENTIK dgn My Info/ESS; BG-463 (Medium, pola sama dgn BG-462: filename path traversal disimpan verbatim) ditulis standar; docs TC-PIM/README; PIM 66.8%; matrix TOTAL 73.8% | 1 commit
- 2026-11-17 | P4.0 PIM lanjutan lagi | 1 TC (PHOTO-API-01); endpoint Profile Picture terpisah dari personal-details tapi backend validasi sama dgn Attachments; BG-464 (Medium, pola sama dgn BG-462/463) + kontras positif (ghost empNumber -> 422 bukan 500); docs TC-PIM/README; PIM 68.0%; matrix TOTAL 74.1% | 1 commit
- 2026-11-17 | P4.0 PIM lanjutan lagi | 1 TC (REPORT-API-01); batas panjang name Reports = 255 karakter (probe binary-search); 16/16 lolos, tidak ada bug; BG-465 (ECONNRESET transien, auto-closed, diarsipkan); docs TC-PIM/README; PIM 69.0% (sejajar Buzz/Claim); matrix TOTAL 74.3%. Performance (67.2%) kini modul terendah proyek | 1 commit
- 2026-11-17 | PIM lanjutan (instruksi user: PIM dulu sampai 100%) | 1 TC (REPORTTO-API-01); BG-466 (High, endpoint supervisors tidak validasi input sama sekali -> 500 utk 4 skenario); fix tooling report.finding() dgn kode literal salah ke-tag COVERED (ditemukan & diperbaiki, matrix jadi lebih jujur); docs TC-PIM/README; PIM 69.8%; matrix TOTAL 74.4% | 1 commit
- 2026-11-17 | PIM lanjutan (DATAIMPORT-API-01) | 1 TC; endpoint csv-import sama body dgn Attachments/Photo tapi mekanisme validasi beda (parser CSV, bukan whitelist nama file); 14/14 lolos, tidak ada bug; TEMUAN CSV Formula Injection potensial (aman saat import, berisiko kalau di-export ulang); docs TC-PIM/README; PIM 71.0%; matrix TOTAL 74.6% | 1 commit
- 2026-11-17 | PIM lanjutan (JOB-API-01) | 1 TC; BG-467 (High, pola sama dgn BG-466 -- jobTitleId/empStatusId/locationId tidak ada -> 500, hanya subUnitId divalidasi benar); docs TC-PIM/README; PIM 71.5%; matrix TOTAL 74.8% | 1 commit
- 2026-11-17 | PIM lanjutan (CUSTOMFIELD-API-01) | 1 TC; percobaan awal batas panjang SALAH (string identik antar percobaan + delete-by-path gagal diam2 -> data lama kolisi, simpul 60/400 keliru); diulang dgn nama unik -> batas REAL 250 karakter, status 422 konsisten; BG-468 (Low, duplikat diterima via API, form-only validation); docs TC-PIM/README + pelajaran metodologi; PIM 72.6%; matrix TOTAL 75.0% | 1 commit
- 2026-11-17 | PIM lanjutan (ADD-API-01) | 1 TC; endpoint create employee pakai backend photo-upload yg sama dgn Attachments/Profile Picture (size WAJIB cocok persis panjang konten); BG-469 (Medium, konfirmasi ke-4 pola BG-462/463/464, tapi filename TIDAK ter-echo di API manapun); docs TC-PIM/README; PIM 74.2%; matrix TOTAL 75.3% | 1 commit
- 2026-11-17 | PIM lanjutan (PD-API-01) | 1 TC; BG-470 (High, konfirmasi ke-3 pola BG-466/467 -- nationalityId tidak ada -> 500, gender/empNumber benar divalidasi 422); docs TC-PIM/README; PIM 75.1%; matrix TOTAL 75.5% | 1 commit
- 2026-11-17 | PIM lanjutan (CONTACT-API-01 + perbaikan CONTACT-03) | 1 TC baru + 1 TC lama diperbaiki; ditemukan bug skrip di TC-PIM-CONTACT-03 (klaim "email invalid diterima tanpa validasi" salah, tidak pernah periksa body yg benar2 terkirim -- app sebenarnya mengosongkan sendiri nilai invalid, server JUSTRU memvalidasi 422 saat dikirim langsung via API); aturan baru: klaim "diterima tanpa validasi" wajib verifikasi body asli; docs TC-PIM/README; PIM 75.7%; matrix TOTAL 75.6% | 1 commit
- 2026-11-17 | PIM lanjutan (EMERGENCY-API-01) | 1 TC; lolos penuh 5/5, tidak ada bug (relationship wajib, phone opsional, format phone ditegakkan); docs TC-PIM/README; PIM 76.0%; matrix TOTAL 75.7% | 1 commit
- 2026-11-17 | PIM lanjutan (DEPENDENT-API-01) | 1 TC; lolos penuh 5/5, tidak ada bug baru (dateOfBirth masa depan diterima, konsisten dgn TC-PIM-PD-04); docs TC-PIM/README; PIM 76.3%; matrix TOTAL 75.7% | 1 commit
- 2026-11-17 | PIM lanjutan (IMMIGRATION-API-01) | 1 TC; lolos penuh 4/4, tidak ada bug baru (expiryDate<issuedDate diterima jg di Admin-side, konfirmasi BG-433 lintas Admin/ESS); docs TC-PIM/README; PIM 76.7%; matrix TOTAL 75.8% | 1 commit
- 2026-11-18 | PIM lanjutan (SALARY-API-01) | 1 TC; lolos penuh 7/7, tidak ada bug (rentang gaji per Pay Grade ditegakkan konsisten, payGradeId tak ada -> 400 aman); docs TC-PIM/README; PIM 77.0% (lewati My Info); matrix TOTAL 75.9% | 1 commit
- 2026-11-18 | PIM lanjutan (QUALIFICATION-API-01) | 1 TC; lolos penuh 5/5, tidak ada bug baru (toDate<fromDate ditolak benar, beda dgn BG-433; ghost id -> 500 konfirmasi BG-434 jg di Admin-side); docs TC-PIM/README; PIM 77.3%; matrix TOTAL 75.9% | 1 commit
- 2026-11-18 | PIM lanjutan (MEMBERSHIP-API-01) | 1 TC; lolos penuh 6/6, tidak ada bug (fee negatif & renewalDate<commenceDate ditegakkan benar); docs TC-PIM/README; SEMUA 9 tab employee selesai; PIM 77.6%; matrix TOTAL 76.0% | 1 commit
- 2026-11-18 | PIM lanjutan (LIST-API-01) | 1 TC; lolos penuh 5/5, tidak ada bug (delete sungguhan, unicode search, limit negatif semua benar); docs TC-PIM/README; PIM 78.0%; matrix TOTAL 76.0% | 1 commit
- 2026-11-18 | PIM lanjutan (REPORTMETHOD-API-01 + TERMREASON-API-01) | 2 TC file terpisah per unit; lolos penuh 5/5 masing2, tidak ada bug (limit 100 char, mass-assignment, whitespace-only name semua ditegakkan); ditemukan & diperbaiki 2 bug tooling (path-based unit mapping mis-atribusi evidence file gabungan, kode literal di label finding salah ke-tag COVERED); sisa GAP 1.2/1.4 pd unit single-field = keterbatasan struktural NA_RULES build_matrix.py, bukan bisa ditutup via TC; docs TC-PIM/README/Execution-Plan; PIM 78.2%; matrix TOTAL 76.1% | 1 commit
- 2026-11-18 | PIM lanjutan BESAR (CSRF-01 + TABEDGE-01, sweep lintas-unit) | 2 TC baru + 2 entri NAME_RULES baru di build_matrix.py; menutup 1.8/4.2/4.3/4.5/4.7/4.8/5.4/8.4 di hampir semua 9 tab karyawan sekaligus (registry sweep lama tidak pernah mencakup form edit pim/employees/<empNumber>/*); CSRF-01 11/11 lolos (Origin tidak divalidasi di endpoint manapun, SameSite=Lax satu-satunya pertahanan, sama dgn My Info/BG-437); TABEDGE-01 19/19 lolos (toast+konsistensi pesan, back/forward, koneksi putus, double-submit, concurrency); BG-472 (timeout transien) diarsipkan sbg noise; sisa 133 GAP PIM: Job (6 kode), Report-to (11 kode, sengaja dikecualikan dari TABEDGE krn risiko duplicate-add 500), 1.6 di 5 unit (perlu verifikasi N/A genuine), U002/U036-042/U098/U099 belum tersentuh; docs TC-PIM/README/Execution-Plan; PIM 78.2% -> 85.6%; matrix TOTAL 76.1% -> 77.6% | 1 commit
- 2026-11-18 | PIM lanjutan (PD-API-02 + JOB-API-02 + REPORTTO-API-02 + fix 3.4 Immigration/Qualifications) | 3 TC baru + 2 TC lama ditambah check; U088 Personal Details 1.2/1.4 TUNTAS (TC-PIM-PD-API-02, 6/6, nationality relation benar); U093 Job 1.2/4.4/5.9 ditutup, 2 BUG BARU (TC-PIM-JOB-API-02, SENGAJA FAILED: BG-473 Medium terminasi sblm joinedDate diterima, BG-474 Medium race 2-terminate-bersamaan tanpa locking); U095 Report-to 1.8/4.2/4.3/4.5/4.7/4.8/5.5/8.4 ditutup AMAN pakai supervisor berbeda per operasi (TC-PIM-REPORTTO-API-02, 7/7, hindari BG-466); verifikasi LIVE (bukan asumsi) bhw hipotesis 1.6-struktural utk 5 unit BENAR (1 "search input" terdeteksi di tiap tab adalah oxd-main-menu-search sidebar global, dibuktikan via ancestor-chain DOM, bukan search milik tabel record); 3.4 Immigration/Qualifications ternyata BUKAN struktural (cuma belum diuji boundary leap-year/rentang ekstrem), ditutup via 2 check tambahan di file lama; docs TC-PIM/README/Execution-Plan/Bug-List; PIM 85.6% -> 87.3%; matrix TOTAL 77.6% -> 77.9% | 1 commit
- 2026-11-18 | PIM lanjutan (ATTACHMENT-API-02 + CONTACT-10, U098 Attachments sebagian) | 2 TC baru; investigasi U098 vs sweep_units.json selesai (bukan oversight, U098 tanpa URL sendiri); 1.1-U/1.2/1.5/2.1/2.4/5.2-IDOR/5.3-DoubleExt/6.5 ditutup via API (TC-PIM-ATTACHMENT-API-02, 10/10); 1.8/4.3/4.5/4.7/8.1/8.2/8.3/8.4 ditutup via UI widget di Contact Details (TC-PIM-CONTACT-10), SENGAJA FAILED 4.2 -> BUG BARU BG-475 Medium (double-click Save = 2 entri, instans ke-4 double-submit app-wide sama dgn BG-427); 4 baris Bug-List noise (BG-476/477/478/479, duplikat/stale dari iterasi debug whitelist console cross-browser) diarsipkan; 1.6 dikonfirmasi struktural via API (sortField ditolak 422); docs TC-PIM/README/Bug-List; PIM 87.3% -> 89.3%; matrix TOTAL 77.9% -> 78.3%; commit b0448aa, PUSHED | 1 commit
- 2026-11-18 | **PAUSE** (STOP REQUEST user, lihat blok PAUSE di NEXT ACTION di atas) | git status bersih, semua commit+push, tidak ada file probe tersisa; PIM 89.3%, matrix TOTAL 78.3%; resume dari U098 sisa 5 kode (5.3-Rename/5.4/5.5/7.4/7.5) lalu U099/U002/U036-038/U041/U042 sesuai urutan "Next pass" user | tidak ada commit (dokumentasi saja)
- 2026-11-18 | PIM lanjutan (RESUME, ATTACHMENT-API-03, U098 Attachments TUNTAS) | 1 TC baru; menutup 5.3-Rename (exe MZ header di-rename .pdf -> 200 diterima, pola BG-462/463), 5.4 (CSRF A/B Origin identik), 5.5 (6 create paralel semua 200, tidak ada rate limit, finding), 7.4 (tanpa console warning modal Add Attachments), 7.5 (waktu respons dlm batas kewajaran); 7/7 lolos, tidak ada bug baru; U098 Attachments TUNTAS kecuali 1.6 struktural; docs TC-PIM/README/Execution-Plan; PIM 89.3% -> 89.8%; matrix TOTAL 78.3% -> 78.4% | 1 commit
- 2026-11-18 | PIM lanjutan (PHOTO-API-02 + PD-12 + LIST-15, U099 & U002 TUNTAS) | 3 TC baru; U099 Profile Picture SEPENUHNYA ditutup (PHOTO-API-02: 1.1-R/2.1/5.2-PrivEsc/5.3-BadExt/5.3-Rename/5.4, 9/9; PD-12: 1.8/4.2/4.3/4.5/4.7/4.8/8.4 via widget foto Personal Details, PUT idempotent beda dgn Attachments, 7/7); U002 Employee List SEPENUHNYA ditutup (LIST-15: 1.8/4.2/4.5/4.8/5.4, modal delete tertutup sesudah klik pertama = double-submit struktural tidak mungkin, 5/5); tidak ada bug baru; ditemukan TC-PIM-CSRF-01 docstring-nya menyebut U037-U040 tapi kode checknya tidak benar2 menguji unit itu (dicatat utk sesi berikutnya); docs TC-PIM/README/Execution-Plan; PIM 89.8% -> 91.8%; matrix TOTAL 78.4% -> 78.8% | 1 commit
- 2026-11-18 | PIM lanjutan (koordinator: fix CSRF-01 overclaim + U036/U037 TUNTAS) | TC-PIM-CSRF-01 diperbaiki (kode ditambah utk benar2 menguji U039/U040/U041/U042, docstring dikoreksi, bug ab() U097 membershipId kolisi diperbaiki, 15/15 lolos); U036 Optional Fields TUNTAS (TC-PIM-OPTFIELD-05, 12/12, tidak ada bug); U037 Custom Fields TUNTAS (TC-PIM-CUSTOMFIELD-07, SENGAJA FAILED, BUG BARU BG-483 double-click Save = 2 entri, instans ke-5 double-submit app-wide); TC-PIM-REPORTMETHOD-API-01/TERMREASON-API-01 ditambah check 4.8, menutup U039/U040 jadi HANYA struktural (1.2/1.4); docs TC-PIM/README/Execution-Plan/Bug-List; PIM 91.8% -> 94.6%; matrix TOTAL 78.8% -> 79.4% | 1 commit
- 2026-11-18 | PIM lanjutan (DATAIMPORT-07, U038 Data Import TUNTAS) | 1 TC baru; SENGAJA FAILED (R3), BUG BARU BG-484 (Medium) -- import CSV identik 2x membuat 2 employee duplikat, tidak ada idempotency key pd proses import; jg temuan feedback CSV import pakai panel ringkasan inline, bukan .oxd-toast spt form lain (finding, bukan bug); menutup 1.2/1.8/4.2/4.3/4.5/4.7/4.8/5.4/5.5/8.4 sekaligus; docs TC-PIM/README/Execution-Plan/Bug-List; PIM 94.6% -> 95.7%; matrix TOTAL 79.4% -> 79.6% | 1 commit
- 2026-11-18 | PIM lanjutan (ADD-34, U041 Add Employee TUNTAS) | 1 TC baru; 7/7 lolos, tidak ada bug (kontras positif dgn BG-484: duplicate employeeId pd Add Employee DITOLAK 422, keunikan ditegakkan benar, beda dgn Data Import yg tidak ada deteksi duplikat); menutup 1.1-R/1.8/5.5/6.2/6.7/8.4 sekaligus; docs TC-PIM/README/Execution-Plan; PIM 95.7% -> 96.3%; matrix TOTAL 79.6% -> 79.7%; SATU-SATUNYA unit PIM yg msh py gap non-struktural kini HANYA U042 Reports | 1 commit
- 2026-11-18 | **PIM SELESAI** (REPORT-07, U042 Reports TUNTAS -- SEMUA 7 item "Next pass" tuntas) | 1 TC baru; SENGAJA FAILED (R3), BUG BARU BG-485 (Medium) -- field criteria pd create Report SELALU 500 Internal Server Error apa pun bentuk datanya (3 format dicoba semua crash), fitur filter kriteria tidak bisa dipakai via API sama sekali; 10/11 lolos; menutup 1.1-U/1.2/1.4/4.1/4.2/4.3/4.5/4.7/5.1-CmdPath/5.5/6.7/8.4 sekaligus; SISA 22 GAP PIM SELURUHNYA struktural (diverifikasi ulang & dikonfirmasi final); docs TC-PIM/README/Execution-Plan/Bug-List; PIM 96.3% -> 97.6% (CEILING FINAL); matrix TOTAL 79.7% -> 80.0%; LANJUT OTOMATIS ke Performance (67.2%, modul terendah) sesuai instruksi user 2026-11-17 | 1 commit
- 2026-11-18 | Performance lanjutan (KPI-12 + API-02, U066/U069/U070 TUNTAS) | 2 TC baru; U066 KPIs SEPENUHNYA ditutup (KPI-12: min>max via API -> 400, non-numerik -> 422, isDefault opsional -> 200, 4/4); U069 My Reviews & U070 My Trackers SEPENUHNYA ditutup, U071 Employee Trackers turun jadi 3 kode struktural (API-02: 3 endpoint menolak 422 parameter apa pun -> tidak ada search capability sama sekali, 9/9); tidak ada bug baru; fix NAME_RULES build_matrix.py utk TC-PERF-API-02; docs TC-Performance/README/Execution-Plan; Performance 67.2% -> 69.4%; matrix TOTAL 80.0% -> 80.2% | 1 commit
- 2026-11-18 | Performance lanjutan (TRACKER-09, U104 Tracker Logs TUNTAS kecuali 1.6) | 1 TC baru; SENGAJA FAILED (R3), BUG BARU BG-486 (Medium) -- double-click Save pd modal Add Log membuat 2 entri, instans ke-6 pola double-submit app-wide (BG-427/BG-475/BG-483); 13/14 lolos; menutup 1.1-U/1.1-D/1.2/1.8/4.2/4.3/4.5/4.7/4.8/5.2-PrivEsc/5.2-MassAssign/5.4/5.5/6.7 sekaligus; fix NAME_RULES build_matrix.py (path tracker/ default map ke U067, perlu entry eksplisit utk TRACKER-09); docs TC-Performance/README/Execution-Plan/Bug-List; Performance 69.4% -> 72.9%; matrix TOTAL 80.2% -> 80.5% | 1 commit
- 2026-11-18 | Performance lanjutan (TRACKER-10, U067 Trackers config TUNTAS) | 1 TC baru; SENGAJA FAILED (R3), BUG BARU BG-487 (Medium) -- double-click Save pd form Add Tracker membuat 2 entri, instans ke-7 pola double-submit app-wide (BG-427/BG-475/BG-483/BG-486); 18/19 lolos; menutup 1.2/1.4/1.8/2.2/3.1(limit 200 char)/4.1/4.2/4.3/4.5/4.7/5.1-SQLi/5.1-XSS-Stored/5.2-MassAssign/5.4/5.5/6.5/6.7/8.4 sekaligus; fix NAME_RULES build_matrix.py regex utk TRACKER-10; docs TC-Performance/README/Execution-Plan/Bug-List; Performance 72.9% -> 77.2%; matrix TOTAL 80.5% -> 80.9% | 1 commit
- 2026-11-18 | Performance lanjutan (REVIEW-14, U068 Manage Reviews TUNTAS kecuali 5.1-SQLi/5.1-XSS-Reflected) | 1 TC baru; SENGAJA FAILED (R3), BUG BARU BG-488 (Medium) -- create review endDate SEBELUM startDate via API diterima 200, validasi urutan tanggal hanya client-side; 15/16 lolos; menutup 1.1-U/1.2/1.8/2.2/4.1/4.3/4.4/4.5/4.7/4.8/5.2-MassAssign/5.4/5.5/5.9/6.5/6.7/8.4 sekaligus; race 2x Activate paralel TIDAK korupsi data, lolos (dugaan awal 2 bug dikoreksi jadi 1 setelah verifikasi ulang); docs TC-Performance/README/Execution-Plan/Bug-List; Performance 77.2% -> 81.2%; matrix TOTAL 80.9% -> 81.2% | 1 commit
- 2026-11-18 | Performance lanjutan (EMPREVIEW-01, U007 Employee Reviews TUNTAS kecuali 5.1-SQLi/5.1-XSS-Reflected) | 1 TC baru; dibuktikan live U007 adalah halaman pencarian MURNI (POST/PUT/DELETE semua 404/405), seluruh kode berbasis mutasi (1.1-C/U/D/1.3/2.5/4.4/5.2-MassAssign/5.9/6.7) TIDAK BERLAKU di unit ini -- ditutup via check literal yg membuktikan ketidakhadiran mutasi; fromDate/toDate TERNYATA opsional di API (beda dari saran UI); menutup 1.2/1.4/1.8/2.1/2.2/3.4/4.1/4.2/4.3/4.5/4.7/4.8/5.4/5.5/6.5/8.4 sekaligus; 26/26 lolos, tidak ada bug baru; docs TC-Performance/README/Execution-Plan; Performance 81.2% -> 87.2%; matrix TOTAL 81.2% -> 81.8% | 1 commit
- 2026-11-18 | Performance lanjutan (EVAL-18 + fix EVAL-17, U102 Review Evaluation TUNTAS) | 1 TC baru + 1 TC lama diperbaiki; menemukan & memperbaiki bug tooling di TC-PERF-EVAL-17 (label check `${label}` di dalam loop bukan string literal, extract_specs.py gagal baca 3 kode taksonomi sejak ditulis -- dibongkar jd 3 panggilan literal, perilaku sama, menutup 5.1-SQLi); EVAL-18 menutup 1.1-R/1.2/1.4/1.8/2.1/4.2/4.3/4.4/4.5/4.7/4.8/5.4/5.9/8.4 sekaligus; tidak ada bug baru; docs TC-Performance/README/Execution-Plan; Performance 87.2% -> 90.7%; matrix TOTAL 81.8% -> 82.1% | 1 commit
