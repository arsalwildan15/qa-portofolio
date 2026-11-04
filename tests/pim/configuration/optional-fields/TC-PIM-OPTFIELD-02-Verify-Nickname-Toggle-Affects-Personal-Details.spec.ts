/**
 * ================================================================================
 * TC-PIM-OPTFIELD-02: Verify Nickname Toggle Affects Personal Details
 * Modul    : PIM - Configuration - Optional Fields
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-OPTFIELD-02-Verify-Nickname-Toggle-Affects-Personal-Details.spec.ts
 * Path     : tests/pim/configuration/optional-fields/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi toggle "Show Nick Name, Smoker and Military Service in
 *   Personal Details" ON lalu Save sukses, dan mengamati efeknya di layar
 *   Personal Details (dicatat sebagai temuan karena TC-PIM-OPTFIELD-01
 *   sudah mendokumentasikan area Optional Fields tidak selalu konsisten
 *   persist di demo publik ini).
 *
 * CATATAN PENTING: toggle ini site-wide. Test ini membaca state live saat
 * ini sebelum toggle, dan MENGEMBALIKAN ke state tersebut di akhir.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/optional-fields/TC-PIM-OPTFIELD-02-Verify-Nickname-Toggle-Affects-Personal-Details.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { createTestEmployee } from '../../../../src/utils/createTestEmployee';

test('TC-PIM-OPTFIELD-02: toggling Nickname field ON affects Personal Details', async ({
  page,
  optionalFieldsPage,
  addEmployeePage,
  personalDetailsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-OPTFIELD-02', 'Nickname Toggle Affects Personal Details', env.baseURL, page);

  report.step('Baca state awal toggle Nick Name/Smoker/Military, pastikan ON lalu Save');
  await optionalFieldsPage.goto();
  await optionalFieldsPage.nickNameSmokerMilitaryToggle.waitFor({ state: 'visible' });
  const originalState = await optionalFieldsPage.isChecked(optionalFieldsPage.nickNameSmokerMilitaryToggle);
  if (!originalState) {
    await optionalFieldsPage.toggle(optionalFieldsPage.nickNameSmokerMilitaryToggle);
  }
  const [saveResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/optional-field') && r.request().method() === 'PUT',
      { timeout: 10_000 },
    ),
    optionalFieldsPage.save(),
  ]);
  report.check('[API] status === 200', saveResp.status() === 200, `status=${saveResp.status()}`);

  report.step('Buat employee baru, buka Personal Details-nya');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaOptField');
  await personalDetailsPage.goto(empNumber);
  await personalDetailsPage.waitUntilLoaded();

  report.step('Amati apakah field Nick Name muncul di Personal Details saat toggle ON');
  const nickNameLabel = page.getByText('Nick Name', { exact: true });
  const visible = await nickNameLabel.isVisible().catch(() => false);
  report.finding('Nick Name field visibility saat toggle ON', `visible=${visible}`);

  report.step('Restore ke state live awal supaya tidak mengganggu test lain (site-wide config)');
  await optionalFieldsPage.goto();
  await optionalFieldsPage.nickNameSmokerMilitaryToggle.waitFor({ state: 'visible' });
  const currentLiveState = await optionalFieldsPage.isChecked(optionalFieldsPage.nickNameSmokerMilitaryToggle);
  if (currentLiveState !== originalState) {
    await optionalFieldsPage.toggle(optionalFieldsPage.nickNameSmokerMilitaryToggle);
    await optionalFieldsPage.save();
  }

  report.print();
});
