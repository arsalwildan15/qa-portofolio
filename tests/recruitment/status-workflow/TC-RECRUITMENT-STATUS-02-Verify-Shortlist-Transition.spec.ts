/**
 * ================================================================================
 * TC-RECRUITMENT-STATUS-02: Verify Shortlist Transition
 * Modul    : Recruitment - Status Workflow
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-STATUS-02-Verify-Shortlist-Transition.spec.ts
 * Path     : tests/recruitment/status-workflow/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik "Shortlist" dari status "Application Initiated"
 *   menavigasi ke form konfirmasi (action=2), dan klik Save benar-benar
 *   mengubah status jadi "Shortlisted" via [API] POST
 *   /api/v2/recruitment/candidates/<id>/shortlist. Sekadar navigasi ke URL
 *   changeCandidateVacancyStatus TIDAK mengubah status (dikonfirmasi live),
 *   harus klik Save.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/status-workflow/TC-RECRUITMENT-STATUS-02-Verify-Shortlist-Transition.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';

test('TC-RECRUITMENT-STATUS-02: clicking Shortlist and saving transitions status to Shortlisted', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-STATUS-02', 'Shortlist Transition', env.baseURL, page);

  report.step('Buat candidate baru, klik Shortlist, klik Save');
  const { candidateId } = await createTestCandidate(page, candidatesPage, 'QaStatusShortlist');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  await candidatesPage.statusActionButton('Shortlist').click();
  await page.waitForTimeout(800);

  report.step('Verify URL confirmation form action=2, lalu klik Save');
  report.check('URL mengandung selectedAction=2', page.url().includes('selectedAction=2'), `url=${page.url()}`);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/shortlist') && r.request().method() !== 'GET', { timeout: 10_000 }),
    candidatesPage.save(),
  ]);
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.step('Verify status berubah jadi "Shortlisted" di halaman detail');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  const statusText = await candidatesPage.statusText.textContent().catch(() => null);
  report.check('Status = "Shortlisted"', statusText?.includes('Shortlisted') ?? false, `statusText=${statusText}`);

  report.print();
});
