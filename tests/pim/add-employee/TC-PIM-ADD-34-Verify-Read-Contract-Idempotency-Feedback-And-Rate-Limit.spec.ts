/**
 * ================================================================================
 * TC-PIM-ADD-34 — Verify Add Employee: Read Contract, Idempotency, Feedback And Rate Limit
 * Modul    : PIM > Add Employee (U041)
 * Kategori : Positive (+) 1.1-R 1.8 | Security (S) 5.5 | API (A) 6.2 6.7 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-34-Verify-Read-Contract-Idempotency-Feedback-And-Rate-Limit.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * LATAR: TC-PIM-ADD-API-01 sudah menutup kontrak create/photo/content-type/filename/mass-
 * assignment. Ini menutup 6 kode terakhir, dibuktikan via probe LIVE 18 Nov 2026:
 *   - GET personal-details setelah create -> 200 (1.1-R).
 *   - POST create -> 200 + kontrak empNumber/firstName/lastName/middleName/employeeId (6.2).
 *   - Create 2x dgn employeeId SAMA (simulasi retry) -> yg kedua 422 DITOLAK (6.7 -- KONTRAS
 *     POSITIF dgn Data Import/BG-484: Add Employee BENAR menegakkan keunikan employeeId,
 *     tidak membuat duplikat).
 *   - 3 create paralel -> SEMUA 200, tidak ada rate limit (5.5, finding, bukan bug, R4).
 *   - Add Employee valid via UI -> toast "Successfully Saved" (1.8/8.4).
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-34-Verify-Read-Contract-Idempotency-Feedback-And-Rate-Limit.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const api = '/web/index.php/api/v2/pim/employees';
type Employee = { empNumber: number; firstName: string; lastName: string; middleName: string; employeeId: string };
const body = (firstName: string, employeeId: string) => ({ firstName, lastName: 'X', middleName: '', employeeId });

test('TC-PIM-ADD-34: read contract, idempotency, feedback, rate limit', async ({
  page, addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-PIM-ADD-34', 'Add Employee Read Contract Idempotency Feedback Rate Limit', env.baseURL, page);
  const s = Date.now() % 100000;
  const createdIds: number[] = [];

  try {
    report.step('1.1-R / 6.2 Create lalu read');
    const created = await page.request.post(api, { data: body(`QaAdd34${s}`, `Q${s}a`) });
    const createdData = ((await created.json().catch(() => ({}))) as { data?: Employee }).data;
    if (createdData?.empNumber) createdIds.push(createdData.empNumber);
    report.check('6.2 [U041] POST create -> 200 + kontrak empNumber/firstName/lastName/middleName/employeeId', created.status() === 200 && !!createdData?.empNumber && createdData?.firstName === `QaAdd34${s}`, `status=${created.status()}`);
    const read = await page.request.get(`${api}/${createdData?.empNumber}/personal-details`);
    report.check('1.1-R [U041] GET personal-details setelah create -> 200', read.status() === 200, `status=${read.status()}`);

    report.step('6.7 Idempotency -- create 2x dgn employeeId SAMA (simulasi retry)');
    const dupEmployeeId = `Q${s}b`;
    const dup1 = await page.request.post(api, { data: body(`QaAdd34Dup1_${s}`, dupEmployeeId) });
    const dup1Data = ((await dup1.json().catch(() => ({}))) as { data?: Employee }).data;
    if (dup1Data?.empNumber) createdIds.push(dup1Data.empNumber);
    const dup2 = await page.request.post(api, { data: body(`QaAdd34Dup2_${s}`, dupEmployeeId) });
    const dup2Data = ((await dup2.json().catch(() => ({}))) as { data?: Employee }).data;
    if (dup2Data?.empNumber) createdIds.push(dup2Data.empNumber);
    report.check('6.7 [U041] Create ke-2 dgn employeeId yg sama -> 422 ditolak (keunikan ditegakkan, kontras positif dgn Data Import/BG-484)', dup1.status() === 200 && dup2.status() === 422, `dup1=${dup1.status()} dup2=${dup2.status()}`);

    report.step('5.5 Rate limiting -- 3 create paralel');
    const rapid = await Promise.all(Array.from({ length: 3 }, (_, i) => page.request.post(api, { data: body(`QaAdd34Rapid${i}_${s}`, `Q${s}c${i}`) })));
    report.check('5.5 [U041] 3 create paralel -> SEMUA 200 (tidak ada 429/lockout)', rapid.every((r) => r.status() === 200), `statuses=${rapid.map((r) => r.status()).join(',')}`);
    for (const r of rapid) {
      const d = ((await r.json().catch(() => ({}))) as { data?: Employee }).data;
      if (d?.empNumber) createdIds.push(d.empNumber);
    }
    report.finding('Rate limiting pada Add Employee', '3 request create paralel SEMUA diterima (200) -- tidak ada rate limit pd endpoint ini, dicatat sbg finding (bukan bug) sesuai R4.');

    report.step('1.8 / 8.4 Add Employee valid via UI -- toast sukses');
    await addEmployeePage.goto();
    await addEmployeePage.firstNameInput.fill(`QaAdd34Ui${s}`);
    await addEmployeePage.lastNameInput.fill('X');
    const [saveResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/pim/employees') && r.request().method() === 'POST'),
      addEmployeePage.save(),
    ]);
    const toastText = await page.locator('.oxd-toast').first().textContent({ timeout: 3_000 }).catch(() => null);
    report.check('1.8 [U041] Add Employee via UI -> POST 200 + toast sukses muncul', saveResp.status() === 200 && !!toastText && /Successfully/i.test(toastText), `status=${saveResp.status()} toast=${toastText}`);
    report.check('8.4 [U041] Teks toast konsisten dgn pola "Successfully ..." di form lain', !!toastText && /Successfully Saved/i.test(toastText), `toast="${toastText}"`);
    const uiData = ((await saveResp.json().catch(() => ({}))) as { data?: Employee }).data;
    if (uiData?.empNumber) createdIds.push(uiData.empNumber);
  } finally {
    if (createdIds.length) await page.request.delete(api, { data: { ids: createdIds } }).catch(() => null);
  }
  report.print();
});
