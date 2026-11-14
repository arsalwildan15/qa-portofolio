/**
 * ================================================================================
 * TC-TIME-TIMESHEET-01 — Verify Logging Hours Against A Project/Activity Succeeds
 * Modul    : Time - Timesheets (My Timesheet)
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-TIMESHEET-01-Verify-Add-Hours-Valid.spec.ts
 * Path     : tests/time/timesheet/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi admin bisa mengedit timesheet-nya sendiri: isi Project + Activity pada
 *   baris yg sudah tersedia, isi jam pada salah satu hari, Save, lalu record tsb tersimpan
 *   (toast "Successfully Saved" + data bertahan setelah reload).
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/timesheet/TC-TIME-TIMESHEET-01-Verify-Add-Hours-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-TIME-TIMESHEET-01: logging hours against a Project/Activity on My Timesheet succeeds and persists', async ({
  page,
  myTimesheetPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-TIME-TIMESHEET-01', 'Add Hours Valid', env.baseURL, page);

  report.step('Buka My Timesheet, masuk mode Edit, isi Project + Activity pada baris pertama');
  await myTimesheetPage.goto();
  await myTimesheetPage.startEdit();
  const { project, activity } = await myTimesheetPage.fillFirstRow([
    'ACME',
    'Apache',
    'Coca-Cola',
    'Fresh Books',
    'FreeWave',
  ]);
  report.check('Project & Activity berhasil terisi', !!project && !!activity, `project=${project}, activity=${activity}`);

  report.step('Isi 2:00 jam pada hari Senin (kolom pertama), lalu Save');
  await myTimesheetPage.fillDuration(0, '2:00');
  const saveResp = await myTimesheetPage.save();
  report.check('[API] Save timesheet berhasil (status 200)', saveResp?.status() === 200, `status=${saveResp?.status()}`);

  report.step('Verify: toast "Successfully Saved" muncul, dan jam bertahan setelah reload halaman');
  await page.waitForTimeout(1_000);
  const toastText = await page.locator('body').innerText();
  report.check('Toast "Successfully Saved" muncul', toastText.includes('Successfully Saved'));

  // Tunggu toast hilang dulu (ia auto-dismiss via timer client-side) sebelum reload --
  // dikonfirmasi live, reload yg terlalu cepat sesaat setelah save() resolve kadang balapan
  // dgn commit state React/Vue internal shalow, membuat view yg di-reload sempat menangkap
  // state lama sesaat. Delay lebih longgar di sini murni utk stabilitas, bukan krn API-nya
  // sendiri lambat (API sudah confirmed 200 di atas).
  await page.waitForTimeout(2_000);
  // [BUG SCRIPT, diperbaiki] Sama dgn race ERR_ABORTED yg sudah ditemukan di goto() beberapa
  // page object lain -- app ini melakukan self-redirect tersendiri sesaat setelah save,
  // yg bisa balapan dgn reload() di sini. Retry sekali kalau kena.
  // [BUG SCRIPT, diperbaiki] waitForLoadState('networkidle') tidak cukup -- dikonfirmasi live,
  // halaman ini melakukan BEBERAPA GET berurutan (timesheet default, lalu entries) stlh
  // reload, dan 'networkidle' kadang resolve di antara 2 request itu, bukan setelah
  // entries-nya benar2 selesai. Tunggu eksplisit GET .../entries yg terakhir.
  const entriesRespPromise = page
    .waitForResponse((r) => /\/api\/v2\/time\/timesheets\/\d+\/entries/.test(r.url()) && r.request().method() === 'GET', { timeout: 15_000 })
    .catch(() => null);
  try {
    await page.reload();
  } catch (error) {
    if (error instanceof Error && error.message.includes('ERR_ABORTED')) {
      await page.waitForTimeout(1_500);
      await page.reload();
    } else {
      throw error;
    }
  }
  await entriesRespPromise;
  await page.waitForTimeout(1_000);
  const afterReloadText = await page.locator('body').innerText();
  report.check(
    `Project "${project}" muncul di My Timesheet setelah reload`,
    afterReloadText.includes(project.split(' - ')[0]),
    `project=${project}`,
  );
  report.check('Total jam (02:00) muncul di tabel setelah reload', afterReloadText.includes('02:00'));

  report.print();
});
