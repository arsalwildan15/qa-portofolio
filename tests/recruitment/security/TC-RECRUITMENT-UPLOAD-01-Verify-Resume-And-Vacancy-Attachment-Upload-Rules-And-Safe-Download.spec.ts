/**
 * ================================================================================
 * TC-RECRUITMENT-UPLOAD-01 — Verify Candidate Resume And Vacancy Attachment Uploads: Allowed Types, Size Limit, Renamed And Disguised Files, Malicious File Names And A Safe Download
 * Modul    : Recruitment (U005 Add Candidate resume, U100 Candidate Detail resume, U101 Vacancy Attachments)
 * Kategori : Positive (+) 1.7 | Boundary (B) 3.3 | Security (S) 5.1-CmdPath 5.1-XSS-Stored 5.3-BadExt
 *            5.3-Rename 5.3-ContentType 5.3-DoubleExt 5.3-Oversize 5.3-Filename | API (A) 6.5
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-UPLOAD-01-Verify-Resume-And-Vacancy-Attachment-Upload-Rules-And-Safe-Download.spec.ts
 * Path     : tests/recruitment/security/
 * ================================================================================
 *
 * Upload dikirim sebagai JSON base64 (dibaca LIVE 17 Nov 2026):
 *   resume   PUT recruitment/candidate/<id>/attachment {currentAttachment:'replaceCurrent', attachment}
 *   lampiran POST recruitment/vacancy/attachments {vacancyId, attachment, comment, attachmentType:1}
 *   unduh    /recruitment/viewCandidateAttachment/candidateId/<id>, /viewVacancyAttachment/attachId/<id>
 *
 * TUJUAN (sama utk resume & lampiran lowongan):
 *   1.7  PDF valid -> 200; unduhan Content-Type application/pdf, "attachment", nosniff, isi utuh.
 *   3.3 / 5.3-Oversize  tepat 1 MB -> 200; 1 MB + 1 byte -> 422; size dipalsukan kecil -> 422.
 *   5.3-BadExt   .exe / .php / .html -> 422.
 *   5.3-ContentType  shell.php dgn type application/pdf -> 422.
 *   5.3-DoubleExt    cv.pdf.php -> 422; shell.php.pdf (ekstensi akhir pdf) diterima tapi diunduh
 *                    sbg application/pdf + attachment + nosniff (tidak dieksekusi).
 *   5.3-Rename   biner EXE (header "MZ") bernama .pdf -> harus ditolak (isi diperiksa).
 *   5.3-Filename / 5.1-CmdPath / 5.1-XSS-Stored  nama "../../../evil.pdf" & "<img ...>.pdf" ->
 *                unduhan tidak memuat "../" mentah di Content-Disposition; nama tampil sbg teks
 *                di halaman (tanpa elemen tersuntik / dialog).
 *   6.5  currentAttachment bernilai tak dikenal -> dicatat (finding).
 *
 * HASIL 17 Nov 2026: SENGAJA FAILED (R3), BUG BG-447 (Medium) -- biner EXE bernama .pdf DITERIMA di resume (sudah BG-004)
 *   DAN di lampiran lowongan (lokasi baru, akar masalah sama: hanya ekstensi/type yg diperiksa).
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/security/TC-RECRUITMENT-UPLOAD-01-Verify-Resume-And-Vacancy-Attachment-Upload-Rules-And-Safe-Download.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createVacancyWithCandidate } from '../../../src/utils/maintenanceData';
import { API, cleanupRecruitment, filePayload } from '../../../src/utils/recruitmentData';

const MB = 1024 * 1024;
const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.from([0x90, 0x00, 0x03, 0x00]), Buffer.from('This program cannot be run in DOS mode')]);

test('TC-RECRUITMENT-UPLOAD-01: resume & vacancy attachment upload rules and safe download', async ({ page }, testInfo) => {
  testInfo.setTimeout(300_000);
  const report = new TestReport('TC-RECRUITMENT-UPLOAD-01', 'Resume And Vacancy Attachment Upload Rules', env.baseURL, page);
  const dialogs: string[] = [];
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  const v = await createVacancyWithCandidate(page.request, 'QaRecUpload');
  const cid = v.candidateId!;
  const vaIds: number[] = [];
  type Target = { tag: string; send: (name: string, type: string, content: string | Buffer, size?: number) => Promise<{ status: number; id?: number }>; dl: (id?: number) => string };
  const resume: Target = {
    tag: '[U005/U100 Resume]',
    send: async (name, type, content, size) => {
      const r = await page.request.put(`${API}recruitment/candidate/${cid}/attachment`, { data: { currentAttachment: 'replaceCurrent', attachment: filePayload(name, type, content, size) } });
      return { status: r.status() };
    },
    dl: () => `/web/index.php/recruitment/viewCandidateAttachment/candidateId/${cid}`,
  };
  const vacancy: Target = {
    tag: '[U101 Lampiran Lowongan]',
    send: async (name, type, content, size) => {
      const r = await page.request.post(`${API}recruitment/vacancy/attachments`, { data: { vacancyId: v.vacancyId, attachment: filePayload(name, type, content, size), comment: 'qa', attachmentType: 1 } });
      const id = ((await r.json().catch(() => ({}))) as { data?: { id?: number } }).data?.id;
      if (id) vaIds.push(id);
      return { status: r.status(), id };
    },
    dl: (id) => `/web/index.php/recruitment/viewVacancyAttachment/attachId/${id}`,
  };
  try {
    for (const t of [resume, vacancy]) {
      report.step(t.tag);
      const pdf = '%PDF-1.4\n% qa upload\n';
      const ok = await t.send('qa-cv.pdf', 'application/pdf', pdf);
      report.check(`1.7 ${t.tag} PDF valid -> 200`, ok.status === 200, `status=${ok.status}`);
      const d = await page.request.get(t.dl(ok.id), { maxRedirects: 0 });
      const h = d.headers();
      report.check(`1.7 ${t.tag} Unduhan: application/pdf, attachment, nosniff, isi utuh`, d.status() === 200 && h['content-type'] === 'application/pdf' && /^attachment/.test(h['content-disposition'] ?? '') && h['x-content-type-options'] === 'nosniff' && (await d.text()) === pdf, `status=${d.status()} ${h['content-type']} | ${h['content-disposition']} | ${h['x-content-type-options']}`);

      const exact = await t.send('qa-1mb.pdf', 'application/pdf', Buffer.alloc(MB, 65));
      report.check(`3.3 ${t.tag} Tepat 1 MB -> 200`, exact.status === 200, `status=${exact.status}`);
      const over = await t.send('qa-big.pdf', 'application/pdf', Buffer.alloc(MB + 1, 65));
      report.check(`3.3 / 5.3-Oversize ${t.tag} 1 MB + 1 byte -> 422`, over.status === 422, `status=${over.status}`);
      const lie = await t.send('qa-big.pdf', 'application/pdf', Buffer.alloc(MB + 5000, 65), 100);
      report.check(`5.3-Oversize ${t.tag} Ukuran dipalsukan (size=100, isi >1 MB) -> 422`, lie.status === 422, `status=${lie.status}`);

      for (const [label, name, type, content] of [
        ['5.3-BadExt .exe', 'evil.exe', 'application/x-msdownload', EXE],
        ['5.3-BadExt .php', 'shell.php', 'application/x-php', '<?php system($_GET["c"]); ?>'],
        ['5.3-BadExt .html', 'x.html', 'text/html', '<script>alert(1)</script>'],
        ['5.3-ContentType shell.php dgn type application/pdf', 'shell.php', 'application/pdf', '<?php echo 1; ?>'],
        ['5.3-DoubleExt cv.pdf.php', 'cv.pdf.php', 'application/pdf', '%PDF-1.4\n'],
      ] as const) {
        const r = await t.send(name, type, content);
        report.check(`5.3-BadExt / 5.3-ContentType / 5.3-DoubleExt ${t.tag} -> 422 (${label})`, r.status === 422, `status=${r.status}`);
      }
      const dbl = await t.send('shell.php.pdf', 'application/pdf', '%PDF-1.4\n');
      const dd = dbl.status === 200 ? await page.request.get(t.dl(dbl.id), { maxRedirects: 0 }) : null;
      report.check(`5.3-DoubleExt ${t.tag} shell.php.pdf -> bila diterima, diunduh sbg application/pdf + attachment + nosniff`, dbl.status === 422 || (dd?.headers()['content-type'] === 'application/pdf' && /^attachment/.test(dd.headers()['content-disposition'] ?? '') && dd.headers()['x-content-type-options'] === 'nosniff'), `status=${dbl.status} ${dd?.headers()['content-type'] ?? ''}`);
      const ren = await t.send('evil.pdf', 'application/pdf', EXE);
      report.check(`5.3-Rename ${t.tag} Biner EXE (header MZ) bernama .pdf -> ditolak (isi file diperiksa)`, ren.status === 422, `status=${ren.status}${t === resume ? ' (resume: lihat BG-004)' : ''}`);

      const trav = await t.send('../../../evil.pdf', 'application/pdf', '%PDF-1.4\n');
      const td = trav.status === 200 ? await page.request.get(t.dl(trav.id), { maxRedirects: 0 }) : null;
      const cd = td?.headers()['content-disposition'] ?? '';
      report.check(`5.3-Filename / 5.1-CmdPath ${t.tag} Nama "../../../evil.pdf" -> ditolak, atau unduhan tanpa "../" mentah di Content-Disposition`, trav.status === 422 || (td?.status() === 200 && !cd.includes('../')), `status=${trav.status} cd=${cd}`);
    }

    report.step('Nama file berisi HTML tampil sebagai teks');
    const xssName = '<img src=x onerror=alert(1)>.pdf';
    const vx = await vacancy.send(xssName, 'application/pdf', '%PDF-1.4\n');
    await page.goto(`/web/index.php/recruitment/addJobVacancy/${v.vacancyId}`);
    await page.waitForLoadState('networkidle');
    const shownV = await page.getByText(xssName).first().isVisible().catch(() => false) || (await page.locator('.orangehrm-container').innerText()).includes(xssName);
    report.check('5.3-Filename / 5.1-XSS-Stored [U101] Nama file HTML tampil sbg teks di daftar lampiran, tanpa elemen tersuntik/dialog', vx.status === 200 && shownV && (await page.locator('img[src="x"]').count()) === 0 && dialogs.length === 0, `status=${vx.status}, tampil=${shownV}, img=${await page.locator('img[src="x"]').count()}, dialog=${dialogs.length}`);
    const rx = await resume.send(xssName, 'application/pdf', '%PDF-1.4\n');
    await page.goto(`/web/index.php/recruitment/addCandidate/${cid}`);
    await page.waitForLoadState('networkidle');
    await page.waitForResponse((r) => r.url().includes(`candidate/${cid}/attachment`)).catch(() => null);
    const bodyText = await page.locator('.orangehrm-background-container').innerText();
    report.check('5.3-Filename / 5.1-XSS-Stored [U100] Nama resume HTML tampil sbg teks, tanpa elemen tersuntik/dialog', rx.status === 200 && bodyText.includes(xssName) && (await page.locator('img[src="x"]').count()) === 0 && dialogs.length === 0, `status=${rx.status}, tampil=${bodyText.includes(xssName)}, dialog=${dialogs.length}`);

    report.step('6.5 currentAttachment tak dikenal');
    const odd = await page.request.put(`${API}recruitment/candidate/${cid}/attachment`, { data: { currentAttachment: 'zzz', attachment: filePayload('odd.pdf', 'application/pdf', '%PDF') } });
    report.finding('6.5 [U100] currentAttachment="zzz"', `status=${odd.status()} (nilai mode tidak divalidasi; file tetap diganti)`);
  } finally {
    if (vaIds.length) await page.request.delete(`${API}recruitment/vacancy/attachments`, { data: { ids: vaIds } }).catch(() => null);
    await cleanupRecruitment(page.request, [cid], [v.vacancyId]);
  }
  report.print();
});
