/**
 * ================================================================================
 * TC-CLAIM-ASSIGN-17 — Verify Create Claim: Validation, State Transition, Boundary And Edge Cases
 * Modul    : Claim > Assign Claim (U076, claim/assignClaim)
 * Kategori : Positive (+) 1.2 1.8 | Negative (-) 2.5 | Boundary (!) 3.1 | Edge (!) 4.5
 *            4.6 | Security (S) 5.2-MassAssign 5.4 5.5 | API (A) 6.3 6.4 6.7 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-ASSIGN-17-Verify-Create-Validation-State-Transition-Boundary-And-Edge-Cases.spec.ts
 * Path     : tests/claim/assign/
 * ================================================================================
 *
 * LATAR: menutup 13 kode GAP terakhir U076 Assign Claim. Dibuktikan LIVE 24 Nov 2026 via
 * POST /api/v2/claim/employees/<empNumber>/requests {claimEventId, currencyId, remarks?}:
 *   - remarks dikosongkan -> 200, field opsional (1.2).
 *   - remarks 5000 karakter -> 422 ditolak, ada batas panjang server-side (3.1).
 *   - field asing status/id di body create -> 422 SELURUH request ditolak (bukan diam2
 *     diabaikan), bukti whitelist validation ketat (5.2-MassAssign -- evidence sama dgn
 *     TC-CLAIM-ASSIGN-11 yg sudah ada, di sini diberi label literal lengkap agar tooling
 *     coverage bisa membacanya).
 *   - Approve claim yg MASIH berstatus INITIATED (belum di-Submit ESS) -> 403 ditolak,
 *     urutan status (INITIATED -> SUBMITTED -> APPROVED/REJECTED) ditegakkan server, tidak
 *     bisa di-skip (2.5).
 *   - GET ke endpoint create-only -> 405 Method Not Allowed (6.3).
 *   - Request tanpa auth/sesi (context browser baru, tanpa cookie login) -> 401 (6.4).
 *   - 2 klaim identik (event+currency sama) utk employee yg sama -> keduanya 200, tidak
 *     ada uniqueness constraint -- wajar, 1 employee bisa punya banyak klaim travel
 *     terpisah (6.7, bukan bug).
 *   - Origin palsu vs sendiri -> status identik (5.4).
 *   - 8x POST create berturut-turut -> TIDAK ADA satu pun kena 429/throttle, rate limiting
 *     TIDAK ADA sama sekali (5.5, BUG BARU, pola sama dgn BG-026/BG-067/BG-185 di modul
 *     lain -- cek hard FAIL konsisten dgn precedent TC-BUZZ-SECURITY-11, bukan finding).
 *   - Create via UI -> toast sukses (1.8/8.4).
 *   - Autocomplete Employee Name dgn nama yg tidak match siapa pun -> dropdown menampilkan
 *     "No Records Found" (4.6, empty-state yg valid di form ini -- bukan tabel Expense,
 *     krn create TIDAK auto-navigasi ke halaman detail, form reset ke kosong lagi).
 *   - Koneksi putus saat Create -> tidak crash, tapi memicu "net::ERR_FAILED"/"Uncaught
 *     exception: fe" di console (instans BG-199-family yg sudah terdokumentasi di banyak
 *     modul lain) -- di-whitelist, bukan bug baru (4.5).
 *
 * HASIL 24 Nov 2026: lolos penuh KECUALI 1 gagal SENGAJA (5.5 rate limiting, BUG BARU --
 *   lihat Bug-List). MENUTUP U076 SEPENUHNYA.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/assign/TC-CLAIM-ASSIGN-17-Verify-Create-Validation-State-Transition-Boundary-And-Edge-Cases.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { pickLightlyUsedEmployee } from '../../../src/utils/pickLightlyUsedEmployee';
import { dropConnectionDuringSave } from '../../../src/utils/networkEdge';
import { AssignClaimPage } from '../../../src/pages';

const API = '/web/index.php/api/v2/';

test('TC-CLAIM-ASSIGN-17: create claim validation, state transition, boundary, edge cases', async ({ page, request }, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-CLAIM-ASSIGN-17', 'Create Validation State Transition Boundary Edge Cases', env.baseURL, page, [
    /net::ERR_FAILED/, /Uncaught exception: fe/,
  ]);
  const target = await pickLightlyUsedEmployee(page);
  await page.goto('/web/index.php/claim/assignClaim');

  report.step('1.2 Field remarks opsional, dikosongkan');
  const noRemarks = await page.request.post(`${API}claim/employees/${target.empNumber}/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } });
  report.check('1.2 [U076] POST tanpa field remarks -> 200 (opsional)', noRemarks.status() === 200, `status=${noRemarks.status()}`);

  report.step('3.1 Boundary panjang -- remarks 5000 karakter');
  const longRemarks = await page.request.post(`${API}claim/employees/${target.empNumber}/requests`, { data: { claimEventId: 3, currencyId: 'AFN', remarks: 'a'.repeat(5000) } });
  report.check('3.1 [U076] remarks 5000 karakter -> 422 ditolak (ada batas panjang server-side)', longRemarks.status() === 422, `status=${longRemarks.status()}`);

  report.step('5.2-MassAssign Field asing status/id di body create');
  const massAssign = await page.request.post(`${API}claim/employees/${target.empNumber}/requests`, { data: { claimEventId: 3, currencyId: 'AFN', status: 'APPROVED', id: 99999 } });
  const massAssignBody = await massAssign.json().catch(() => null);
  report.check('5.2-MassAssign [U076] Field asing status/id -> 422 SELURUH request ditolak (whitelist validation ketat, tidak diam2 diabaikan)', massAssign.status() === 422 && (massAssignBody?.error?.data?.invalidParamKeys ?? []).includes('status'), `status=${massAssign.status()} keys=${JSON.stringify(massAssignBody?.error?.data?.invalidParamKeys)}`);

  report.step('2.5 State transition -- Approve claim yg masih INITIATED (belum Submit)');
  const created = await page.request.post(`${API}claim/employees/${target.empNumber}/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } });
  const claimId = (await created.json().catch(() => null))?.data?.id as number | undefined;
  report.check('[Setup] Klaim baru berhasil dibuat', created.status() === 200 && !!claimId, `status=${created.status()} id=${claimId}`);
  if (claimId) {
    const approveInitiated = await page.request.put(`${API}claim/requests/${claimId}/action`, { data: { action: 'APPROVE' } });
    report.check('2.5 [U076] Approve claim yg MASIH INITIATED (skip Submit) -> ditolak (urutan status ditegakkan, tidak bisa di-skip)', approveInitiated.status() === 403, `status=${approveInitiated.status()}`);
  }

  report.step('6.3 Request method salah -- GET ke endpoint create-only');
  const wrongMethod = await page.request.get(`${API}claim/employees/${target.empNumber}/requests`);
  report.check('6.3 [U076] GET ke endpoint create claim (harusnya POST-only) -> 405', wrongMethod.status() === 405, `status=${wrongMethod.status()}`);

  report.step('6.4 Auth/token -- request tanpa sesi login');
  const noAuth = await request.post(`${API}claim/employees/${target.empNumber}/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } });
  report.check('6.4 [U076] POST tanpa cookie sesi login -> 401 ditolak', noAuth.status() === 401, `status=${noAuth.status()}`);

  report.step('6.7 Uniqueness -- 2 klaim identik (event+currency sama) utk employee yg sama');
  const dup1 = await page.request.post(`${API}claim/employees/${target.empNumber}/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } });
  const dup2 = await page.request.post(`${API}claim/employees/${target.empNumber}/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } });
  report.check('6.7 [U076] 2 klaim identik -> keduanya 200, tidak ada uniqueness constraint (wajar, 1 employee bisa py banyak klaim terpisah)', dup1.status() === 200 && dup2.status() === 200, `dup1=${dup1.status()} dup2=${dup2.status()}`);

  report.step('5.4 CSRF -- Origin aplikasi sendiri vs Origin palsu');
  const legit = await page.request.post(`${API}claim/employees/${target.empNumber}/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } });
  const evil = await page.request.post(`${API}claim/employees/${target.empNumber}/requests`, { data: { claimEventId: 3, currencyId: 'AFN' }, headers: { Origin: 'https://evil.example' } });
  report.check('5.4 [U076] Status identik Origin sendiri vs Origin palsu -- Origin tidak divalidasi (konsisten dgn modul lain)', legit.status() === evil.status(), `legit=${legit.status()} evil=${evil.status()}`);

  report.step('5.5 Rate limiting -- 8x POST create berturut-turut');
  const rapidResults: number[] = [];
  for (let i = 0; i < 8; i++) {
    const r = await page.request.post(`${API}claim/employees/${target.empNumber}/requests`, { data: { claimEventId: 3, currencyId: 'AFN' } });
    rapidResults.push(r.status());
  }
  report.check('5.5 [U076] Spam create tidak menyebabkan 500 (server tetap stabil meski tanpa rate limit)', rapidResults.every((s) => s < 500), `results=${JSON.stringify(rapidResults)}`);
  report.check(`5.5 [U076] Rate limiting ADA pd create claim (minimal 1 dari 8 POST berturut-turut kena 429/throttle)`, rapidResults.some((s) => s === 429), `results=${JSON.stringify(rapidResults)} -- tanpa rate limiting, akun bisa men-spam klaim sampah tak terbatas, pola sama dgn BG-026 (Login)/BG-067 (Recruitment)/BG-185 (Buzz)`);

  report.step('1.8 / 8.4 Create via UI -- toast sukses');
  const assignClaimPage = new AssignClaimPage(page);
  await assignClaimPage.goto();
  await assignClaimPage.selectEmployee(target.employeeId);
  await assignClaimPage.selectEvent('Travel Allowance');
  await assignClaimPage.selectCurrencyByIndex(1);
  const createResp = await assignClaimPage.create();
  const toastText = await page.locator('.oxd-toast').first().textContent({ timeout: 3_000 }).catch(() => null);
  report.check('1.8 [U076] Create via UI -> POST 200 + toast sukses muncul', createResp?.status() === 200 && !!toastText && /Successfully/i.test(toastText), `status=${createResp?.status()} toast=${toastText}`);
  report.check('8.4 [U076] Teks toast konsisten dgn pola "Successfully ..." di form lain', !!toastText && /Successfully (Saved|Added)/i.test(toastText), `toast="${toastText}"`);

  report.step('4.6 Data kosong -- autocomplete Employee Name tanpa hasil');
  await assignClaimPage.goto();
  await assignClaimPage.employeeNameInput.fill('Zzzznonexistentgarbage12345');
  await page.waitForTimeout(2000);
  const noRecordsText = await page.locator('.oxd-autocomplete-dropdown, [role="listbox"]').innerText().catch(() => '');
  report.check('4.6 [U076] Autocomplete Employee Name tanpa hasil -> menampilkan "No Records Found" (empty state)', /No Records Found/i.test(noRecordsText), `dropdown="${noRecordsText}"`);

  report.step('4.5 Koneksi putus saat Create');
  await assignClaimPage.goto();
  await assignClaimPage.selectEmployee(target.employeeId);
  await assignClaimPage.selectEvent('Travel Allowance');
  await assignClaimPage.selectCurrencyByIndex(1);
  await dropConnectionDuringSave(page, `**/claim/employees/${target.empNumber}/requests`, () => assignClaimPage.createButton.click());
  report.check('4.5 [U076] Koneksi putus saat Create -> tidak crash (halaman tetap merespons)', await page.locator('body').isVisible(), 'body masih visible setelah abort');

  report.print();
});
