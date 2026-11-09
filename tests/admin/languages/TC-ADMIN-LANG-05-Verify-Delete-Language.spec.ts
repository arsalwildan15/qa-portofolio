/**
 * ================================================================================
 * TC-ADMIN-LANG-05: Verify Delete Language
 * Modul    : Admin - Qualifications - Languages
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LANG-05-Verify-Delete-Language.spec.ts
 * Path     : tests/admin/languages/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Language yang baru dibuat bisa dihapus lewat tombol
 *   aksi pertama di row (trash/delete).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/languages/TC-ADMIN-LANG-05-Verify-Delete-Language.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-LANG-05: a newly created Language can be deleted', async ({
  page,
  adminLanguagesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-LANG-05', 'Delete Language', env.baseURL, page);
  const name = uniqueName('QaDeleteLanguage');

  report.step('Buat Language baru untuk dihapus');
  await adminLanguagesPage.gotoAdd();
  await adminLanguagesPage.nameInput.fill(name);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/languages') && r.request().method() === 'POST'),
    adminLanguagesPage.save(),
  ]);
  await adminLanguagesPage.goto();
  await page.waitForTimeout(1200);

  report.step('Hapus Language yang baru dibuat');
  const row = adminLanguagesPage.rowByName(name).first();
  report.check('Language muncul sebelum dihapus', await row.isVisible({ timeout: 5_000 }).catch(() => false));
  await adminLanguagesPage.deleteRow(row);
  await page.waitForTimeout(1200);

  report.step('Verify: language tidak lagi muncul di list');
  report.check(
    `Language "${name}" sudah terhapus`,
    !(await adminLanguagesPage.rowByName(name).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
