/**
 * ================================================================================
 * TC-PIM-PD-API-02 — Verify Personal Details API: Optional Field Combinations And Nationality Relation
 * Modul    : PIM > Employee > Personal Details (U088)
 * Kategori : Positive (+) 1.2 1.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-API-02-Verify-Optional-Field-Combinations-And-Nationality-Relation.spec.ts
 * Path     : tests/pim/personal-details/
 * ================================================================================
 *
 * LATAR: TC-PIM-PD-API-01 sudah menutup 1.1-U/2.1/2.2/3.1/5.1-SQLi/5.1-XSS-Stored/5.2-
 * MassAssign/2.6/6.3/6.4 (+ BG-470). TC ini SENGAJA sempit, hanya menutup 2 item yg masih
 * GAP: 1.2 (variasi field opsional: middleName, SIM+tanggal kedaluwarsa, tanggal lahir,
 * nationalityId, maritalStatus -- semua kosong vs semua terisi) & 1.4 (relasi entity:
 * nationalityId adalah lookup ke tabel Nationality, dibuktikan via GET setelah PUT
 * mengembalikan `nationality.name` yg benar, bukan sekadar echo id).
 * Probe LIVE 18 Nov 2026 (body direkam langsung): maritalStatus adalah STRING ENUM, BUKAN
 * id -- field terpisah dari objek `nationality` yg memang id+name.
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/personal-details/TC-PIM-PD-API-02-Verify-Optional-Field-Combinations-And-Nationality-Relation.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

type PersonalDetails = {
  middleName: string; drivingLicenseNo: string; drivingLicenseExpiredDate: string | null;
  birthday: string | null; maritalStatus: string; nationality: { id: number | null; name: string | null };
};

test('TC-PIM-PD-API-02: Personal Details API - optional field combinations and nationality relation', async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-PD-API-02', 'Personal Details API Optional Field Combinations Nationality Relation', env.baseURL);
  const emp = await createEmployee(page.request, 'QaPdOpt', `L${Date.now() % 100000}`);
  const api = `/web/index.php/api/v2/pim/employees/${emp}/personal-details`;
  const body = (over: Record<string, unknown> = {}) => ({ lastName: 'QaPdOptLast', firstName: 'QaPdOptFirst', middleName: '', employeeId: null, otherId: '', drivingLicenseNo: '', drivingLicenseExpiredDate: null, gender: null, birthday: null, nationalityId: null, maritalStatus: '', ...over });

  try {
    report.step('1.2 Semua field opsional kosong');
    const empty = await page.request.put(api, { data: body() });
    const emptyData = ((await empty.json().catch(() => ({}))) as { data?: PersonalDetails }).data;
    report.check('1.2 [U088] middleName/drivingLicenseNo/birthday/nationality/maritalStatus semua kosong -> 200', empty.status() === 200 && emptyData?.middleName === '' && emptyData?.nationality.id === null && emptyData?.maritalStatus === '', `status=${empty.status()}`);

    report.step('1.2 Semua field opsional terisi (kombinasi penuh)');
    const full = await page.request.put(api, { data: body({ middleName: 'QaPdOptMid', drivingLicenseNo: 'QaDL12345', drivingLicenseExpiredDate: '2030-01-01', birthday: '1990-05-15', nationalityId: 1, maritalStatus: 'Single' }) });
    const fullData = ((await full.json().catch(() => ({}))) as { data?: PersonalDetails }).data;
    report.check('1.2 [U088] middleName/drivingLicenseNo+tanggal/birthday/nationality/maritalStatus semua terisi -> 200 & tersimpan', full.status() === 200 && fullData?.middleName === 'QaPdOptMid' && fullData?.drivingLicenseNo === 'QaDL12345' && fullData?.birthday === '1990-05-15' && fullData?.maritalStatus === 'Single', `status=${full.status()}`);

    report.step('1.4 Relasi nationalityId -> Nationality (id + name benar, bukan sekadar echo id)');
    report.check('1.4 [U088] PUT dgn nationalityId=1 -> response membawa nationality.name yg benar ("Afghan", bukan hanya id)', fullData?.nationality.id === 1 && fullData?.nationality.name === 'Afghan', `nationality=${JSON.stringify(fullData?.nationality)}`);
    const reread = await page.request.get(api);
    const rereadData = ((await reread.json().catch(() => ({}))) as { data?: PersonalDetails }).data;
    report.check('1.4 [U088] GET ulang setelah PUT -> relasi nationality tetap konsisten (cascade read)', reread.status() === 200 && rereadData?.nationality.id === 1 && rereadData?.nationality.name === 'Afghan', `nationality=${JSON.stringify(rereadData?.nationality)}`);

    report.step('1.4 Ganti ke nationality lain -> relasi berubah ikut id baru');
    const changed = await page.request.put(api, { data: body({ nationalityId: 2 }) });
    const changedData = ((await changed.json().catch(() => ({}))) as { data?: PersonalDetails }).data;
    report.check('1.4 [U088] nationalityId diganti (1 -> 2) -> nationality.name ikut berubah (bukan cache nama lama)', changed.status() === 200 && changedData?.nationality.id === 2 && changedData?.nationality.name !== 'Afghan' && !!changedData?.nationality.name, `nationality=${JSON.stringify(changedData?.nationality)}`);
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
