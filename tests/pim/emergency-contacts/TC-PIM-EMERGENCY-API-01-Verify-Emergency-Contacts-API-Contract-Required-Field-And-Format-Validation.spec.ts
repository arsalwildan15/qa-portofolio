/**
 * ================================================================================
 * TC-PIM-EMERGENCY-API-01 — Verify The Emergency Contacts API: Contract, Required Relationship, Optional Phone Fields, Phone Format Validation
 * Modul    : PIM > Employee > Emergency Contacts (U090)
 * Kategori : Positive (+) 1.1-C 1.2 1.4 | Negative (-) 2.1 2.2 | API (A) 6.2
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-EMERGENCY-API-01-Verify-Emergency-Contacts-API-Contract-Required-Field-And-Format-Validation.spec.ts
 * Path     : tests/pim/emergency-contacts/
 * ================================================================================
 *
 * LATAR: POST pim/employees/<N>/emergency-contacts body {name,relationship,homePhone,
 * officePhone,mobilePhone}. 5.2-MassAssign/5.1-SQLi/5.1-XSS-Stored/6.5/2.6/6.3/6.4 SUDAH
 * dicakup oleh TC-PIM-MUT-01 (lintas-tab) -- TC ini melengkapi GAP yg tersisa spesifik di
 * unit ini: relationship WAJIB diisi (beda dari name/phone yg semua opsional), format
 * nomor telepon ditegakkan server.
 *
 * TUJUAN:
 *   1.1-C / 1.4  create valid -> 200 & kontrak.
 *   1.2  create dgn ketiga field phone KOSONG (opsional) -> 200 (hanya relationship wajib).
 *   2.1 / 6.2  relationship kosong (meski phone terisi) -> 422.
 *   2.2  mobilePhone format tidak valid ("not-a-phone-number!!!") -> 422 (ditegakkan).
 *   Semua kontak uji dihapus di akhir.
 *
 * HASIL 17 Nov 2026: lolos penuh, tidak ada bug ditemukan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/emergency-contacts/TC-PIM-EMERGENCY-API-01-Verify-Emergency-Contacts-API-Contract-Required-Field-And-Format-Validation.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

type EmergencyContact = { id: string; name: string; relationship: string };

test('TC-PIM-EMERGENCY-API-01: Emergency Contacts API - contract, required relationship, optional phone, format validation', async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PIM-EMERGENCY-API-01', 'Emergency Contacts API Contract Required Relationship Optional Phone Format Validation', env.baseURL);
  const emp = await createEmployee(page.request, 'QaEmergApi', `L${Date.now() % 100000}`);
  const api = `/web/index.php/api/v2/pim/employees/${emp}/emergency-contacts`;
  const createdIds: string[] = [];

  try {
    report.step('Kontrak create valid');
    const ok = await page.request.post(api, { data: { name: 'QaEmergApiTest', relationship: 'Teman', homePhone: '', officePhone: '', mobilePhone: '081234500001' } });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: EmergencyContact }).data;
    if (okData?.id) createdIds.push(okData.id);
    report.check('1.1-C / 1.4 [U090] POST valid -> 200 + id/name/relationship', ok.status() === 200 && !!okData?.id && okData?.name === 'QaEmergApiTest', `status=${ok.status()}`);

    report.step('Field phone opsional, relationship wajib');
    const noPhone = await page.request.post(api, { data: { name: 'QaEmergApiNoPhone', relationship: 'Teman', homePhone: '', officePhone: '', mobilePhone: '' } });
    const noPhoneData = ((await noPhone.json().catch(() => ({}))) as { data?: EmergencyContact }).data;
    if (noPhoneData?.id) createdIds.push(noPhoneData.id);
    report.check('1.2 [U090] Ketiga field phone kosong (opsional) -> 200', noPhone.status() === 200, `status=${noPhone.status()}`);
    const noRel = await page.request.post(api, { data: { name: 'QaEmergApiNoRel', relationship: '', homePhone: '', officePhone: '', mobilePhone: '081234500002' } });
    report.check('2.1 / 6.2 [U090] relationship kosong (meski phone terisi) -> 422', noRel.status() === 422, `status=${noRel.status()}`);

    report.step('Format nomor telepon');
    const badPhone = await page.request.post(api, { data: { name: 'QaEmergApiBadPhone', relationship: 'Teman', homePhone: '', officePhone: '', mobilePhone: 'not-a-phone-number!!!' } });
    report.check('2.2 [U090] mobilePhone format tidak valid -> 422 (ditegakkan)', badPhone.status() === 422, `status=${badPhone.status()}`);

    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
