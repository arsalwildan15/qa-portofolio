/**
 * ================================================================================
 * TC-CLAIM-APPROVAL-06 — Verify Concurrent Approve And Reject On The Same Claim Resolve To One Outcome
 * Modul    : Claim - Employee Claims (Admin)
 * Kategori : Edge Case (!) 4.4 -- Race Condition
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-CLAIM-APPROVAL-06-Verify-Concurrent-Approve-And-Reject.spec.ts
 * Path     : tests/claim/approval/
 * ================================================================================
 *
 * TUJUAN:
 *   Dua aksi yg saling eksklusif (APPROVE dan REJECT) dikirim BERSAMAAN (Promise.all) ke klaim
 *   SUBMITTED yg sama. Harapan: tepat SATU yg 200, satunya ditolak, dan status akhir konsisten
 *   dgn pemenang (PAID jika Approve menang, REJECTED jika Reject menang) -- bukan dua-duanya
 *   sukses (pola race condition yg pernah ditemukan di Recruitment). Confirmed live 2x dgn
 *   pemenang BERBEDA (Approve 200/Reject 403 -> PAID; Approve 403/Reject 200 -> REJECTED):
 *   pemenang tidak deterministik, tapi selalu tepat satu & status akhir konsisten.
 *
 * RUN COMMAND:
 *   npx playwright test tests/claim/approval/TC-CLAIM-APPROVAL-06-Verify-Concurrent-Approve-And-Reject.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createEssClaim } from '../../../src/utils/createEssClaim';

test('TC-CLAIM-APPROVAL-06: concurrent approve and reject on the same claim resolve to exactly one outcome', async ({
  page,
  browser,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  const report = new TestReport('TC-CLAIM-APPROVAL-06', 'Concurrent Approve And Reject', env.baseURL, page);

  report.step('Setup: ESS punya klaim SUBMITTED');
  const { essPage, close, claimId } = await createEssClaim(page, browser, addEmployeePage, 'QaClmRace');

  report.step('[Admin API] APPROVE dan REJECT dikirim bersamaan');
  const act = (action: string) => page.request.put(`/web/index.php/api/v2/claim/requests/${claimId}/action`, { data: { action } });
  const [approve, reject] = await Promise.all([act('APPROVE'), act('REJECT')]);
  const winners = [approve.status(), reject.status()].filter((s) => s === 200).length;
  report.finding('Status respons', `approve=${approve.status()}, reject=${reject.status()}`);
  report.check('Tepat SATU aksi sukses (200)', winners === 1, `winners=${winners}`);

  report.step('[ESS API] Status akhir konsisten dgn pemenang');
  const final = (await (await essPage.request.get(`/web/index.php/api/v2/claim/requests/${claimId}`)).json().catch(() => null))?.data?.status;
  const expected = approve.status() === 200 ? 'PAID' : reject.status() === 200 ? 'REJECTED' : '(tidak ada pemenang)';
  report.check(`Status akhir = ${expected}`, final === expected, `final=${final}`);

  await close();
  report.print();
});
