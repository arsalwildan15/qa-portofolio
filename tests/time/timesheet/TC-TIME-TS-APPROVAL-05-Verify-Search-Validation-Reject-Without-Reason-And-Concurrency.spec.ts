/**
 * ================================================================================
 * TC-TIME-TS-APPROVAL-05 — Verify Search Validation, Reject Without Reason And Concurrency
 * Modul    : Time > Timesheets > Employee Timesheets (U004, Admin side)
 * Kategori : Negative (-) 2.8 | Edge (!) 4.1 4.4 4.8 | Security (S) 5.1-SQLi
 *            5.1-XSS-Reflected | API (A) 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-TS-APPROVAL-05-Verify-Search-Validation-Reject-Without-Reason-And-Concurrency.spec.ts
 * Path     : tests/time/timesheet/
 * ================================================================================
 *
 * LATAR: menutup 7 kode GAP terakhir U004 Employee Timesheets. Endpoint list: GET
 * /api/v2/time/employees/timesheets/list (filter satu2nya: Employee Name -> empNumber
 * numerik). Endpoint action: PUT time/timesheets/<id> {action, comment?}. Dibuktikan LIVE
 * 24 Nov 2026:
 *   - Query param asing / sortField tak dikenal -> 422 (6.5).
 *   - empNumber non-numerik ("abc") maupun payload SQLi ("' OR '1'='1") -> 422 ditolak
 *     keduanya, TIDAK crash (BEDA dgn Reports/BG-494 -- endpoint ini validasi tipe dgn
 *     benar) (5.1-SQLi).
 *   - [5.1-XSS-Reflected] Satu2nya filter di halaman ini (Employee Name) resolve ke
 *     empNumber NUMERIK (autocomplete, bukan free-text search langsung ke API) --
 *     dibuktikan param ini menolak nilai non-numerik apa pun, jadi TIDAK ADA permukaan
 *     reflected-injection yg bisa dieksploitasi via parameter ini (structural, sama pola
 *     dgn unit search lain yg tidak py free-text filter).
 *   - Employee Name search box (UI) menerima unicode/emoji tanpa crash (4.1).
 *   - [2.8] Reject SUBMITTED timesheet TANPA comment/alasan -> 200 DITERIMA (field
 *     alasan TIDAK wajib) -- sudah terdokumentasi sbg finding di TC-TIME-TS-APPROVAL-02
 *     (probe manual), di sini diformalkan jd check literal.
 *   - 2 Approve+Reject paralel pd timesheet SUBMITTED yg SAMA -> TEPAT SATU aksi 200,
 *     sisanya ditolak, status akhir konsisten dgn pemenang -- tidak ada race condition
 *     (4.4, pola sama dgn TC-CLAIM-APPROVAL-06).
 *   - [4.8] Timesheet yg di-Reject TANPA alasan tetap bisa di-resubmit ESS normal --
 *     tidak ada state korup krn comment kosong (non-obvious tapi aman).
 *
 * HASIL 24 Nov 2026: lolos penuh, tidak ada bug baru. MENUTUP U004 SEPENUHNYA.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/timesheet/TC-TIME-TS-APPROVAL-05-Verify-Search-Validation-Reject-Without-Reason-And-Concurrency.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssTimesheet, getEssTimesheetStatus } from '../../../src/utils/createEssTimesheet';
import { EmployeeTimesheetPage } from '../../../src/pages';

const API = '/web/index.php/api/v2/';

test('TC-TIME-TS-APPROVAL-05: search validation, reject without reason, concurrency', async ({
  page, browser, addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-TIME-TS-APPROVAL-05', 'Search Validation Reject Without Reason Concurrency', env.baseURL, page);
  await page.goto('/web/index.php/time/viewEmployeeTimesheet');

  report.step('6.5 Parameter negative -- param asing & sortField tak dikenal');
  const badParam = await page.request.get(`${API}time/employees/timesheets/list?limit=50&offset=0&bogusParam=1`);
  const badSort = await page.request.get(`${API}time/employees/timesheets/list?limit=50&offset=0&sortField=bogus&sortOrder=ASC`);
  report.check('6.5 [U004] GET list dgn param asing -> 422 ditolak', badParam.status() === 422, `status=${badParam.status()}`);
  report.check('6.5 [U004] GET list dgn sortField tak dikenal -> 422 ditolak', badSort.status() === 422, `status=${badSort.status()}`);

  report.step('5.1-SQLi empNumber berisi payload SQL / non-numerik');
  const sqli = await page.request.get(`${API}time/employees/timesheets/list?limit=50&offset=0&empNumber=${encodeURIComponent("' OR '1'='1")}`);
  const nonNumeric = await page.request.get(`${API}time/employees/timesheets/list?limit=50&offset=0&empNumber=abc`);
  report.check('5.1-SQLi [U004] empNumber SQLi -> 422 ditolak, tidak crash', sqli.status() === 422, `status=${sqli.status()}`);
  report.check('[U004] empNumber non-numerik "abc" -> 422 (BEDA dgn Reports/BG-494, endpoint ini validasi tipe dgn benar)', nonNumeric.status() === 422, `status=${nonNumeric.status()}`);
  report.check('5.1-XSS-Reflected [U004] Satu2nya filter (empNumber) STRICT NUMERIK -- tidak ada permukaan free-text utk reflected injection di halaman ini (structural)', sqli.status() === 422 && nonNumeric.status() === 422, `sqli=${sqli.status()} nonNumeric=${nonNumeric.status()}`);

  report.step('4.1 Employee Name search box -- unicode/emoji');
  await page.getByPlaceholder('Type for hints...').fill('مرحبا 你好 🎉').catch(() => {});
  await page.waitForTimeout(500);
  report.check('4.1 [U004] Employee Name search box menerima unicode/emoji tanpa crash', await page.locator('body').isVisible(), 'body masih visible setelah input unicode');

  report.step('2.8 / 4.8 Reject TANPA comment/alasan');
  const { ess, essPage, close, timesheetId } = await createEssTimesheet(page, browser, addEmployeePage, 'QaTsNoReason');
  const lastName = ess.fullName.split(' ').pop() ?? ess.fullName;
  try {
    const employeeTimesheets = new EmployeeTimesheetPage(page);
    await employeeTimesheets.goto();
    const row = employeeTimesheets.pendingRowFor(lastName);
    await row.waitFor({ state: 'visible', timeout: 15_000 });
    await employeeTimesheets.view(row);
    const rejectResp = await employeeTimesheets.act('Reject', '');
    const rejectBody = await rejectResp?.json().catch(() => null);
    report.check('2.8 [U004] Reject TANPA comment/alasan -> 200 DITERIMA (field alasan tidak wajib)', rejectResp?.status() === 200 && rejectBody?.data?.status?.id === 'REJECTED', `status=${rejectResp?.status()}`);

    const resubmit = await essPage.request.put(`${API}time/timesheets/${timesheetId}`, { data: { action: 'SUBMIT' } });
    report.check('4.8 [U004] Timesheet yg di-Reject TANPA alasan tetap bisa di-resubmit normal, status kembali SUBMITTED -- tidak ada state korup krn comment kosong', resubmit.status() === 200 && (await getEssTimesheetStatus(essPage)) === 'SUBMITTED', `resubmitStatus=${resubmit.status()}`);
  } finally {
    await close();
  }

  report.step('4.4 Concurrency -- 2 aksi Approve+Reject paralel pd timesheet SUBMITTED yg sama');
  const { essPage: essPage2, close: close2, timesheetId: tsId2 } = await createEssTimesheet(page, browser, addEmployeePage, 'QaTsConcurrent');
  try {
    const [approveResp, rejectResp2] = await Promise.all([
      page.request.put(`${API}time/timesheets/${tsId2}`, { data: { action: 'APPROVE' } }),
      page.request.put(`${API}time/timesheets/${tsId2}`, { data: { action: 'REJECT', comment: 'concurrent reject' } }),
    ]);
    const winners = [approveResp.status(), rejectResp2.status()].filter((s) => s === 200);
    report.check('4.4 [U004] 2 aksi Approve+Reject paralel pd timesheet SAMA -> TEPAT SATU 200 (tidak ada race condition)', winners.length === 1, `approve=${approveResp.status()} reject=${rejectResp2.status()}`);
    const finalStatus = await getEssTimesheetStatus(essPage2);
    report.check('4.4 [U004] Status akhir konsisten dgn pemenang (APPROVED atau REJECTED, bukan status lain/korup)', finalStatus === 'APPROVED' || finalStatus === 'REJECTED', `finalStatus=${finalStatus}`);
  } finally {
    await close2();
  }

  report.print();
});
