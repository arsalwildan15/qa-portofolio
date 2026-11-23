/**
 * ================================================================================
 * TC-CLAIM-CONFIG-EVENT-05 — Verify Optional Field, Format Validation And Known Behavior
 * Modul    : Claim > Configuration > Events (U072)
 * Kategori : Positive (+) 1.2 | Negative (-) 2.2 | Edge (!) 4.8
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-CONFIG-EVENT-05-Verify-Optional-Field-Format-Validation-And-Known-Behavior.spec.ts
 * Path     : tests/claim/config/
 * ================================================================================
 *
 * LATAR: menutup 3 kode GAP terakhir U072 (Configuration > Events). Dibuktikan LIVE
 * 24 Nov 2026 via POST /api/v2/claim/events {name, description, status}:
 *   - description dikosongkan -> 200, field opsional (1.2).
 *   - status berupa string non-boolean ("abc") -> 422 ditolak (2.2).
 *   - [4.8] description yg dikosongkan tersimpan sbg null (bukan string kosong "") --
 *     behavior non-obvious yg konsisten di seluruh API OrangeHRM (bukan bug).
 *
 * HASIL 24 Nov 2026: lolos penuh, tidak ada bug baru. MENUTUP U072 SEPENUHNYA.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/config/TC-CLAIM-CONFIG-EVENT-05-Verify-Optional-Field-Format-Validation-And-Known-Behavior.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const API = '/web/index.php/api/v2/';

test('TC-CLAIM-CONFIG-EVENT-05: optional field, format validation, known behavior', async ({ page }, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-CLAIM-CONFIG-EVENT-05', 'Optional Field Format Validation Known Behavior', env.baseURL, page);
  await page.goto('/web/index.php/claim/viewEvents');

  report.step('1.2 / 4.8 Field description opsional, dikosongkan');
  const name = `QaEvtOpt_${Date.now()}`;
  const noDesc = await page.request.post(`${API}claim/events`, { data: { name, status: true } });
  const noDescBody = await noDesc.json().catch(() => null);
  report.check('1.2 [U072] POST tanpa field description -> 200 (opsional)', noDesc.status() === 200, `status=${noDesc.status()}`);
  report.check('4.8 [U072] description yg tidak diisi tersimpan sbg null (bukan string kosong) -- behavior non-obvious, konsisten di seluruh API, bukan bug', noDescBody?.data?.description === null, `description=${JSON.stringify(noDescBody?.data?.description)}`);

  report.step('2.2 Format invalid -- status bukan boolean');
  const badStatus = await page.request.post(`${API}claim/events`, { data: { name: `QaEvtBadStatus_${Date.now()}`, description: 'x', status: 'abc' } });
  report.check('2.2 [U072] POST status="abc" (bukan boolean) -> 422 ditolak', badStatus.status() === 422, `status=${badStatus.status()}`);

  report.print();
});
