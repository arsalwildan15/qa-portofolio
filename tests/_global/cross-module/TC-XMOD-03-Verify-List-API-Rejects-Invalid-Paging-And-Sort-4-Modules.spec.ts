/**
 * ================================================================================
 * TC-XMOD-03 — Verify List APIs Reject Invalid Paging And Sort Parameters Cleanly (4 Modules)
 * Modul    : Lintas modul (Leave / Claim / Performance / Time) - API
 * Kategori : Boundary (B) 3.5 | API (A) 6.6
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-XMOD-03-Verify-List-API-Rejects-Invalid-Paging-And-Sort-4-Modules.spec.ts
 * Path     : tests/_global/cross-module/
 * ================================================================================
 *
 * TUJUAN:
 *   Endpoint list tiap modul menerima limit/offset/sortField/sortOrder dari query string.
 *   Nilai invalid (limit negatif / non-angka, offset negatif, sortField tak dikenal termasuk
 *   payload SQL "1;DROP TABLE x", sortOrder selain ASC/DESC) harus ditolak 422 dgn
 *   invalidParamKeys yg tepat -- bukan 500 dan bukan diam-diam diabaikan. limit sangat besar
 *   (100000) boleh 200 asal tidak 5xx. Confirmed live 15 Nov 2026 di keempat modul.
 *
 * RUN COMMAND:
 *   npx playwright test tests/_global/cross-module/TC-XMOD-03-Verify-List-API-Rejects-Invalid-Paging-And-Sort-4-Modules.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const LISTS: Array<[string, string]> = [
  ['Leave', '/web/index.php/api/v2/leave/employees/leave-requests'],
  ['Claim', '/web/index.php/api/v2/claim/employees/requests'],
  ['Performance', '/web/index.php/api/v2/performance/kpis'],
  ['Time', '/web/index.php/api/v2/time/projects'],
];

const INVALID: Array<[string, string]> = [
  ['limit=-1&offset=0', 'limit'],
  ['limit=abc&offset=0', 'limit'],
  ['limit=50&offset=-5', 'offset'],
  ['limit=50&offset=0&sortField=xyz&sortOrder=ASC', 'sortField'],
  [`limit=50&offset=0&sortField=${encodeURIComponent('1;DROP TABLE x')}&sortOrder=ASC`, 'sortField'],
  ['limit=50&offset=0&sortOrder=SIDEWAYS', 'sortOrder'],
];

test('TC-XMOD-03: list APIs reject invalid paging and sort parameters cleanly in 4 modules', async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-XMOD-03', 'List API Invalid Paging And Sort', env.baseURL, page);

  for (const [module, url] of LISTS) {
    report.step(`[${module}] ${url}`);
    const ok = await page.request.get(`${url}?limit=50&offset=0`);
    report.check(`[${module}] Kontrol: parameter valid -> 200`, ok.status() === 200, `status=${ok.status()}`);
    for (const [query, key] of INVALID) {
      const r = await page.request.get(`${url}?${query}`);
      const keys = ((await r.json().catch(() => null))?.error?.data?.invalidParamKeys ?? []) as string[];
      report.check(`[${module}] ${decodeURIComponent(query)} -> 422 [${key}]`, r.status() === 422 && keys.includes(key), `status=${r.status()}, keys=${JSON.stringify(keys)}`);
    }
    const big = await page.request.get(`${url}?limit=100000&offset=0`);
    report.check(`[${module}] limit=100000 -> bukan 5xx`, big.status() < 500, `status=${big.status()}`);
  }

  report.print();
});
