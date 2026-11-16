/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-03 — Verify Adding An Expense Line Item To A Claim Succeeds
 * Modul    : Claim - Assign Claim (Expense detail)
 * Kategori : Positive (+) 1.1-C 1.4 | API (A) 6.1 6.2
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-03-Verify-Add-Expense-Line-Item.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi admin bisa menambahkan baris expense (Expense Type + Date +
 *   Amount + Note) ke sebuah claim request yg baru dibuat, dan baris tsb
 *   muncul di tabel Expenses pada halaman detail claim dgn Total Amount yg
 *   ikut terupdate.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-03-Verify-Add-Expense-Line-Item.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';

test('TC-CLAIM-ASSIGN-03: adding an expense line item to a claim succeeds and totals update', async ({
  page,
  assignClaimPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-03', 'Add Expense Line Item', env.baseURL, page);

  report.step('Buat claim baru, lalu buka halaman detail-nya');
  const target = await pickLightlyUsedEmployee(page);
  await assignClaimPage.goto();
  await assignClaimPage.selectEmployee(target.employeeId);
  await assignClaimPage.selectEvent('Travel Allowance');
  await assignClaimPage.selectCurrencyByIndex(1);
  const createResp = await assignClaimPage.create();
  const createBody = await createResp?.json().catch(() => null);
  const claimId = createBody?.data?.id;
  report.check('[API] Claim baru berhasil dibuat (status 200)', createResp?.status() === 200, `claimId=${claimId}`);
  await assignClaimPage.gotoDetail(claimId);

  report.step('Tambahkan 1 baris Expense: Accommodation, amount 500, note "Taxi receipt"');
  const expenseResp = await assignClaimPage.addExpense('Accommodation', '2026-30-11', '500', 'Taxi receipt');
  const expenseBody = await expenseResp?.json().catch(() => null);
  report.check('[API] POST expenses status === 200', expenseResp?.status() === 200, `status=${expenseResp?.status()}`);
  report.check('[API] Response menunjukkan amount === 500', Number(expenseBody?.data?.amount) === 500, `amount=${expenseBody?.data?.amount}`);

  report.step('Verify: baris expense muncul di tabel, Total Amount ikut terupdate ke 500.00');
  // [BUG SCRIPT, diperbaiki] page.goto() ke URL yg SAMA adalah no-op di SPA ini (router tidak
  // re-fetch kalau route tidak berubah) -- dikonfirmasi live via probe: body text tepat
  // setelah save() masih menunjukkan toast "Successfully Saved" tapi tabel Expenses belum
  // sempat di-refresh client-side. Dibutuhkan page.reload() (full reload), bukan goto() lagi,
  // utk melihat data Expenses yg sudah benar2 tersimpan di server.
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_000);
  const bodyText = await page.locator('body').innerText();
  report.check('Baris expense "Accommodation" muncul di tabel', bodyText.includes('Accommodation') && bodyText.includes('500'));
  report.check('Total Amount terupdate ke 500.00 (bukan lagi 0.00)', /Total Amount.*?:\s*500\.00/.test(bodyText), bodyText.match(/Total Amount[^\n]*/)?.[0]);

  report.print();
});
