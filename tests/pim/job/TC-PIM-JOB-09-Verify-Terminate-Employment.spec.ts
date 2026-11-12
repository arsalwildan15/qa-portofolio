/**
 * ================================================================================
 * TC-PIM-JOB-09 — Verify Terminate Employment
 * Modul    : PIM - Job
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-JOB-09-Verify-Terminate-Employment.spec.ts
 * Path     : tests/pim/job/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi fitur "Terminate Employment" di tab Job, section
 *   "Employee Termination / Activiation" (NOTE: "Activiation" adalah
 *   typo di aplikasi sendiri, bukan typo dokumentasi -- dikonfirmasi
 *   via screenshot live 2026-11-12). Modal berisi Termination Date*
 *   (date picker), Termination Reason* (dropdown dari master data
 *   Termination Reasons), dan Note (optional). Setelah submit:
 *     - PUT /api/v2/pim/employees/<empNumber>/terminations harus 200
 *       dan body berisi date/note/terminationReason yang sesuai input.
 *     - Tombol berubah dari "Terminate Employment" jadi "Activate
 *       Employment" (toggle state, bukan 2 tombol statis).
 *   [TEMUAN SKRIP] Modal ini render DI ATAS form Job Details yang masih
 *   ada di background, dan form background itu punya input "Joined
 *   Date" dengan placeholder SAMA ("yyyy-dd-mm") serta dropdown/Save
 *   button sendiri -- locator tanpa scope ke dialog akan resolve ke 2+
 *   elemen (strict-mode violation). Semua interaksi modal WAJIB di-scope
 *   ke page.getByRole('dialog') -- lihat JobPage.terminateEmployment().
 *
 *   [TEMUAN APLIKASI - bukan bug skrip] Tombol "Terminate Employment"
 *   TIDAK berubah jadi "Activate Employment" secara client-side setelah
 *   submit sukses (200) -- dikonfirmasi via discovery script terpisah:
 *   tanpa reload, tombol lama masih terlihat; setelah full page reload,
 *   tombol yang benar (Activate Employment) baru muncul. Pola IDENTIK
 *   dengan temuan Buzz "post baru tidak muncul tanpa reload" (lihat
 *   BuzzPage.reloadAndFindCard) -- app ini secara konsisten tidak
 *   melakukan client-side state update setelah mutasi API sukses, butuh
 *   reload manual. TC ini reload sebelum verifikasi tombol untuk
 *   menghindari false-fail krn pola app ini, bukan untuk menyembunyikan
 *   temuan -- temuan tetap dicatat via report.finding().
 *   Belum pernah diuji sama sekali sebelumnya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/job/TC-PIM-JOB-09-Verify-Terminate-Employment.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-JOB-09: terminating an employee submits the termination and flips the button to Activate', async ({
  page,
  addEmployeePage,
  jobPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-JOB-09', 'Verify Terminate Employment', env.baseURL, page);
  const note = 'QA automation termination test';

  report.step('Buat employee baru via helper createTestEmployee (menangani collision Employee Id otomatis)');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaTerminate');
  await jobPage.goto(empNumber);
  await page.waitForTimeout(1000);

  report.step('Klik "Terminate Employment", isi Termination Date/Reason/Note di modal, Save');
  const resp = await jobPage.terminateEmployment('2026-15-11', 'Contract Not Renewed', note);

  report.step('Verify API termination berhasil');
  report.check('[API] PUT .../terminations status === 200', resp?.status() === 200, `status=${resp?.status()}`);
  const body = await resp?.json().catch(() => null);
  report.check(
    '[API] Response body berisi note yang sesuai input',
    body?.data?.note === note,
    `note="${body?.data?.note}"`,
  );
  report.check(
    '[API] Response body berisi terminationReason yang sesuai input',
    body?.data?.terminationReason?.name === 'Contract Not Renewed',
    `terminationReason=${JSON.stringify(body?.data?.terminationReason)}`,
  );

  report.step('Reload halaman, verify tombol berubah jadi "Activate Employment"');
  await jobPage.goto(empNumber);
  // NOTE: goto() resolves on navigation commit, not on the page's own async data fetch for
  // this section -- a fixed timeout alone raced the button render and flaked ~2/3 runs during
  // verification. waitForLoadState('networkidle') eliminates the race (confirmed via a 10x500ms
  // polling discovery script: with networkidle, the correct button is already visible at t=0).
  await page.waitForLoadState('networkidle').catch(() => {});
  report.check(
    'Tombol "Activate Employment" terlihat setelah reload (toggle state berhasil)',
    await jobPage.activateButton.isVisible({ timeout: 5_000 }).catch(() => false),
  );
  report.check(
    'Tombol "Terminate Employment" TIDAK terlihat lagi',
    (await jobPage.terminateButton.count()) === 0,
  );

  report.finding(
    'Typo "Activiation" di label section aplikasi',
    'Section di tab Job berjudul "Employee Termination / Activiation" -- seharusnya "Activation". Typo ada di aplikasi sendiri (dikonfirmasi via screenshot live), bukan kesalahan dokumentasi/skrip. Minor copy bug, tidak memengaruhi fungsi.',
  );
  report.finding(
    'Tombol tidak update client-side tanpa reload',
    'Setelah PUT .../terminations sukses (200), tombol "Terminate Employment" TIDAK otomatis berubah jadi "Activate Employment" tanpa reload -- dikonfirmasi via discovery script terpisah (before reload: tombol lama masih visible; after reload: tombol benar muncul). Pola sama dgn temuan Buzz (post baru tidak muncul tanpa reload, lihat BuzzPage.reloadAndFindCard) -- app ini konsisten tidak melakukan client-side state refresh setelah mutasi API, meski API selalu sukses.',
  );

  report.print();
});
