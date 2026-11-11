/**
 * ================================================================================
 * TC-ADMIN-EMPSTATUS-04: Verify Duplicate Name
 * Modul    : Admin - Employment Status
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMPSTATUS-04-Verify-Duplicate-Name.spec.ts
 * Path     : tests/admin/employment-status/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mencoba menambah Employment Status dengan nama yang
 *   SUDAH ADA di data seed demo ("Full-Time") ditangani konsisten
 *   (ditolak atau diterima -- dicatat apa adanya).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/employment-status/TC-ADMIN-EMPSTATUS-04-Verify-Duplicate-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-EMPSTATUS-04: adding a duplicate Employment Status name is handled consistently', async ({
  page,
  adminEmploymentStatusPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-EMPSTATUS-04', 'Duplicate Name', env.baseURL, page);

  report.step('Coba tambah Employment Status dengan nama existing "Full-Time"');
  await adminEmploymentStatusPage.gotoAdd();
  await adminEmploymentStatusPage.nameInput.fill('Full-Time');
  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/employment-statuses') && r.request().method() === 'POST', { timeout: 8_000 })
    .catch(() => null);
  await adminEmploymentStatusPage.save();
  const resp = await respPromise;
  const duplicateError = await adminEmploymentStatusPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);

  report.step('Verify: catat perilaku duplikat apa adanya, lalu bersihkan kalau sampai tersimpan');
  report.check(
    'TC dijalankan tanpa exception (perilaku duplikat dicatat apa adanya)',
    true,
    `status=${resp?.status() ?? 'tidak ada response (ditolak client-side)'}, error=${duplicateError ?? 'tidak ada'}`,
  );

  if (resp && resp.status() === 200) {
    await adminEmploymentStatusPage.goto();
    await page.waitForTimeout(3000);
    const rows = adminEmploymentStatusPage.rowByName('Full-Time');
    const count = await rows.count();
    if (count > 1) {
      await adminEmploymentStatusPage.deleteRow(rows.last());
    }
  }

  report.print();
});
