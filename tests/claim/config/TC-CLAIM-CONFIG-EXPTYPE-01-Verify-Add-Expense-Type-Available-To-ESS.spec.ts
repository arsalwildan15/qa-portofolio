/**
 * ================================================================================
 * TC-CLAIM-CONFIG-EXPTYPE-01 — Verify A New Expense Type Is Saved And Offered In The ESS Add Expense Dialog
 * Modul    : Claim - Configuration - Expense Types
 * Kategori : Positive (+) 1.1-C 1.4 | API (A) 6.1 -- Cross-Role
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-CONFIG-EXPTYPE-01-Verify-Add-Expense-Type-Available-To-ESS.spec.ts
 * Path     : tests/claim/config/
 * ================================================================================
 *
 * TUJUAN:
 *   Admin menambah Expense Type baru (claim/saveExpense: Name wajib, Description, toggle Active
 *   default ON) -> POST /api/v2/claim/expenses/types 200 (confirmed live), muncul di daftar
 *   Expense Types, DAN ditawarkan di dropdown "Expense Type" pada dialog Add Expense milik akun
 *   ESS (efek konfigurasi lintas role).
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/config/TC-CLAIM-CONFIG-EXPTYPE-01-Verify-Add-Expense-Type-Available-To-ESS.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { SubmitClaimPage } from '../../../src/pages';
import { createEssClaim } from '../../../src/utils/createEssClaim';

test('TC-CLAIM-CONFIG-EXPTYPE-01: a new expense type is saved and offered in the ESS Add Expense dialog', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-CLAIM-CONFIG-EXPTYPE-01', 'Add Expense Type Available To ESS', env.baseURL, page);
  const typeName = `QaExpType ${Date.now()}`;

  report.step('[Admin UI] Add Expense Type -> isi Name -> Save');
  await page.goto('/web/index.php/claim/saveExpense');
  const nameInput = page.locator('.oxd-input-group', { has: page.getByText('Name', { exact: true }) }).locator('input');
  await nameInput.waitFor({ state: 'visible', timeout: 15_000 });
  await nameInput.fill(typeName);
  const respPromise = page
    .waitForResponse((r) => /\/api\/v2\/claim\/expenses\/types$/.test(r.url()) && r.request().method() === 'POST', { timeout: 15_000 })
    .catch(() => null);
  await page.getByRole('button', { name: 'Save' }).click();
  const resp = await respPromise;
  const body = await resp?.json().catch(() => null);
  report.check('[API] POST expenses/types 200, Active', resp?.status() === 200 && body?.data?.status === true, `status=${resp?.status()}, data=${JSON.stringify(body?.data)}`);

  report.step('[Admin UI] Muncul di daftar Expense Types');
  await page.goto('/web/index.php/claim/viewExpense');
  report.check('Expense Type baru ada di daftar', await isVisibleWithWait(page.locator('.oxd-table-card').filter({ hasText: typeName }).first(), 15_000));

  report.step('[ESS UI] Dialog Add Expense pd klaim INITIATED menawarkan expense type baru');
  const { essPage, close, claimId } = await createEssClaim(page, browser, addEmployeePage, 'QaClmExpType', { submit: false });
  const submitClaimPage = new SubmitClaimPage(essPage);
  await submitClaimPage.gotoDetail(claimId);
  await submitClaimPage.addExpenseButton.click();
  const dialog = essPage.locator('.oxd-dialog-container, [role="dialog"]').last();
  await dialog.locator('.oxd-select-text').click();
  const option = essPage.getByRole('option', { name: typeName, exact: true });
  report.check('Expense Type baru ada di dropdown dialog ESS', await isVisibleWithWait(option, 10_000), `options=${JSON.stringify(await essPage.getByRole('option').allInnerTexts())}`);

  await close();
  report.print();
});
