/**
 * ================================================================================
 * TC-CLAIM-CONFIG-EVENT-01 — Verify A New Active Event Is Saved And Offered To ESS Employees
 * Modul    : Claim - Configuration - Events
 * Kategori : Positive (+) 1.1-C 1.4 1.5 | API (A) 6.1 -- Cross-Role
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-CONFIG-EVENT-01-Verify-Add-Event-Available-To-ESS.spec.ts
 * Path     : tests/claim/config/
 * ================================================================================
 *
 * TUJUAN:
 *   Admin menambah Event baru (Active, default) -> POST claim/events 200, muncul di daftar
 *   Events, DAN benar2 muncul di dropdown Event pd form Submit Claim milik akun ESS (efek
 *   konfigurasi lintas role, bukan cuma tersimpan).
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/config/TC-CLAIM-CONFIG-EVENT-01-Verify-Add-Event-Available-To-ESS.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { ClaimEventsPage, SubmitClaimPage } from '../../../src/pages';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { loginAs } from '../../../src/utils/loginAs';

test('TC-CLAIM-CONFIG-EVENT-01: a new active event is saved and offered in the ESS Submit Claim dropdown', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-CLAIM-CONFIG-EVENT-01', 'Add Event Available To ESS', env.baseURL, page);
  const eventsPage = new ClaimEventsPage(page);
  const eventName = `QaEvent ${Date.now()}`;

  report.step('[Admin] Add Event (Active default) -> Save');
  await eventsPage.gotoAdd();
  await eventsPage.eventNameInput.fill(eventName);
  const resp = await eventsPage.save();
  const body = await resp?.json().catch(() => null);
  report.check('[API] POST claim/events 200', resp?.status() === 200, `status=${resp?.status()}`);
  report.check('[API] Event tersimpan Active (status=true)', body?.data?.status === true && body?.data?.name === eventName, `data=${JSON.stringify(body?.data)}`);

  report.step('[Admin] Event muncul di daftar Events');
  await eventsPage.goto();
  const inList = await isVisibleWithWait(eventsPage.tableRows.filter({ hasText: eventName }).first(), 10_000);
  report.check('Event baru ada di daftar', inList);

  report.step('[ESS] Event baru tersedia di dropdown Submit Claim');
  const ess = await createEssAccount(page, addEmployeePage, 'QaClmEvt');
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);
  const submitClaimPage = new SubmitClaimPage(essPage);
  await submitClaimPage.goto();
  await submitClaimPage.eventSelect.click();
  const options = await essPage.getByRole('option').allInnerTexts();
  report.check('Event baru muncul di dropdown Event ESS', options.includes(eventName), `options=${JSON.stringify(options)}`);

  await close();
  report.print();
});
