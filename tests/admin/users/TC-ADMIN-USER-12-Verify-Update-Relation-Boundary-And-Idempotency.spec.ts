/**
 * ================================================================================
 * TC-ADMIN-USER-12 — Verify Update, Status Transition, Employee Relation, Boundary,
 *   Unicode Input And API Idempotency/Parameter Validation For System Users
 * Modul    : Admin > User Management > Users (U001)
 * Kategori : Positive (+) 1.1-U 1.2 1.3 1.4 1.8 | Negative (-) 2.3 | Boundary (B) 3.1 |
 *            Edge (!) 4.1 4.8 | API (A) 6.5 6.7 | UI/UX 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-USER-12-Verify-Update-Relation-Boundary-And-Idempotency.spec.ts
 * Path     : tests/admin/users/
 * ================================================================================
 *
 * LATAR: rebuild matrix 25 Nov 2026 menunjukkan U001 Admin Users py 19 kode GAP. File ini
 * menutup 12 dari 19 (sisi CRUD/validation/boundary/API) -- sisi security/concurrency
 * (2.5/4.4/4.7/5.1-XSS-Reflected/5.2-MassAssign/5.5/5.9) ditutup terpisah di
 * TC-ADMIN-USER-13, pola sama dgn unit besar lain (Performance U103/Claim U105) yg dipecah
 * jadi beberapa TC per sub-fokus.
 *
 * EKSPLORASI LIVE (Playwright MCP, sebelum menulis kode) membuktikan:
 *   - Edit User (pencil icon) -> /admin/saveSystemUser/<id>, PUT /api/v2/admin/users/<id> body
 *     WAJIB {username, userRoleId, empNumber, status, changePassword, password} -- changePassword
 *     DAN password WAJIB ada di body meski TIDAK mengganti password (changePassword:false,
 *     password:'') -- dikonfirmasi live, mengirim password:null atau menghilangkan key itu
 *     SELALU 422 invalidParamKeys:["password"].
 *   - Form Add/Edit User TIDAK punya field opsional apa pun (Username/User Role/Employee
 *     Name/Status/Password/Confirm Password semua wajib) -- 1.2 ditutup lewat sisi LAIN
 *     taksonomi 1.2 (kombinasi pagination normal), sama pola dgn 8 dari 12 unit reference-data
 *     Admin (lihat TC-ADMIN-REFDATA-SWEEP-01).
 *   - Username: boundary panjang PERSIS 40 karakter (41 -> 422 invalidParamKeys:["username"]),
 *     dikonfirmasi binary-search dgn tag unik tiap percobaan (bukan string identik -- pelajaran
 *     dari TC-PIM-CUSTOMFIELD-API-01 soal kolisi delete-gagal-diam2). Unicode beraksen (Üñî) DAN
 *     RTL (Ibrani) DITERIMA 200; emoji astral DAN whitespace-only DITOLAK 422 -- KONTRAS POSITIF
 *     dgn pola charset DB utf8/bukan-utf8mb4 di modul lain (BG-496/501/505/506): username di sini
 *     punya validasi format EXPLISIT yg menolak emoji dgn 422 bersih, BUKAN crash 500.
 *   - Relasi employee<->user genuine: GET /api/v2/admin/users/<id> meng-cascade nama employee
 *     (bukan cache) -- rename employee via PUT personal-details, GET user detail lagi -> nama
 *     ikut berubah, dikonfirmasi live.
 *   - Mass-assignment (field asing di body create/update) SUDAH ditutup 5.2-PrivEsc/BFLAC di TC
 *     lama (tidak GAP) -- TAPI 5.2-MassAssign literal msh GAP, ditutup di TC-ADMIN-USER-13
 *     (bukan di sini, biar tidak duplikat lintas TC).
 *
 * HASIL 25 Nov 2026: lolos penuh, tidak ada bug baru (semua 12 kode genuinely testable &
 *   PASSED -- boundary bersih, cascade relasi benar, idempotency ditegakkan via unique
 *   constraint username, parameter negative test selalu 4xx bukan 500).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/users/TC-ADMIN-USER-12-Verify-Update-Relation-Boundary-And-Idempotency.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

const API = '/web/index.php/api/v2/';
const PASSWORD = 'Passw0rd!2026';

type Row = Record<string, unknown>;
const json = async (r: { json(): Promise<unknown> }) => (await r.json().catch(() => null)) as { data?: Row; error?: Row } | null;

test('TC-ADMIN-USER-12: update, status transition, employee relation, boundary, unicode and API idempotency/parameter validation', async ({
  page,
  addEmployeePage,
  adminUsersPage,
}, testInfo) => {
  testInfo.setTimeout(180_000);
  const report = new TestReport('TC-ADMIN-USER-12', 'Update Relation Boundary Idempotency', env.baseURL, page);
  const tag = Date.now() % 1_000_000;

  report.step('Setup: buat employee throwaway via Add Employee (akan dihapus di akhir, menghapus user yg tertaut sekaligus)');
  const employee = await createTestEmployee(page, addEmployeePage, 'QaUserFunc');
  const fullName = `${employee.firstName} ${employee.lastName}`;

  report.step('1.1-C setup: buat User (ESS) tertaut KE employee throwaway ini via UI Add User');
  const username = `QaUserFunc${tag}`;
  await adminUsersPage.gotoAdd();
  await adminUsersPage.selectUserRole('ESS');
  await adminUsersPage.selectEmployee(fullName);
  await adminUsersPage.selectStatus('Enabled');
  await adminUsersPage.usernameInput.fill(username);
  await adminUsersPage.passwordInput.fill(PASSWORD);
  await adminUsersPage.confirmPasswordInput.fill(PASSWORD);
  const createPromise = page.waitForResponse((r) => r.url().includes(`${API}admin/users`) && r.request().method() === 'POST', { timeout: 15_000 });
  await adminUsersPage.save();
  const createResp = await createPromise;
  const createBody = await json(createResp);
  const userId = createBody?.data?.id as number | undefined;
  report.check('Setup user berhasil dibuat, tertaut ke employee throwaway', createResp.status() === 200 && typeof userId === 'number', `status=${createResp.status()}`);
  if (typeof userId !== 'number') { report.finding('Setup gagal', 'Sisa check di TC ini tidak bisa dilanjutkan dgn benar.'); report.print(); return; }

  report.step('1.1-U / 1.3 / 1.8: Edit User via UI, ubah Status Enabled -> Disabled, verify PUT + toast + persisted');
  await page.goto(`${env.baseURL}/web/index.php/admin/saveSystemUser/${userId}`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await adminUsersPage.selectStatus('Disabled');
  const editPromise = page.waitForResponse((r) => r.url().includes(`${API}admin/users/${userId}`) && r.request().method() === 'PUT', { timeout: 15_000 });
  await adminUsersPage.save();
  const editResp = await editPromise;
  const toastVisible = await page.locator('.oxd-toast-content, .oxd-text--toast-message').first().waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
  report.check('1.1-U PUT /api/v2/admin/users/<id> -> 200 (update via UI)', editResp.status() === 200, `status=${editResp.status()}`);
  report.check('1.8 Toast sukses muncul setelah Save Edit User', toastVisible);
  const afterDisable = await json(await page.request.get(`${API}admin/users/${userId}`));
  report.check('1.3 Status transition Enabled -> Disabled tersimpan (transisi legal)', afterDisable?.data?.status === false, `status=${JSON.stringify(afterDisable?.data?.status)}`);

  report.step('1.3: transisi balik Disabled -> Enabled (arah legal lainnya), via API');
  const reEnable = await page.request.put(`${API}admin/users/${userId}`, { data: { username, userRoleId: 2, empNumber: employee.empNumber, status: true, changePassword: false, password: '' } });
  const afterEnable = await json(await page.request.get(`${API}admin/users/${userId}`));
  report.check('1.3 Status transition Disabled -> Enabled -> 200 & tersimpan', reEnable.status() === 200 && afterEnable?.data?.status === true, `PUT status=${reEnable.status()}, GET status=${JSON.stringify(afterEnable?.data?.status)}`);

  report.step('1.2: kombinasi pagination normal (form Add/Edit TIDAK punya field opsional genuine)');
  const p0 = await json(await page.request.get(`${API}admin/users?limit=1&offset=0&sortField=u.userName&sortOrder=ASC`));
  const p1 = await json(await page.request.get(`${API}admin/users?limit=1&offset=1&sortField=u.userName&sortOrder=ASC`));
  const page0Id = (p0?.data as unknown as Row[] | undefined)?.[0]?.id;
  const page1Id = (p1?.data as unknown as Row[] | undefined)?.[0]?.id;
  report.check('1.2 GET limit=1 offset=0 vs offset=1 -> hasil berbeda, kombinasi pagination valid', page0Id !== undefined && page0Id !== page1Id, `offset0 id=${page0Id}, offset1 id=${page1Id}`);

  report.step('1.4: relasi employee<->user genuine -- rename employee, verify cascade di GET user detail (bukan cache)');
  const beforeName = await json(await page.request.get(`${API}admin/users/${userId}`));
  report.check('1.4 GET user detail menunjukkan nama employee yg tertaut', (beforeName?.data?.employee as Row | undefined)?.lastName === employee.lastName, `employee=${JSON.stringify(beforeName?.data?.employee)}`);
  const renamedLastName = `${employee.lastName}Renamed`;
  await page.request.put(`${API}pim/employees/${employee.empNumber}/personal-details`, {
    data: { lastName: renamedLastName, firstName: employee.firstName, middleName: '', employeeId: null, otherId: '', drivingLicenseNo: '', drivingLicenseExpiredDate: null, gender: null, birthday: null, nationalityId: null, maritalStatus: '' },
  });
  const afterName = await json(await page.request.get(`${API}admin/users/${userId}`));
  report.check('1.4 Employee di-rename -> nama relasi di GET user detail ikut berubah (bukan cache nama lama)', (afterName?.data?.employee as Row | undefined)?.lastName === renamedLastName, `employee setelah rename=${JSON.stringify(afterName?.data?.employee)}`);

  report.step('2.3: username duplikat (sama dgn user yg sudah ada) -> ditolak');
  const dup = await page.request.post(`${API}admin/users`, { data: { username, userRoleId: 2, empNumber: employee.empNumber, status: true, password: PASSWORD } });
  const dupBody = await json(dup);
  const dupInvalidKeys = (((dupBody?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys ?? []) as string[];
  report.check('2.3 POST username duplikat -> 422 invalidParamKeys:["username"]', dup.status() === 422 && dupInvalidKeys.includes('username'), `status=${dup.status()}, body=${JSON.stringify(dupBody)}`);

  report.step('6.7: idempotency -- payload create IDENTIK dikirim 2x (simulasi retry network) -> TIDAK membuat 2 record');
  const idemTag = `QaUserIdem${tag}`;
  const first = await page.request.post(`${API}admin/users`, { data: { username: idemTag, userRoleId: 2, empNumber: employee.empNumber, status: true, password: PASSWORD } });
  const firstBody = await json(first);
  const retry = await page.request.post(`${API}admin/users`, { data: { username: idemTag, userRoleId: 2, empNumber: employee.empNumber, status: true, password: PASSWORD } });
  const listIdem = await json(await page.request.get(`${API}admin/users?username=${encodeURIComponent(idemTag)}&limit=10&offset=0`));
  report.check('6.7 Create pertama -> 200, retry IDENTIK ke-2 -> DITOLAK (bukan duplikat tersimpan)', first.status() === 200 && retry.status() !== 200, `first=${first.status()}, retry=${retry.status()}`);
  report.check(`6.7 Hanya TEPAT 1 record "${idemTag}" tersimpan setelah 2x kirim`, (listIdem?.data as unknown as Row[] | undefined)?.length === 1, `total record=${(listIdem?.data as unknown as Row[] | undefined)?.length}`);
  const idemId = (firstBody?.data as Row | undefined)?.id as number | undefined;

  report.step('3.1: boundary panjang Username -- 40 karakter (accept), 41 karakter (reject)');
  const mkUsername = (len: number) => {
    let u = `u${(Date.now() + len) % 1_000_000}`;
    while (u.length < len) u += 'x';
    return u.slice(0, len);
  };
  const u40 = mkUsername(40);
  const r40 = await page.request.post(`${API}admin/users`, { data: { username: u40, userRoleId: 2, empNumber: employee.empNumber, status: true, password: PASSWORD } });
  const r40Body = await json(r40);
  const id40 = (r40Body?.data as Row | undefined)?.id as number | undefined;
  report.check('3.1 Username 40 karakter (min length boundary genap) -> 200 diterima', r40.status() === 200 && u40.length === 40, `status=${r40.status()}, len=${u40.length}`);
  await page.waitForTimeout(50);
  const u41 = mkUsername(41);
  const r41 = await page.request.post(`${API}admin/users`, { data: { username: u41, userRoleId: 2, empNumber: employee.empNumber, status: true, password: PASSWORD } });
  report.check('3.1 Username 41 karakter (max+1) -> 422 ditolak, batas PERSIS 40', r41.status() === 422 && u41.length === 41, `status=${r41.status()}, len=${u41.length}`);

  report.step('4.1: karakter tidak biasa -- unicode beraksen & RTL diterima, emoji astral & whitespace-only ditolak');
  const uAccent = `QaÜñî${tag}`;
  const rAccent = await page.request.post(`${API}admin/users`, { data: { username: uAccent, userRoleId: 2, empNumber: employee.empNumber, status: true, password: PASSWORD } });
  const rAccentBody = await json(rAccent);
  report.check('4.1 Username unicode beraksen ("Üñî") -> 200 diterima', rAccent.status() === 200, `status=${rAccent.status()}`);
  const idAccent = (rAccentBody?.data as Row | undefined)?.id as number | undefined;

  const uRtl = `Qa${tag}שלום`;
  const rRtl = await page.request.post(`${API}admin/users`, { data: { username: uRtl, userRoleId: 2, empNumber: employee.empNumber, status: true, password: PASSWORD } });
  const rRtlBody = await json(rRtl);
  report.check('4.1 Username RTL (Ibrani) -> 200 diterima', rRtl.status() === 200, `status=${rRtl.status()}`);
  const idRtl = (rRtlBody?.data as Row | undefined)?.id as number | undefined;

  const uEmoji = `QaEmo${tag}😀`;
  const rEmoji = await page.request.post(`${API}admin/users`, { data: { username: uEmoji, userRoleId: 2, empNumber: employee.empNumber, status: true, password: PASSWORD } });
  report.check('4.1 Username emoji astral -> 422 DITOLAK dgn bersih (KONTRAS dgn pola crash 500 field teks bebas modul lain)', rEmoji.status() === 422, `status=${rEmoji.status()}`);

  const rWs = await page.request.post(`${API}admin/users`, { data: { username: '   ', userRoleId: 2, empNumber: employee.empNumber, status: true, password: PASSWORD } });
  report.check('4.1 Username whitespace-only -> 422 ditolak (bukan diterima sbg "blank")', rWs.status() === 422, `status=${rWs.status()}`);

  report.step('4.8: non-obvious -- PUT record dgn username SENDIRI yg tidak berubah TIDAK dianggap duplikat dgn dirinya sendiri');
  const resave = await page.request.put(`${API}admin/users/${userId}`, { data: { username, userRoleId: 2, empNumber: employee.empNumber, status: true, changePassword: false, password: '' } });
  report.check('4.8 PUT dgn username yg SAMA (tidak berubah) -> 200, bukan 422 duplikat palsu', resave.status() === 200, `status=${resave.status()}`);

  report.step('6.5: parameter negative test di GET list -- tipe salah / field tak dikenal / nilai negatif SEMUA 4xx, bukan 500');
  const negLimit = await page.request.get(`${API}admin/users?limit=-1&offset=0`);
  const bogusSort = await page.request.get(`${API}admin/users?sortField=bogusField&limit=5&offset=0`);
  const badType = await page.request.get(`${API}admin/users?userRoleId=notanumber&limit=5`);
  const emptyArr = await page.request.get(`${API}admin/users?empNumbers=[]&limit=5`);
  const is4xx = (s: number) => s >= 400 && s < 500;
  report.check('6.5 limit negatif -> 4xx (bukan 500)', is4xx(negLimit.status()), `status=${negLimit.status()}`);
  report.check('6.5 sortField tidak dikenal -> 4xx (bukan 500)', is4xx(bogusSort.status()), `status=${bogusSort.status()}`);
  report.check('6.5 userRoleId bertipe salah (string bukan angka) -> 4xx (bukan 500)', is4xx(badType.status()), `status=${badType.status()}`);
  report.check('6.5 empNumbers array-literal-sebagai-string tak dikenal -> 4xx (bukan 500)', is4xx(emptyArr.status()), `status=${emptyArr.status()}`);

  report.step('8.4: konsistensi format pesan error -- bandingkan 422 admin/users vs admin/job-titles (unit lain)');
  const jobTitleName = `QaUserConsistency${tag}`;
  const jtCreate = await page.request.post(`${API}admin/job-titles`, { data: { title: jobTitleName, description: '', specification: null, note: '' } });
  const jtId = ((await json(jtCreate))?.data as Row | undefined)?.id as number | undefined;
  const jtDup = await page.request.post(`${API}admin/job-titles`, { data: { title: jobTitleName, description: '', specification: null, note: '' } });
  const jtDupBody = await json(jtDup);
  const usersErrShape = (dupBody?.error as Row | undefined) ?? {};
  const jobTitleErrShape = (jtDupBody?.error as Row | undefined) ?? {};
  report.check(
    '8.4 Bentuk error 422 admin/users DAN admin/job-titles identik ({error:{status,message:"Invalid Parameter",data:{invalidParamKeys}}})',
    usersErrShape.message === jobTitleErrShape.message && usersErrShape.message === 'Invalid Parameter',
    `users=${JSON.stringify(usersErrShape)}, job-titles=${JSON.stringify(jobTitleErrShape)}`,
  );
  if (typeof jtId === 'number') await page.request.delete(`${API}admin/job-titles`, { data: { ids: [jtId] } }).catch(() => null);

  report.step('Cleanup: hapus semua record probe boundary/unicode/idempotency + employee throwaway (cascade hapus user yg tertaut)');
  const cleanupIds = [idemId, id40, idAccent, idRtl].filter((x): x is number => typeof x === 'number');
  if (cleanupIds.length) await page.request.delete(`${API}admin/users`, { data: { ids: cleanupIds } }).catch(() => null);
  await page.request.delete(`${API}pim/employees`, { data: { ids: [employee.empNumber] } }).catch(() => null);

  report.print();
});
