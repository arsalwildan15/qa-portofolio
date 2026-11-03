/**
 * ================================================================================
 * TC-PIM-JOB-05 — Verify Future Joined Date
 * Modul    : PIM - Job
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-JOB-05-Verify-Future-Joined-Date.spec.ts
 * Path     : tests/pim/job/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Joined Date di masa depan (tahun 2099) — apakah ada
 *   validasi logis "tidak boleh di masa depan" atau diterima begitu saja.
 *   Hasil didokumentasikan sebagai observasi, bukan asumsi benar/salah.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/job/TC-PIM-JOB-05-Verify-Future-Joined-Date.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-JOB-05: future joined date behavior is documented', async ({
  page,
  addEmployeePage,
  jobPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-JOB-05', 'Future Joined Date', env.baseURL, page);
  const employee = uniqueEmployeeName('QaJobFuture');

  report.step('Buat employee baru, navigate ke tab Job');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  const empNumber = (await addResp.json()).data.empNumber;
  await jobPage.goto(empNumber);

  report.step('Fill Joined Date = "2099-01-01" (format valid, tapi jauh di masa depan), klik Save');
  await jobPage.joinedDateInput.fill('2099-01-01');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/job-details') && r.request().method() === 'PUT').catch(() => null),
    jobPage.save(),
  ]);
  await page.waitForTimeout(800);

  report.step('Verify server tidak crash, catat apakah ada validasi logis tanggal masa depan');
  report.check('Server tidak crash (status < 500 atau PUT tidak terkirim karena diblok client)', (resp?.status() ?? 200) < 500);
  const errorCount = await jobPage.fieldErrors.count();
  report.finding(
    'Validasi Joined Date masa depan',
    errorCount > 0
      ? 'Ada validasi yang menolak tanggal masa depan.'
      : 'Tahun 2099 DITERIMA tanpa validasi logis apapun — tidak ada pengecekan "tanggal bergabung tidak boleh di masa depan".',
  );

  report.print();
});
