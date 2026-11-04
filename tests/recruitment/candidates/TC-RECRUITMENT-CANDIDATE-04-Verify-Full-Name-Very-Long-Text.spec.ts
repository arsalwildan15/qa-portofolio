/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-04: Verify Full Name Very Long Text
 * Modul    : Recruitment - Candidates
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-04-Verify-Full-Name-Very-Long-Text.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi perilaku First Name dengan teks sangat panjang (300
 *   karakter): didokumentasikan sebagai finding karena belum diketahui
 *   batas pasti sebelum dicoba langsung.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-04-Verify-Full-Name-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmail } from '../../../src/data/testData';

test('TC-RECRUITMENT-CANDIDATE-04: a 300-character First Name is handled', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-04', 'Full Name Very Long Text', env.baseURL, page);
  const longName = 'B'.repeat(300);

  report.step('Isi First Name 300 karakter, isi field wajib lain, klik Save');
  await candidatesPage.gotoAddForm();
  await candidatesPage.firstNameInput.fill(longName);
  await candidatesPage.lastNameInput.fill('Test');
  await candidatesPage.selectFirstVacancy();
  await candidatesPage.emailInput.fill(uniqueEmail('qalongname'));
  await candidatesPage.save();
  await page.waitForTimeout(1500);

  const errorText = await candidatesPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.finding(
    'Perilaku First Name 300 karakter',
    errorText !== null
      ? `Ditolak dengan pesan validasi: "${errorText}"`
      : 'Diterima tanpa pesan validasi panjang (tidak ada batas client-side yang terlihat).',
  );
  report.check('TC dijalankan tanpa exception', true);

  report.print();
});
