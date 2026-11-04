/**
 * ================================================================================
 * TC-RECRUITMENT-STATUS-05: Verify Schedule Interview Empty Validation
 * Modul    : Recruitment - Status Workflow
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-STATUS-05-Verify-Schedule-Interview-Empty-Validation.spec.ts
 * Path     : tests/recruitment/status-workflow/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Schedule Interview tanpa mengisi field
 *   wajib (Interview Title, Interviewer, Date) menampilkan validasi
 *   Required dan tidak mengirim POST shedule-interview.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/status-workflow/TC-RECRUITMENT-STATUS-05-Verify-Schedule-Interview-Empty-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';
import { shortlistCandidate } from '../../../src/utils/advanceCandidateStatus';

test('TC-RECRUITMENT-STATUS-05: submitting Schedule Interview empty shows required validation', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-STATUS-05', 'Schedule Interview Empty Validation', env.baseURL, page);

  report.step('Buat candidate baru, Shortlist, buka form Schedule Interview, langsung klik Save');
  const { candidateId } = await createTestCandidate(page, candidatesPage, 'QaStatusEmptyInt');
  await shortlistCandidate(page, candidatesPage, candidateId);

  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  await candidatesPage.statusActionButton('Schedule Interview').click();
  await page.waitForTimeout(800);

  let postFired = false;
  page.on('request', (r) => {
    if (r.url().includes('shedule-interview') && r.method() !== 'GET') postFired = true;
  });
  await candidatesPage.save();
  await page.waitForTimeout(1000);

  report.step('Verify: pesan error Required muncul, POST tidak terkirim');
  const errorCount = await candidatesPage.fieldErrors.count();
  report.check('Minimal 1 pesan error Required muncul', errorCount > 0, `errorCount=${errorCount}`);
  report.check('POST shedule-interview TIDAK terkirim', !postFired);

  report.print();
});
