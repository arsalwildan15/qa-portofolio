/**
 * ================================================================================
 * TC-ADMIN-SOCIALAUTH-01: Verify List Loads
 * Modul    : Admin - Configuration - Social Media Authentication
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-SOCIALAUTH-01-Verify-List-Loads.spec.ts
 * Path     : tests/admin/social-media-authentication/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Provider List termuat dengan tombol Add; pada demo ini
 *   belum ada provider terdaftar ("No Records Found").
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/social-media-authentication/TC-ADMIN-SOCIALAUTH-01-Verify-List-Loads.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-ADMIN-SOCIALAUTH-01: Provider List loads with Add button', async ({
  page,
  adminSocialMediaAuthPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-SOCIALAUTH-01', 'Verify List Loads', env.baseURL, page);
  const sa = adminSocialMediaAuthPage;

  report.step('Buka Social Media Authentication');
  await sa.goto();

  report.step('Verify tombol Add terlihat, catat jumlah provider saat ini');
  report.check('Tombol Add terlihat', await isVisibleWithWait(sa.addButton));
  const rowCount = await sa.tableRows.count();
  report.finding('Jumlah provider terdaftar saat ini', `${rowCount} provider`);

  report.print();
});
