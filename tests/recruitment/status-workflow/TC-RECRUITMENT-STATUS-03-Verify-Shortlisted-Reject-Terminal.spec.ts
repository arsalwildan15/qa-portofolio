/**
 * ================================================================================
 * TC-RECRUITMENT-STATUS-03: Verify Shortlisted Reject Terminal
 * Modul    : Recruitment - Status Workflow
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-STATUS-03-Verify-Shortlisted-Reject-Terminal.spec.ts
 * Path     : tests/recruitment/status-workflow/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi candidate dengan status "Shortlisted" bisa di-Reject,
 *   dan status "Rejected" bersifat terminal (tidak ada tombol aksi lain
 *   setelahnya, selain Reject itu sendiri sudah tidak tersedia lagi).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/status-workflow/TC-RECRUITMENT-STATUS-03-Verify-Shortlisted-Reject-Terminal.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';
import { shortlistCandidate } from '../../../src/utils/advanceCandidateStatus';

test('TC-RECRUITMENT-STATUS-03: rejecting a Shortlisted candidate moves it to a terminal Rejected state', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-STATUS-03', 'Shortlisted Reject Terminal', env.baseURL, page);

  report.step('Buat candidate baru, Shortlist, lalu Reject');
  const { candidateId } = await createTestCandidate(page, candidatesPage, 'QaStatusReject');
  await shortlistCandidate(page, candidatesPage, candidateId);

  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  await candidatesPage.statusActionButton('Reject').click();
  await page.waitForTimeout(800);

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/recruitment/candidates') && r.request().method() !== 'GET', { timeout: 10_000 }),
    candidatesPage.save(),
  ]);
  report.check('[API] status reject === 200', resp.status() === 200, `status=${resp.status()}, url=${resp.url()}`);

  report.step('Verify status "Rejected" dan tidak ada tombol aksi lain (terminal)');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  const statusText = await candidatesPage.statusText.textContent().catch(() => null);
  report.check('Status = "Rejected"', statusText?.includes('Rejected') ?? false, `statusText=${statusText}`);
  const actionButtons = await page.getByRole('button').allTextContents();
  const meaningfulButtons = actionButtons.map((b) => b.trim()).filter((b) => b && b !== 'Upgrade');
  report.check('Tidak ada tombol aksi status lain (terminal)', meaningfulButtons.length === 0, `buttons=${JSON.stringify(meaningfulButtons)}`);

  report.print();
});
