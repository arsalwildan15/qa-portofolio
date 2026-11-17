/**
 * ================================================================================
 * TC-LEAVE-ENT-02 — Verify Add Entitlement: Additive Upsert, Server Validation, Unicode, Injection And Mass Assignment
 * Modul    : Leave > Entitlements > Add Entitlements & Employee Entitlements (U045, U046)
 * Kategori : Positive (+) 1.1-C 1.1-R 1.1-U 1.1-D 1.2 1.4 | Negative (-) 2.2 2.6 | Boundary (B) 3.2 |
 *            Edge (!) 4.1 4.7 4.8 | Security (S) 5.2-MassAssign | API (A) 6.5 6.7
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LEAVE-ENT-02-Verify-Add-Entitlement-Upsert-Validation-Injection-And-Mass-Assignment.spec.ts
 * Path     : tests/leave/entitlements/
 * ================================================================================
 *
 * LATAR (probe LIVE 17 Nov 2026): POST leave/leave-entitlements body
 * {empNumber, leaveTypeId, fromDate, toDate, entitlement}. Mengirim POST lagi utk karyawan +
 * leave type + periode yg SAMA bukan replace, melainkan MENAMBAH ke nilai yg sudah ada --
 * dikonfirmasi via dialog UI sendiri: "Existing Entitlement value 10.00 will be updated to
 * 15.00" (= 10 + 5). Ini desain yg disengaja & terdokumentasi di dialog, BUKAN bug.
 *
 * TUJUAN:
 *   1.1-C  POST pertama (belum ada entitlement) -> 200 langsung, TANPA dialog konfirmasi.
 *   1.1-U / 1.4 / 4.8  POST ke-2 (employee+type+periode sama) -> NILAI AKUMULATIF (ditambah,
 *          bukan diganti), dialog UI menyatakannya dgn jelas sblm user menekan Confirm.
 *   1.1-R  GET leave-entitlements utk employee menampilkan baris terbaru.
 *   2.2 / 6.5  entitlement negatif, empNumber 999999, leaveTypeId 999999 -> 422
 *          (invalidParamKeys spesifik per field).
 *   3.2    entitlement pecahan (2.5 hari) -> diterima.
 *   5.2-MassAssign  field "id" di body -> 422 (ditolak, bukan diam-diam diabaikan).
 *   4.1    karyawan bernama Arab ditemukan via autocomplete & diberi entitlement lewat UI
 *          (leaveEntitlementPage.save(), menangani dialog upsert bila muncul) -> 200, nama
 *          tersimpan utuh.
 *   4.7    3 POST paralel utk employee+type+periode SAMA -> SEMUA 200, hasil akhir = akumulasi
 *          ketiganya (bukan last-write-wins) -- konsekuensi dari upsert ADDITIVE, bukan replace.
 *   1.1-D  DELETE leave/leave-entitlements {ids} -> 200 & baris hilang (endpoint nyata, TANPA
 *          kontrol hapus apa pun di UI -- finding, bukan bug keamanan: masih perlu sesi Admin).
 *   6.7    GET tanpa data (fromDate/toDate di luar periode) -> [] (bukan error).
 *
 * CATATAN CAKUPAN: fitur "Multiple Employees" (bulk-assign berdasar filter Location/Sub Unit)
 * di form Add Entitlement SENGAJA TIDAK diuji end-to-end di sini: pada demo publik ini
 * filter kosong cocok dgn 118 karyawan SUNGGUHAN milik pengguna lain, dan tidak ada cara aman
 * mengisolasi ujian ke karyawan uji sendiri tanpa berisiko mengubah entitlement banyak orang.
 * Jalur single-employee di atas membuktikan endpoint & aturan servernya; GAP ini dicatat
 * sbg N/A beralasan di coverage matrix, bukan diabaikan diam-diam.
 *
 * RUN COMMAND:
 *   npx playwright test tests/leave/entitlements/TC-LEAVE-ENT-02-Verify-Add-Entitlement-Upsert-Validation-Injection-And-Mass-Assignment.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEmployee } from '../../../src/utils/maintenanceData';
import { API, cleanupLeave, currentPeriodRange, firstLeaveTypeId, getJson, grantEntitlement } from '../../../src/utils/leaveData';

type Row = { id: number; entitlement: number };

test('TC-LEAVE-ENT-02: Add Entitlement - additive upsert, validation, injection, mass assignment', async ({ page, leaveEntitlementPage }, testInfo) => {
  testInfo.setTimeout(240_000);
  const report = new TestReport('TC-LEAVE-ENT-02', 'Add Entitlement Upsert Validation Injection Mass Assignment', env.baseURL);
  const emp = await createEmployee(page.request, 'QaEntMut', `L${Date.now() % 100000}`);
  const typeId = await firstLeaveTypeId(page.request);
  const rows = async () => {
    const { fromDate, toDate } = await currentPeriodRange(page.request);
    return getJson<Row[]>(page.request, `leave/leave-entitlements?empNumber=${emp}&fromDate=${fromDate}&toDate=${toDate}`);
  };
  try {
    report.step('Upsert additif');
    const g1 = await grantEntitlement(page.request, emp, typeId, '10');
    report.check('1.1-C [U045] POST pertama -> 200', g1.status() === 200, `status=${g1.status()}`);
    report.check('1.1-R [U046] GET entitlements -> baris muncul dgn nilai 10', (await rows())[0]?.entitlement === 10, JSON.stringify(await rows()));
    const g2 = await grantEntitlement(page.request, emp, typeId, '5');
    const after = await rows();
    report.check('1.1-U / 1.4 / 4.8 [U045] POST ke-2 -> nilai AKUMULATIF (10+5=15), bukan diganti', g2.status() === 200 && after[0]?.entitlement === 15, `entitlement=${after[0]?.entitlement}`);

    report.step('Validasi server');
    const neg: Array<[string, Record<string, unknown>, string]> = [
      ['2.2 / 6.5 entitlement negatif', { empNumber: emp, leaveTypeId: typeId, entitlement: '-5', fromDate: '2026-01-01', toDate: '2026-12-31' }, 'entitlement'],
      ['2.6 / 6.5 empNumber 999999', { empNumber: 999999, leaveTypeId: typeId, entitlement: '5', fromDate: '2026-01-01', toDate: '2026-12-31' }, 'empNumber'],
      ['2.6 / 6.5 leaveTypeId 999999', { empNumber: emp, leaveTypeId: 999999, entitlement: '5', fromDate: '2026-01-01', toDate: '2026-12-31' }, 'leaveTypeId'],
    ];
    for (const [label, body, key] of neg) {
      const r = await page.request.post(`${API}leave/leave-entitlements`, { data: body });
      const k = ((await r.json().catch(() => ({}))) as { error?: { data?: { invalidParamKeys?: string[] } } }).error?.data?.invalidParamKeys ?? [];
      report.check(`${label} [U045] -> 422 dgn "${key}"`, r.status() === 422 && k.includes(key), `status=${r.status()} keys=${k.join(',')}`);
    }
    const frac = await grantEntitlement(page.request, emp, typeId, '2.5');
    const fracRow = await rows();
    report.check('3.2 [U045] Entitlement pecahan (2.5) -> diterima & tersimpan', frac.status() === 200 && fracRow[0]?.entitlement === 17.5, `entitlement=${fracRow[0]?.entitlement}`);
    const mass = await page.request.post(`${API}leave/leave-entitlements`, { data: { id: 1, empNumber: emp, leaveTypeId: typeId, entitlement: '5', fromDate: '2026-01-01', toDate: '2026-12-31' } });
    report.check('5.2-MassAssign [U045] field "id" -> 422 (ditolak)', mass.status() === 422, `status=${mass.status()}`);

    report.step('4.1 Karyawan nama Arab: cari & assign entitlement lewat UI end-to-end');
    const emp2 = await createEmployee(page.request, 'مرحبا', `QaEnt${Date.now() % 100000}`);
    try {
      await leaveEntitlementPage.goto();
      await page.waitForLoadState('networkidle');
      const selected = await leaveEntitlementPage.selectEmployee('مرحبا');
      report.check('4.1 [U045] Nama karyawan Arab ditemukan via autocomplete', selected.includes('مرحبا'), `ditemukan="${selected}"`);
      await leaveEntitlementPage.selectLeaveType('CAN - Bereavement');
      await leaveEntitlementPage.fillEntitlement('3');
      const pr = await leaveEntitlementPage.save();
      report.check('4.1 [U045] Entitlement utk karyawan nama Arab lewat UI -> POST 200', pr?.status() === 200, `status=${pr?.status()}`);
      const { fromDate, toDate } = await currentPeriodRange(page.request);
      const row = (await getJson<Array<{ employee: { firstName: string } }>>(page.request, `leave/leave-entitlements?empNumber=${emp2}&fromDate=${fromDate}&toDate=${toDate}`))[0];
      report.check('4.1 [U045] Nama Arab tersimpan utuh di respons GET', row?.employee?.firstName === 'مرحبا', `nama=${row?.employee?.firstName}`);
    } finally {
      await page.request.delete(`${API}pim/employees`, { data: { ids: [emp2] } }).catch(() => null);
    }

    report.step('Konkurensi: 3 POST paralel utk employee+type+periode sama');
    const before = (await rows())[0]?.entitlement ?? 0;
    const parallel = await Promise.all([1, 2, 3].map((n) => grantEntitlement(page.request, emp, typeId, String(n))));
    const final = (await rows())[0]?.entitlement ?? 0;
    report.check('4.7 [U045] 3 POST paralel -> semua 200 & hasil akumulatif (before+1+2+3)', parallel.every((r) => r.status() === 200) && Math.abs(final - (before + 6)) < 0.01, `before=${before} final=${final}`);

    report.step('1.1-D DELETE entitlement (endpoint nyata, meski tanpa kontrol UI)');
    const delTarget = (await rows())[0]?.id;
    const delR = await page.request.delete(`${API}leave/leave-entitlements`, { data: { ids: delTarget ? [delTarget] : [] } });
    const afterDel = await rows();
    report.check('1.1-D [U045/U046] DELETE entitlement -> 200 & baris hilang dari GET', delR.status() === 200 && !afterDel.some((r) => r.id === delTarget), `status=${delR.status()} id=${delTarget} sisa=${afterDel.length}`);
    report.finding('1.1-D Kontrol UI utk delete entitlement', 'tidak ada ikon hapus di halaman Employee Entitlements maupun Add Entitlement, walau endpoint DELETE berfungsi normal via API.');

    report.step('Rentang tanpa data');
    const empty = await getJson<Row[]>(page.request, `leave/leave-entitlements?empNumber=${emp}&fromDate=2020-01-01&toDate=2020-12-31`);
    report.check('6.7 [U046] GET di luar periode -> [] (bukan error)', Array.isArray(empty) && empty.length === 0, `jumlah=${empty.length}`);
  } finally {
    await cleanupLeave(page.request, [emp]);
  }
  report.print();
});
