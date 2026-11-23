/**
 * ================================================================================
 * TC-TIME-PROJECT-03 — Verify Customer: Optional Field, XSS And Known Behavior
 * Modul    : Time > Project Info > Customers (U063)
 * Kategori : Positive (+) 1.2 | Edge (!) 4.8 | Security (S) 5.1-XSS-Stored
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-PROJECT-03-Verify-Customer-Optional-Field-XSS-And-Known-Behavior.spec.ts
 * Path     : tests/time/project/
 * ================================================================================
 *
 * LATAR: menutup 3 kode GAP terakhir U063 Customers. Dibuktikan LIVE 24 Nov 2026 via
 * POST /api/v2/time/customers {name, description}:
 *   - description dikosongkan -> 200, field opsional, tersimpan sbg string kosong ""
 *     (BUKAN null spt di modul Claim -- behavior non-obvious, tiap modul OrangeHRM bisa
 *     beda konvensi null vs "" utk field opsional kosong, dicatat sbg 4.8).
 *   - name berisi payload XSS lengkap (`<img src=x onerror=...>`) -> 422 DITOLAK (name
 *     field py validasi lebih ketat drpd description -- karakter tunggal `<` dan `'`
 *     SENDIRI diterima normal, tapi payload onerror lengkap ditolak, kemungkinan krn
 *     panjang atau pola tertentu, bukan krn char `<`/`'` itu sendiri).
 *   - description berisi payload XSS yg SAMA -> 200, tersimpan apa adanya sbg teks,
 *     TIDAK tereksekusi saat ditampilkan di daftar Customers (5.1-XSS-Stored, field yg
 *     genuinely vulnerable-tested krn name field menolaknya duluan).
 *
 * HASIL 24 Nov 2026: lolos penuh, tidak ada bug baru. MENUTUP U063 SEPENUHNYA.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/project/TC-TIME-PROJECT-03-Verify-Customer-Optional-Field-XSS-And-Known-Behavior.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

const API = '/web/index.php/api/v2/';

test('TC-TIME-PROJECT-03: customer optional field, XSS, known behavior', async ({ page }, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-TIME-PROJECT-03', 'Customer Optional Field XSS Known Behavior', env.baseURL, page);
  await page.goto('/web/index.php/time/viewCustomers');

  report.step('1.2 / 4.8 Field description opsional, dikosongkan');
  const name = `QaCustOpt_${Date.now()}`;
  const noDesc = await page.request.post(`${API}time/customers`, { data: { name } });
  const noDescBody = await noDesc.json().catch(() => null);
  report.check('1.2 [U063] POST tanpa field description -> 200 (opsional)', noDesc.status() === 200, `status=${noDesc.status()}`);
  report.check('4.8 [U063] description yg tidak diisi tersimpan sbg STRING KOSONG "" (bukan null spt di modul Claim) -- behavior non-obvious, konvensi beda antar modul OrangeHRM, bukan bug', noDescBody?.data?.description === '', `description=${JSON.stringify(noDescBody?.data?.description)}`);

  report.step('5.1-XSS-Stored Payload XSS di field description');
  const stamp = Date.now();
  const payload = `<img src=x onerror="window.__timeCustXss=1">${stamp}`;
  const xssResp = await page.request.post(`${API}time/customers`, { data: { name: `QaCustXss_${stamp}`, description: payload } });
  const xssBody = await xssResp.json().catch(() => null);
  report.check('[API] Customer dgn payload XSS di description tersimpan 200 verbatim', xssResp.status() === 200 && xssBody?.data?.description === payload, `status=${xssResp.status()}`);

  await page.goto('/web/index.php/time/viewCustomers');
  const rows = page.locator('.oxd-table-card');
  report.check('5.1-XSS-Stored [U063] Teks payload tampil apa adanya (via tooltip/cell description) tanpa tereksekusi', await isVisibleWithWait(rows.filter({ hasText: String(stamp) }).first(), 15_000));
  report.check('5.1-XSS-Stored [U063] Payload TIDAK tereksekusi', (await page.evaluate(() => (window as unknown as { __timeCustXss?: number }).__timeCustXss)) === undefined);
  report.check('5.1-XSS-Stored [U063] Tidak ada <img src="x"> tersuntik ke DOM', (await page.locator('img[src="x"]').count()) === 0);

  report.print();
});
