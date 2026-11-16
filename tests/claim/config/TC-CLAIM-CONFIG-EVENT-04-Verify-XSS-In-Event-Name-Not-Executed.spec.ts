/**
 * ================================================================================
 * TC-CLAIM-CONFIG-EVENT-04 — Verify An XSS Payload In An Event Name Is Rendered As Text Everywhere
 * Modul    : Claim - Configuration - Events
 * Kategori : Security (S) 5.1-XSS-Stored -- Stored XSS
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-CONFIG-EVENT-04-Verify-XSS-In-Event-Name-Not-Executed.spec.ts
 * Path     : tests/claim/config/
 * ================================================================================
 *
 * TUJUAN:
 *   Nama Event dibuat Admin tapi DITAMPILKAN ke semua karyawan (dropdown Submit Claim ESS) --
 *   stored XSS di sini berdampak lintas role. Payload `<img src=x onerror=...>` disimpan
 *   (confirmed live: 200, tersimpan apa adanya), lalu diverifikasi TIDAK tereksekusi di daftar
 *   Events (Admin) maupun di dropdown Event form Submit Claim (ESS).
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/config/TC-CLAIM-CONFIG-EVENT-04-Verify-XSS-In-Event-Name-Not-Executed.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { ClaimEventsPage, SubmitClaimPage } from '../../../src/pages';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { loginAs } from '../../../src/utils/loginAs';

test('TC-CLAIM-CONFIG-EVENT-04: an XSS payload in an event name is rendered as text for Admin and ESS', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-CLAIM-CONFIG-EVENT-04', 'XSS In Event Name Not Executed', env.baseURL, page);
  const stamp = Date.now();
  const payload = `<img src=x onerror="window.__claimXss=1">${stamp}`;

  report.step('[Admin API] Buat event dgn payload XSS di nama');
  const resp = await page.request.post('/web/index.php/api/v2/claim/events', { data: { name: payload, description: '', status: true } });
  report.check('[API] Event tersimpan 200', resp.status() === 200, `status=${resp.status()}`);

  report.step('[Admin UI] Daftar Events');
  const eventsPage = new ClaimEventsPage(page);
  await eventsPage.goto();
  report.check('Teks payload tampil apa adanya di daftar', await isVisibleWithWait(eventsPage.tableRows.filter({ hasText: String(stamp) }).first(), 15_000));
  report.check('Payload TIDAK tereksekusi (Admin)', (await page.evaluate(() => (window as unknown as { __claimXss?: number }).__claimXss)) === undefined);
  report.check('Tidak ada <img src="x"> tersuntik (Admin)', (await page.locator('img[src="x"]').count()) === 0);

  report.step('[ESS UI] Dropdown Event di Submit Claim');
  const ess = await createEssAccount(page, addEmployeePage, 'QaClmXss');
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);
  const submitClaimPage = new SubmitClaimPage(essPage);
  await submitClaimPage.goto();
  await submitClaimPage.eventSelect.click();
  report.check('Opsi event berisi payload tampil sbg teks', await isVisibleWithWait(essPage.getByRole('option').filter({ hasText: String(stamp) }), 10_000));
  report.check('Payload TIDAK tereksekusi (ESS)', (await essPage.evaluate(() => (window as unknown as { __claimXss?: number }).__claimXss)) === undefined);
  report.check('Tidak ada <img src="x"> tersuntik (ESS)', (await essPage.locator('img[src="x"]').count()) === 0);

  await close();
  report.print();
});
