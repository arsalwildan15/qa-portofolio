/**
 * ================================================================================
 * TC-CLAIM-SUBMIT-03 — Verify The ESS "My Claims" List Filters By Status
 * Modul    : Claim - My Claims (ESS)
 * Kategori : Positive (+) / UI
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-SUBMIT-03-Verify-My-Claims-Status-Filter.spec.ts
 * Path     : tests/claim/submit/
 * ================================================================================
 *
 * TUJUAN:
 *   My Claims (claim/viewClaim) punya filter Reference Id / Event / Status / tanggal. Filter
 *   Status mengirim GET claim/requests?status=<STATUS> (confirmed live). ESS dgn 1 klaim
 *   SUBMITTED: filter "Submitted" menampilkan klaimnya (reference id cocok), filter "Paid"
 *   menampilkan "No Records Found".
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/submit/TC-CLAIM-SUBMIT-03-Verify-My-Claims-Status-Filter.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { createEssClaim } from '../../../src/utils/createEssClaim';

test('TC-CLAIM-SUBMIT-03: the ESS My Claims list filters by status', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-CLAIM-SUBMIT-03', 'My Claims Status Filter', env.baseURL, page);

  report.step('Setup: ESS dgn 1 klaim SUBMITTED');
  const { essPage, close, claimId } = await createEssClaim(page, browser, addEmployeePage, 'QaClmFilter');
  const referenceId = (await (await essPage.request.get(`/web/index.php/api/v2/claim/requests/${claimId}`)).json().catch(() => null))?.data?.referenceId as string;

  const filterBy = async (statusLabel: string, statusParam: string) => {
    await essPage.goto('/web/index.php/claim/viewClaim');
    await essPage.locator('.oxd-select-text').nth(1).waitFor({ state: 'visible', timeout: 15_000 });
    await essPage.locator('.oxd-select-text').nth(1).click();
    await essPage.getByRole('option', { name: statusLabel, exact: true }).click();
    const listResp = essPage
      .waitForResponse((r) => r.url().includes('/api/v2/claim/requests?') && r.url().includes(`status=${statusParam}`), { timeout: 15_000 })
      .catch(() => null);
    await essPage.getByRole('button', { name: 'Search' }).click();
    return listResp;
  };

  report.step('[ESS UI] Filter Status = Submitted');
  const submittedResp = await filterBy('Submitted', 'SUBMITTED');
  report.check('[API] Request list membawa status=SUBMITTED', submittedResp !== null, `url=${submittedResp?.url()}`);
  report.check('Klaim muncul (reference id cocok)', await isVisibleWithWait(essPage.locator('.oxd-table-card').filter({ hasText: referenceId }).first(), 15_000), `referenceId=${referenceId}`);

  report.step('[ESS UI] Filter Status = Paid');
  const paidResp = await filterBy('Paid', 'PAID');
  const paidBody = await paidResp?.json().catch(() => null);
  report.check('[API] Hasil filter Paid kosong', (paidBody?.data ?? []).length === 0, `count=${(paidBody?.data ?? []).length}`);
  report.check('"No Records Found" tampil', await isVisibleWithWait(essPage.getByText('No Records Found').first(), 10_000));

  await close();
  report.print();
});
