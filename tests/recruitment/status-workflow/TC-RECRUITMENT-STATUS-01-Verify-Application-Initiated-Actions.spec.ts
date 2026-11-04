/**
 * ================================================================================
 * TC-RECRUITMENT-STATUS-01: Verify Application Initiated Actions
 * Modul    : Recruitment - Status Workflow
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-STATUS-01-Verify-Application-Initiated-Actions.spec.ts
 * Path     : tests/recruitment/status-workflow/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi candidate baru dimulai dengan status "Application
 *   Initiated" dan tombol aksi yang tersedia adalah "Reject" dan
 *   "Shortlist", sesuai GET /api/v2/recruitment/candidates/<id>/actions/allowed.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/status-workflow/TC-RECRUITMENT-STATUS-01-Verify-Application-Initiated-Actions.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';

test('TC-RECRUITMENT-STATUS-01: a new candidate starts at Application Initiated with Reject/Shortlist actions', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-STATUS-01', 'Application Initiated Actions', env.baseURL, page);

  report.step('Buat candidate baru, buka halaman detail');
  const { candidateId } = await createTestCandidate(page, candidatesPage, 'QaStatusInit');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);

  report.step('Verify status awal "Application Initiated" dan tombol Reject/Shortlist tersedia');
  const statusText = await candidatesPage.statusText.textContent().catch(() => null);
  report.check('Status awal = "Application Initiated"', statusText?.includes('Application Initiated') ?? false, `statusText=${statusText}`);
  report.check('Tombol "Reject" tersedia', await candidatesPage.statusActionButton('Reject').isVisible({ timeout: 3_000 }).catch(() => false));
  report.check('Tombol "Shortlist" tersedia', await candidatesPage.statusActionButton('Shortlist').isVisible({ timeout: 3_000 }).catch(() => false));

  report.print();
});
