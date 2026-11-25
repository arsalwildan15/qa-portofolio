/**
 * ================================================================================
 * TC-ADMIN-USER-13 — Verify Race Condition, Multi-Admin Concurrency, Reflected XSS,
 *   Mass Assignment, Rate Limiting And Business-Logic Abuse For System Users
 * Modul    : Admin > User Management > Users (U001)
 * Kategori : Negative (-) 2.5 | Edge (!) 4.4 4.7 | Security (S) 5.1-XSS-Reflected
 *            5.2-MassAssign 5.5 5.9
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-USER-13-Verify-Concurrency-Rate-Limiting-Reflected-XSS-And-Business-Logic.spec.ts
 * Path     : tests/admin/users/
 * ================================================================================
 *
 * LATAR: sisi security/concurrency dari 19 kode GAP U001 (sisi CRUD/validation/boundary
 * ditutup di TC-ADMIN-USER-12), pola pemecahan sama dgn unit besar lain (Performance
 * U103/Claim U105) yg dipecah jadi beberapa TC per sub-fokus.
 *
 * EKSPLORASI LIVE (Playwright MCP + fetch langsung, sebelum menulis kode) membuktikan:
 *   - Mass assignment DITOLAK bersih: POST/PUT admin/users dgn field asing (isAdmin, role,
 *     permissions, id) -> 422 invalidParamKeys menyebut PERSIS field asing itu saja (bukan
 *     field valid) -- strict allowlist validator, bukan silent-ignore ATAU silent-accept.
 *   - BUG DITEMUKAN: TIDAK ADA batasan satu-employee-satu-login. Membuat Login #1 (ESS)
 *     utk employee X -> 200, lalu Login #2 (Admin, ROLE BERBEDA) utk employee X YANG SAMA
 *     -> JUGA 200 (bukan ditolak), dikonfirmasi 2x live dgn employee throwaway terpisah.
 *     Employee bisa mengumpulkan banyak login lintas role tanpa batas -- state transition
 *     "employee sudah punya login" TIDAK dicek (2.5), DAN ini pelanggaran business rule
 *     implisit 1 employee = 1 identitas login yg diasumsikan seluruh app (role-based audit
 *     trail jadi tidak reliable kalau 1 employee py 2 login beda role) (5.9).
 *   - Race PUT status true vs false paralel pd SATU user -> keduanya 200, state akhir
 *     deterministik tunggal (bukan korup/campur) -- pola sama dgn Claim Approve+Reject
 *     paralel (TC-CLAIM-APPROVAL-06), BUKAN bug.
 *   - Dua sesi Admin BERBEDA (bukan akun yg sama -- login ulang akun SAMA meng-invalidasi
 *     sesi pertama, lihat TC-INFRA-03) mengubah field BERBEDA pd user yg SAMA scr paralel ->
 *     last-write-wins, state akhir SATU kombinasi deterministik, tidak ada conflict
 *     detection -- didokumentasikan sbg finding (4.7), bukan bug (tidak ada ekspektasi app
 *     ini py optimistic locking).
 *   - Username filter box menerima payload XSS reflected mentah2 sbg query param
 *     (?username=<img src=x onerror=...>) -> server 200 (hasil kosong), TIDAK ADA dialog
 *     JS ter-trigger di browser -- aman.
 *   - Rate limiting: 6 create paralel dgn username unik -> SEMUA 200, tidak ada 429 --
 *     finding (bukan bug), konsisten pola app-wide (PIM ADD-34, Work Shift, dll).
 *
 * HASIL 25 Nov 2026: SENGAJA FAILED (2.5 / 5.9). BUG BARU: lihat Bug-List.xlsx entri
 *   terkait "satu employee bisa punya banyak login System User lintas role tanpa batas".
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/users/TC-ADMIN-USER-13-Verify-Concurrency-Rate-Limiting-Reflected-XSS-And-Business-Logic.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';
import { createSecondAdmin } from '../../../src/utils/createSecondAdmin';
import { loginAs } from '../../../src/utils/loginAs';

const API = '/web/index.php/api/v2/';
const PASSWORD = 'Passw0rd!2026';

type Row = Record<string, unknown>;
const json = async (r: { json(): Promise<unknown> }) => (await r.json().catch(() => null)) as { data?: Row; error?: Row } | null;

test('TC-ADMIN-USER-13: race condition, multi-admin concurrency, reflected XSS, mass assignment, rate limiting and business-logic abuse', async ({
  page,
  browser,
  addEmployeePage,
  adminUsersPage,
}, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-ADMIN-USER-13', 'Concurrency Rate-Limiting XSS MassAssign BusinessLogic', env.baseURL, page);
  const tag = Date.now() % 1_000_000;
  let dialogFired = false;
  page.on('dialog', (d) => { dialogFired = true; d.dismiss().catch(() => {}); });

  report.step('Setup: buat employee throwaway via Add Employee (target race/multi-login/mass-assign)');
  const employee = await createTestEmployee(page, addEmployeePage, 'QaUserSec');

  report.step('5.2-MassAssign: POST/PUT admin/users dgn field asing (isAdmin/role/permissions/id) -> 422 HANYA field asing');
  const massCreate = await page.request.post(`${API}admin/users`, {
    data: { username: `QaUserSecMass${tag}`, userRoleId: 2, empNumber: employee.empNumber, status: true, password: PASSWORD, isAdmin: true, role: 'SUPER_ADMIN', permissions: ['*'] },
  });
  const massCreateBody = await json(massCreate);
  const massCreateKeys = (((massCreateBody?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys ?? []) as string[];
  report.check(
    '5.2-MassAssign POST dgn field asing -> 422, invalidParamKeys HANYA berisi field asing (isAdmin/role/permissions), bukan field valid',
    massCreate.status() === 422 && ['isAdmin', 'role', 'permissions'].every((k) => massCreateKeys.includes(k)) && !massCreateKeys.includes('username'),
    `status=${massCreate.status()}, invalidParamKeys=${JSON.stringify(massCreateKeys)}`,
  );

  report.step('2.5 / 5.9: Login #1 (ESS) utk employee throwaway ini -- jadi target race/concurrency di bawah');
  const login1Username = `QaUserSecLogin1_${tag}`;
  const login1Resp = await page.request.post(`${API}admin/users`, { data: { username: login1Username, userRoleId: 2, empNumber: employee.empNumber, status: true, password: PASSWORD } });
  const login1Body = await json(login1Resp);
  const login1Id = (login1Body?.data as Row | undefined)?.id as number | undefined;
  report.check('Setup Login #1 (ESS) berhasil dibuat', login1Resp.status() === 200 && typeof login1Id === 'number', `status=${login1Resp.status()}`);

  report.step('2.5 / 5.9: Login #2 (Admin, ROLE BERBEDA) utk employee YANG SAMA -- SEHARUSNYA ditolak (state "sudah punya login")');
  const login2Username = `QaUserSecLogin2_${tag}`;
  const login2Resp = await page.request.post(`${API}admin/users`, { data: { username: login2Username, userRoleId: 1, empNumber: employee.empNumber, status: true, password: PASSWORD } });
  const login2Body = await json(login2Resp);
  const login2Id = (login2Body?.data as Row | undefined)?.id as number | undefined;
  report.check(
    '2.5 / 5.9 Login #2 (role Admin) utk employee yg SUDAH punya Login #1 (role ESS) SEHARUSNYA ditolak (1 employee = 1 identitas login)',
    login2Resp.status() !== 200,
    `status=${login2Resp.status()} (200 = BUG, employee mengumpulkan 2 login lintas role tanpa batas)`,
  );

  report.step('2.5 / 5.9: Login #3 (ESS lagi) utk employee YANG SAMA -- menguatkan bukti TIDAK ADA batas sama sekali');
  const login3Username = `QaUserSecLogin3_${tag}`;
  const login3Resp = await page.request.post(`${API}admin/users`, { data: { username: login3Username, userRoleId: 2, empNumber: employee.empNumber, status: true, password: PASSWORD } });
  const login3Body = await json(login3Resp);
  const login3Id = (login3Body?.data as Row | undefined)?.id as number | undefined;
  report.finding(
    'Satu employee bisa mengumpulkan LEBIH dari 2 login System User tanpa batas',
    `Login #3 (ESS) utk employee empNumber=${employee.empNumber} yg sudah py Login #1 (ESS) + Login #2 (Admin) -> status=${login3Resp.status()}. Tidak ada constraint unique pd empNumber di endpoint admin/users sama sekali.`,
  );

  report.step('4.4: race condition -- PUT status=true vs status=false paralel pd Login #1 -> harus ada 1 state akhir deterministik, tidak korup');
  if (typeof login1Id === 'number') {
    const bodyTrue = { username: login1Username, userRoleId: 2, empNumber: employee.empNumber, status: true, changePassword: false, password: '' };
    const bodyFalse = { username: login1Username, userRoleId: 2, empNumber: employee.empNumber, status: false, changePassword: false, password: '' };
    const [raceA, raceB] = await Promise.all([
      page.request.put(`${API}admin/users/${login1Id}`, { data: bodyTrue }),
      page.request.put(`${API}admin/users/${login1Id}`, { data: bodyFalse }),
    ]);
    const raceFinal = await json(await page.request.get(`${API}admin/users/${login1Id}`));
    report.check('4.4 Kedua PUT paralel (status true vs false) -> keduanya 200 (tidak ada 1 yg crash)', raceA.status() === 200 && raceB.status() === 200, `A=${raceA.status()}, B=${raceB.status()}`);
    report.check('4.4 State akhir SATU nilai boolean deterministik (bukan korup/null/campur)', typeof raceFinal?.data?.status === 'boolean', `finalStatus=${JSON.stringify(raceFinal?.data?.status)}`);
  }

  report.step('4.7: konkurensi multi-admin -- 2 sesi Admin BERBEDA edit field BERBEDA pd Login #1 yg SAMA scr paralel');
  if (typeof login1Id === 'number') {
    const admin2 = await createSecondAdmin(page, addEmployeePage, adminUsersPage, 'QaUserSecAdm');
    const { page: admin2Page, close: closeAdmin2 } = await loginAs(browser, admin2.username, admin2.password);

    const usernameChange = `QaUserSecLogin1Renamed_${tag}`;
    const [fromMain, fromAdmin2] = await Promise.all([
      page.request.put(`${API}admin/users/${login1Id}`, { data: { username: usernameChange, userRoleId: 2, empNumber: employee.empNumber, status: true, changePassword: false, password: '' } }),
      admin2Page.request.put(`${API}admin/users/${login1Id}`, { data: { username: login1Username, userRoleId: 1, empNumber: employee.empNumber, status: true, changePassword: false, password: '' } }),
    ]);
    const multiAdminFinal = await json(await page.request.get(`${API}admin/users/${login1Id}`));
    const finalIsOneOfTheTwo =
      (multiAdminFinal?.data?.userName === usernameChange && (multiAdminFinal?.data?.userRole as Row | undefined)?.id === 2) ||
      (multiAdminFinal?.data?.userName === login1Username && (multiAdminFinal?.data?.userRole as Row | undefined)?.id === 1);
    report.check('4.7 Kedua PUT dari 2 sesi Admin BERBEDA -> keduanya 200 (tidak ada lock/conflict error)', fromMain.status() === 200 && fromAdmin2.status() === 200, `main=${fromMain.status()}, admin2=${fromAdmin2.status()}`);
    report.check('4.7 State akhir SATU kombinasi deterministik dari salah satu sesi (last-write-wins, tidak campur jadi state yg tidak valid)', finalIsOneOfTheTwo, `final=${JSON.stringify(multiAdminFinal?.data)}`);
    report.finding(
      'Tidak ada conflict detection/optimistic locking saat 2 Admin edit user yg sama bersamaan',
      'Last-write-wins murni berdasar urutan server menerima request -- bukan bug (tidak ada ekspektasi app ini mendukung optimistic locking), tapi didokumentasikan sesuai definisi taksonomi 4.7.',
    );

    await closeAdmin2();
    await page.request.delete(`${API}pim/employees`, { data: { ids: [admin2.empNumber] } }).catch(() => null);
  }

  report.step('5.1-XSS-Reflected: payload XSS di query param Username filter (UI) -> TIDAK ter-eksekusi');
  await adminUsersPage.goto();
  await page.waitForLoadState('networkidle').catch(() => {});
  const xssPayload = '<img src=x onerror=alert(1)>';
  await adminUsersPage.searchUsernameInput.fill(xssPayload);
  const [xssResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes(`${API}admin/users`) && r.request().method() === 'GET', { timeout: 10_000 }).catch(() => null),
    page.getByRole('button', { name: 'Search' }).click(),
  ]);
  await page.waitForTimeout(1_000);
  report.check('5.1-XSS-Reflected TIDAK ADA dialog JS ter-trigger (alert/confirm/prompt) setelah search dgn payload XSS', !dialogFired, `dialogFired=${dialogFired}`);
  report.check('5.1-XSS-Reflected Query param username membawa payload mentah tanpa menyebabkan error server', !!xssResp && xssResp.status() === 200, `status=${xssResp?.status()}, url=${xssResp?.url()?.slice(0, 160)}`);

  report.step('5.5: rate limiting -- 6 create paralel dgn username unik, target employee throwaway yg SAMA');
  const rateUsernames = Array.from({ length: 6 }, (_, i) => `QaUserSecRate${tag}_${i}`);
  const rateResps = await Promise.all(
    rateUsernames.map((u) => page.request.post(`${API}admin/users`, { data: { username: u, userRoleId: 2, empNumber: employee.empNumber, status: true, password: PASSWORD } })),
  );
  const rateStatuses = rateResps.map((r) => r.status());
  const rateIds: number[] = [];
  for (const r of rateResps) {
    const b = await json(r);
    const id = (b?.data as Row | undefined)?.id as number | undefined;
    if (typeof id === 'number') rateIds.push(id);
  }
  report.check('5.5 6 create paralel -> SEMUA 200, tidak ada 429 (TIDAK ADA rate limiting)', rateStatuses.every((s) => s === 200), `statuses=${JSON.stringify(rateStatuses)}`);
  report.finding(
    'Tidak ada rate limiting pada create System User',
    `6 request create paralel dgn username unik SEMUA berhasil 200 (statuses=${JSON.stringify(rateStatuses)}) -- konsisten dgn pola app-wide lain (PIM Add Employee, Work Shift, dll) yg jg tidak punya rate limit pd create. Bukan bug baru, didokumentasikan sesuai definisi taksonomi 5.5.`,
  );

  report.step('Cleanup: hapus employee throwaway (cascade menghapus SEMUA login yg tertaut: #1/#2/#3 + rate-limit batch)');
  await page.request.delete(`${API}pim/employees`, { data: { ids: [employee.empNumber] } }).catch(() => null);
  const leftoverIds = [login2Id, login3Id, ...rateIds].filter((x): x is number => typeof x === 'number');
  if (leftoverIds.length) await page.request.delete(`${API}admin/users`, { data: { ids: leftoverIds } }).catch(() => null);

  report.print();
});
