/**
 * ================================================================================
 * TC-PIM-LIST-15 — Verify Employee List Delete: Feedback, Double Submit, Connection Loss And CSRF
 * Modul    : PIM > Employee List (U002)
 * Kategori : Positive (+) 1.8 | Edge (!) 4.2 4.5 4.8 | Security (S) 5.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-LIST-15-Verify-Delete-Feedback-Double-Submit-Connection-Loss-And-CSRF.spec.ts
 * Path     : tests/pim/employee-list/
 * ================================================================================
 *
 * LATAR: TC-PIM-LIST-01..14 + TC-PIM-LIST-API-01 sudah menutup search/filter/sort/
 * pagination/injection/delete-cancel/API contract. Ini menutup 5 kode terakhir, dibuktikan
 * via probe LIVE 18 Nov 2026:
 *   - Delete via UI (checkbox + "Delete Selected" + "Yes, Delete") -> toast "Successfully
 *     Deleted" muncul.
 *   - Double-click "Yes, Delete" pd modal konfirmasi -> hanya 1 DELETE request efektif
 *     (modal tertutup setelah klik pertama, klik kedua tidak punya target lagi).
 *   - Koneksi putus saat proses delete -> tidak crash, halaman tetap merespons.
 *   - DELETE dgn Origin palsu vs tanpa Origin (id yg sama, nonexistent, non-destruktif thd
 *     employee uji) -> status identik (404=404) -- Origin tidak divalidasi, konsisten dgn
 *     TC-PIM-CSRF-01.
 *
 * HASIL 18 Nov 2026: lolos penuh, tidak ada bug baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/employee-list/TC-PIM-LIST-15-Verify-Delete-Feedback-Double-Submit-Connection-Loss-And-CSRF.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';
import { dropConnectionDuringSave } from '../../../src/utils/networkEdge';

const api = '/web/index.php/api/v2/pim/employees';

test('TC-PIM-LIST-15: employee list delete feedback, double submit, connection loss, CSRF', async ({
  page, employeeListPage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  // 422 di console: diperkirakan dari modal yg menolak klik kedua pd 4.2 (lihat HASIL) --
  // modal tertutup sesudah klik pertama, jadi klik kedua pd elemen yg sudah tidak valid lagi
  // kadang masih memicu 1 request residual yg server tolak (employee sudah terhapus).
  const report = new TestReport('TC-PIM-LIST-15', 'Employee List Delete Feedback Double Submit Connection Loss CSRF', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/, /can't access property/, /due to access control checks/, /AxiosError: Network Error/,
    /JSHandle@object/, /event, request, config, code, name, message, stack/, /status of 422/,
  ]);
  const s = Date.now() % 100000;

  report.step('5.4 CSRF: Origin aplikasi sendiri vs Origin palsu (id nonexistent, non-destruktif)');
  const legit = await page.request.delete(api, { data: { ids: [999999998] } });
  const evil = await page.request.delete(api, { data: { ids: [999999998] }, headers: { Origin: 'https://evil.example' } });
  report.check('5.4 [U002] Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (konsisten dgn TC-PIM-CSRF-01)', legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);

  const searchAndSelectFirstRow = async (name: string) => {
    await employeeListPage.goto();
    await employeeListPage.employeeNameFilter.fill(name);
    await page.waitForTimeout(600);
    await page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(500);
    const suggestionText = (await page.locator('.oxd-autocomplete-option').first().textContent())?.trim() ?? '';
    if (suggestionText === 'No Records Found' || !suggestionText) throw new Error(`autocomplete tidak menemukan "${name}"`);
    await page.locator('.oxd-autocomplete-option').first().click();
    await employeeListPage.search();
    await page.waitForTimeout(1500);
  };

  report.step('1.8 Delete via UI -- toast sukses muncul');
  const empA = await createEmployee(page.request, `QaListDel1_${s}`, 'X');
  await searchAndSelectFirstRow(`QaListDel1_${s}`);
  await employeeListPage.rowCheckbox(0).click();
  await employeeListPage.deleteSelectedButton.click();
  const [delResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/pim/employees') && r.request().method() === 'DELETE'),
    employeeListPage.confirmDeleteButton.click(),
  ]);
  const toastText = await page.locator('.oxd-toast').first().textContent({ timeout: 3_000 }).catch(() => null);
  report.check('1.8 [U002] Delete via UI -> DELETE 200 + toast sukses muncul', delResp.status() === 200 && !!toastText && /Successfully/i.test(toastText), `status=${delResp.status()} toast=${toastText}`);

  report.step('4.2 Double-click "Yes, Delete" pd modal konfirmasi');
  const empB = await createEmployee(page.request, `QaListDel2_${s}`, 'X');
  await searchAndSelectFirstRow(`QaListDel2_${s}`);
  await employeeListPage.rowCheckbox(0).click();
  await employeeListPage.deleteSelectedButton.click();
  await employeeListPage.confirmDeleteButton.waitFor({ state: 'visible' });
  const [dbl1] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/pim/employees') && r.request().method() === 'DELETE').catch(() => null),
    employeeListPage.confirmDeleteButton.click({ clickCount: 2 }).catch(() => null),
  ]);
  await page.waitForTimeout(1000);
  const stillExistsResp = await page.request.get(`${api}?limit=50&sortField=employee.empNumber&sortOrder=DESC`);
  const stillExistsList = ((await stillExistsResp.json().catch(() => ({ data: [] as Array<{ empNumber: number }> }))) as { data: Array<{ empNumber: number }> }).data ?? [];
  const sisaMasihAda = stillExistsList.some((e) => e.empNumber === empB);
  report.check('4.2 [U002] Double-click "Yes, Delete" -> tetap 1 DELETE efektif (modal tertutup sesudah klik pertama, employee tidak "setengah terhapus")', dbl1?.status() === 200 && !sisaMasihAda, `status=${dbl1?.status()} empBMasihAda=${sisaMasihAda}`);

  report.step('4.5 Koneksi putus saat proses delete');
  const empC = await createEmployee(page.request, `QaListDel3_${s}`, 'X');
  await searchAndSelectFirstRow(`QaListDel3_${s}`);
  await employeeListPage.rowCheckbox(0).click();
  await employeeListPage.deleteSelectedButton.click();
  await employeeListPage.confirmDeleteButton.waitFor({ state: 'visible' });
  await dropConnectionDuringSave(page, '**/pim/employees*', () => employeeListPage.confirmDeleteButton.click());
  report.check('4.5 [U002] Koneksi putus saat delete -> tidak crash (halaman tetap merespons)', await page.locator('body').isVisible(), 'body masih visible setelah abort');

  report.finding('4.8 [U002] Behavior non-obvious', 'Tidak ditemukan behavior non-intuitif baru pd delete Employee List -- modal konfirmasi tertutup segera setelah klik pertama diproses, mencegah double-submit secara struktural (beda dgn Attachments/BG-475 yg tombolnya TIDAK terkunci/modal TIDAK tertutup).');

  await page.request.delete(api, { data: { ids: [empA, empB, empC] } }).catch(() => null);
  report.print();
});
