/**
 * ================================================================================
 * TC-CLAIM-CONFIG-EVENT-02 — Verify Event Name Is Required And Inactive Events Are Not Offered
 * Modul    : Claim - Configuration - Events
 * Kategori : Positive (+) 1.4 | Negative (-) 2.1 -- Business Rule
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-CONFIG-EVENT-02-Verify-Required-And-Inactive-Event-Hidden.spec.ts
 * Path     : tests/claim/config/
 * ================================================================================
 *
 * TUJUAN:
 *   (1) Save form Add Event kosong ditolak client-side ("Required"), tidak ada POST.
 *   (2) Event yg dibuat dgn status NON-aktif TIDAK boleh ditawarkan di dropdown Event form
 *       Submit Claim milik ESS (event aktif pembanding tetap muncul).
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/config/TC-CLAIM-CONFIG-EVENT-02-Verify-Required-And-Inactive-Event-Hidden.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { ClaimEventsPage, SubmitClaimPage } from '../../../src/pages';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { loginAs } from '../../../src/utils/loginAs';

test('TC-CLAIM-CONFIG-EVENT-02: Event Name is required and inactive events are not offered to ESS', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-CLAIM-CONFIG-EVENT-02', 'Required And Inactive Event Hidden', env.baseURL, page);
  const eventsPage = new ClaimEventsPage(page);

  report.step('[Admin] Save form Add Event kosong');
  await eventsPage.gotoAdd();
  const emptyResp = await eventsPage.save();
  report.check('TIDAK ada POST terkirim', emptyResp === null, `status=${emptyResp?.status()}`);
  const required = await eventsPage.fieldErrors.allInnerTexts();
  report.check('Pesan "Required" muncul', required.includes('Required'), `errors=${JSON.stringify(required)}`);

  report.step('[Admin API, setup] Buat 1 event NON-aktif + 1 event aktif pembanding');
  const stamp = Date.now();
  const inactiveName = `QaEventOff ${stamp}`;
  const activeName = `QaEventOn ${stamp}`;
  const off = await page.request.post('/web/index.php/api/v2/claim/events', { data: { name: inactiveName, description: '', status: false } });
  const on = await page.request.post('/web/index.php/api/v2/claim/events', { data: { name: activeName, description: '', status: true } });
  report.check('[API] Kedua event tersimpan', off.status() === 200 && on.status() === 200, `off=${off.status()}, on=${on.status()}`);

  report.step('[ESS] Dropdown Event di Submit Claim');
  const ess = await createEssAccount(page, addEmployeePage, 'QaClmEvt2');
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);
  const submitClaimPage = new SubmitClaimPage(essPage);
  await submitClaimPage.goto();
  await submitClaimPage.eventSelect.click();
  const options = await essPage.getByRole('option').allInnerTexts();
  report.check('Event NON-aktif TIDAK ditawarkan', !options.includes(inactiveName), `options=${JSON.stringify(options)}`);
  report.check('Event aktif pembanding ditawarkan', options.includes(activeName), `options=${JSON.stringify(options)}`);

  await close();
  report.print();
});
