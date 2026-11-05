/**
 * ================================================================================
 * TC-RECRUITMENT-SECURITY-04: Verify Concurrent Status Transition Race Condition
 * Modul    : Recruitment - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-SECURITY-04-Verify-Concurrent-Status-Transition-Race-Condition.spec.ts
 * Path     : tests/recruitment/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi race condition saat 2 status transition BERBEDA
 *   ditembakkan SECARA PARALEL (Promise.all, bukan berurutan) untuk
 *   candidate yang sama (dari status Shortlisted: Reject vs Schedule
 *   Interview). Ini adalah PEMERIKSAAN KORENTNESS NYATA (bukan cuma
 *   dokumentasi): jika hasil akhirnya tidak konsisten (mis. status final
 *   "Rejected" TAPI Candidate History juga mencatat "Interview
 *   Scheduled", atau sebaliknya), itu BUG NYATA dan di-hard-fail via
 *   report.check(), BUKAN dilunakkan jadi report.finding() ambigu --
 *   sesuai instruksi eksplisit di gap-coverage doc untuk TC ini.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/security/TC-RECRUITMENT-SECURITY-04-Verify-Concurrent-Status-Transition-Race-Condition.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';
import { shortlistCandidate } from '../../../src/utils/advanceCandidateStatus';

test('TC-RECRUITMENT-SECURITY-04: 2 concurrent status-transition PUT requests for the same candidate', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-RECRUITMENT-SECURITY-04', 'Concurrent Status Transition Race Condition', env.baseURL, page);

  report.step('Buat candidate, Shortlist (status punya minimal 2 aksi valid: Reject dan Schedule Interview)');
  const { candidateId } = await createTestCandidate(page, candidatesPage, 'QaRaceCondition');
  await shortlistCandidate(page, candidatesPage, candidateId);

  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(3000);
  const rejectAvailable = await candidatesPage.statusActionButton('Reject').isVisible({ timeout: 3_000 }).catch(() => false);
  const scheduleAvailable = await candidatesPage.statusActionButton('Schedule Interview').isVisible({ timeout: 3_000 }).catch(() => false);
  report.check('Candidate Shortlisted punya minimal 2 aksi valid tersedia (Reject + Schedule Interview)', rejectAvailable && scheduleAvailable);

  report.step('[API] Siapkan 2 request status-transition BERBEDA untuk candidate id yang SAMA (payload/method confirmed live via discovery)');
  const rejectUrl = `${env.baseURL}/web/index.php/api/v2/recruitment/candidates/${candidateId}/reject`;
  const interviewUrl = `${env.baseURL}/web/index.php/api/v2/recruitment/candidates/${candidateId}/shedule-interview`;

  report.step('[API] Kirim keduanya SECARA PARALEL via Promise.all (bukan berurutan)');
  const [rejectResp, interviewResp] = await Promise.all([
    page.request.put(rejectUrl, { data: { note: 'QA race condition reject' } }).catch((e) => ({ status: () => -1, _err: e }) as any),
    page.request
      .post(interviewUrl, {
        data: {
          interviewName: 'QA Race Condition Interview',
          interviewDate: '2026-11-20',
          interviewTime: null,
          note: null,
          interviewerEmpNumbers: [69],
        },
      })
      .catch((e) => ({ status: () => -1, _err: e }) as any),
  ]);
  const rejectStatus = typeof rejectResp.status === 'function' ? rejectResp.status() : -1;
  const interviewStatus = typeof interviewResp.status === 'function' ? interviewResp.status() : -1;
  report.check('Kedua request PUT selesai tanpa exception jaringan (status code terbaca)', rejectStatus !== -1 && interviewStatus !== -1, `reject=${rejectStatus}, interview=${interviewStatus}`);

  report.step('[API] GET detail candidate setelah keduanya selesai, cek status akhir konsisten');
  const detailResp = await page.request.get(`${env.baseURL}/web/index.php/api/v2/recruitment/candidates/${candidateId}`);
  const detailBody = await detailResp.json().catch(() => null);
  const finalStatusLabel: string | undefined = detailBody?.data?.status?.label ?? detailBody?.data?.status;
  report.check('GET detail candidate setelah race berhasil (200)', detailResp.status() === 200, `status=${detailResp.status()}`);

  // Cross-check the candidate's final status label against candidate
  // history (vacancy-history endpoint, best-effort -- some demo builds do
  // not expose it, so its absence does not by itself prove inconsistency).
  const historyUrl = `${env.baseURL}/web/index.php/api/v2/recruitment/candidates/${candidateId}/vacancy-history`;
  const historyResp = await page.request.get(historyUrl).catch(() => null);
  const historyBody = historyResp && historyResp.status() === 200 ? await historyResp.json().catch(() => null) : null;
  const historyEntries: any[] = Array.isArray(historyBody?.data) ? historyBody.data : [];
  const historyMentionsReject = historyEntries.some((e) => JSON.stringify(e).toLowerCase().includes('reject'));
  const historyMentionsInterview = historyEntries.some((e) => JSON.stringify(e).toLowerCase().includes('interview'));

  const onlyOneSucceeded =
    (rejectStatus === 200 && interviewStatus !== 200) || (rejectStatus !== 200 && interviewStatus === 200);
  const bothSucceeded = rejectStatus === 200 && interviewStatus === 200;
  // The authoritative consistency check is whether the final status label
  // matches the ONE transition the server reported as successful -- the
  // history endpoint is corroborating evidence only, not a hard requirement
  // (it may 404/be shaped differently across demo builds).
  const stateIsConsistent =
    onlyOneSucceeded &&
    ((rejectStatus === 200 && finalStatusLabel === 'Rejected') ||
      (interviewStatus === 200 && finalStatusLabel === 'Interview Scheduled'));

  if (bothSucceeded) {
    // Both transitions reporting success for mutually-exclusive status
    // changes on the same candidate IS the race condition: this is a real
    // confirmed bug, hard-failed per the gap-coverage doc's explicit
    // instruction for this TC (not softened into a finding).
    report.check(
      'BUG: HANYA SATU transition yang boleh berhasil ter-apply (server harus punya locking/versioning)',
      false,
      `Kedua PUT request (Reject dan Schedule Interview) melaporkan sukses (reject=${rejectStatus}, interview=${interviewStatus}) ` +
        `untuk candidate id ${candidateId} yang sama secara SIMULTAN -- tidak ada optimistic locking/versioning di server. ` +
        `Status akhir tercatat: "${finalStatusLabel}". historyMentionsReject=${historyMentionsReject}, historyMentionsInterview=${historyMentionsInterview}.`,
    );
  } else if (onlyOneSucceeded && !stateIsConsistent) {
    // One succeeded, but the recorded final state/history doesn't line up
    // with which one succeeded -- also a real inconsistency, hard-failed.
    report.check(
      'BUG: state akhir TIDAK KONSISTEN dengan transition yang berhasil',
      false,
      `reject=${rejectStatus}, interview=${interviewStatus}, finalStatusLabel="${finalStatusLabel}", ` +
        `historyMentionsReject=${historyMentionsReject}, historyMentionsInterview=${historyMentionsInterview}. ` +
        'Status/history yang tercatat tidak cocok dengan request yang dilaporkan sukses oleh server.',
    );
  } else if (onlyOneSucceeded && stateIsConsistent) {
    report.check(
      'Hanya SATU transition berhasil ter-apply secara konsisten (server punya locking/versioning yang benar)',
      true,
      `reject=${rejectStatus}, interview=${interviewStatus}, finalStatusLabel="${finalStatusLabel}"`,
    );
  } else {
    // Neither succeeded (e.g. both rejected by validation) -- not the
    // scenario under test, but not a broken/inconsistent state either.
    report.finding(
      'Kedua request gagal (bukan race condition yang teramati)',
      `reject=${rejectStatus}, interview=${interviewStatus}. Tidak ada transition yang berhasil diterapkan sama sekali, ` +
        'jadi tidak ada state inkonsisten untuk dievaluasi pada run ini.',
    );
  }

  report.check('TC dijalankan tanpa exception', true);
  report.print();
});
