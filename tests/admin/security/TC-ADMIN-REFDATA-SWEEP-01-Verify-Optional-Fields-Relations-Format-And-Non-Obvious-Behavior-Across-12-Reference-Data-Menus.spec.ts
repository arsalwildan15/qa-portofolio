/**
 * ================================================================================
 * TC-ADMIN-REFDATA-SWEEP-01 — Verify Optional Fields, Entity Relations, Format Validation And
 *   Non-Obvious Behavior Across The 12 Simple Reference-Data Menus Of Admin
 * Modul    : Admin > Job > Job Titles/Pay Grades/Employment Status/Job Categories/Work Shifts
 *            (U013-U017), Admin > Organization > Locations (U019), Admin > Qualifications >
 *            Skills/Education/Licenses/Languages/Memberships (U021-U025), Admin > Nationalities
 *            (U026) — the 14 "reference-data" units share an (almost) identical Add-form shape
 *            (registry src/data/unitMutationRegistry.ts, body captured LIVE); U018/U020
 *            (Organization > General Info/Structure) are excluded, out of scope.
 * Kategori : Positive (+) 1.2 1.4 | Edge (!) 4.8 | Negative (-) 2.2 | Boundary (B) 3.2 |
 *            Security (S) 5.9
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-REFDATA-SWEEP-01-Verify-Optional-Fields-Relations-Format-And-Non-Obvious-Behavior-Across-12-Reference-Data-Menus.spec.ts
 * Path     : tests/admin/security/
 * ================================================================================
 *
 * LATAR: rebuild matrix 25 Nov 2026 menunjukkan 12 unit referensi Admin (U013-U017, U019,
 * U021-U026) masing2 py 5-7 kode GAP identik: 1.2/1.4/2.2/4.8/5.4 di semua 12, +3.2/5.9 HANYA
 * di U014 Pay Grades (satu-satunya unit dgn field numerik, "Add Currency" min/max salary),
 * +5.1-XSS-Stored HANYA di U015/U023/U025 (TC lama unit itu hanya menguji SQLi, belum XSS --
 * ditutup via TC tersendiri per unit, BUKAN di sini). 5.4 CSRF ditutup di TC-ADMIN-REFDATA-
 * CSRF-01 terpisah. File ini fokus 1.2/1.4/2.2/4.8/3.2/5.9.
 *
 * EKSPLORASI LIVE (Playwright MCP, sebelum menulis kode) membuktikan:
 *   - 8 dari 12 unit (Pay Grades, Employment Status, Job Categories, Education, Licenses,
 *     Languages, Memberships, Nationalities) TIDAK punya field opsional apa pun saat create
 *     (hanya 1 field Name/Level wajib) -- `AdminSimpleListPage` dikonfirmasi live hanya Skills
 *     yg punya Description. 1.2 utk 8 unit ini ditutup lewat sisi LAIN taksonomi 1.2 yg
 *     definisinya EKSPLISIT menyebut "kombinasi filter/sort/pagination normal" (bukan hanya
 *     optional-field) -- dikonfirmasi live API menerima limit/offset & mengembalikan subset
 *     BERBEDA scr benar (list tidak punya UI sort/search, tapi endpoint-nya genuinely
 *     mendukung pagination).
 *   - 4 unit SISANYA (Job Titles: Job Description+Note+file; Skills: Description; Locations:
 *     City wajib + State/Zip/Phone/Fax/Address/Notes opsional; Work Shifts: assign employee
 *     `empNumbers` opsional saat create) PUNYA field/relasi opsional genuine -- 1.2 ditutup
 *     dgn kombinasi terisi vs kosong SUNGGUHAN utk unit2 ini.
 *   - SEMUA 12 unit terbukti punya relasi nyata ke PIM (job-details utk Job Titles/Job
 *     Categories/Employment Status/Locations; skills/educations/licenses/languages/memberships
 *     endpoint utk 5 unit Qualifications; personal-details utk Nationalities; salary-components
 *     utk Pay Grades; assign langsung via empNumbers utk Work Shifts) -- 1.4 ditutup dgn
 *     benar2 membuat link, membaca cascade nama via API, LALU rename entity admin & membaca
 *     ulang (nama di sisi PIM ikut berubah, tidak cache nama lama -- pola sama PD-API-02).
 *   - 4.8: PUT record dgn namanya SENDIRI yg tidak berubah -> 200 (tidak salah dianggap
 *     "Already exists" krn menabrak dirinya sendiri) -- behavior non-obvious tapi BENAR,
 *     didokumentasikan di sini, bukan diasumsikan.
 *   - 2.2: POST dgn field nama bertipe object/array (bukan string) -> 422 "Invalid Parameter"
 *     di semua unit yg diuji -- format tervalidasi dgn benar.
 *   - Pay Grade "Add Currency" (admin/pay-grades/<id>/currencies): minSalary string non-numerik
 *     -> 422 (2.2, benar). minSalary NEGATIF (-5000) -> 200 DITERIMA (3.2/5.9, BUG, lihat
 *     SENGAJA FAILED di bawah).
 *   - Work Shift: startTime/hoursPerDay bertipe string non-waktu ("not-a-time"/"abc") -> 500,
 *     BUKAN 422 (2.2, BUG terpisah dari Pay Grade, pola sama family BG- "missing/malformed
 *     field crashes server").
 *
 * SEMUA record uji berprefix "QaRefSweep"; entity admin dibuat+dihapus per unit di dalam loop,
 * SATU employee throwaway dibuat sekali di awal & dihapus di akhir (DELETE employee membawa
 * serta seluruh relasi qualifications/job-details/salary/membership-nya, tidak perlu dihapus
 * satu-satu).
 *
 * HASIL 25 Nov 2026: SENGAJA FAILED (R3, stabil 3x run berturut-turut, 83/85 check lolos). 2 BUG BARU:
 *   BG-510 (Medium) -- POST admin/pay-grades/<id>/currencies menerima minSalary negatif
 *     (-5000) tanpa validasi bisnis, hanya menegakkan min<max (3.2/5.9).
 *   BG-508 (Medium) -- POST/PUT admin/work-shifts dgn startTime/endTime/hoursPerDay bertipe
 *     string bebas (bukan format waktu/angka valid) -> 500 Unexpected Error, bukan 422 (2.2).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/security/TC-ADMIN-REFDATA-SWEEP-01-Verify-Optional-Fields-Relations-Format-And-Non-Obvious-Behavior-Across-12-Reference-Data-Menus.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';
import { MUTATION_UNITS, mutationContext } from '../../../src/data/unitMutationRegistry';

const API = '/web/index.php/api/v2/';
const is4xx = (s: number) => s >= 400 && s < 500;

type Row = Record<string, unknown>;
const json = async (r: { json(): Promise<unknown> }) => (await r.json().catch(() => null)) as { data?: Row | Row[] } | null;

const REFDATA_IDS = new Set(['U013', 'U014', 'U015', 'U016', 'U017', 'U019', 'U021', 'U022', 'U023', 'U024', 'U025', 'U026']);

test('TC-ADMIN-REFDATA-SWEEP-01: optional fields, entity relations, format validation and non-obvious behavior across 12 reference-data menus', async ({
  page,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(360_000);
  const report = new TestReport('TC-ADMIN-REFDATA-SWEEP-01', 'Optional Fields Relations Format Non-Obvious Behavior', env.baseURL, page);
  const ctx = await mutationContext(page);
  const { empNumber: tempEmp } = await createTestEmployee(page, addEmployeePage, 'QaRefSweep');
  const jobDetailsApi = `${API}pim/employees/${tempEmp}/job-details`;

  const units = MUTATION_UNITS.filter((u) => REFDATA_IDS.has(u.id));

  // 1.4: establish a real relation from the admin entity's fresh id into PIM, then read the
  // cascaded name back. `read` is called twice (before/after an admin-side rename) by the loop.
  const RELATION: Partial<Record<string, { set: (id: number) => Promise<void>; read: (id: number) => Promise<string | undefined> }>> = {
    U013: {
      set: async (id) => { await page.request.put(jobDetailsApi, { data: { joinedDate: null, jobTitleId: id } }); },
      read: async () => undefined, // superseded by jobDetailsName() in the loop below
    },
    U015: {
      set: async (id) => { await page.request.put(jobDetailsApi, { data: { joinedDate: null, empStatusId: id } }); },
      read: async () => undefined,
    },
    U016: {
      set: async (id) => { await page.request.put(jobDetailsApi, { data: { joinedDate: null, jobCategoryId: id } }); },
      read: async () => undefined,
    },
    U019: {
      set: async (id) => { await page.request.put(jobDetailsApi, { data: { joinedDate: null, locationId: id } }); },
      read: async () => undefined,
    },
    U021: {
      set: async (id) => { await page.request.post(`${API}pim/employees/${tempEmp}/skills`, { data: { skillId: id, yearsOfExperience: null, comments: '' } }); },
      read: async (id) => {
        const list = (await json(await page.request.get(`${API}pim/employees/${tempEmp}/skills?limit=20`)))?.data as Row[] | undefined;
        return (list?.find((r) => (r.skill as Row)?.id === id)?.skill as Row)?.name as string | undefined;
      },
    },
    U022: {
      set: async (id) => { await page.request.post(`${API}pim/employees/${tempEmp}/educations`, { data: { educationId: id, institute: '', major: '', year: null, score: '', startDate: '', endDate: '' } }); },
      read: async (id) => {
        const list = (await json(await page.request.get(`${API}pim/employees/${tempEmp}/educations?limit=20`)))?.data as Row[] | undefined;
        return (list?.find((r) => (r.education as Row)?.id === id)?.education as Row)?.name as string | undefined;
      },
    },
    U023: {
      set: async (id) => { await page.request.post(`${API}pim/employees/${tempEmp}/licenses`, { data: { licenseId: id, licenseNo: '', issuedDate: '', expiryDate: '' } }); },
      read: async (id) => {
        const list = (await json(await page.request.get(`${API}pim/employees/${tempEmp}/licenses?limit=20`)))?.data as Row[] | undefined;
        return (list?.find((r) => (r.license as Row)?.id === id)?.license as Row)?.name as string | undefined;
      },
    },
    U024: {
      set: async (id) => { await page.request.post(`${API}pim/employees/${tempEmp}/languages`, { data: { languageId: id, fluencyId: 1, competencyId: 1, comment: '' } }); },
      read: async (id) => {
        const list = (await json(await page.request.get(`${API}pim/employees/${tempEmp}/languages?limit=20`)))?.data as Row[] | undefined;
        return (list?.find((r) => (r.language as Row)?.id === id)?.language as Row)?.name as string | undefined;
      },
    },
    U025: {
      set: async (id) => { await page.request.post(`${API}pim/employees/${tempEmp}/memberships`, { data: { membershipId: id, subscriptionFee: 10, subscriptionCommenceDate: '2024-01-01', subscriptionRenewalDate: '2024-12-31' } }); },
      read: async (id) => {
        const list = (await json(await page.request.get(`${API}pim/employees/${tempEmp}/memberships?limit=20`)))?.data as Row[] | undefined;
        return (list?.find((r) => (r.membership as Row)?.id === id)?.membership as Row)?.name as string | undefined;
      },
    },
    U026: {
      set: async (id) => {
        await page.request.put(`${API}pim/employees/${tempEmp}/personal-details`, {
          data: { lastName: 'QaRefSweep', firstName: 'QaRefSweep', middleName: '', employeeId: null, otherId: '', drivingLicenseNo: '', drivingLicenseExpiredDate: null, gender: null, birthday: null, nationalityId: id, maritalStatus: '' },
        });
      },
      read: async () => undefined,
    },
  };
  // job-details reads: a single helper covers U013/U015/U016/U019 (each a different sub-key of the same resource).
  const JOB_DETAILS_KEY: Record<string, string> = { U013: 'jobTitle', U015: 'empStatus', U016: 'jobCategory', U019: 'location' };
  const jobDetailsName = async (unitId: string): Promise<string | undefined> => {
    const data = (await json(await page.request.get(jobDetailsApi)))?.data as Row | undefined;
    const sub = data?.[JOB_DETAILS_KEY[unitId] ?? ''] as Row | undefined;
    return (sub?.name ?? sub?.title) as string | undefined;
  };
  const nationalityName = async (): Promise<string | undefined> => {
    const data = (await json(await page.request.get(`${API}pim/employees/${tempEmp}/personal-details`)))?.data as Row | undefined;
    return (data?.nationality as Row | undefined)?.name as string | undefined;
  };

  for (const u of units) {
    const tag = `[${u.id} ${u.path}]`;
    const ep = API + u.endpoint;
    const s = `${Date.now() % 100000}`;
    const name = `QaRefSweep ${s}`.slice(0, 48);

    report.step(`${tag} setup: create`);
    const create = await page.request.post(ep, { data: u.body(name, ctx) });
    const createData = (await json(create))?.data as Row | undefined;
    const id = createData?.id as number | undefined;
    report.check(`${tag} setup create -> 200 + id`, create.status() === 200 && typeof id === 'number', `status=${create.status()}`);
    if (typeof id !== 'number') { report.finding(`${tag} dilewati`, 'create gagal -> check lain tidak bermakna'); continue; }

    report.step(`${tag} 4.8 non-obvious: re-save unchanged name`);
    const resave = await page.request.put(`${ep}/${id}`, { data: u.body(name, ctx) });
    report.check(`${tag} 4.8 PUT record dgn nama sendiri yg TIDAK berubah -> 200 (tidak dianggap duplikat dgn dirinya sendiri)`, resave.status() === 200, `status=${resave.status()}`);

    report.step(`${tag} 2.2 format: nama bertipe object`);
    const badType = await page.request.post(ep, { data: { ...u.body(name, ctx), [u.nameKey]: { bad: 'type' } } });
    report.check(`${tag} 2.2 ${u.nameKey} bertipe object (bukan string) -> 4xx, bukan 500`, is4xx(badType.status()), `status=${badType.status()}`);
    const badId = ((await json(badType))?.data as Row | undefined)?.id as number | undefined;
    if (typeof badId === 'number') await page.request.delete(ep, { data: { ids: [badId] } });

    report.step(`${tag} 1.2 kombinasi pagination normal`);
    const p1 = (await json(await page.request.get(`${ep}?limit=1&offset=0`)))?.data as Row[] | undefined;
    const p2 = (await json(await page.request.get(`${ep}?limit=1&offset=1`)))?.data as Row[] | undefined;
    const pagingDiffers = (p1?.[0]?.id ?? null) !== (p2?.[0]?.id ?? null);
    report.check(`${tag} 1.2 GET limit=1 offset=0 vs offset=1 -> hasil berbeda, kombinasi pagination valid`, Array.isArray(p1) && Array.isArray(p2) && pagingDiffers, `offset0=${p1?.[0]?.id}, offset1=${p2?.[0]?.id}`);

    const relation = RELATION[u.id];
    if (relation) {
      report.step(`${tag} 1.4 relasi antar-entity ke PIM`);
      await relation.set(id);
      const nameBefore = JOB_DETAILS_KEY[u.id] ? await jobDetailsName(u.id) : u.id === 'U026' ? await nationalityName() : await relation.read(id);
      report.check(`${tag} 1.4 Relasi tersimpan, nama ikut (bukan sekadar echo id): "${nameBefore}"`, nameBefore === name, `nama cascade=${JSON.stringify(nameBefore)}`);

      const renamed = `${name}R`;
      await page.request.put(`${ep}/${id}`, { data: u.body(renamed, ctx) });
      const nameAfter = JOB_DETAILS_KEY[u.id] ? await jobDetailsName(u.id) : u.id === 'U026' ? await nationalityName() : await relation.read(id);
      report.check(`${tag} 1.4 Entity admin di-rename -> nama relasi di sisi PIM ikut berubah (tidak cache nama lama)`, nameAfter === renamed, `nama cascade setelah rename=${JSON.stringify(nameAfter)}`);
    }

    report.step(`${tag} cleanup`);
    await page.request.delete(ep, { data: { ids: [id] } });
  }

  // ---------------------------------------------------------------- U013/U021/U019 extra: genuine optional fields
  report.step('[U013 Job Titles] 1.2 kombinasi field opsional (Job Description/Note) terisi vs kosong');
  const jtEp = `${API}admin/job-titles`;
  const sJt = `${Date.now() % 100000}`;
  const jtFull = await page.request.post(jtEp, { data: { title: `QaRefSweepJtFull ${sJt}`, description: 'desc', specification: null, note: 'note' } });
  const jtFullData = ((await json(jtFull))?.data as Row | undefined);
  const jtEmpty = await page.request.post(jtEp, { data: { title: `QaRefSweepJtEmpty ${sJt}`, description: '', specification: null, note: '' } });
  const jtEmptyData = ((await json(jtEmpty))?.data as Row | undefined);
  report.check('[U013] 1.2 Job Title dgn Description+Note TERISI -> 200 & tersimpan', jtFull.status() === 200 && jtFullData?.description === 'desc', `status=${jtFull.status()}, description=${JSON.stringify(jtFullData?.description)}`);
  report.check('[U013] 1.2 Job Title dgn Description+Note KOSONG -> 200 (keduanya memang opsional)', jtEmpty.status() === 200, `status=${jtEmpty.status()}`);
  const jtIds = [jtFullData?.id, jtEmptyData?.id].filter((x): x is number => typeof x === 'number');
  if (jtIds.length) await page.request.delete(jtEp, { data: { ids: jtIds } });

  report.step('[U021 Skills] 1.2 kombinasi field opsional (Description) terisi vs kosong');
  const skEp = `${API}admin/skills`;
  const sSk = `${Date.now() % 100000}`;
  const skFull = await page.request.post(skEp, { data: { name: `QaRefSweepSkFull ${sSk}`, description: 'skill desc' } });
  const skFullData = (await json(skFull))?.data as Row | undefined;
  const skEmpty = await page.request.post(skEp, { data: { name: `QaRefSweepSkEmpty ${sSk}`, description: '' } });
  const skEmptyData = (await json(skEmpty))?.data as Row | undefined;
  report.check('[U021] 1.2 Skill dgn Description TERISI -> 200 & tersimpan', skFull.status() === 200 && skFullData?.description === 'skill desc', `status=${skFull.status()}`);
  report.check('[U021] 1.2 Skill dgn Description KOSONG -> 200 (opsional)', skEmpty.status() === 200, `status=${skEmpty.status()}`);
  const skIds = [skFullData?.id, skEmptyData?.id].filter((x): x is number => typeof x === 'number');
  if (skIds.length) await page.request.delete(skEp, { data: { ids: skIds } });

  report.step('[U019 Locations] 1.2 kombinasi field opsional (State/Zip/Phone/Fax/Address/Notes) terisi vs kosong');
  const locEp = `${API}admin/locations`;
  const sLoc = `${Date.now() % 100000}`;
  const locFullBody = (title: string) => ({ name: title, countryCode: 'US', province: 'ProbeState', city: 'ProbeCity', address: 'probe address', zipCode: '12345', phone: '555-1234', fax: '555-5678', note: 'probe notes' });
  const locEmptyBody = (title: string) => ({ name: title, countryCode: 'US', city: 'ProbeCity' });
  const locFull = await page.request.post(locEp, { data: locFullBody(`QaRefSweepLocFull ${sLoc}`) });
  const locFullData = (await json(locFull))?.data as Row | undefined;
  const locEmpty = await page.request.post(locEp, { data: locEmptyBody(`QaRefSweepLocEmpty ${sLoc}`) });
  const locEmptyData = (await json(locEmpty))?.data as Row | undefined;
  report.check('[U019] 1.2 Location dgn State/Zip/Phone/Fax/Address/Notes TERISI (City+Country wajib) -> 200 & tersimpan', locFull.status() === 200 && locFullData?.province === 'ProbeState', `status=${locFull.status()}`);
  report.check('[U019] 1.2 Location dgn HANYA field wajib (Name/City/Country) -> 200 (sisanya genuinely opsional)', locEmpty.status() === 200, `status=${locEmpty.status()}`);
  const locIds = [locFullData?.id, locEmptyData?.id].filter((x): x is number => typeof x === 'number');
  if (locIds.length) await page.request.delete(locEp, { data: { ids: locIds } });

  // ---------------------------------------------------------------- U017 Work Shifts: assign (1.2+1.4) & format (2.2, bug)
  report.step('[U017 Work Shifts] 1.2/1.4 assign employee (empNumbers) terisi vs kosong + relasi nyata');
  const wsEp = `${API}admin/work-shifts`;
  const sWs = `${Date.now() % 100000}`;
  const wsAssigned = await page.request.post(wsEp, { data: { name: `QaRefSweepWsAssign ${sWs}`, hoursPerDay: '8.00', startTime: '09:00', endTime: '17:00', empNumbers: [tempEmp] } });
  const wsAssignedData = (await json(wsAssigned))?.data as Row | undefined;
  const wsAssignedId = wsAssignedData?.id as number | undefined;
  let wsDetail: Row | undefined;
  if (typeof wsAssignedId === 'number') wsDetail = (await json(await page.request.get(`${wsEp}/${wsAssignedId}`)))?.data as Row | undefined;
  const assignedEmployees = (wsDetail?.employees as Row[] | undefined) ?? [];
  report.check('[U017] 1.2 Work Shift dibuat dgn empNumbers TERISI -> 200 (assign opsional, boleh diisi)', wsAssigned.status() === 200, `status=${wsAssigned.status()}`);
  report.check('[U017] 1.4 Employee yg di-assign muncul nyata di GET detail shift (relasi A->B, bukan sekadar id)', assignedEmployees.some((e) => e.empNumber === tempEmp), `employees=${JSON.stringify(assignedEmployees.map((e) => e.empNumber))}`);
  const wsEmpty = await page.request.post(wsEp, { data: { name: `QaRefSweepWsEmpty ${sWs}`, hoursPerDay: '8.00', startTime: '10:00', endTime: '18:00', empNumbers: [] } });
  const wsEmptyData = (await json(wsEmpty))?.data as Row | undefined;
  report.check('[U017] 1.2 Work Shift dibuat dgn empNumbers KOSONG -> 200 (genuinely opsional, tidak wajib assign siapa pun)', wsEmpty.status() === 200, `status=${wsEmpty.status()}`);
  const wsIds = [wsAssignedId, wsEmptyData?.id].filter((x): x is number => typeof x === 'number');
  if (wsIds.length) await page.request.delete(wsEp, { data: { ids: wsIds } });

  report.step('[U017 Work Shifts] 2.2 format waktu tidak valid (startTime/hoursPerDay bertipe string bebas)');
  const wsBadTime = await page.request.post(wsEp, { data: { name: `QaRefSweepWsBadTime ${sWs}`, hoursPerDay: '8.00', startTime: 'not-a-time', endTime: '17:00', empNumbers: [] } });
  const wsBadTimeData = (await json(wsBadTime))?.data as Row | undefined;
  report.check('[U017] 2.2 startTime format tidak valid ("not-a-time") -> 4xx (SEHARUSNYA, bukan 500)', is4xx(wsBadTime.status()), `status=${wsBadTime.status()}`);
  if (typeof wsBadTimeData?.id === 'number') await page.request.delete(wsEp, { data: { ids: [wsBadTimeData.id] } });

  // ---------------------------------------------------------------- U014 Pay Grades: currency sub-resource (1.4, 2.2, 3.2, 5.9, bug)
  report.step('[U014 Pay Grades] 1.4 relasi payGradeId -> salary-components, cascade nama saat rename');
  const pgEp = `${API}admin/pay-grades`;
  const sPg = `${Date.now() % 100000}`;
  const pgName = `QaRefSweepPg ${sPg}`;
  const pgCreate = await page.request.post(pgEp, { data: { name: pgName } });
  const pgId = ((await json(pgCreate))?.data as Row | undefined)?.id as number | undefined;
  report.check('[U014] setup create Pay Grade -> 200 + id', pgCreate.status() === 200 && typeof pgId === 'number', `status=${pgCreate.status()}`);
  if (typeof pgId === 'number') {
    const currEp = `${pgEp}/${pgId}/currencies`;
    const addCurrency = await page.request.post(currEp, { data: { currencyId: 'USD', minSalary: 10000, maxSalary: 90000 } });
    report.check('[U014] 1.2 Pay Grade + Currency Add TERISI (opsional saat create, ditambah setelahnya) -> 200', addCurrency.status() === 200, `status=${addCurrency.status()}`);

    const sal = await page.request.post(`${API}pim/employees/${tempEmp}/salary-components`, { data: { salaryComponent: `QaRefSweepSal ${sPg}`, salaryAmount: '55000', payGradeId: pgId, currencyId: 'USD', payFrequencyId: '4', comment: null, addDirectDeposit: false } });
    const salData = (await json(sal))?.data as Row | undefined;
    const payGradeCascade = salData?.payGrade as Row | undefined;
    report.check('[U014] 1.4 salary-components referensi payGradeId -> payGrade.name benar (cascade, bukan echo id)', sal.status() === 200 && payGradeCascade?.name === pgName, `status=${sal.status()}, payGrade=${JSON.stringify(payGradeCascade)}`);

    const pgRenamed = `${pgName}R`;
    await page.request.put(`${pgEp}/${pgId}`, { data: { name: pgRenamed } });
    const salAfter = (await json(await page.request.get(`${API}pim/employees/${tempEmp}/salary-components?limit=20`)))?.data as Row[] | undefined;
    const payGradeAfter = salAfter?.find((r) => (r.payGrade as Row)?.id === pgId)?.payGrade as Row | undefined;
    report.check('[U014] 1.4 Pay Grade di-rename -> payGrade.name di salary-components ikut berubah', payGradeAfter?.name === pgRenamed, `payGrade setelah rename=${JSON.stringify(payGradeAfter)}`);

    report.step('[U014 Pay Grades] 2.2/3.2/5.9 Add Currency: format salah vs nilai numerik tidak valid secara bisnis');
    const badFormat = await page.request.post(currEp, { data: { currencyId: 'EUR', minSalary: 'not-a-number', maxSalary: 60000 } });
    report.check('[U014] 2.2 minSalary bertipe string non-numerik ("not-a-number") -> 422 (format ditegakkan benar)', badFormat.status() === 422, `status=${badFormat.status()}`);

    const negative = await page.request.post(currEp, { data: { currencyId: 'GBP', minSalary: -5000, maxSalary: 60000 } });
    report.check('[U014] 3.2 / 5.9 minSalary NEGATIF (-5000) -> SEHARUSNYA ditolak (nilai tidak valid secara bisnis), bukan diterima 200', negative.status() !== 200, `status=${negative.status()}, body=${JSON.stringify(await json(negative))}`);
    if (negative.status() === 200) await page.request.delete(currEp, { data: { ids: ['GBP'] } }).catch(() => null);

    await page.request.delete(currEp, { data: { ids: ['USD'] } }).catch(() => null);
    await page.request.delete(pgEp, { data: { ids: [pgId] } });
  }

  // ---------------------------------------------------------------- cleanup throwaway employee (removes all PIM relation rows above)
  await page.request.delete(`${API}pim/employees`, { data: { ids: [tempEmp] } });

  report.print();
});
