/**
 * ================================================================================
 * TC-ADMIN-EMAILSUB-02: Verify Add/Delete Subscriber Restore Cycle
 * Modul    : Admin - Configuration - Email Subscriptions
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMAILSUB-02-Verify-Add-Delete-Subscriber-Restore.spec.ts
 * Path     : tests/admin/email-subscriptions/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah 1 subscriber (Name + Email, FREE TEXT --
 *   [TEMUAN KOREKSI] BUKAN employee autocomplete seperti asumsi awal,
 *   dikonfirmasi live lewat DOM inspection: dialog ini cuma 2 input teks
 *   biasa) ke notification type "Leave Cancellations" berhasil tersimpan,
 *   lalu menghapusnya lagi di akhir test (restore-after-mutate, sama
 *   disiplin dengan AdminGeneralInformationPage.snapshot()/restore()).
 *
 *   [SAFETY] Mengubah siapa yang menerima notifikasi email untuk event ini
 *   adalah perubahan nyata ke shared demo (bukan cuma milik admin ini
 *   sendiri, koreksi atas asumsi awal scoping -- lihat CATATAN CAKUPAN di
 *   TC-Admin.txt). TC ini SELALU membersihkan subscriber yang ditambahkan
 *   di akhir test, baik lolos maupun gagal di tengah (expect.soft tidak
 *   menghentikan test body).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/email-subscriptions/TC-ADMIN-EMAILSUB-02-Verify-Add-Delete-Subscriber-Restore.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName, uniqueEmail } from '../../../src/data/testData';

test('TC-ADMIN-EMAILSUB-02: adding then deleting a subscriber on Leave Cancellations round-trips cleanly', async ({
  page,
  adminEmailSubscriptionsPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-EMAILSUB-02', 'Verify Add Delete Subscriber Restore', env.baseURL, page);
  const es = adminEmailSubscriptionsPage;
  const subscriberName = uniqueName('QaSubscriber');
  const subscriberEmail = uniqueEmail('qasubscriber');

  report.step('Buka Email Subscriptions, klik icon Add Subscriber pada baris Leave Cancellations');
  await es.goto();
  const row = es.rowByNotificationType('Leave Cancellations');
  await es.openSubscribersFor(row);

  report.step('Verify sub-page Subscribers: Leave Cancellations termuat, catat baseline');
  const baselineText = await page.locator('body').innerText();
  const baselineHadRecords = !baselineText.includes('No Records Found');
  report.finding('Baseline subscriber list sebelum Add', baselineHadRecords ? 'SUDAH ADA subscriber lain sebelumnya (bukan 0)' : 'Kosong (0 subscriber) sebelum TC ini menambah');

  report.step('Klik Add, isi Name + Email, Save');
  await es.addButton.click();
  await page.waitForTimeout(800);
  await es.fillSubscriber(subscriberName, subscriberEmail);
  const [saveResp] = await Promise.all([
    page.waitForResponse((r) => ['POST', 'PUT'].includes(r.request().method()) && r.url().includes('subscriber'), { timeout: 10_000 }).catch(() => null),
    es.save(),
  ]);

  report.step('Verify subscriber baru muncul di list (tunggu row-nya render)');
  const subscriberRow = es.tableRows.filter({ hasText: subscriberName });
  const subscriberAdded = await subscriberRow
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  report.check(
    'Subscriber baru muncul di list dengan nama yang benar',
    subscriberAdded,
    `expected name "${subscriberName}" to appear; saveResponseStatus=${saveResp ? saveResp.status() : 'none captured'}`,
  );

  report.step('Restore: hapus subscriber yang baru ditambahkan (jika berhasil ditambahkan)');
  if (subscriberAdded) {
    await es.deleteRow(subscriberRow.first());
    await page.waitForTimeout(1200);
  }
  const afterDeleteText = await page.locator('body').innerText();
  const restoredToEmpty = !afterDeleteText.includes(subscriberName);
  report.check('Subscriber berhasil dihapus (tidak lagi muncul di list)', restoredToEmpty);

  report.print();
});
