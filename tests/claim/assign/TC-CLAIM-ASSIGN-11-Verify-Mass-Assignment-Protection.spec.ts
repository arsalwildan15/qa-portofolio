/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-11 — Verify Mass Assignment Protection On Create Claim Request
 * Modul    : Claim - API Access Control
 * Kategori : Security (S) 5.2 - Mass Assignment
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-11-Verify-Mass-Assignment-Protection.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi server MENOLAK field tak terduga ("status": "APPROVED", "id": 99999) yg
 *   dikirim bersamaan dgn field valid (claimEventId, currencyId) pada POST create claim --
 *   mencoba memaksa status awal langsung jadi APPROVED (bypass INITIATED) atau memaksa ID
 *   tertentu. Server HARUS menolak SELURUH request (bukan diam2 mengabaikan field asing dan
 *   tetap sukses dgn field valid saja), krn itu bukti whitelist validation yg benar2 ketat.
 *
 * [TEMUAN POSITIF, dikonfirmasi live] Server menolak dgn 422 "Invalid Parameter" dan secara
 * eksplisit menyebutkan key mana yg invalid (`invalidParamKeys: ["status","id"]`) -- bukti
 * validasi DTO/whitelist yg ketat, bukan cuma mengabaikan field asing secara diam2. Ini
 * perilaku AMAN, tidak ada mass assignment vulnerability di endpoint ini.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-11-Verify-Mass-Assignment-Protection.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';

test('TC-CLAIM-ASSIGN-11: POST create claim with unexpected fields (status, id) is rejected entirely, not silently ignored', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-11', 'Mass Assignment Protection', env.baseURL, page);

  report.step('Baseline: POST create claim dgn payload valid (claimEventId + currencyId) -- harus sukses');
  const target = await pickLightlyUsedEmployee(page);
  const baseline = await page.request.post(`/web/index.php/api/v2/claim/employees/${target.empNumber}/requests`, {
    data: { claimEventId: 3, currencyId: 'AFN' },
  });
  report.check('[API] Baseline payload valid berhasil (200)', baseline.status() === 200, `status=${baseline.status()}`);

  report.step('POST create claim dgn payload valid + field asing ("status":"APPROVED","id":99999)');
  const resp = await page.request.post(`/web/index.php/api/v2/claim/employees/${target.empNumber}/requests`, {
    data: { claimEventId: 3, currencyId: 'AFN', status: 'APPROVED', id: 99999 },
  });
  const body = await resp.json().catch(() => null);
  report.check(
    '[API] SELURUH request ditolak (422) saat ada field asing -- bukan diam2 sukses dgn field valid saja',
    resp.status() === 422,
    `status=${resp.status()}`,
  );
  report.check(
    '[API] Response secara eksplisit menyebutkan "status" & "id" sbg invalidParamKeys',
    (body?.error?.data?.invalidParamKeys ?? []).includes('status') && body?.error?.data?.invalidParamKeys?.includes('id'),
    `invalidParamKeys=${JSON.stringify(body?.error?.data?.invalidParamKeys)}`,
  );

  report.finding(
    'Mass Assignment: TIDAK ditemukan kerentanan -- validasi whitelist ketat',
    'Endpoint create claim request menolak SELURUH request (422) saat ada field tak terduga, bukan mengabaikannya secara diam2. Perilaku aman, bukti negatif yg didokumentasikan sesuai taksonomi 5.2.',
  );

  report.print();
});
