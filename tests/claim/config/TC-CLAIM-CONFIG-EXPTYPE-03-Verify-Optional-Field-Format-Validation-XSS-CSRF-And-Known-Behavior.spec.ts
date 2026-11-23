/**
 * ================================================================================
 * TC-CLAIM-CONFIG-EXPTYPE-03 — Verify Optional Field, Format Validation, XSS, CSRF And Known Behavior
 * Modul    : Claim > Configuration > Expense Types (U073)
 * Kategori : Positive (+) 1.2 | Negative (-) 2.2 | Edge (!) 4.8 | Security (S)
 *            5.1-XSS-Stored 5.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-CONFIG-EXPTYPE-03-Verify-Optional-Field-Format-Validation-XSS-CSRF-And-Known-Behavior.spec.ts
 * Path     : tests/claim/config/
 * ================================================================================
 *
 * LATAR: menutup 5 kode GAP terakhir U073 (Configuration > Expense Types). Dibuktikan
 * LIVE 24 Nov 2026 via POST /api/v2/claim/expenses/types {name, description, status}:
 *   - description dikosongkan -> 200, field opsional (1.2).
 *   - status berupa string non-boolean ("abc") -> 422 ditolak (2.2).
 *   - name berisi payload XSS -> 200, tersimpan apa adanya di JSON (bukan di-strip
 *     server), lalu diverifikasi TIDAK tereksekusi saat ditampilkan di daftar Admin
 *     (5.1-XSS-Stored, pola sama dgn TC-CLAIM-CONFIG-EVENT-04 utk Events).
 *   - Origin palsu vs sendiri -> status identik (5.4).
 *   - [4.8] description kosong tersimpan sbg null, sama dgn Events -- konsisten,
 *     bukan bug.
 *
 * HASIL 24 Nov 2026: lolos penuh, tidak ada bug baru. MENUTUP U073 SEPENUHNYA.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/config/TC-CLAIM-CONFIG-EXPTYPE-03-Verify-Optional-Field-Format-Validation-XSS-CSRF-And-Known-Behavior.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

const API = '/web/index.php/api/v2/';

test('TC-CLAIM-CONFIG-EXPTYPE-03: optional field, format validation, XSS, CSRF, known behavior', async ({ page }, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-CLAIM-CONFIG-EXPTYPE-03', 'Optional Field Format Validation XSS CSRF Known Behavior', env.baseURL, page);
  await page.goto('/web/index.php/claim/viewExpense');

  report.step('1.2 / 4.8 Field description opsional, dikosongkan');
  const name = `QaExpOpt_${Date.now()}`;
  const noDesc = await page.request.post(`${API}claim/expenses/types`, { data: { name, status: true } });
  const noDescBody = await noDesc.json().catch(() => null);
  report.check('1.2 [U073] POST tanpa field description -> 200 (opsional)', noDesc.status() === 200, `status=${noDesc.status()}`);
  report.check('4.8 [U073] description yg tidak diisi tersimpan sbg null (bukan string kosong), konsisten dgn Events -- bukan bug', noDescBody?.data?.description === null, `description=${JSON.stringify(noDescBody?.data?.description)}`);

  report.step('2.2 Format invalid -- status bukan boolean');
  const badStatus = await page.request.post(`${API}claim/expenses/types`, { data: { name: `QaExpBadStatus_${Date.now()}`, description: 'x', status: 'abc' } });
  report.check('2.2 [U073] POST status="abc" (bukan boolean) -> 422 ditolak', badStatus.status() === 422, `status=${badStatus.status()}`);

  report.step('5.1-XSS-Stored Payload XSS di nama expense type');
  const stamp = Date.now();
  const payload = `<img src=x onerror="window.__claimExpXss=1">${stamp}`;
  const xssResp = await page.request.post(`${API}claim/expenses/types`, { data: { name: payload, description: '', status: true } });
  report.check('[API] Expense Type dgn payload XSS tersimpan 200', xssResp.status() === 200, `status=${xssResp.status()}`);
  await page.goto('/web/index.php/claim/viewExpense');
  const rows = page.locator('.oxd-table-card');
  report.check('5.1-XSS-Stored [U073] Teks payload tampil apa adanya di daftar Expense Types', await isVisibleWithWait(rows.filter({ hasText: String(stamp) }).first(), 15_000));
  report.check('5.1-XSS-Stored [U073] Payload TIDAK tereksekusi', (await page.evaluate(() => (window as unknown as { __claimExpXss?: number }).__claimExpXss)) === undefined);
  report.check('5.1-XSS-Stored [U073] Tidak ada <img src="x"> tersuntik', (await page.locator('img[src="x"]').count()) === 0);

  report.step('5.4 CSRF -- Origin aplikasi sendiri vs Origin palsu');
  const legit = await page.request.post(`${API}claim/expenses/types`, { data: { name: `QaExpCsrfLegit_${Date.now()}`, description: '', status: true } });
  const evil = await page.request.post(`${API}claim/expenses/types`, { data: { name: `QaExpCsrfEvil_${Date.now()}`, description: '', status: true }, headers: { Origin: 'https://evil.example' } });
  report.check('5.4 [U073] Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (konsisten dgn modul lain)', legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);

  report.print();
});
