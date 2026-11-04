/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-05: Verify XSS In Notes
 * Modul    : Recruitment - Candidates
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-05-Verify-XSS-In-Notes.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Notes tidak tereksekusi sebagai script.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-05-Verify-XSS-In-Notes.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName, uniqueEmail } from '../../../src/data/testData';

test('TC-RECRUITMENT-CANDIDATE-05: an XSS payload in Notes does not execute', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-05', 'XSS In Notes', env.baseURL, page);
  const { firstName, lastName } = uniqueEmployeeName('QaXssNotes');
  const payload = '<script>window.__xss=true</script>';

  report.step('Isi field wajib, isi Notes dengan payload XSS, klik Save');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  await candidatesPage.selectFirstVacancy();
  await candidatesPage.emailInput.fill(uniqueEmail('qaxssnotes'));
  await candidatesPage.notesTextarea.fill(payload);
  await candidatesPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify: tidak ada eksekusi script (window.__xss tidak ter-set)');
  const xssExecuted = await page.evaluate(() => (globalThis as unknown as { __xss?: boolean }).__xss === true);
  report.check('Payload XSS TIDAK tereksekusi sebagai script', xssExecuted === false);

  report.print();
});
