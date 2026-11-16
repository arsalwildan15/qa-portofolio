/**
 * ================================================================================
 * TC-ADMIN-LANG-01: Verify Add Language Valid
 * Modul    : Admin - Qualifications - Languages
 * Kategori : Positive (+) 1.1-C 1.1-R | API (A) 6.1
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LANG-01-Verify-Add-Language-Valid.spec.ts
 * Path     : tests/admin/languages/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Language baru (Name) berhasil tersimpan via
 *   POST /api/v2/admin/languages dan muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/languages/TC-ADMIN-LANG-01-Verify-Add-Language-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-LANG-01: adding a language with valid data succeeds', async ({
  page,
  adminLanguagesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-LANG-01', 'Add Language Valid', env.baseURL, page);
  const name = uniqueName('QaLanguage');

  report.step('Isi Name, klik Save');
  await adminLanguagesPage.gotoAdd();
  await adminLanguagesPage.nameInput.fill(name);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/languages') && r.request().method() === 'POST'),
    adminLanguagesPage.save(),
  ]);

  report.step('Verify response POST languages, dan language muncul di list');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  await adminLanguagesPage.goto();
  await page.waitForTimeout(1200);
  report.check(
    `Language "${name}" muncul di list`,
    await isVisibleWithWait(adminLanguagesPage.rowByName(name).first(), 5_000),
  );

  report.print();
});
