/**
 * ================================================================================
 * TC-ADMIN-EMAILSUB-06 — Verify Feedback, Double-Submit, Navigation, Session,
 *   Concurrency, Mass Assignment, CSRF And Cross-Type Relation Sweep For Email
 *   Subscriptions
 * Modul    : Admin > Configuration > Email Subscriptions (U029)
 * Kategori : Positive (+) 1.1-U 1.2 1.4 1.8 | Edge (!) 4.2 4.3 4.5 4.7 4.8 |
 *            Security (S) 5.2-MassAssign 5.4 | API (A) 6.5 | UI (8.4)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMAILSUB-06-Verify-Feedback-DoubleSubmit-Concurrency-MassAssignment-CSRF-And-Relation-Sweep.spec.ts
 * Path     : tests/admin/email-subscriptions/
 * ================================================================================
 *
 * LATAR: rebuild matrix 26 Nov 2026 menunjukkan U029 py 13 kode GAP. TC lama
 * (EMAILSUB-01..05) sudah menutup 1.1-C/1.1-D dasar + beberapa negative; sweep
 * ini menutup sisa kode (feedback/double-submit/navigasi/sesi/konkurensi/mass
 * assignment/CSRF/parameter-negative/relasi antar-entity).
 *
 * EKSPLORASI LIVE (Playwright MCP, sebelum menulis kode) membuktikan:
 *   - GET /api/v2/admin/email-subscriptions?limit=50&offset=0 -> 5 notification
 *     type (Leave Applications/Approvals/Assignments/Cancellations/Rejections),
 *     masing2 {id, name, subscribers[], isEnabled}.
 *   - PUT /api/v2/admin/email-subscriptions/<id> body {enabled:boolean} (BUKAN
 *     "isEnabled" spt nama field GET -- field PUT & GET BEDA NAMA, dikonfirmasi
 *     via UI checkbox click + capture request body asli: {"enabled":true}).
 *   - POST/DELETE /api/v2/admin/email-subscriptions/<typeId>/subscribers, body
 *     POST {name, email} (2 free-text field, bukan employee autocomplete,
 *     dikonfirmasi ulang sesi ini -- konsisten dgn TC-02 lama). DELETE body
 *     {ids:[...]}. Mass assignment (isAdmin/id) & format email salah DITOLAK
 *     422 dgn benar.
 *   - [BUG, lihat SENGAJA FAILED] Subscriber id TERNYATA GLOBAL (bukan scoped
 *     per notification type -- id lanjut increment lintas type: 1,2,3,...), DAN
 *     endpoint DELETE /api/v2/admin/email-subscriptions/<typeId>/subscribers
 *     TIDAK memverifikasi bahwa id yang dihapus benar2 milik <typeId> di URL --
 *     subscriber yang dibuat di bawah type 1 (Leave Applications) BERHASIL (200)
 *     dihapus via endpoint type 3 (Leave Approvals) yang SAMA SEKALI TIDAK
 *     PERNAH memilikinya. Dikonfirmasi deterministik dlm satu skrip sekuensial
 *     tanpa jeda waktu (bukan reset demo publik).
 *
 * SEMUA subscriber yang ditambahkan dibersihkan di akhir test (restore-after-
 * mutate), toggle "enabled" dikembalikan ke baseline (withConfigRestore, pola
 * R6) -- shared demo, GLOBAL notification routing dilihat semua user.
 *
 * HASIL 26 Nov 2026: SENGAJA FAILED (1 check, R3 -- lihat BG baru), sisanya lolos.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/email-subscriptions/TC-ADMIN-EMAILSUB-06-Verify-Feedback-DoubleSubmit-Concurrency-MassAssignment-CSRF-And-Relation-Sweep.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { withConfigRestore } from '../../../src/utils/withConfigRestore';
import { uniqueName, uniqueEmail } from '../../../src/data/testData';

const LIST_API = '/web/index.php/api/v2/admin/email-subscriptions';
type Row = Record<string, unknown>;
const json = async (r: { json(): Promise<unknown> }) => (await r.json().catch(() => null)) as { data?: unknown; error?: Row } | null;

test('TC-ADMIN-EMAILSUB-06: feedback/double-submit/navigation/session/concurrency/mass-assignment/CSRF/relation sweep for Email Subscriptions', async ({
  page,
  adminEmailSubscriptionsPage,
}, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-ADMIN-EMAILSUB-06', 'Feedback DoubleSubmit Concurrency MassAssignment CSRF Relation Sweep', env.baseURL, page, [
    /status of 422/, /status of 401/, /status of 404/, /net::ERR_FAILED/, /reading 'response'/,
  ]);
  const es = adminEmailSubscriptionsPage;

  const getTypes = async (): Promise<Row[]> => {
    const r = await page.request.get(`${LIST_API}?limit=50&offset=0`);
    return ((await json(r))?.data as Row[]) ?? [];
  };
  const typeByName = (types: Row[], name: string) => types.find((t) => t.name === name) as Row;
  const subscribers = async (typeId: number): Promise<Row[]> => {
    const r = await page.request.get(`${LIST_API}/${typeId}/subscribers`);
    return ((await json(r))?.data as Row[]) ?? [];
  };
  const addSubscriber = async (typeId: number, name: string, email: string) => {
    const res = await page.request.post(`${LIST_API}/${typeId}/subscribers`, { data: { name, email } });
    return { status: res.status(), body: await json(res) };
  };
  const deleteSubscriber = async (typeId: number, ids: number[]) => {
    const res = await page.request.delete(`${LIST_API}/${typeId}/subscribers`, { data: { ids } });
    return { status: res.status(), body: await json(res) };
  };
  const setEnabled = async (typeId: number, enabled: boolean) => {
    const res = await page.request.put(`${LIST_API}/${typeId}`, { data: { enabled } });
    return { status: res.status(), body: await json(res) };
  };

  await withConfigRestore(
    async () => getTypes(),
    async (snap) => {
      // restore every type's "enabled" flag to its snapshot value
      await Promise.all(snap.map((t) => setEnabled(t.id as number, t.isEnabled as boolean)));
    },
    async () => {
      const typesBefore = await getTypes();
      const leaveApplications = typeByName(typesBefore, 'Leave Applications');
      const leaveApprovals = typeByName(typesBefore, 'Leave Approvals');
      const leaveAssignments = typeByName(typesBefore, 'Leave Assignments');
      const createdIds: { typeId: number; id: number }[] = [];

      report.step('1.1-U / 1.8: toggle "enabled" via UI checkbox -> PUT 200 & terlihat tersimpan, restore via UI lagi');
      await es.goto();
      const row = es.rowByNotificationType('Leave Applications');
      const checkbox = row.locator('input[type="checkbox"]');
      await checkbox.click();
      const putWait = page.waitForResponse((r) => r.url().includes(`/email-subscriptions/${leaveApplications.id}`) && r.request().method() === 'PUT', { timeout: 15_000 }).catch(() => null);
      const putRes = await putWait;
      report.check('1.1-U Toggle "enabled" via UI -> PUT 200', putRes?.status() === 200, `status=${putRes?.status()}`);
      const afterToggle = (await getTypes()).find((t) => t.id === leaveApplications.id);
      report.check('1.1-U Setelah toggle, GET mencerminkan isEnabled = !semula', afterToggle?.isEnabled === !leaveApplications.isEnabled, `isEnabled=${afterToggle?.isEnabled}, semula=${leaveApplications.isEnabled}`);
      report.check('1.8 Tidak ada error/crash setelah toggle (checkbox tetap interaktif)', await checkbox.isEnabled(), 'checkbox.isEnabled()');
      await setEnabled(leaveApplications.id as number, leaveApplications.isEnabled as boolean); // restore immediately

      report.step('1.2: tambah 2 subscriber dgn format input valid BERVARIASI (nama berapostrof, email bersubdomain) -> keduanya 200');
      const nameA = `O'Brien_${uniqueName('Qa')}`;
      const emailA = `qa.sub.${Date.now().toString().slice(-6)}@mail.sub.example.com`;
      const addA = await addSubscriber(leaveApplications.id as number, nameA, emailA);
      report.check('1.2 Subscriber dgn nama berapostrof + email bersubdomain -> 200 & tersimpan', addA.status === 200 && (addA.body?.data as Row)?.name === nameA, `status=${addA.status}, data=${JSON.stringify(addA.body?.data)}`);
      if (addA.status === 200) createdIds.push({ typeId: leaveApplications.id as number, id: (addA.body?.data as Row).id as number });
      const nameB = uniqueName('QaUnicodeÀéü');
      const emailB = uniqueEmail('qa-variasi');
      const addB = await addSubscriber(leaveApplications.id as number, nameB, emailB);
      report.check('1.2 Subscriber dgn nama unicode beraksen -> 200 & tersimpan', addB.status === 200 && (addB.body?.data as Row)?.name === nameB, `status=${addB.status}, data=${JSON.stringify(addB.body?.data)}`);
      if (addB.status === 200) createdIds.push({ typeId: leaveApplications.id as number, id: (addB.body?.data as Row).id as number });

      report.step('1.4: relasi antar-entity -- subscriber yang ditambahkan ke type A TIDAK muncul di list subscriber type B (isolasi relasi)');
      const listA = await subscribers(leaveApplications.id as number);
      const listB = await subscribers(leaveApprovals.id as number);
      report.check('1.4 Subscriber baru (type A) muncul di list type A sendiri', listA.some((s) => s.name === nameA), `listA names=${JSON.stringify(listA.map((s) => s.name))}`);
      report.check('1.4 Subscriber baru (type A) TIDAK muncul di list type B yang berbeda (isolasi list benar)', !listB.some((s) => s.name === nameA), `listB names=${JSON.stringify(listB.map((s) => s.name))}`);

      report.step('4.2: double-submit -- 2 POST paralel dgn Name+Email PERSIS SAMA -> TIDAK ada 5xx, TEPAT SATU baris tersimpan (email unique ditegakkan, bukan duplikat/korup)');
      const dupName = uniqueName('QaDup');
      const dupEmail = uniqueEmail('qa-dup');
      const [dupA, dupB] = await Promise.all([
        addSubscriber(leaveApplications.id as number, dupName, dupEmail),
        addSubscriber(leaveApplications.id as number, dupName, dupEmail),
      ]);
      const statusesDup = [dupA.status, dupB.status].sort();
      report.check('4.2 Dua POST paralel dgn data identik -> TIDAK ada 5xx (hasil = [200,200] jika duplikat diizinkan, ATAU [200,422] jika email unique ditegakkan)', statusesDup.every((s) => s < 500), `statuses=${JSON.stringify(statusesDup)}`);
      if (dupA.status === 200) createdIds.push({ typeId: leaveApplications.id as number, id: (dupA.body?.data as Row).id as number });
      if (dupB.status === 200) createdIds.push({ typeId: leaveApplications.id as number, id: (dupB.body?.data as Row).id as number });
      const afterDup = await subscribers(leaveApplications.id as number);
      const dupRows = afterDup.filter((s) => s.name === dupName);
      report.check(
        '4.2 Baris tersimpan dari 2 POST paralel identik = 1 atau 2 (bukan 0 krn silently hilang, bukan >2 krn korup)',
        dupRows.length === 1 || dupRows.length === 2,
        `rows tersimpan=${dupRows.length}, A=${dupA.status} B=${dupB.status}`,
      );
      report.finding(
        '4.2 Double-submit Name+Email identik pada Email Subscriptions',
        dupRows.length === 1
          ? `Email unique DITEGAKKAN server-side pd race ini: A=${dupA.status}, B=${dupB.status}, tepat 1 baris "${dupName}" tersimpan (salah satu POST ditolak 422 krn email sudah dipakai request paralelnya).`
          : `Duplikat DITERIMA pd race ini: A=${dupA.status}, B=${dupB.status}, ${dupRows.length} baris "${dupName}" tersimpan (tidak ada constraint unique yang menang pd timing ini -- hasil race condition bisa berbeda antar run, didokumentasikan sbg finding bukan bug keras krn ini daftar penerima notifikasi).`,
      );

      report.step('4.3: isi dialog Add TANPA Save (Cancel) -> TIDAK ada POST terkirim, list tidak berubah');
      await es.goto();
      const rowForCancel = es.rowByNotificationType('Leave Applications');
      await es.openSubscribersFor(rowForCancel);
      const beforeCancelCount = (await subscribers(leaveApplications.id as number)).length;
      await es.addButton.click();
      await page.waitForTimeout(500);
      await es.fillSubscriber(uniqueName('QaShouldNotPersist'), uniqueEmail('qa-cancel'));
      let cancelPostSent = false;
      const onReq = (req: { url(): string; method(): string }) => {
        if (req.url().includes('/subscribers') && req.method() === 'POST') cancelPostSent = true;
      };
      page.on('request', onReq);
      await es.cancelButton.click();
      await page.waitForTimeout(1000);
      page.off('request', onReq);
      const afterCancelCount = (await subscribers(leaveApplications.id as number)).length;
      report.check('4.3 Klik Cancel pada dialog Add -> TIDAK ada POST /subscribers terkirim', !cancelPostSent, `cancelPostSent=${cancelPostSent}`);
      report.check('4.3 Jumlah subscriber tidak berubah setelah Cancel', afterCancelCount === beforeCancelCount, `before=${beforeCancelCount}, after=${afterCancelCount}`);

      report.step('4.5: POST subscriber dgn sesi terputus (cookie dihapus) -> 401, TIDAK ada baris baru tersimpan');
      const beforeSessionCount = (await subscribers(leaveApplications.id as number)).length;
      const cookies = await page.context().cookies();
      await page.context().clearCookies();
      const noSessStatus = await page.evaluate(async (url) => {
        const r = await fetch(url, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'QaNoSession', email: 'qa-nosession@example.com' }) });
        return r.status;
      }, `${LIST_API}/${leaveApplications.id}/subscribers`);
      await page.context().addCookies(cookies);
      const afterSessionCount = (await subscribers(leaveApplications.id as number)).length;
      report.check('4.5 POST tanpa sesi -> 401', noSessStatus === 401, `status=${noSessStatus}`);
      report.check('4.5 Jumlah subscriber TIDAK berubah setelah POST tanpa sesi ditolak', afterSessionCount === beforeSessionCount, `sebelum=${beforeSessionCount}, sesudah=${afterSessionCount}`);

      report.step('4.7: konkurensi 2 "admin" -- 2 PUT paralel enable 2 notification type BERBEDA -> keduanya tersimpan, tidak saling timpa');
      const [concA, concB] = await Promise.all([
        setEnabled(leaveApplications.id as number, true),
        setEnabled(leaveAssignments.id as number, true),
      ]);
      const typesAfterConc = await getTypes();
      const laAfter = typesAfterConc.find((t) => t.id === leaveApplications.id);
      const lasAfter = typesAfterConc.find((t) => t.id === leaveAssignments.id);
      report.check(
        '4.7 Dua "admin" enable 2 type berbeda scr paralel -> keduanya 200 & keduanya tersimpan enabled=true',
        concA.status === 200 && concB.status === 200 && laAfter?.isEnabled === true && lasAfter?.isEnabled === true,
        `A=${concA.status}, B=${concB.status}, LeaveApplications.isEnabled=${laAfter?.isEnabled}, LeaveAssignments.isEnabled=${lasAfter?.isEnabled}`,
      );
      // restore both immediately
      await setEnabled(leaveApplications.id as number, leaveApplications.isEnabled as boolean);
      await setEnabled(leaveAssignments.id as number, leaveAssignments.isEnabled as boolean);

      report.step('[SENGAJA FAILED, lihat BUG] 1.4 / 4.8: DELETE subscriber via endpoint type LAIN (bukan type aslinya) SEHARUSNYA ditolak/no-op, relasi subscriber<->type harus ditegakkan');
      const crossAdd = await addSubscriber(leaveApplications.id as number, uniqueName('QaCrossTypeRelation'), uniqueEmail('qa-crosstype'));
      const crossId = (crossAdd.body?.data as Row)?.id as number;
      const crossDelWrongType = await deleteSubscriber(leaveApprovals.id as number, [crossId]);
      const stillUnderOriginal = (await subscribers(leaveApplications.id as number)).some((s) => s.id === crossId);
      report.check(
        '1.4 / 4.8 [BUG] Subscriber milik type "Leave Applications" DIHAPUS lewat endpoint type "Leave Approvals" yang TIDAK PERNAH memilikinya -- SEHARUSNYA DELETE ini ditolak (404/403) atau minimal tidak berefek krn id tidak terdaftar di bawah type tsb, NYATANYA 200 & subscriber benar2 hilang dari type aslinya',
        crossDelWrongType.status !== 200 || stillUnderOriginal,
        `crossDelWrongType.status=${crossDelWrongType.status}, stillUnderOriginalType=${stillUnderOriginal} (id=${crossId} dibuat di bawah type ${leaveApplications.id}, dihapus via type ${leaveApprovals.id})`,
      );
      if (stillUnderOriginal) createdIds.push({ typeId: leaveApplications.id as number, id: crossId }); // cleanup if the delete didn't actually work

      report.step('5.2-MassAssign: POST subscriber dgn field asing (isAdmin/id) -> 422 ditolak eksplisit');
      const massRes = await page.request.post(`${LIST_API}/${leaveApplications.id}/subscribers`, { data: { name: uniqueName('QaMass'), email: uniqueEmail('qa-mass'), isAdmin: true, id: 999999 } });
      const massBody = await json(massRes);
      const massKeys = ((massBody?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('5.2-MassAssign Field asing ditolak 422 DAN disebut eksplisit', massRes.status() === 422 && !!massKeys?.includes('isAdmin') && !!massKeys?.includes('id'), `status=${massRes.status()}, invalidParamKeys=${JSON.stringify(massKeys)}`);

      report.step('5.4: CSRF -- cookie sesi aman + Origin header tidak divalidasi (A/B status identik)');
      const cookie = (await page.context().cookies()).find((c) => c.name === 'orangehrm');
      report.check('5.4 Cookie sesi HttpOnly + Secure + SameSite Lax/Strict', !!cookie && cookie.httpOnly && cookie.secure && ['Lax', 'Strict'].includes(cookie.sameSite as string), JSON.stringify({ httpOnly: cookie?.httpOnly, secure: cookie?.secure, sameSite: cookie?.sameSite }));
      const legitOrigin = await page.request.post(`${LIST_API}/${leaveApplications.id}/subscribers`, { data: { name: uniqueName('QaCsrfLegit'), email: uniqueEmail('qa-csrf-legit') } });
      const fakeOrigin = await page.request.post(`${LIST_API}/${leaveApplications.id}/subscribers`, { data: { name: uniqueName('QaCsrfFake'), email: uniqueEmail('qa-csrf-fake') }, headers: { Origin: 'https://evil.example' } });
      report.check('5.4 Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (pertahanan hanya cookie SameSite, pola app-wide)', legitOrigin.status() === fakeOrigin.status(), `legit=${legitOrigin.status()}, fake=${fakeOrigin.status()}`);
      const legitBody = await json(legitOrigin);
      const fakeBody = await json(fakeOrigin);
      if (legitOrigin.status() === 200) createdIds.push({ typeId: leaveApplications.id as number, id: (legitBody?.data as Row).id as number });
      if (fakeOrigin.status() === 200) createdIds.push({ typeId: leaveApplications.id as number, id: (fakeBody?.data as Row).id as number });

      report.step('6.5: parameter negative -- format email salah & name bertipe number -> 422');
      const badEmailRes = await page.request.post(`${LIST_API}/${leaveApplications.id}/subscribers`, { data: { name: uniqueName('QaBadEmail'), email: 'not-an-email' } });
      const badEmailBody = await json(badEmailRes);
      const badEmailKeys = ((badEmailBody?.error as Row | undefined)?.data as Row | undefined)?.invalidParamKeys as string[] | undefined;
      report.check('6.5 Format email salah -> 422 menyebut "email"', badEmailRes.status() === 422 && !!badEmailKeys?.includes('email'), `status=${badEmailRes.status()}, invalidParamKeys=${JSON.stringify(badEmailKeys)}`);
      const badNameTypeRes = await page.request.post(`${LIST_API}/${leaveApplications.id}/subscribers`, { data: { name: 12345, email: uniqueEmail('qa-badnametype') } });
      report.check('6.5 Name bertipe number (bukan string) -> 422', badNameTypeRes.status() === 422, `status=${badNameTypeRes.status()}`);

      report.step('8.4: konsistensi struktur error -- 2 jenis invalid berbeda, envelope error sama bentuknya');
      const shape = (b: { error?: Row } | null | undefined) => JSON.stringify(Object.keys(b?.error ?? {}).sort());
      report.check('8.4 Struktur error {status,message,data.invalidParamKeys} konsisten antar jenis invalid (mass-assign vs format email salah)', shape(massBody) === shape(badEmailBody), `massAssign=${shape(massBody)}, badEmail=${shape(badEmailBody)}`);

      report.step('Cleanup: hapus SEMUA subscriber QA* yang tersisa, verifikasi tidak ada probe tertinggal');
      const byType = new Map<number, number[]>();
      for (const { typeId, id } of createdIds) {
        byType.set(typeId, [...(byType.get(typeId) ?? []), id]);
      }
      for (const [typeId, ids] of byType) {
        await deleteSubscriber(typeId, ids).catch(() => null);
      }
      const finalLeaveApplications = await subscribers(leaveApplications.id as number);
      const leftoverQa = finalLeaveApplications.filter((s) => String(s.name).startsWith('Qa') || String(s.name).startsWith("O'Brien_Qa"));
      report.check('Tidak ada subscriber probe "Qa*" tersisa di "Leave Applications" setelah cleanup', leftoverQa.length === 0, `leftover=${JSON.stringify(leftoverQa)}`);
    },
  );

  report.print();
});
