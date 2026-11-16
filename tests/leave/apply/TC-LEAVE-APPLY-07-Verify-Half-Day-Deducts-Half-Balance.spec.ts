/**
 * ================================================================================
 * TC-LEAVE-APPLY-07 — Verify A Half-Day Leave Deducts Exactly 0.5 Day From The Balance
 * Modul    : Leave - Apply Leave (ESS)
 * Kategori : Positive (+) 1.1-C | Boundary (B) 3.2 | API (A) 6.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-APPLY-07-Verify-Half-Day-Deducts-Half-Balance.spec.ts
 * Path     : tests/leave/apply/
 * ================================================================================
 *
 * TUJUAN:
 *   Utk rentang 1 hari, form Apply Leave menampilkan dropdown "Duration" (Full Day, Half Day -
 *   Morning, Half Day - Afternoon, Specify Time -- confirmed live). ESS memilih "Half Day -
 *   Morning" lewat UI -> POST leave-requests dgn duration {type:"half_day_morning"} -> saldo
 *   10 menjadi 9.5 (bukan 9).
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/apply/TC-LEAVE-APPLY-07-Verify-Half-Day-Deducts-Half-Balance.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { ApplyLeavePage } from '../../../src/pages';
import { createEssLeaveRequest } from '../../../src/utils/createEssLeaveRequest';

test('TC-LEAVE-APPLY-07: a half-day leave applied via UI deducts exactly 0.5 day', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-LEAVE-APPLY-07', 'Half Day Deducts Half Balance', env.baseURL, page);

  report.step('Setup: ESS + entitlement 10 hari (tanpa request)');
  const { essPage, close, date } = await createEssLeaveRequest(page, browser, addEmployeePage, 'QaLvHalf', { apply: false, daysFromNow: 23 });
  const balance = async () => (await (await essPage.request.get('/web/index.php/api/v2/leave/leave-balance/leave-type/1')).json().catch(() => null))?.data?.balance?.balance;
  report.check('Saldo awal 10', (await balance()) === 10);

  report.step('[ESS UI] Apply Leave 1 hari, Duration = "Half Day - Morning"');
  const applyLeavePage = new ApplyLeavePage(essPage);
  await applyLeavePage.goto();
  await applyLeavePage.selectLeaveType('US - Vacation');
  const [yyyy, mm, dd] = date.split('-');
  await applyLeavePage.fillDateRange(`${yyyy}-${dd}-${mm}`, `${yyyy}-${dd}-${mm}`);
  await essPage.keyboard.press('Escape');
  const durationSelect = essPage.locator('.oxd-select-text').nth(1);
  await durationSelect.waitFor({ state: 'visible', timeout: 10_000 });
  await durationSelect.click();
  const options = await essPage.getByRole('option').allInnerTexts();
  report.check('Dropdown Duration berisi 4 opsi', ['Full Day', 'Half Day - Morning', 'Half Day - Afternoon', 'Specify Time'].every((o) => options.includes(o)), `options=${JSON.stringify(options)}`);
  await essPage.getByRole('option', { name: 'Half Day - Morning' }).click();
  const { response } = await applyLeavePage.submit();
  report.check('[API] Apply 200', response?.status() === 200, `status=${response?.status()}`);
  const sent = JSON.parse(response?.request().postData() ?? '{}');
  report.check('[API] Payload duration = half_day_morning', sent?.duration?.type === 'half_day_morning', `duration=${JSON.stringify(sent?.duration)}`);

  report.step('[ESS API] Saldo terpotong tepat 0.5 hari');
  report.check('Saldo menjadi 9.5', (await balance()) === 9.5, `balance=${await balance()}`);

  await close();
  report.print();
});
