/**
 * ================================================================================
 * TC-RECRUITMENT-STATUS-08: Verify Candidate History Logs Transitions
 * Modul    : Recruitment - Status Workflow
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-STATUS-08-Verify-Candidate-History-Logs-Transitions.spec.ts
 * Path     : tests/recruitment/status-workflow/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi kartu "Candidate History" di halaman detail mencatat
 *   setiap transisi status (misal shortlist) sebagai baris audit log baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/status-workflow/TC-RECRUITMENT-STATUS-08-Verify-Candidate-History-Logs-Transitions.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';
import { shortlistCandidate } from '../../../src/utils/advanceCandidateStatus';

test('TC-RECRUITMENT-STATUS-08: Candidate History records a shortlist transition', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-STATUS-08', 'Candidate History Logs Transitions', env.baseURL, page);

  report.step('Buat candidate baru, catat jumlah baris History awal');
  const { candidateId } = await createTestCandidate(page, candidatesPage, 'QaStatusHistory');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  const historyCountBefore = await candidatesPage.historyRows.count();

  report.step('Shortlist candidate');
  await shortlistCandidate(page, candidatesPage, candidateId);

  report.step('Verify Candidate History bertambah baris baru dengan keterangan shortlist');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  const historyCountAfter = await candidatesPage.historyRows.count();
  report.check(
    'Jumlah baris Candidate History bertambah setelah shortlist',
    historyCountAfter > historyCountBefore,
    `before=${historyCountBefore}, after=${historyCountAfter}`,
  );
  const historyText = await page.locator('body').textContent();
  report.check(
    'Ada entri histori yang menyebut "Shortlist"',
    historyText?.includes('Shortlist') ?? false,
  );

  report.print();
});
