/**
 * ================================================================================
 * TC-TIME-PROJECT-02 — Verify Activities, Projects And Customers With Logged Time Cannot Be Deleted
 * Modul    : Time - Project Info (Customers / Projects / Activities)
 * Kategori : Positive (+) 1.1-D 1.4 -- Referential Integrity
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-TIME-PROJECT-02-Verify-Delete-Blocked-When-Time-Logged.spec.ts
 * Path     : tests/time/project/
 * ================================================================================
 *
 * TUJUAN:
 *   Setelah karyawan mencatat jam ke project+activity baru, Admin mencoba menghapus
 *   activity, project, lalu customer-nya. Confirmed live: ketiganya 400 dgn pesan jelas
 *   ("Not Allowed to Delete Project Activities Which Have Time Logged Against", dst) dan
 *   timesheet karyawan tetap utuh. Kontrol: activity KEDUA yg belum dipakai BISA dihapus (200)
 *   -- membuktikan penolakan memang karena jam tercatat, bukan larangan hapus umum.
 *
 * RUN COMMAND:
 *   npx playwright test tests/time/project/TC-TIME-PROJECT-02-Verify-Delete-Blocked-When-Time-Logged.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssTimesheet, getEssTimesheetEntries } from '../../../src/utils/createEssTimesheet';

const API = '/web/index.php/api/v2/time';

test('TC-TIME-PROJECT-02: activities, projects and customers with logged time cannot be deleted', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(150_000);
  const report = new TestReport('TC-TIME-PROJECT-02', 'Delete Blocked When Time Logged', env.baseURL, page);
  const stamp = Date.now();

  report.step('Setup: Customer -> Project -> 2 Activity (via API); ESS mencatat 01:00 ke activity pertama');
  const customerId = (await (await page.request.post(`${API}/customers`, { data: { name: `QaCustDel ${stamp}`, description: '' } })).json().catch(() => null))?.data?.id as number;
  const projectId = (await (await page.request.post(`${API}/projects`, { data: { name: `QaProjDel ${stamp}`, customerId, description: null, projectAdminsEmpNumbers: [] } })).json().catch(() => null))?.data?.id as number;
  const usedId = (await (await page.request.post(`${API}/project/${projectId}/activities`, { data: { name: 'QaUsed' } })).json().catch(() => null))?.data?.id as number;
  const unusedId = (await (await page.request.post(`${API}/project/${projectId}/activities`, { data: { name: 'QaUnused' } })).json().catch(() => null))?.data?.id as number;
  report.check('[API] Setup customer/project/2 activity berhasil', !!customerId && !!projectId && !!usedId && !!unusedId, `c=${customerId}, p=${projectId}, a=${usedId}/${unusedId}`);
  const { essPage, close, timesheetId, startDate } = await createEssTimesheet(page, browser, addEmployeePage, 'QaTimeDel', { submit: false });
  const log = await essPage.request.put(`${API}/timesheets/${timesheetId}/entries`, {
    data: { entries: [{ projectId, activityId: usedId, dates: { [startDate]: { duration: '01:00' } } }], deletedEntries: [] },
  });
  report.check('[API] ESS mencatat jam 200', log.status() === 200, `status=${log.status()}`);

  const expect400 = async (label: string, resp: import('@playwright/test').APIResponse, messagePart: RegExp) => {
    const body = await resp.json().catch(() => null);
    report.check(label, resp.status() === 400 && messagePart.test(body?.error?.message ?? ''), `status=${resp.status()}, message=${body?.error?.message}`);
  };

  report.step('[Admin API] Hapus activity yg SUDAH dipakai');
  await expect400('[API] Delete activity terpakai -> 400 + pesan', await page.request.delete(`${API}/project/${projectId}/activities`, { data: { ids: [usedId] } }), /Time Logged/i);
  report.step('[Admin API] Hapus project & customer yg punya jam tercatat');
  await expect400('[API] Delete project -> 400 + pesan', await page.request.delete(`${API}/projects`, { data: { ids: [projectId] } }), /Time Logged/i);
  await expect400('[API] Delete customer -> 400 + pesan', await page.request.delete(`${API}/customers`, { data: { ids: [customerId] } }), /Time Logged/i);

  report.step('[Admin API] Kontrol: activity yg BELUM dipakai bisa dihapus');
  const delUnused = await page.request.delete(`${API}/project/${projectId}/activities`, { data: { ids: [unusedId] } });
  report.check('[API] Delete activity tak terpakai -> 200', delUnused.status() === 200, `status=${delUnused.status()}`);

  report.step('[ESS API] Timesheet karyawan tetap utuh');
  const rows = (await getEssTimesheetEntries(essPage, timesheetId))?.data ?? [];
  const row = rows.find((r) => r.project.id === projectId);
  report.check('Baris project tetap ada dgn 01:00', row?.total?.label === '01:00' && row?.activity?.id === usedId, `row=${JSON.stringify(row?.total)}`);

  await close();
  report.print();
});
