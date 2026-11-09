/**
 * ================================================================================
 * TC-ADMIN-EDU-01: Verify Add Education Level Valid
 * Modul    : Admin - Qualifications - Education
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EDU-01-Verify-Add-Education-Level-Valid.spec.ts
 * Path     : tests/admin/education/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Education Level baru berhasil tersimpan via
 *   POST /api/v2/admin/educations dan muncul di list. [TEMUAN] Label
 *   field ini "Level", BUKAN "Name" seperti sub-screen Qualifications
 *   lain -- dikonfirmasi live via discovery run.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/education/TC-ADMIN-EDU-01-Verify-Add-Education-Level-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-EDU-01: adding an Education Level with valid data succeeds', async ({
  page,
  adminEducationPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-EDU-01', 'Add Education Level Valid', env.baseURL, page);
  const level = uniqueName('QaEduLevel');

  report.step('Isi Level, klik Save');
  await adminEducationPage.gotoAdd();
  await adminEducationPage.nameInput.fill(level);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/educations') && r.request().method() === 'POST'),
    adminEducationPage.save(),
  ]);

  report.step('Verify response POST educations, dan level muncul di list');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  await adminEducationPage.goto();
  await page.waitForTimeout(1200);
  report.check(
    `Education Level "${level}" muncul di list`,
    await adminEducationPage.rowByName(level).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );

  report.print();
});
