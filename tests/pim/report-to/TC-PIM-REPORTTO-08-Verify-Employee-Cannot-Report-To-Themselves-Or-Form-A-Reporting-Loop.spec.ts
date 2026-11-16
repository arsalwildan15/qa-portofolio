/**
 * ================================================================================
 * TC-PIM-REPORTTO-08 — Verify An Employee Cannot Be Their Own Supervisor And Two Employees Cannot Supervise Each Other
 * Modul    : PIM - Employee > Report-to (U095)
 * Kategori : Positive (+) 1.4 | Security (S) 5.9 | API (A) 6.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTTO-08-Verify-Employee-Cannot-Report-To-Themselves-Or-Form-A-Reporting-Loop.spec.ts
 * Path     : tests/pim/report-to/
 * ================================================================================
 *
 * LATAR: rantai supervisor dipakai alur approval (Leave, Claim, Performance, Timesheet), jadi
 * hubungan atasan yg tidak masuk akal membuka celah approval diri sendiri (taksonomi 5.9).
 *
 * TUJUAN (sesi Admin, 2 karyawan uji A & B dibuat lewat API dan dihapus di akhir):
 *   1.4 / 6.1  Kontrol: B jadi supervisor A -> 200 & tampil di Supervisors A dan Subordinates B.
 *   5.9  A dijadikan supervisor dirinya sendiri -> 4xx.
 *   5.9  B (sudah supervisor A) dijadikan subordinate A -> 4xx (tidak boleh saling membawahi).
 *   5.9  Daftar Supervisors & Subordinates A tidak memuat A sendiri, dan B tidak ada di keduanya.
 *
 * HASIL 17 Nov 2026 (dibuktikan probe): kedua permintaan yg tidak masuk akal diterima 200 dan tampil
 *   di halaman Report-to = BUG BG-438 (Medium, SENGAJA FAILED, R3).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/report-to/TC-PIM-REPORTTO-08-Verify-Employee-Cannot-Report-To-Themselves-Or-Form-A-Reporting-Loop.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const API = '/web/index.php/api/v2/';
const is4xx = (n: number) => n >= 400 && n < 500;
type Rel = { supervisor?: { empNumber: number }; subordinate?: { empNumber: number } };

test('TC-PIM-REPORTTO-08: an employee cannot report to themselves or form a reporting loop', async ({ page }) => {
  const report = new TestReport('TC-PIM-REPORTTO-08', 'Employee Cannot Report To Themselves Or Form A Loop', env.baseURL, page);
  const s = `${Date.now() % 100000}`;
  const make = async (first: string, i: number) => {
    const r = await page.request.post(`${API}pim/employees`, { data: { firstName: first, lastName: `Rt${s}`, middleName: '', employeeId: `R${Date.now().toString().slice(-8)}${i}` } });
    return ((await r.json()) as { data: { empNumber: number } }).data.empNumber;
  };
  const a = await make('QaRtA', 1);
  const b = await make('QaRtB', 2);
  const rel = async (emp: number, kind: 'supervisors' | 'subordinates') =>
    (((await (await page.request.get(`${API}pim/employees/${emp}/${kind}`)).json()) as { data: Rel[] }).data).map((x) => (x.supervisor ?? x.subordinate)?.empNumber);
  try {
    report.step('Kontrol: B menjadi supervisor A');
    const ok = await page.request.post(`${API}pim/employees/${a}/supervisors`, { data: { empNumber: b, reportingMethodId: 1 } });
    const supA = await rel(a, 'supervisors');
    const subB = await rel(b, 'subordinates');
    report.check('1.4 / 6.1 B jadi supervisor A -> 200, tampil di Supervisors A & Subordinates B', ok.status() === 200 && supA.includes(b) && subB.includes(a), `status=${ok.status()}, supervisorsA=${supA}, subordinatesB=${subB}`);

    report.step('A menjadi supervisor dirinya sendiri');
    const self = await page.request.post(`${API}pim/employees/${a}/supervisors`, { data: { empNumber: a, reportingMethodId: 1 } });
    report.check('5.9 A dijadikan supervisor dirinya sendiri -> 4xx', is4xx(self.status()), `status=${self.status()} ${(await self.text()).slice(0, 100)}`);

    report.step('B sekaligus supervisor & subordinate A');
    const loop = await page.request.post(`${API}pim/employees/${a}/subordinates`, { data: { empNumber: b, reportingMethodId: 1 } });
    report.check('5.9 B (supervisor A) dijadikan subordinate A -> 4xx (tidak boleh saling membawahi)', is4xx(loop.status()), `status=${loop.status()} ${(await loop.text()).slice(0, 100)}`);

    report.step('Status akhir daftar Report-to A');
    const sup = await rel(a, 'supervisors');
    const sub = await rel(a, 'subordinates');
    report.check('5.9 Daftar Report-to A tidak memuat A sendiri', !sup.includes(a) && !sub.includes(a), `supervisors=${sup}, subordinates=${sub}`);
    report.check('5.9 B tidak sekaligus supervisor & subordinate A', !(sup.includes(b) && sub.includes(b)), `supervisors=${sup}, subordinates=${sub}`);
    await page.goto(`/web/index.php/pim/viewReportToDetails/empNumber/${a}`);
    await page.waitForLoadState('networkidle');
    const rows = await page.locator('.oxd-table-card').allInnerTexts();
    report.finding('Tampilan halaman Report-to A', rows.map((r) => r.replace(/\s+/g, ' ')).join(' | ') || '(kosong)');
  } finally {
    await page.request.delete(`${API}pim/employees`, { data: { ids: [a, b] } });
  }
  report.print();
});
