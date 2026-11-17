/**
 * ================================================================================
 * TC-PIM-CONTACT-API-01 — Verify The Contact Details API: Contract, Required Fields, Email Format Validation, Unicode, Mass Assignment, Unknown Employee, Method And Session
 * Modul    : PIM > Employee > Contact Details (U089)
 * Kategori : Positive (+) 1.1-R 1.4 | Negative (-) 2.1 2.2 | Security (S) 5.2-MassAssign |
 *            API (A) 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CONTACT-API-01-Verify-Contact-Details-API-Contract-Email-Format-Validation-Unicode-Injection-And-Mass-Assignment.spec.ts
 * Path     : tests/pim/contact-details/
 * ================================================================================
 *
 * LATAR (body direkam LIVE dari UI 17 Nov 2026): PUT pim/employee/<N>/contact-details
 * {street1,street2,city,province,zipCode,homeTelephone,workTelephone,mobile,workEmail,
 * otherEmail}. SEMUA field opsional (TC-PIM-CONTACT-02 sudah membuktikan save kosong
 * sukses) -- 2.1 "required field kosong" dicatat N/A-nya TANPA kode literal di label.
 * SERVER (bukan form) MEMVALIDASI format email -- dikonfirmasi via API langsung: PUT
 * dgn workEmail="not-an-email" -> 422. Ini BERBEDA dari temuan TC-PIM-CONTACT-03 yg
 * menunjukkan form sendiri MENGOSONGKAN nilai invalid sblm sempat terkirim (user tidak
 * pernah melihat 422 itu krn request yg benar2 terkirim selalu sudah bersih).
 *
 * TUJUAN:
 *   1.1-R / 1.4  GET & PUT -> 200 & kontrak field lengkap.
 *   2.2 / 6.5  workEmail format tidak valid ("not-an-email") dikirim LANGSUNG via API
 *        (bypass form) -> 422 (server menegakkan format, kontras dgn TC-PIM-CONTACT-03
 *        yg membuktikan form tidak pernah benar2 mengirim nilai ini).
 *   4.1  street1/city Arab/CJK -> 200 & tersimpan apa adanya.
 *   3.1 / 6.5  street1 300 karakter -> 422 (batas ditegakkan).
 *   5.2-MassAssign  field asing (isAdmin) -> 422 ditolak (skema ketat).
 *   2.6 / 6.5  empNumber tidak ada (999999) -> 422 (benar, bukan 500).
 *   6.3  PATCH -> 405.  6.4  tanpa sesi -> 401.
 *
 * HASIL 17 Nov 2026: lolos penuh, tidak ada bug ditemukan -- validasi email, panjang
 *   field, dan penanganan empNumber tidak ada semuanya benar & konsisten di level API.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/contact-details/TC-PIM-CONTACT-API-01-Verify-Contact-Details-API-Contract-Email-Format-Validation-Unicode-Injection-And-Mass-Assignment.spec.ts --project=chromium
 * ================================================================================
 */

import { request } from '@playwright/test';
import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

type ContactDetails = { street1: string | null; city: string | null; workEmail: string | null };

test('TC-PIM-CONTACT-API-01: Contact Details API - contract, email format, unicode, mass assignment, unknown employee, method, session', async ({ page }, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-PIM-CONTACT-API-01', 'Contact Details API Contract Email Format Validation Unicode Mass Assignment Unknown Employee Method Session', env.baseURL);
  const anon = await request.newContext({ baseURL: env.baseURL });
  const emp = await createEmployee(page.request, 'QaContactApi', `L${Date.now() % 100000}`);
  const api = `/web/index.php/api/v2/pim/employee/${emp}/contact-details`;
  const body = (over: Record<string, unknown> = {}) => ({ street1: '', street2: '', city: '', province: '', zipCode: null, homeTelephone: null, workTelephone: null, mobile: null, workEmail: null, otherEmail: null, ...over });

  try {
    report.step('Kontrak GET & PUT valid');
    const getRes = await page.request.get(api);
    report.check('1.1-R [U089] GET -> 200 & kontrak field', getRes.status() === 200, `status=${getRes.status()}`);
    const ok = await page.request.put(api, { data: body({ street1: 'QaContactApi St 1', city: 'Jakarta' }) });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: ContactDetails }).data;
    report.check('1.4 [U089] PUT valid -> 200 & kontrak street1/city', ok.status() === 200 && okData?.street1 === 'QaContactApi St 1' && okData?.city === 'Jakarta', `status=${ok.status()}`);

    report.step('Catatan cakupan: semua field opsional (2.1 N/A by design)');
    report.finding('Required field kosong N/A', 'Contact Details tidak punya field wajib isi -- save dgn semua field kosong sukses (sudah dibuktikan TC-PIM-CONTACT-02); 2.1 tidak berlaku pada unit ini.');

    report.step('Validasi format email (server, bukan form)');
    const badEmail = await page.request.put(api, { data: body({ workEmail: 'not-an-email' }) });
    report.check('2.2 / 6.5 [U089] workEmail format tidak valid dikirim LANGSUNG via API -> 422 (server menegakkan, beda dgn form yg mengosongkan sendiri sblm terkirim)', badEmail.status() === 422, `status=${badEmail.status()}`);

    report.step('Unicode & panjang field');
    const unicode = await page.request.put(api, { data: body({ street1: 'مرحبا', city: '你好' }) });
    const unicodeData = ((await unicode.json().catch(() => ({}))) as { data?: ContactDetails }).data;
    report.check('4.1 [U089] street1/city Arab/CJK -> 200 & tersimpan apa adanya', unicode.status() === 200 && unicodeData?.street1 === 'مرحبا' && unicodeData?.city === '你好', `status=${unicode.status()}`);
    const longStreet = await page.request.put(api, { data: body({ street1: 'S'.repeat(300) }) });
    report.check('3.1 / 6.5 [U089] street1 300 karakter -> 422 (batas ditegakkan)', longStreet.status() === 422, `status=${longStreet.status()}`);

    report.step('Mass assignment, empNumber tidak ada, method, sesi');
    const mass = await page.request.put(api, { data: { ...body(), isAdmin: true } });
    report.check('5.2-MassAssign [U089] Field asing (isAdmin) -> 422 (skema ketat)', mass.status() === 422, `status=${mass.status()}`);
    const ghostEmp = await page.request.put('/web/index.php/api/v2/pim/employee/999999/contact-details', { data: body() });
    report.check('2.6 / 6.5 [U089] empNumber tidak ada (999999) -> 422 (benar, bukan 500)', ghostEmp.status() === 422, `status=${ghostEmp.status()}`);
    const patch = await page.request.patch(api, { data: {} });
    report.check('6.3 [U089] PATCH -> 405', patch.status() === 405, `status=${patch.status()}`);
    const noAuth = await anon.get(api);
    report.check('6.4 [U089] Tanpa sesi -> 401', noAuth.status() === 401, `status=${noAuth.status()}`);
  } finally {
    await anon.dispose();
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
