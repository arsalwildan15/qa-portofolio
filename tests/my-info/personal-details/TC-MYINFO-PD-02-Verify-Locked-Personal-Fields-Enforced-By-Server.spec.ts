/**
 * ================================================================================
 * TC-MYINFO-PD-02 — Verify Personal Fields Locked For Employees Cannot Be Changed Through The API
 * Modul    : My Info - Personal Details (ESS)
 * Kategori : Security (S) 5.2-PrivEsc 5.2-MassAssign | Negative (-) 2.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-PD-02-Verify-Locked-Personal-Fields-Enforced-By-Server.spec.ts
 * Path     : tests/my-info/personal-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Di My Info, Employee Id, Driver's License Number dan Date of Birth DISABLED utk karyawan
 *   (TC-MYINFO-PD-01): hanya Admin yg boleh mengubahnya. Kunci yg hanya ada di UI tidak cukup --
 *   server harus menolak atau mengabaikan nilai baru utk field tsb bila dikirim oleh sesi ESS.
 *   Langkah: rekam body PUT personal-details yg dikirim tombol Save milik ESS sendiri, lalu kirim
 *   ulang body yg sama dgn SATU field terkunci diubah per percobaan. Lolos bila tiap percobaan
 *   ditolak (4xx) ATAU nilai tersimpan tetap nilai lama (dibaca Admin).
 *   Kontrol: field yg memang boleh (Other Id) tetap bisa diubah lewat jalur yg sama.
 *   Confirmed live 16 Nov 2026: ketiganya DITERIMA 200 & TERSIMPAN -> BUG. TC sengaja FAILED.
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/personal-details/TC-MYINFO-PD-02-Verify-Locked-Personal-Fields-Enforced-By-Server.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { PersonalDetailsPage } from '../../../src/pages';
import { newEssSession, openMyInfoFromMenu, nextResponse } from '../../../src/utils/myInfo';

test('TC-MYINFO-PD-02: personal fields locked for employees cannot be changed through the API', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-PD-02', 'Locked Personal Fields Enforced By Server', env.baseURL, page);

  report.step('Setup: akun ESS sungguhan, buka My Info');
  const { essPage, close } = await newEssSession(page, browser, addEmployeePage, 'QaMyInfoLock');
  const empNumber = await openMyInfoFromMenu(essPage);
  const api = `/web/index.php/api/v2/pim/employees/${empNumber}/personal-details`;
  const pd = new PersonalDetailsPage(essPage);
  await pd.firstNameInput.waitFor({ state: 'visible', timeout: 15_000 });
  await essPage.waitForLoadState('networkidle').catch(() => {});

  report.step('[ESS UI] Save normal utk merekam bentuk body PUT yg dikirim aplikasi');
  const put = nextResponse(essPage, `/pim/employees/${empNumber}/personal-details`, 'PUT');
  await pd.save();
  const uiResp = await put;
  const uiBody = JSON.parse(uiResp?.request().postData() ?? '{}') as Record<string, unknown>;
  report.check('[Kontrol] Save normal ESS 200', uiResp?.status() === 200, `status=${uiResp?.status()}`);
  const original = (await (await page.request.get(api)).json().catch(() => null))?.data ?? {};

  report.step('[ESS API] Kontrol: field yg BOLEH diubah (Other Id) lewat body yg sama');
  const allowed = `OK${Date.now() % 100000}`;
  const ctl = await essPage.request.put(api, { data: { ...uiBody, otherId: allowed } });
  const afterCtl = (await (await page.request.get(api)).json().catch(() => null))?.data ?? {};
  report.check('[Kontrol] Other Id via API 200 & tersimpan', ctl.status() === 200 && afterCtl.otherId === allowed, `status=${ctl.status()}, otherId=${afterCtl.otherId}`);

  const attempts: Array<[string, string, string]> = [
    ['employeeId', 'Employee Id', `HX${Date.now() % 100000}`],
    ['drivingLicenseNo', "Driver's License Number", 'DL-TC-PD02'],
    ['birthday', 'Date of Birth', '1990-01-01'],
  ];
  for (const [key, label, value] of attempts) {
    report.step(`[ESS API] Ubah ${label} (terkunci di UI) -> "${value}"`);
    const r = await essPage.request.put(api, { data: { ...uiBody, otherId: allowed, [key]: value } });
    const stored = (await (await page.request.get(api)).json().catch(() => null))?.data ?? {};
    const rejected = r.status() >= 400 && r.status() < 500;
    const unchanged = stored[key] === original[key];
    report.check(`5.2-PrivEsc ${label} tidak bisa diubah ESS (ditolak 4xx atau nilai tetap)`, rejected || unchanged, `status=${r.status()}, sebelum=${JSON.stringify(original[key])}, sesudah=${JSON.stringify(stored[key])}`);
    // put the record back so the next attempt starts from the original value
    if (!unchanged) await page.request.put(api, { data: { ...uiBody, otherId: allowed } });
  }

  await close();
  report.print();
});
