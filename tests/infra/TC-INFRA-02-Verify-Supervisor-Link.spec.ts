/**
 * ================================================================================
 * TC-INFRA-02 — Verify assignSupervisor() Links A Supervisor To A Fresh Employee
 * Modul    : Infrastruktur - Fixture Multi-Role (Fase 1)
 * Kategori : Smoke (prasyarat Fase 2: approval flow butuh relasi supervisor->subordinate)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-INFRA-02-Verify-Supervisor-Link.spec.ts
 * Path     : tests/infra/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi `assignSupervisor()` (Fase 1, src/utils/assignSupervisor.ts) berhasil
 *   menautkan seorang supervisor ke employee baru via Report-to, diverifikasi lewat status
 *   response API (bukan teks UI stlh save -- itu known issue terdokumentasi, lihat komentar di
 *   assignSupervisor.ts), DAN lewat API GET Report-to independen stlh save.
 *
 * RUN COMMAND:
 *   npx playwright test tests/infra/TC-INFRA-02-Verify-Supervisor-Link.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';
import { createEssAccount } from '../../src/utils/createEssAccount';
import { assignSupervisor } from '../../src/utils/assignSupervisor';
import { getLoggedInEmployeeName } from '../../src/utils/getLoggedInEmployeeName';

test('TC-INFRA-02: assignSupervisor() links the logged-in Admin as supervisor of a fresh ESS employee', async ({
  page,
  addEmployeePage,
  reportToPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-INFRA-02', 'Supervisor Link', env.baseURL, page);

  report.step('Buat employee ESS baru, catat identitas Admin yg login (bakal jadi supervisor)');
  const ess = await createEssAccount(page, addEmployeePage, 'QaInfraSup');
  const admin = await getLoggedInEmployeeName(page);
  report.check('Employee ESS baru berhasil dibuat', !!ess.empNumber, `empNumber=${ess.empNumber}`);

  report.step(`Assign "${admin.fullName}" sbg supervisor Direct dari employee ESS baru`);
  const { status } = await assignSupervisor(page, reportToPage, ess.empNumber, admin.fullName);
  report.check('[API] POST supervisor berhasil (status 200)', status === 200, `status=${status}`);

  report.step('Verify via API independen: relasi supervisor benar2 tersimpan di server');
  const getResp = await page.request.get(`/web/index.php/api/v2/pim/employees/${ess.empNumber}/supervisors?limit=50`);
  const getBody = await getResp.json().catch(() => null);
  const supervisorNames: string[] = (getBody?.data ?? []).map(
    (s: { supervisor?: { firstName?: string; lastName?: string } }) => `${s.supervisor?.firstName} ${s.supervisor?.lastName}`,
  );
  report.check(
    '[API] GET supervisors mengandung nama Admin yg baru di-assign',
    supervisorNames.some((n) => n.includes(admin.fullName.split(' ')[0] ?? admin.fullName)),
    `status=${getResp.status()}, supervisorNames=${JSON.stringify(supervisorNames)}`,
  );

  report.print();
});
