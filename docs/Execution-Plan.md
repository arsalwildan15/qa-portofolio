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
- **Fase aktif:** 2 (P2.1 Performance batch 1 TUNTAS: 13 TC Review + 4 TC KPI, BG-356 ditemukan)
- **Task terakhir selesai:** P2.1 batch 1 (lihat checklist P2.1 + LOG)
- **NEXT ACTION:** P2.1 BATCH 2 -- probe widget Rating per-KPI di reviewEvaluateByAdmin/<id> (input
  tanpa type/placeholder) -> EVAL-11 finalize positif, EVAL-12 rating min/max, EVAL-13 XSS komentar,
  EVAL-14 eval Inactive via API, EVAL-10 self-eval ESS, KPI-11, lalu eksplor+TC TRACKER-01..08.
  Setelah itu docs/TC-Performance.txt, baru P2.2 Claim.
- **Catatan run:** TC asli JANGAN pakai `--reporter=list` (R8). REVIEW-10 SENGAJA FAILED (BG-356);
  REVIEW-04/05/06/08/11/12 boleh gagal INTERMITEN HANYA di console-check (BG-356) -- gagal di check
  lain = regresi baru, investigasi.
- **Blocker:** —
- **Perlu persetujuan user (antrian):** — (identity self-heal otomatis sejak Fase 1, TIDAK perlu
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
- [x] BUG NYATA: BG-356 -- setelah Activate, GET manage/reviews/<id> 404 -> uncaught exception "fe"
      (signature sama BG-333), form edit kosong; frekuensi naik seiring jumlah review. TIDAK ada risiko
      data (PUT field inti ke review Activated selalu 422). Sesuai R3: TIDAK di-whitelist; REVIEW-10 =
      reproducer konsisten yg SENGAJA FAILED (jaga BG-356 Open); REVIEW-04/05/06/08/11/12 bisa gagal
      INTERMITEN di console-check krn bug ini (+report.finding) -> pengecualian R3 "3x bersih" yg sah
      sampai bug diperbaiki dev. Baris duplikat otomatis dari script2 itu -> tutup "Duplicate of BG-356".
- [x] Perbaikan infra selama P2.1: `TestReport` pageerror kini ikut expectedConsoleErrorPatterns (dulu cuma
      console 'error'; dicek: whitelist lama di repo tdk ada yg match "Uncaught exception"). Memory baru:
      JANGAN `--reporter=list` utk TC asli (override bugListReporter) -- sesuai R8.
- [ ] P2.1 BATCH 2 (sisa, BELUM dikerjakan): eksplor dulu widget Rating per-KPI (input tanpa type/
      placeholder, 6 utk KPI + 1 Final Rating) -> EVAL-11 finalize positif (isi rating+komentar+tanggal ->
      Complete -> status Completed) | EVAL-12 Rating luar min/max (KPI "targeted new customer" 50-90) |
      EVAL-13 XSS komentar | EVAL-14 evaluasi review Inactive via API (-) | EVAL-10 self-eval ESS
      (lintas role) | KPI-11 Pagination/sort | TRACKER-01..08 (fitur jurnal, perlu eksplor + page object)
- [ ] Regresi modul + docs/TC-Performance.txt + commit

### P2.2 Claim (~30) — eksplor: aksi admin pada klaim SUBMITTED milik ESS, Event inactive vs dropdown,
submit tanpa expense.
- [ ] Eksplorasi P2.2
- [ ] CONFIG-EVENT-01..06 (Add, Required, Duplikat, XSS, Inactive hilang dari dropdown, Delete dipakai)
- [ ] CONFIG-EXPTYPE-01..06 (pola sama)
- [ ] SUBMIT-01 ESS create->expense->Submit | 02 Submit tanpa expense | 03 My Claims filter
- [ ] APPROVAL-01 Approve->Pay->PAID | 02 Reject terminal | 03 ESS tak bisa approve sendiri | 04 Approve
      CANCELLED via API (-) | 05 Approve vs Reject paralel (!) | 06 Cross-admin concurrency
- [ ] ASSIGN-16 Assign+Submit->PAID (aturan bisnis) | 17 Edit/delete expense | 18 Delete attachment
      | 19 Attachment 1MB tepat/>1MB (B) | 20 Double extension + nama file berbahaya (S) | 21 IDOR scoped+ESS
- [ ] LIST-01 Filter Employee Claims | 02 Pagination/sort | 03 Kombinasi filter
- [ ] Regresi modul + docs/TC-Claim.txt + commit

### P2.3 Leave (~45) — eksplor: opsi Duration, field "Add to", halaman Reports, flag situational,
efek Holiday ke hitungan.
- [ ] Eksplorasi P2.3
- [ ] APPLY-07 Half Day/Specify Time | 08 Hari libur | 09 Overlap | 10 Tanggal lampau | 11 Unicode/RTL
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
- [ ] Eksplorasi P2.4
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
- [ ] docs/TC-Performance.txt | [ ] TC-Claim.txt | [ ] TC-Leave.txt | [ ] TC-Time.txt (format TC-Login.txt)
- [ ] README: tabel coverage + subsection 4 modul (bug & temuan desain), total benar
- [ ] QA-Review-Progress.md status final 4 modul

## FASE 4 — Audit Ulang Modul Lama
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
