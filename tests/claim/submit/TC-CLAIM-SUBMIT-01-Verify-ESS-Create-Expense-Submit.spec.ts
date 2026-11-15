/**
 * ================================================================================
 * TC-CLAIM-SUBMIT-01 — Verify An ESS Employee Can Create A Claim, Add An Expense, And Submit It
 * Modul    : Claim - Submit Claim (ESS)
 * Kategori : Positive (+) / Cross-Role
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-SUBMIT-01-Verify-ESS-Create-Expense-Submit.spec.ts
 * Path     : tests/claim/submit/
 * ================================================================================
 *
 * TUJUAN:
 *   Alur inti sisi karyawan (lewat UI, akun ESS sungguhan dari infra Fase 1): Submit Claim ->
 *   pilih Event + Currency -> Create (status INITIATED) -> Add Expense -> Submit (status
 *   SUBMITTED). Lalu cek pembagian hak: ESS hanya boleh CANCEL klaim submitted miliknya,
 *   sedangkan Admin mendapat APPROVE + REJECT (confirmed live).
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/submit/TC-CLAIM-SUBMIT-01-Verify-ESS-Create-Expense-Submit.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { SubmitClaimPage } from '../../../src/pages';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { loginAs } from '../../../src/utils/loginAs';

test('TC-CLAIM-SUBMIT-01: an ESS employee creates a claim, adds an expense and submits it', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-CLAIM-SUBMIT-01', 'ESS Create Expense Submit', env.baseURL, page);

  report.step('Setup: akun ESS baru, login di sesi terpisah');
  const ess = await createEssAccount(page, addEmployeePage, 'QaClmSub');
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);
  const submitClaimPage = new SubmitClaimPage(essPage);

  report.step('[ESS] Submit Claim: pilih Event + Currency -> Create');
  await submitClaimPage.goto();
  await submitClaimPage.selectEvent('Accommodation');
  await submitClaimPage.selectCurrencyByIndex(1);
  const createResp = await submitClaimPage.create();
  const created = await createResp?.json().catch(() => null);
  const claimId = created?.data?.id as number | undefined;
  report.check('[API] Create claim 200', createResp?.status() === 200, `status=${createResp?.status()}`);
  report.check('[API] Status awal INITIATED', created?.data?.status === 'INITIATED', `status=${created?.data?.status}`);

  if (claimId) {
    report.step('[ESS] Add Expense (Accommodation, 150.50)');
    await submitClaimPage.gotoDetail(claimId);
    const expResp = await submitClaimPage.addExpense('Accommodation', '2026-07-07', '150.50', 'Hotel 1 malam');
    report.check('[API] Add expense 200', expResp?.status() === 200, `status=${expResp?.status()}`);
    const expenses = await (await essPage.request.get(`/web/index.php/api/v2/claim/requests/${claimId}/expenses`)).json().catch(() => null);
    report.check('[API] Total amount = 150.5', expenses?.meta?.totalAmount === 150.5, `totalAmount=${expenses?.meta?.totalAmount}`);

    report.step('[ESS] Submit');
    const submitResp = await submitClaimPage.clickAction('Submit');
    const submitted = await submitResp?.json().catch(() => null);
    report.check('[API] Submit 200 -> status SUBMITTED', submitResp?.status() === 200 && submitted?.data?.status === 'SUBMITTED', `status=${submitResp?.status()}, claim=${submitted?.data?.status}`);

    report.step('[API] Pembagian hak: ESS hanya CANCEL, Admin APPROVE + REJECT');
    const essView = await (await essPage.request.get(`/web/index.php/api/v2/claim/requests/${claimId}`)).json().catch(() => null);
    const essActions = ((essView?.meta?.allowedActions ?? []) as Array<{ action: string }>).map((a) => a.action).sort();
    report.check('ESS allowedActions = [CANCEL]', JSON.stringify(essActions) === '["CANCEL"]', `actions=${JSON.stringify(essActions)}`);
    const adminView = await (await page.request.get(`/web/index.php/api/v2/claim/employees/${ess.empNumber}/requests/${claimId}`)).json().catch(() => null);
    const adminActions = ((adminView?.meta?.allowedActions ?? []) as Array<{ action: string }>).map((a) => a.action).sort();
    report.check('Admin allowedActions = [APPROVE, REJECT]', JSON.stringify(adminActions) === '["APPROVE","REJECT"]', `actions=${JSON.stringify(adminActions)}`);
  } else {
    report.check('[SETUP GAGAL] claimId tidak didapat', false);
  }

  await close();
  report.print();
});
