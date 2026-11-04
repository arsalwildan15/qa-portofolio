/**
 * ================================================================================
 * TC-PIM-OPTFIELD-03: Verify Double Toggle Before Save Is Idempotent
 * Modul    : PIM - Configuration - Optional Fields
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-OPTFIELD-03-Verify-Double-Toggle-Before-Save-Is-Idempotent.spec.ts
 * Path     : tests/pim/configuration/optional-fields/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi toggle US Tax Exemptions dua kali berturut-turut
 *   (ON lalu OFF) sebelum Save menghasilkan state akhir yang sama dengan
 *   state awal (net no-op), dan Save tetap sukses mengirim PUT.
 *
 *   Test ini sengaja TIDAK reload/cek persist (area itu sudah terbukti
 *   flaky, lihat TC-PIM-OPTFIELD-01) dan secara desain self-restoring,
 *   jadi tidak butuh langkah restore terpisah di akhir.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/optional-fields/TC-PIM-OPTFIELD-03-Verify-Double-Toggle-Before-Save-Is-Idempotent.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

test('TC-PIM-OPTFIELD-03: double toggle before save is a net no-op', async ({
  page,
  optionalFieldsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-OPTFIELD-03', 'Double Toggle Before Save Is Idempotent', env.baseURL, page);

  report.step('Baca state awal toggle US Tax Exemptions');
  await optionalFieldsPage.goto();
  await optionalFieldsPage.usTaxExemptionsToggle.waitFor({ state: 'visible' });
  const originalState = await optionalFieldsPage.isChecked(optionalFieldsPage.usTaxExemptionsToggle);

  report.step('Toggle dua kali berturut-turut (ON lalu OFF, atau sebaliknya)');
  await optionalFieldsPage.toggle(optionalFieldsPage.usTaxExemptionsToggle);
  await optionalFieldsPage.toggle(optionalFieldsPage.usTaxExemptionsToggle);
  const afterDoubleToggle = await optionalFieldsPage.isChecked(optionalFieldsPage.usTaxExemptionsToggle);
  report.check('State kembali ke awal setelah toggle 2x (net no-op)', afterDoubleToggle === originalState, `awal=${originalState}, setelah 2x toggle=${afterDoubleToggle}`);

  report.step('Klik Save, verify PUT tetap sukses meski tidak ada perubahan net');
  const [saveResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/optional-field') && r.request().method() === 'PUT',
      { timeout: 10_000 },
    ),
    optionalFieldsPage.save(),
  ]);
  report.check('[API] status === 200', saveResp.status() === 200, `status=${saveResp.status()}`);

  report.print();
});
