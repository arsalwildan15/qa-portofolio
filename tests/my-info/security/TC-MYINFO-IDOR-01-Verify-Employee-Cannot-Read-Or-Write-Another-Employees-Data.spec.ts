/**
 * ================================================================================
 * TC-MYINFO-IDOR-01 — Verify An Employee Cannot Read Or Write Another Employee's PIM Data Via The API
 * Modul    : My Info - semua tab (ESS, API authorization)
 * Kategori : Security (S) 5.2-IDOR
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-MYINFO-IDOR-01-Verify-Employee-Cannot-Read-Or-Write-Another-Employees-Data.spec.ts
 * Path     : tests/my-info/security/
 * ================================================================================
 *
 * TUJUAN:
 *   My Info menampilkan data karyawan sendiri. Lewat API, karyawan tidak boleh membaca atau
 *   mengubah data karyawan LAIN dgn mengganti empNumber di URL. TC: satu akun ESS "korban"
 *   (diberi data kontak nyata oleh Admin) + satu akun ESS "penyerang". Dari sesi penyerang:
 *     5.2-IDOR  GET tiap endpoint tab milik korban (personal, contact (path TUNGGAL "employee"),
 *               emergency, dependents, immigration, job, salary, report-to, qualifications,
 *               memberships, custom fields, attachments) -> 403/404/422, tidak 200 berisi data.
 *     5.2-IDOR  PUT contact-details korban -> ditolak & data korban TIDAK berubah.
 *   Kontrol positif: penyerang membaca endpoint yg SAMA utk dirinya sendiri -> 200.
 *
 * RUN COMMAND:
 *   npx playwright test tests/my-info/security/TC-MYINFO-IDOR-01-Verify-Employee-Cannot-Read-Or-Write-Another-Employees-Data.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssAccount } from '../../../src/utils/createEssAccount';
import { loginAs } from '../../../src/utils/loginAs';

const ep = (emp: number, suffix: string) => `/web/index.php/api/v2/pim/${suffix.includes('contact-details') ? 'employee' : 'employees'}/${emp}${suffix.startsWith('/') ? '' : '/'}${suffix}`.replace('employee//', 'employee/').replace('employees//', 'employees/');

test('TC-MYINFO-IDOR-01: an employee cannot read or write another employee PIM data via the API', async ({ page, browser, addEmployeePage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-MYINFO-IDOR-01', 'Employee Cannot Read Or Write Another Employees Data', env.baseURL, page);

  report.step('Setup: ESS korban (dgn data kontak dari Admin) + ESS penyerang');
  const victim = await createEssAccount(page, addEmployeePage, 'QaIdorVictim');
  const secret = `Jl. Rahasia ${Date.now() % 100000}`;
  await page.request.put(`/web/index.php/api/v2/pim/employee/${victim.empNumber}/contact-details`, { data: { street1: secret, city: 'Bandung' } });
  const attacker = await createEssAccount(page, addEmployeePage, 'QaIdorAttacker');
  const { page: atk, close } = await loginAs(browser, attacker.username, attacker.password);

  const READ: Array<[string, string]> = [
    ['personal-details', 'personal-details'], ['contact-details', 'contact-details'],
    ['emergency-contacts', 'emergency-contacts?limit=50&offset=0'], ['dependents', 'dependents?limit=50&offset=0'],
    ['immigration', 'immigrations?limit=50&offset=0'], ['job-details', 'job-details'],
    ['salary', 'salary-components?limit=50&offset=0'], ['supervisors', 'supervisors?limit=50&offset=0'],
    ['qualifications (skills)', 'skills?limit=50&offset=0'], ['memberships', 'memberships?limit=50&offset=0'],
    ['custom-fields', 'custom-fields?screen=personal'], ['attachments', 'screen/personal/attachments?limit=50&offset=0'],
    ['employee record', ''],
  ];

  report.step('[Penyerang API] Baca tiap tab milik korban');
  let leaks = 0;
  for (const [label, suffix] of READ) {
    const r = await atk.request.get(ep(victim.empNumber, suffix));
    const refused = [403, 404, 422].includes(r.status());
    report.check(`5.2-IDOR GET ${label} korban ditolak (403/404/422)`, refused, `status=${r.status()}`);
    if (!refused) leaks++;
  }
  report.finding('Jumlah endpoint korban yg bocor', String(leaks));

  report.step('[Penyerang API] Tulis contact-details korban');
  const w = await atk.request.put(`/web/index.php/api/v2/pim/employee/${victim.empNumber}/contact-details`, { data: { street1: 'HACKED by other ESS' } });
  report.check('5.2-IDOR PUT contact-details korban ditolak (4xx)', w.status() >= 400 && w.status() < 500, `status=${w.status()}`);
  const victimNow = (await (await page.request.get(`/web/index.php/api/v2/pim/employee/${victim.empNumber}/contact-details`)).json().catch(() => null))?.data;
  report.check('5.2-IDOR Data korban TIDAK berubah', victimNow?.street1 === secret, `street1=${victimNow?.street1}`);

  report.step('[Penyerang API] Kontrol positif: baca data sendiri');
  const own = await atk.request.get(ep(attacker.empNumber, 'personal-details'));
  report.check('[Kontrol] GET personal-details sendiri -> 200', own.status() === 200, `status=${own.status()}`);

  await close();
  report.print();
});
