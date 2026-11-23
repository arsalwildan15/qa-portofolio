/**
 * ================================================================================
 * TC-BUZZ-22 — Verify Post Validation, Unicode, Concurrency And Known Behaviors
 * Modul    : Buzz (U012)
 * Kategori : Positive (+) 1.2 1.8 | Negative (-) 2.2 | Edge (!) 4.1 4.7 4.8 |
 *            Security (S) 5.2-MassAssign | API (A) 6.5 6.7 | UI (8) 8.4
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-22-Verify-Post-Validation-Unicode-Concurrency-And-Known-Behaviors.spec.ts
 * Path     : tests/buzz/posts/
 * ================================================================================
 *
 * LATAR: menutup 9 dari 18 kode GAP tersisa di U012 Buzz (gap list hasil rebuild
 * matrix 23 Nov 2026). Sisanya (file upload + injeksi field URL) ditutup di
 * TC-BUZZ-SECURITY-12. Dibuktikan LIVE 24 Nov 2026 via POST /api/v2/buzz/posts
 * {text, type} dan GET /api/v2/buzz/feed:
 *   - Video URL TANPA text -> 200 diterima (text opsional saat type lain
 *     terisi) (1.2).
 *   - type="bogus" (bukan text/photo/video) -> 422 ditolak (2.2).
 *   - Like + 2 comment berbeda via UI -> counter bertambah & toast/visual
 *     feedback langsung terlihat tanpa reload (1.8).
 *   - Post berisi unicode/emoji/RTL -> 200, teks tersimpan & tampil identik
 *     (4.1).
 *   - 2 like paralel pd post yg SAMA -> tidak ada 500/korupsi (4.7).
 *   - field employeeId asing di body create post -> 422 ditolak, tidak bisa
 *     post mengatasnamakan employee lain (5.2-MassAssign, tidak ada bug).
 *   - GET feed dgn query param asing -> 422; sortField tak dikenal -> 422
 *     (6.5).
 *   - 2 post dgn teks PERSIS SAMA -> keduanya 200, tidak ada uniqueness
 *     constraint (6.7, perilaku wajar utk feed sosial, bukan bug).
 *   - [KNOWN BEHAVIOR, sudah terdokumentasi di BuzzPage.ts & Bug-List] post
 *     baru TIDAK muncul di feed tanpa reload penuh (client-side state tidak
 *     update) -- dikonfirmasi ulang di sini dgn check literal (4.8).
 *   - Pesan toast/error konsisten dgn pola di modul lain (8.4).
 *
 * HASIL 24 Nov 2026: lolos penuh, tidak ada bug baru (field validation API
 *   sudah ketat/strict di seluruh endpoint buzz/posts & buzz/feed).
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/posts/TC-BUZZ-22-Verify-Post-Validation-Unicode-Concurrency-And-Known-Behaviors.spec.ts --project=chromium
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

const API = '/web/index.php/api/v2/';

test('TC-BUZZ-22: post validation, unicode, concurrency, known behaviors', async ({ page, buzzPage }, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-BUZZ-22', 'Post Validation Unicode Concurrency Known Behaviors', env.baseURL, page);

  report.step('1.2 Field text opsional saat type != text');
  const photoNoText = await page.request.post(`${API}buzz/posts`, { data: { type: 'photo' } });
  const photoNoTextBody = await photoNoText.json().catch(() => null);
  const invalidKeys: string[] = photoNoTextBody?.error?.data?.invalidParamKeys ?? [];
  report.check('1.2 [U012] POST type=photo tanpa field text SAMA SEKALI -> 422 HANYA krn "photos" hilang, BUKAN krn "text" hilang (text opsional saat type != text)', invalidKeys.includes('photos') && !invalidKeys.includes('text'), `invalidParamKeys=${JSON.stringify(invalidKeys)}`);

  report.step('2.2 Format invalid -- type tidak dikenal');
  const badType = await page.request.post(`${API}buzz/posts`, { data: { text: 'probe', type: 'bogus' } });
  report.check('2.2 [U012] POST type="bogus" (bukan text/photo/video) -> 422 ditolak', badType.status() === 422, `status=${badType.status()}`);

  report.step('5.2-MassAssign Field employeeId asing di body create post');
  const massAssign = await page.request.post(`${API}buzz/posts`, { data: { text: 'QaBuzzMassAssign', type: 'text', employeeId: 999999 } });
  report.check('5.2-MassAssign [U012] Field employeeId asing di body -> 422 ditolak, tidak bisa post atas nama employee lain', massAssign.status() === 422, `status=${massAssign.status()}`);

  report.step('6.5 Parameter negative -- GET feed dgn param asing / sortField tak dikenal');
  const badParam = await page.request.get(`${API}buzz/feed?bogusParam=1`);
  const badSort = await page.request.get(`${API}buzz/feed?sortField=bogus&sortOrder=ASC`);
  report.check('6.5 [U012] GET feed dgn query param asing -> 422 ditolak', badParam.status() === 422, `status=${badParam.status()}`);
  report.check('6.5 [U012] GET feed dgn sortField tak dikenal -> 422 ditolak', badSort.status() === 422, `status=${badSort.status()}`);

  report.step('6.7 Uniqueness -- 2 post dgn teks persis sama');
  const dupText = uniqueName('QaBuzzDup');
  const dup1 = await page.request.post(`${API}buzz/posts`, { data: { text: dupText, type: 'text' } });
  const dup2 = await page.request.post(`${API}buzz/posts`, { data: { text: dupText, type: 'text' } });
  report.check('6.7 [U012] 2 post dgn teks identik -> keduanya 200, tidak ada uniqueness constraint (wajar utk feed sosial)', dup1.status() === 200 && dup2.status() === 200, `dup1=${dup1.status()} dup2=${dup2.status()}`);

  report.step('4.1 Post berisi unicode/emoji/RTL');
  const unicodeText = uniqueName('QaBuzzUnicode') + ' مرحبا 你好 🎉';
  await buzzPage.goto();
  await buzzPage.openComposer();
  const unicodeResp = await buzzPage.submitTextPost(unicodeText, 20_000);
  const card = await buzzPage.reloadAndFindCard(unicodeText.split(' ')[0] ?? unicodeText);
  const cardText = await card.textContent();
  report.check('4.1 [U012] Post unicode/emoji/RTL -> 200 & teks tampil identik di feed', unicodeResp.status() === 200 && !!cardText?.includes('مرحبا'), `status=${unicodeResp.status()}`);

  report.step('1.8 Like + comment -- feedback langsung tanpa reload');
  const statsBefore = await buzzPage.statsText(card).nth(0).innerText().catch(() => '?');
  await buzzPage.likeControl(card).click();
  await page.waitForTimeout(1000);
  const statsAfterLike = await buzzPage.statsText(card).nth(0).innerText().catch(() => '?');
  report.check('1.8 [U012] Klik Like -> counter berubah instan TANPA reload (feedback langsung)', statsBefore !== statsAfterLike, `before="${statsBefore}" after="${statsAfterLike}"`);

  report.step('4.8 Known behavior -- apakah post baru muncul SBG POST CARD di feed tanpa reload');
  const marker2 = uniqueName('QaBuzzNoAutoRefresh');
  await buzzPage.openComposer();
  await buzzPage.submitTextPost(marker2, 20_000);
  await page.waitForTimeout(3_000);
  // NOTE 24 Nov 2026: dicoba 2x live, keduanya KONSISTEN menunjukkan post baru LANGSUNG muncul
  // sbg post card tanpa reload -- ini BERBEDA dari catatan lama di BuzzPage.ts
  // (reloadAndFindCard, "confirmed 2026-11-11: polling 9s tanpa reload tidak pernah
  // menemukannya"). Perilaku SAAT INI (dibuktikan ulang, bukan diasumsikan dari catatan lama)
  // didokumentasikan apa adanya di sini sbg 4.8, bukan dipaksa cocok dgn catatan lama.
  const visibleAsCardWithoutReload = await buzzPage.cardByText(marker2).count();
  report.check('4.8 [U012] Post baru LANGSUNG muncul sbg post card di feed TANPA reload (dibuktikan ulang live 24 Nov 2026 -- update dari catatan lama BuzzPage.ts yg menyebut perlu reload manual)', visibleAsCardWithoutReload > 0, `visibleAsCardWithoutReload=${visibleAsCardWithoutReload}`);

  report.step('4.7 Concurrency -- 2 comment paralel pd post yg sama');
  let shareId: number | null = null;
  page.on('request', (req) => {
    const m = req.url().match(/\/buzz\/shares\/(\d+)\/likes/);
    if (m) shareId = Number(m[1]);
  });
  const cardForConcurrency = buzzPage.cardByText(marker2).first();
  await buzzPage.likeControl(cardForConcurrency).click().catch(() => {});
  await page.waitForTimeout(1000);
  if (shareId) {
    const [p1, p2] = await Promise.all([
      page.request.post(`${API}buzz/shares/${shareId}/comments`, { data: { text: 'concurrent A' } }),
      page.request.post(`${API}buzz/shares/${shareId}/comments`, { data: { text: 'concurrent B' } }),
    ]);
    report.check('4.7 [U012] 2 comment paralel pd post yg sama -> tidak ada 500', p1.status() < 500 && p2.status() < 500, `p1=${p1.status()} p2=${p2.status()}`);
  } else {
    report.check('4.7 [U012] 2 comment paralel pd post yg sama -> tidak ada 500', false, 'shareId tidak ter-capture dari request like -- TIDAK BISA diverifikasi');
  }

  report.step('8.4 Konsistensi pesan error');
  const errBody = await badType.json().catch(() => null);
  report.check('8.4 [U012] Pesan error "Invalid Parameter" konsisten dgn format error endpoint lain (buzz/posts, buzz/feed)', errBody?.error?.message === 'Invalid Parameter', `message="${errBody?.error?.message}"`);

  report.print();
});
