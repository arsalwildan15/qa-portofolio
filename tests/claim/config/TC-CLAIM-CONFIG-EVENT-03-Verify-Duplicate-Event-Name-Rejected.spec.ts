/**
 * ================================================================================
 * TC-CLAIM-CONFIG-EVENT-03 — Verify A Duplicate Event Name Is Rejected (UI And API)
 * Modul    : Claim - Configuration - Events
 * Kategori : Negative (-) 2.3 | API (A) 6.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-CONFIG-EVENT-03-Verify-Duplicate-Event-Name-Rejected.spec.ts
 * Path     : tests/claim/config/
 * ================================================================================
 *
 * TUJUAN:
 *   Nama Event harus unik. Confirmed live: POST /api/v2/claim/events dgn nama yg sudah ada ->
 *   422 "Invalid Parameter" [name] (validasi DI SERVER, bukan cuma di form). Di UI, Save nama
 *   duplikat juga tidak boleh menghasilkan event kedua.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/config/TC-CLAIM-CONFIG-EVENT-03-Verify-Duplicate-Event-Name-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { ClaimEventsPage } from '../../../src/pages';

test('TC-CLAIM-CONFIG-EVENT-03: a duplicate event name is rejected by the server and the form', async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-CLAIM-CONFIG-EVENT-03', 'Duplicate Event Name Rejected', env.baseURL, page);
  const name = `QaEvDup ${Date.now()}`;

  report.step('[Admin API] Buat event, lalu POST lagi dgn nama yg sama');
  const first = await page.request.post('/web/index.php/api/v2/claim/events', { data: { name, description: '', status: true } });
  report.check('Event pertama 200', first.status() === 200, `status=${first.status()}`);
  const second = await page.request.post('/web/index.php/api/v2/claim/events', { data: { name, description: '', status: true } });
  const body = await second.json().catch(() => null);
  report.check('Event kedua (nama sama) ditolak 422', second.status() === 422, `status=${second.status()}`);
  report.check('invalidParamKeys menyebut "name"', (body?.error?.data?.invalidParamKeys ?? []).includes('name'), `body=${JSON.stringify(body)}`);

  report.step('[Admin UI] Add Event dgn nama yg sama');
  const eventsPage = new ClaimEventsPage(page);
  await eventsPage.gotoAdd();
  await eventsPage.eventNameInput.fill(name);
  const uiResp = await eventsPage.save();
  const dupMsg = await isVisibleWithWait(eventsPage.fieldErrors.filter({ hasText: /Already exists/i }), 10_000);
  report.check('Form menolak: pesan "Already exists" ATAU POST ditolak non-200', dupMsg || (uiResp !== null && uiResp.status() !== 200), `msg=${dupMsg}, status=${uiResp?.status()}`);

  report.step('[Admin API] Hanya ada SATU event dgn nama tsb');
  const list = await (await page.request.get('/web/index.php/api/v2/claim/events?limit=0')).json().catch(() => null);
  const count = ((list?.data ?? []) as Array<{ name: string }>).filter((e) => e.name === name).length;
  report.check('Jumlah event bernama sama = 1', count === 1, `count=${count}`);

  report.print();
});
