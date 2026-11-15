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
- **Fase aktif:** FASE 3 TUNTAS (dokumentasi 4 modul) -> lanjut lapis 2 Fase 2. Riwayat: P2.1 Performance lapis 1 TUNTAS (24 TC; sengaja FAILED: REVIEW-10=BG-356,
  EVAL-15=BG-373); P2.2 Claim lapis 1 TUNTAS (9 TC; sengaja FAILED: SUBMIT-02=BG-375,
  APPROVAL-05=BG-374)
- **Task terakhir selesai:** FASE 2 LAPIS 1 TUNTAS (4 modul): Performance 24 TC, Claim 9, Leave 5 (+4 TC
  lama dipulihkan), Time 5 (modul Time 12/12 lolos). TC yg SENGAJA FAILED: REVIEW-10 (BG-356),
  EVAL-15 (BG-373), CLAIM-APPROVAL-05 (BG-374), CLAIM-SUBMIT-02 (BG-375).
- **INSTRUKSI USER 2026-11-15:** begitu Fase 2 (lapis 1 keempat modul) selesai, LANGSUNG lanjut
  otomatis ke Fase 3 (dokumentasi) tanpa menunggu konfirmasi. **DIPERLUAS:** lanjutkan SEMUA fase
  berikutnya (lapis 2, P2.5, Fase 4-8) secara OTOMATIS tanpa konfirmasi user. (Tetap: aturan R1-R9
  berlaku; R6 config global sudah disetujui dgn withConfigRestore.)
- **URUTAN BARU (disetujui user 2026-11-15, pendekatan 2 LAPIS):** lapis 1 = alur inti + approval
  lintas role (ESS) + keamanan di SEMUA modul dulu; lapis 2 = edge case sisa SETELAH 4 modul punya
  lapis 1. Urutan: (1) P2.1 batch 2 ringkas -> (2) P2.2 Claim lapis 1 -> (3) P2.3 Leave lapis 1 ->
  (4) P2.4 Time lapis 1 -> (5) Fase 3 docs -> (6) lapis 2 + P2.5 -> (7) Fase 4-8.
  Efisiensi: verifikasi per file dulu, full batch sekali per modul; bug intermiten cukup dibuktikan+
  dicatat lalu tinggal; run TC asli tanpa --reporter=list.
- **NEXT ACTION:** (6) LAPIS 2 Fase 2 -- Leave lapis 2 (APPLY-07..11) [x], Claim lapis 2 (6 TC) [x].
  Berikutnya: P2.1 Performance lapis 2 (EVAL-10 self-eval ESS, KPI-11 pagination/sort, TRACKER-03..08),
  lalu Time lapis 2 (multi-row, komentar sel, Customer/Project), lalu P2.5 lintas-modul, lalu Fase 4-8.
  Setiap TC baru: verifikasi per file, full batch per modul (--workers=1 utk modul dgn setup ESS),
  docs/TC-*.txt ikut diperbarui.
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
- [x] P1.8 `tests/infra/` INFRA-01/02/03 -- 3x run, 9/9 check x 3 = lolos semua.
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
- [ ] LAPIS 2 (ditunda sesuai urutan baru): EVAL-10 self-eval ESS | KPI-11 Pagination/sort |
      TRACKER-03..08 (duplikat, edit/delete, log, XSS log, ESS My Trackers, IDOR)
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
- [ ] TIMESHEET-03 Submit | 04 Multi-row | 05 Hapus row | 06 Duplikat row | 07 Komentar sel | 08 Navigasi
      minggu | 09 Reset | 10 XSS komentar | 11 Total >24j/hari lintas row (B)
- [ ] TS-APPROVAL-01 Approve | 02 Reject+komentar | 03 Reject tanpa komentar | 04 ESS tak bisa approve
      sendiri | 05 Approve belum Submitted via API (-)
- [ ] PUNCH-03 Out<In | 04 Overlap | 05 Masa depan | ADMIN-ATTENDANCE-03 Edit | 04 Delete | MY-01
      | CONFIG-01 (R6)
- [ ] REPORTS-02 Project | 03 Attendance Summary | 04 Rentang kosong | 05 Rentang terbalik
- [ ] CUSTOMER-01..05 | PROJECT-01..06
- [ ] Regresi modul + docs/TC-Time.txt + commit

### P2.5 Lintas-modul 4 modul (~28): per modul CSRF, rate limit, headers, refresh pending, koneksi putus,
unicode/RTL, API param negatif (offset/limit/sortField).
- [ ] Leave | [ ] Claim | [ ] Performance | [ ] Time

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
- [ ] (BARU dari Fase 2, WAJIB duluan) Drift format tanggal: 9 page object lama masih hardcode
      placeholder "yyyy-dd-mm" -> CandidatesPage, DependentsPage, ImmigrationPage, JobPage (+dialog
      terminate), MembershipsPage, PersonalDetailsPage, QualificationsPage, TimeAttendancePage
      (TimeAttendancePage dikerjakan di P2.4). Pindahkan ke dateInput.ts + cek TC yg mencocokkan teks
      tanggal di tabel (pakai pola rowByDate).
- [ ] (BARU) `locator.isVisible({ timeout })` TIDAK menunggu (timeout diabaikan) -- TC lama yg memakainya
      (mis. KPI-01/02) bisa false-fail (cek positif) atau false-PASS (cek negatif). Ganti ke
      isVisibleWithWait/isHiddenWithWait (testReport.ts); cek negatif wajib tunggu elemen jangkar dulu.
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
