/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-03: Verify Invalid Email Format Rejected
 * Modul    : Recruitment - Candidates
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-03-Verify-Invalid-Email-Format-Rejected.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Email dengan format tidak valid ("not-an-email")
 *   ditolak dengan pesan "Expected format: admin@example.com" dan POST
 *   tidak terkirim. Dikonfirmasi live: Email DIVALIDASI dengan benar di
 *   form ini (berbeda dari beberapa field lain di PIM yang longgar), jadi
 *   ini hard check, bukan finding ambigu.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-03-Verify-Invalid-Email-Format-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-RECRUITMENT-CANDIDATE-03: an invalid email format is rejected before submit', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-03', 'Invalid Email Format Rejected', env.baseURL, page);
  const { firstName, lastName } = uniqueEmployeeName('QaInvalidEmail');

  let postFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/candidates')) postFired = true;
  });

  report.step('Isi Full Name, isi Email format invalid, klik Save');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  await candidatesPage.emailInput.fill('not-an-email');
  await candidatesPage.save();
  await page.waitForTimeout(1200);

  report.step('Verify: pesan error format email muncul, POST tidak terkirim');
  const errors = await candidatesPage.fieldErrors.allTextContents();
  report.check(
    'Pesan error format email muncul',
    errors.some((e) => /expected format/i.test(e)),
    `errors=${JSON.stringify(errors)}`,
  );
  report.check('POST candidates TIDAK terkirim', postFired === false);

  report.print();
});
