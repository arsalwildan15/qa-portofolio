/**
 * ================================================================================
 * TC-MAINT-SECURITY-01 — Verify The "Administrator Access" Password Prompt Protects Purge And Data Download On The Server, Not Only In The UI
 * Modul    : Maintenance (U010 Purge Employee, U086 Purge Candidate, U087 Access Records)
 * Kategori : Edge (!) 4.8 | Security (S) 5.9 | API (A) 6.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MAINT-SECURITY-01-Verify-The-Administrator-Access-Password-Prompt-Is-Enforced-By-The-Server.spec.ts
 * Path     : tests/maintenance/security/
 * ================================================================================
 *
 * LATAR: setiap menu Maintenance meminta password Admin lagi ("Administrator Access",
 * POST /web/index.php/auth/adminVerify) sebelum operasi yang tak bisa dibatalkan (purge) atau
 * pengunduhan data pribadi. Kontrol re-autentikasi seperti ini hanya bermakna bila server yang
 * menegakkannya; bila hanya UI, sesi Admin yang dicuri/ditinggal terbuka bisa langsung purge.
 *
 * TUJUAN (sesi Admin BARU yang belum pernah melewati prompt; data uji milik TC ini):
 *   4.8  Kontrol: membuka halaman Purge Employee pada sesi baru memang menampilkan prompt password.
 *   5.9 / 6.1  Tanpa melewati prompt, server MENOLAK:
 *        DELETE maintenance/purge (karyawan uji yg sudah di-terminate),
 *        DELETE maintenance/candidates/purge (lowongan uji berisi 1 kandidat),
 *        GET maintenance/accessEmployeeData/<empNumber> (data pribadi karyawan uji),
 *        dan datanya tetap ada / tidak bocor.
 *
 * HASIL 17 Nov 2026 (probe): ketiganya dijawab 200 tanpa prompt -> data ter-purge / terunduh = BUG
 *   BG-440 (High, SENGAJA FAILED, R3).
 *
 * RUN COMMAND:
 *   npx playwright test tests/maintenance/security/TC-MAINT-SECURITY-01-Verify-The-Administrator-Access-Password-Prompt-Is-Enforced-By-The-Server.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { loginAs } from '../../../src/utils/loginAs';
import { createEmployee, createPastEmployee, createVacancyWithCandidate } from '../../../src/utils/maintenanceData';

const API = '/web/index.php/api/v2/';

test('TC-MAINT-SECURITY-01: the Administrator Access prompt is enforced by the server', async ({ page, browser }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MAINT-SECURITY-01', 'Administrator Access Prompt Enforced By Server', env.baseURL);
  const s = `${Date.now() % 100000}`;
  const past = await createPastEmployee(page.request, 'QaGate', `P${s}`);
  const subject = await createEmployee(page.request, 'QaGate', `D${s}`);
  const vac = await createVacancyWithCandidate(page.request, 'QaGateVac');
  const fresh = await loginAs(browser, env.username, env.password);
  try {
    report.step('Kontrol: sesi baru memang diminta password');
    await fresh.page.goto('/web/index.php/maintenance/purgeEmployee');
    const prompted = await fresh.page.getByText('Administrator Access').waitFor({ timeout: 30_000 }).then(() => true, () => false);
    report.check('4.8 Sesi Admin baru -> halaman Purge menampilkan prompt "Administrator Access"', prompted);

    report.step('Tanpa melewati prompt: panggil operasinya langsung');
    const req = fresh.page.request;
    const p1 = await req.delete(`${API}maintenance/purge`, { data: { empNumber: past } });
    const pastLeft = (await page.request.get(`${API}pim/employees/${past}/personal-details`)).status() === 200;
    report.check('5.9 / 6.1 Purge karyawan tanpa melewati prompt -> ditolak & karyawan tetap ada', p1.status() >= 400 && pastLeft, `status=${p1.status()}, karyawanMasihAda=${pastLeft}`);
    const p2 = await req.delete(`${API}maintenance/candidates/purge`, { data: { vacancyId: vac.vacancyId } });
    const candLeft = (await page.request.get(`${API}recruitment/candidates/${vac.candidateId}`)).status() === 200;
    report.check('5.9 / 6.1 Purge kandidat tanpa melewati prompt -> ditolak & kandidat tetap ada', p2.status() >= 400 && candLeft, `status=${p2.status()}, kandidatMasihAda=${candLeft}`);
    const dl = await req.get(`/web/index.php/maintenance/accessEmployeeData/${subject}`, { maxRedirects: 0 });
    const leaked = /"Employee"\s*:\s*\[\s*\{/.test(await dl.text());
    report.check('5.9 / 6.1 Unduh data pribadi tanpa melewati prompt -> ditolak, tanpa data', !leaked && dl.status() !== 200, `status=${dl.status()}, dataBocor=${leaked}`);
  } finally {
    await fresh.close();
    await page.request.delete(`${API}maintenance/purge`, { data: { empNumber: past } }).catch(() => null);
    await page.request.delete(`${API}maintenance/candidates/purge`, { data: { vacancyId: vac.vacancyId } }).catch(() => null);
    await page.request.delete(`${API}recruitment/vacancies`, { data: { ids: [vac.vacancyId] } });
    await page.request.delete(`${API}pim/employees`, { data: { ids: [subject] } });
  }
  report.print();
});
