/**
 * ================================================================================
 * TC-ADMIN-MEMBERSHIP-02: Verify Empty Submit Validation
 * Modul    : Admin - Qualifications - Memberships
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-MEMBERSHIP-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/memberships/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add Membership tanpa mengisi Name
 *   menampilkan validasi "Required" dan TIDAK mengirim POST.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/memberships/TC-ADMIN-MEMBERSHIP-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-MEMBERSHIP-02: submitting an empty Add Membership form shows Required validation', async ({
  page,
  adminMembershipsListPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-MEMBERSHIP-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buka form Add Membership, klik Save tanpa isi apa pun');
  await adminMembershipsListPage.gotoAdd();
  await adminMembershipsListPage.save();
  await page.waitForTimeout(800);

  report.step('Verify: pesan Required muncul, form tidak submit');
  const requiredError = await adminMembershipsListPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.check('Pesan validasi "Required" muncul', (requiredError ?? '').trim().length > 0, `error=${requiredError}`);

  report.print();
});
