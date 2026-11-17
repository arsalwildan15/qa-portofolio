/**
 * ================================================================================
 * TC-PIM-MEMBERSHIP-API-01 — Verify The Membership API: Contract, Optional Fee/Dates, Negative Fee And Renewal-Before-Commence Business Rule
 * Modul    : PIM > Employee > Memberships (U097)
 * Kategori : Positive (+) 1.1-C 1.2 1.4 | Security (S) 5.9 | API (A) 6.2
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-MEMBERSHIP-API-01-Verify-Membership-API-Contract-Optional-Fields-And-Business-Rule-Validation.spec.ts
 * Path     : tests/pim/memberships/
 * ================================================================================
 *
 * LATAR: POST pim/employees/<N>/memberships body {membershipId,subscriptionFee,
 * subscriptionCommenceDate,subscriptionRenewalDate}. TIDAK ADA field teks bebas pada
 * endpoint ini (tidak ada comment/description) -- 5.1-XSS-Stored N/A, dicatat via
 * report.finding() TANPA kode literal di label.
 *
 * TUJUAN:
 *   1.1-C / 1.4  create valid -> 200 & kontrak (termasuk relasi ke membership.name).
 *   1.2  subscriptionFee & kedua tanggal kosong (opsional) -> 200.
 *   5.9  [Business logic] subscriptionFee NEGATIF (-500) -> 422 (ditegakkan benar);
 *        subscriptionRenewalDate SEBELUM subscriptionCommenceDate -> 422 (ditegakkan
 *        benar) -- modul ini menegakkan urutan tanggal & nilai negatif dgn BENAR,
 *        kontras positif dgn gap yg ditemukan di modul lain (Immigration/BG-433).
 *   Semua membership uji dihapus di akhir.
 *
 * HASIL 17 Nov 2026: lolos penuh, tidak ada bug ditemukan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/memberships/TC-PIM-MEMBERSHIP-API-01-Verify-Membership-API-Contract-Optional-Fields-And-Business-Rule-Validation.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

type Membership = { id: number; membership: { id: number; name: string }; subscriptionFee: string | null };

test('TC-PIM-MEMBERSHIP-API-01: Membership API - contract, optional fields, business rule validation', async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PIM-MEMBERSHIP-API-01', 'Membership API Contract Optional Fields Business Rule Validation', env.baseURL);
  const emp = await createEmployee(page.request, 'QaMemApi', `L${Date.now() % 100000}`);
  const api = `/web/index.php/api/v2/pim/employees/${emp}/memberships`;
  const body = (over: Record<string, unknown> = {}) => ({ membershipId: 1, subscriptionFee: 100, subscriptionCommenceDate: '2024-01-01', subscriptionRenewalDate: '2024-12-31', ...over });
  const createdIds: number[] = [];

  try {
    report.step('Kontrak create valid');
    const ok = await page.request.post(api, { data: body() });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: Membership }).data;
    if (okData?.id) createdIds.push(okData.id);
    report.check('1.1-C / 1.4 [U097] POST valid -> 200 + id/membership.name/subscriptionFee', ok.status() === 200 && !!okData?.id && !!okData?.membership.name, `status=${ok.status()}`);

    report.step('Catatan cakupan: tidak ada field teks bebas pd endpoint ini');
    report.finding('Field teks bebas tidak ada (XSS N/A)', 'Endpoint memberships hanya menerima membershipId (enum), subscriptionFee (angka), & 2 tanggal -- tidak ada field comment/description utk diuji stored XSS pada unit ini secara spesifik.');

    report.step('Field opsional');
    const noDates = await page.request.post(api, { data: body({ subscriptionCommenceDate: '', subscriptionRenewalDate: '' }) });
    const noDatesData = ((await noDates.json().catch(() => ({}))) as { data?: Membership }).data;
    if (noDatesData?.id) createdIds.push(noDatesData.id);
    report.check('1.2 [U097] Kedua tanggal kosong (opsional) -> 200', noDates.status() === 200, `status=${noDates.status()}`);
    const noFee = await page.request.post(api, { data: body({ subscriptionFee: '' }) });
    const noFeeData = ((await noFee.json().catch(() => ({}))) as { data?: Membership }).data;
    if (noFeeData?.id) createdIds.push(noFeeData.id);
    report.check('1.2 [U097] subscriptionFee kosong (opsional) -> 200', noFee.status() === 200, `status=${noFee.status()}`);

    report.step('Aturan bisnis: fee negatif & urutan tanggal');
    const negativeFee = await page.request.post(api, { data: body({ subscriptionFee: -500 }) });
    report.check('5.9 [U097] subscriptionFee negatif (-500) -> 422 (ditegakkan benar)', negativeFee.status() === 422, `status=${negativeFee.status()}`);
    const renewalBeforeCommence = await page.request.post(api, { data: body({ subscriptionCommenceDate: '2024-06-01', subscriptionRenewalDate: '2024-01-01' }) });
    report.check('5.9 [U097] subscriptionRenewalDate sebelum subscriptionCommenceDate -> 422 (ditegakkan benar)', renewalBeforeCommence.status() === 422, `status=${renewalBeforeCommence.status()}`);

    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
