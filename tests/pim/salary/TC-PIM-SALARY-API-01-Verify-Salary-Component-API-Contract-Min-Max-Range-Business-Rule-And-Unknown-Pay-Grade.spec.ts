/**
 * ================================================================================
 * TC-PIM-SALARY-API-01 — Verify The Salary Component API: Contract, Optional Comment, Min/Max Range Business Rule, Unicode, Unknown Pay Grade
 * Modul    : PIM > Employee > Salary (U094)
 * Kategori : Positive (+) 1.1-C 1.2 | Negative (-) 2.6 | Security (S) 5.9 | API (A) 6.2
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-SALARY-API-01-Verify-Salary-Component-API-Contract-Min-Max-Range-Business-Rule-And-Unknown-Pay-Grade.spec.ts
 * Path     : tests/pim/salary/
 * ================================================================================
 *
 * LATAR: POST pim/employees/<N>/salary-components body {salaryComponent (TEXT bebas),
 * salaryAmount,payGradeId,currencyId,payFrequencyId,comment,addDirectDeposit}. Pay Grade
 * "Grade 1" (id=1) punya rentang gaji USD 50000-60000 (GET admin/pay-grades/1/currencies).
 *
 * TUJUAN:
 *   1.1-C / 1.4  create dgn amount DI DALAM rentang Pay Grade (55000) -> 200 & kontrak.
 *   1.2  comment null (opsional) -> 200.
 *   5.9  [Business logic] amount DI LUAR rentang Pay Grade (di bawah min 49999, di atas
 *        max 60001) -> 400 "Salary should be within min and max" (DITEGAKKAN benar).
 *   2.6  payGradeId yg tidak ada (999999) -> 400 (BUKAN 500/200 -- rentang tidak
 *        ditemukan utk grade yg tidak ada, server menolak dgn aman, bukan crash).
 *   4.1  salaryComponent (field teks bebas) Arab/CJK -> 200 & tersimpan apa adanya.
 *   Semua komponen uji dihapus di akhir.
 *
 * HASIL 17 Nov 2026: lolos penuh, tidak ada bug ditemukan -- aturan bisnis rentang
 *   gaji per Pay Grade ditegakkan dgn benar & konsisten, termasuk utk grade yg tidak ada.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/salary/TC-PIM-SALARY-API-01-Verify-Salary-Component-API-Contract-Min-Max-Range-Business-Rule-And-Unknown-Pay-Grade.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';

type SalaryComponent = { id: number; amount: string; salaryName: string };

test('TC-PIM-SALARY-API-01: Salary Component API - contract, min/max range business rule, unicode, unknown pay grade', async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-PIM-SALARY-API-01', 'Salary Component API Contract Min Max Range Business Rule Unicode Unknown Pay Grade', env.baseURL);
  const emp = await createEmployee(page.request, 'QaSalaryApi', `L${Date.now() % 100000}`);
  const api = `/web/index.php/api/v2/pim/employees/${emp}/salary-components`;
  const body = (over: Record<string, unknown> = {}) => ({ salaryComponent: 'Basic Salary', salaryAmount: '55000', payGradeId: 1, currencyId: 'USD', payFrequencyId: '4', comment: null, addDirectDeposit: false, ...over });
  const createdIds: number[] = [];

  try {
    report.step('Kontrak create valid (amount di dalam rentang Grade 1: 50000-60000 USD)');
    const ok = await page.request.post(api, { data: body() });
    const okData = ((await ok.json().catch(() => ({}))) as { data?: SalaryComponent }).data;
    if (okData?.id) createdIds.push(okData.id);
    report.check('1.1-C / 1.4 [U094] POST amount dlm rentang Pay Grade -> 200 + id/amount', ok.status() === 200 && !!okData?.id && okData?.amount === '55000', `status=${ok.status()}`);
    report.check('1.2 [U094] comment null (opsional) -> 200', ok.status() === 200, `status=${ok.status()}`);

    report.step('Aturan bisnis rentang min/max Pay Grade');
    const belowMin = await page.request.post(api, { data: body({ salaryAmount: '49999' }) });
    report.check('5.9 [U094] Amount di bawah min Pay Grade (49999 < 50000) -> 400 ditegakkan', belowMin.status() === 400, `status=${belowMin.status()}`);
    const aboveMax = await page.request.post(api, { data: body({ salaryAmount: '60001' }) });
    report.check('5.9 [U094] Amount di atas max Pay Grade (60001 > 60000) -> 400 ditegakkan', aboveMax.status() === 400, `status=${aboveMax.status()}`);

    report.step('Pay Grade tidak ada & unicode');
    const ghostPayGrade = await page.request.post(api, { data: body({ payGradeId: 999999 }) });
    report.check('2.6 [U094] payGradeId tidak ada (999999) -> 400 (bukan 500/200, aman)', ghostPayGrade.status() === 400, `status=${ghostPayGrade.status()}`);
    const unicode = await page.request.post(api, { data: body({ salaryComponent: 'مرحبا 你好' }) });
    const unicodeData = ((await unicode.json().catch(() => ({}))) as { data?: SalaryComponent }).data;
    if (unicodeData?.id) createdIds.push(unicodeData.id);
    report.check('4.1 [U094] salaryComponent Arab/CJK -> 200 & tersimpan apa adanya', unicode.status() === 200 && unicodeData?.salaryName === 'مرحبا 你好', `status=${unicode.status()}`);

    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  } finally {
    await page.request.delete('/web/index.php/api/v2/pim/employees', { data: { ids: [emp] } }).catch(() => null);
  }
  report.print();
});
