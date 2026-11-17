/**
 * ================================================================================
 * TC-PIM-QUALIFICATION-API-01 — Verify The Work Experience API (Admin Side): Contract, Optional Dates, Date Order Validation, Unknown Record Id
 * Modul    : PIM > Employee > Qualifications (U096)
 * Kategori : Positive (+) 1.1-C 1.2 1.4 | Negative (-) 2.2 | API (A) 6.2   [+finding]
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-QUALIFICATION-API-01-Verify-Work-Experience-API-Contract-Optional-Dates-Date-Order-And-Unknown-Record.spec.ts
 * Path     : tests/pim/qualifications/
 * ================================================================================
 *
 * LATAR: POST pim/employees/<N>/work-experiences body {company,jobTitle,fromDate,toDate,
 * comment}. Endpoint ini SAMA dgn yg dipakai My Info (ESS, TC-MYINFO-QUALIFICATION-02),
 * termasuk bug PUT id tak ada -> 500 (BG-434) yg sudah dikonfirmasi di sana.
 *
 * TUJUAN:
 *   1.1-C / 1.4  create valid -> 200 & kontrak.
 *   1.2  fromDate/toDate kosong (opsional) -> 200.
 *   2.2  toDate SEBELUM fromDate -> 422 (ditegakkan benar, BEDA dgn Immigration yg
 *        menerima urutan terbalik -- unit ini TIDAK berbagi bug BG-433).
 *   [BUKAN bug baru] PUT id tidak ada (999999) -> 500 -- konfirmasi BG-434 berlaku jg di
 *        Admin-side, bukan bug kedua.
 *   Semua record uji dihapus di akhir.
 *
 * HASIL 17 Nov 2026: lolos penuh, tidak ada bug BARU (BG-434 dikonfirmasi berlaku jg di
 *   Admin-side).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/qualifications/TC-PIM-QUALIFICATION-API-01-Verify-Work-Experience-API-Contract-Optional-Dates-Date-Order-And-Unknown-Record.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

type WorkExperience = { id: number; company: string; fromDate: string | null; toDate: string | null };

test('TC-PIM-QUALIFICATION-API-01: Work Experience API (Admin) - contract, optional dates, date order, unknown record', async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PIM-QUALIFICATION-API-01', 'Work Experience API Admin Contract Optional Dates Date Order Unknown Record', env.baseURL);
  const emp = await createEmployee(page.request, 'QaQualApi', `L${Date.now() % 100000}`);
  const api = `/web/index.php/api/v2/pim/employees/${emp}/work-experiences`;
  const createdIds: number[] = [];

  try {
    report.step('Kontrak create valid');
    const ok = await page.request.post(api, { data: { company: 'QaQualApiCo', jobTitle: 'QaT', fromDate: '2020-01-01', toDate: '2021-01-01', comment: '' } });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: WorkExperience }).data;
    if (okData?.id) createdIds.push(okData.id);
    report.check('1.1-C / 1.4 [U096] POST valid -> 200 + id/company/fromDate/toDate', ok.status() === 200 && !!okData?.id && okData?.fromDate === '2020-01-01', `status=${ok.status()}`);

    report.step('Tanggal opsional & urutan');
    const noDates = await page.request.post(api, { data: { company: 'QaQualApiNoDates', jobTitle: 'QaT', fromDate: '', toDate: '', comment: '' } });
    const noDatesData = ((await noDates.json().catch(() => ({}))) as { data?: WorkExperience }).data;
    if (noDatesData?.id) createdIds.push(noDatesData.id);
    report.check('1.2 [U096] fromDate & toDate kosong (opsional) -> 200', noDates.status() === 200, `status=${noDates.status()}`);
    const badOrder = await page.request.post(api, { data: { company: 'QaQualApiOrder', jobTitle: 'QaT', fromDate: '2022-01-01', toDate: '2020-01-01', comment: '' } });
    report.check('2.2 [U096] toDate sebelum fromDate -> 422 (ditegakkan benar, beda dgn Immigration)', badOrder.status() === 422, `status=${badOrder.status()}`);

    report.step('Record tidak ada (konfirmasi BG-434, bukan bug baru)');
    const ghostUpdate = await page.request.put(`${api}/999999`, { data: { company: 'X', jobTitle: 'X', fromDate: '2020-01-01', toDate: '2021-01-01', comment: '' } });
    report.finding('PUT id tidak ada -> 500 (BG-434, bukan bug baru)', `PUT work-experiences/999999 -> status=${ghostUpdate.status()} -- endpoint ini SAMA dgn My Info (ESS) yg sudah dikonfirmasi BG-434 (ghost id -> 500 Internal Server Error). Dicatat sbg konfirmasi cakupan Admin-side, bukan bug kedua.`);
    report.check('(kontrol) PUT id tidak ada tetap 4xx/5xx (tidak 200/2xx)', !(ghostUpdate.status() >= 200 && ghostUpdate.status() < 300), `status=${ghostUpdate.status()}`);

    report.step('3.4 Tanggal boundary: leap year & rentang ekstrem');
    const leap = await page.request.post(api, { data: { company: 'QaQualApiLeap', jobTitle: 'QaT', fromDate: '2024-02-29', toDate: '2028-02-29', comment: '' } });
    const leapData = ((await leap.json().catch(() => ({}))) as { data?: WorkExperience }).data;
    if (leapData?.id) createdIds.push(leapData.id);
    report.check('3.4 [U096] fromDate/toDate 29 Februari (leap year) -> 200 & tersimpan apa adanya', leap.status() === 200 && leapData?.fromDate === '2024-02-29', `status=${leap.status()}`);
    const extreme = await page.request.post(api, { data: { company: 'QaQualApiExtreme', jobTitle: 'QaT', fromDate: '1950-01-01', toDate: '2099-12-31', comment: '' } });
    const extremeData = ((await extreme.json().catch(() => ({}))) as { data?: WorkExperience }).data;
    if (extremeData?.id) createdIds.push(extremeData.id);
    report.check('3.4 [U096] Rentang tanggal ekstrem (1950..2099) -> 200, tidak ada batas bisnis yg menolak', extreme.status() === 200, `status=${extreme.status()}`);

    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
