/**
 * ================================================================================
 * TC-PIM-IMMIGRATION-API-01 — Verify The Immigration API (Admin Side): Contract, Optional Dates, Date Format Validation, Expiry-Before-Issued Order
 * Modul    : PIM > Employee > Immigration (U092)
 * Kategori : Positive (+) 1.1-C 1.2 1.4 | Negative (-) 2.2 | API (A) 6.2
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-IMMIGRATION-API-01-Verify-Immigration-API-Contract-Optional-Dates-Format-Validation-And-Date-Order.spec.ts
 * Path     : tests/pim/immigration/
 * ================================================================================
 *
 * LATAR: POST pim/employees/<N>/immigrations body {number,issuedDate,expiryDate,type,
 * status,reviewDate,comment}. Endpoint ini SAMA PERSIS dgn yg dipakai My Info (ESS,
 * TC-MYINFO-IMMIGRATION-02) -- Admin-side (PIM) memakai backend identik.
 *
 * TUJUAN:
 *   1.1-C / 1.4  create valid -> 200 & kontrak.
 *   1.2  issuedDate & expiryDate kosong (opsional) -> 200.
 *   2.2  issuedDate format tidak valid ("not-a-date") -> 422 (ditegakkan).
 *   3.4  [BUKAN temuan baru] expiryDate SEBELUM issuedDate -> 200 (diterima) -- backend
 *        Admin-side SAMA dgn ESS-side yg sudah dikonfirmasi BG-433 (Low); TC ini
 *        mengonfirmasi bug yg SAMA berlaku jg via jalur Admin, bukan bug baru/terpisah.
 *   Semua record uji dihapus di akhir.
 *
 * HASIL 17 Nov 2026: lolos penuh, tidak ada bug BARU (BG-433 sudah ada, dikonfirmasi
 *   berlaku jg di sisi Admin -- bukan bug kedua).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/immigration/TC-PIM-IMMIGRATION-API-01-Verify-Immigration-API-Contract-Optional-Dates-Format-Validation-And-Date-Order.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

type Immigration = { id: string; number: string; issuedDate: string | null; expiryDate: string | null };

test('TC-PIM-IMMIGRATION-API-01: Immigration API (Admin) - contract, optional dates, format validation, date order', async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PIM-IMMIGRATION-API-01', 'Immigration API Admin Contract Optional Dates Format Validation Date Order', env.baseURL);
  const emp = await createEmployee(page.request, 'QaImmApi', `L${Date.now() % 100000}`);
  const api = `/web/index.php/api/v2/pim/employees/${emp}/immigrations`;
  const createdIds: string[] = [];

  try {
    report.step('Kontrak create valid');
    const ok = await page.request.post(api, { data: { number: 'QaImmApiTest', issuedDate: '2024-01-01', expiryDate: '2030-01-01', type: 1, status: '', reviewDate: '', comment: '' } });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: Immigration }).data;
    if (okData?.id) createdIds.push(okData.id);
    report.check('1.1-C / 1.4 [U092] POST valid -> 200 + id/number/issuedDate/expiryDate', ok.status() === 200 && !!okData?.id && okData?.issuedDate === '2024-01-01', `status=${ok.status()}`);

    report.step('Tanggal opsional & format');
    const noDates = await page.request.post(api, { data: { number: 'QaImmApiNoDates', issuedDate: '', expiryDate: '', type: 1, status: '', reviewDate: '', comment: '' } });
    const noDatesData = ((await noDates.json().catch(() => ({}))) as { data?: Immigration }).data;
    if (noDatesData?.id) createdIds.push(noDatesData.id);
    report.check('1.2 [U092] issuedDate & expiryDate kosong (opsional) -> 200', noDates.status() === 200, `status=${noDates.status()}`);
    const badDate = await page.request.post(api, { data: { number: 'QaImmApiBadDate', issuedDate: 'not-a-date', expiryDate: '2030-01-01', type: 1, status: '', reviewDate: '', comment: '' } });
    report.check('2.2 [U092] issuedDate format tidak valid -> 422 (ditegakkan)', badDate.status() === 422, `status=${badDate.status()}`);

    report.step('Urutan tanggal (konfirmasi BG-433 jg berlaku di Admin-side, bukan bug baru)');
    const expiryBeforeIssued = await page.request.post(api, { data: { number: 'QaImmApiOrder', issuedDate: '2024-01-01', expiryDate: '2020-01-01', type: 1, status: '', reviewDate: '', comment: '' } });
    const expiryData = ((await expiryBeforeIssued.json().catch(() => ({}))) as { data?: Immigration }).data;
    if (expiryData?.id) createdIds.push(expiryData.id);
    report.finding('expiryDate sebelum issuedDate diterima (BG-433, bukan bug baru)', `POST dgn expiryDate (2020-01-01) sebelum issuedDate (2024-01-01) -> status=${expiryBeforeIssued.status()} -- backend Admin-side (PIM) memakai kode validasi yg SAMA dgn ESS-side (My Info) yg sudah dikonfirmasi BG-433 (Low). Dicatat sbg konfirmasi cakupan, bukan bug kedua.`);

    report.step('3.4 Tanggal boundary: leap year & rentang ekstrem');
    const leap = await page.request.post(api, { data: { number: 'QaImmApiLeap', issuedDate: '2024-02-29', expiryDate: '2028-02-29', type: 1, status: '', reviewDate: '', comment: '' } });
    const leapData = ((await leap.json().catch(() => ({}))) as { data?: Immigration }).data;
    if (leapData?.id) createdIds.push(leapData.id);
    report.check('3.4 [U092] issuedDate/expiryDate 29 Februari (leap year) -> 200 & tersimpan apa adanya', leap.status() === 200 && leapData?.issuedDate === '2024-02-29', `status=${leap.status()}`);
    const extreme = await page.request.post(api, { data: { number: 'QaImmApiExtreme', issuedDate: '1950-01-01', expiryDate: '2099-12-31', type: 1, status: '', reviewDate: '', comment: '' } });
    const extremeData = ((await extreme.json().catch(() => ({}))) as { data?: Immigration }).data;
    if (extremeData?.id) createdIds.push(extremeData.id);
    report.check('3.4 [U092] Rentang tanggal ekstrem (1950..2099) -> 200, tidak ada batas bisnis yg menolak', extreme.status() === 200, `status=${extreme.status()}`);

    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
