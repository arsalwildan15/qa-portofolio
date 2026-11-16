/**
 * ================================================================================
 * TC-CLAIM-CONFIG-EXPTYPE-02 — Verify Duplicate Expense Type Names Are Blocked And Inactive Types Are Hidden From ESS
 * Modul    : Claim - Configuration - Expense Types
 * Kategori : Positive (+) 1.4 | Negative (-) 2.3 -- Business Rule
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-CONFIG-EXPTYPE-02-Verify-Duplicate-And-Inactive-Expense-Type.spec.ts
 * Path     : tests/claim/config/
 * ================================================================================
 *
 * TUJUAN:
 *   (1) Save Add Expense Type dgn nama yg SUDAH ada -> pesan "Already exists" (confirmed live)
 *       dan TIDAK ada POST terkirim.
 *   (2) Expense Type NON-aktif (dibuat via API status:false) TIDAK ditawarkan di dropdown dialog
 *       Add Expense milik ESS, sedangkan type aktif pembanding ditawarkan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/config/TC-CLAIM-CONFIG-EXPTYPE-02-Verify-Duplicate-And-Inactive-Expense-Type.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { SubmitClaimPage } from '../../../src/pages';
import { createEssClaim } from '../../../src/utils/createEssClaim';

test('TC-CLAIM-CONFIG-EXPTYPE-02: duplicate expense type names are blocked and inactive types are hidden from ESS', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-CLAIM-CONFIG-EXPTYPE-02', 'Duplicate And Inactive Expense Type', env.baseURL, page);
  const stamp = Date.now();
  const activeName = `QaExpOn ${stamp}`;
  const inactiveName = `QaExpOff ${stamp}`;

  report.step('[Admin API, setup] 1 expense type aktif + 1 NON-aktif');
  const on = await page.request.post('/web/index.php/api/v2/claim/expenses/types', { data: { name: activeName, description: '', status: true } });
  const off = await page.request.post('/web/index.php/api/v2/claim/expenses/types', { data: { name: inactiveName, description: '', status: false } });
  report.check('[API] Kedua expense type tersimpan', on.status() === 200 && off.status() === 200, `on=${on.status()}, off=${off.status()}`);

  report.step('[Admin UI] Add Expense Type dgn nama yg sudah ada');
  await page.goto('/web/index.php/claim/saveExpense');
  const nameInput = page.locator('.oxd-input-group', { has: page.getByText('Name', { exact: true }) }).locator('input');
  await nameInput.waitFor({ state: 'visible', timeout: 15_000 });
  let posted = false;
  page.on('request', (r) => { if (/\/api\/v2\/claim\/expenses\/types$/.test(r.url()) && r.method() === 'POST') posted = true; });
  await nameInput.fill(activeName);
  await page.getByRole('button', { name: 'Save' }).click();
  const dupError = page.locator('.oxd-input-field-error-message').filter({ hasText: 'Already exists' });
  report.check('Pesan "Already exists" muncul', await isVisibleWithWait(dupError, 10_000));
  report.check('TIDAK ada POST terkirim utk nama duplikat', !posted);

  report.step('[ESS UI] Dropdown Expense Type di dialog Add Expense');
  const { essPage, close, claimId } = await createEssClaim(page, browser, addEmployeePage, 'QaClmExpOff', { submit: false });
  const submitClaimPage = new SubmitClaimPage(essPage);
  await submitClaimPage.gotoDetail(claimId);
  await submitClaimPage.addExpenseButton.click();
  const dialog = essPage.locator('.oxd-dialog-container, [role="dialog"]').last();
  await dialog.locator('.oxd-select-text').click();
  report.check('Expense type aktif ditawarkan', await isVisibleWithWait(essPage.getByRole('option', { name: activeName, exact: true }), 10_000));
  const options = await essPage.getByRole('option').allInnerTexts();
  report.check('Expense type NON-aktif TIDAK ditawarkan', !options.includes(inactiveName), `options=${JSON.stringify(options)}`);

  await close();
  report.print();
});
