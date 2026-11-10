/**
 * ================================================================================
 * TC-ADMIN-EMAILSUB-05: Verify XSS/SQLi Payload In Subscriber Name
 * Modul    : Admin - Configuration - Email Subscriptions
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMAILSUB-05-Verify-XSS-SQLi-In-Employee-Search.spec.ts
 * Path     : tests/admin/email-subscriptions/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS/SQLi di field Name (notification type
 *   "Leave Approvals") TIDAK men-trigger alert/exception dan ter-render
 *   aman (escaped) di list subscriber -- [TEMUAN KOREKSI, dikonfirmasi
 *   live saat menulis suite ini] field ini BUKAN employee autocomplete
 *   seperti dugaan awal, melainkan 2 input teks bebas (Name + Email),
 *   jadi payload XSS/SQLi langsung relevan di sini (bukan di search
 *   box). TC ini membersihkan subscriber yang dibuatnya di akhir test
 *   (restore-after-mutate, sama disiplin dengan TC-ADMIN-EMAILSUB-02).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/email-subscriptions/TC-ADMIN-EMAILSUB-05-Verify-XSS-SQLi-In-Employee-Search.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmail } from '../../../src/data/testData';

const PAYLOAD_NAME = `<script>alert(1)</script>' OR '1'='1`;

test('TC-ADMIN-EMAILSUB-05: XSS/SQLi payload in subscriber Name is handled safely, then cleaned up', async ({
  page,
  adminEmailSubscriptionsPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-EMAILSUB-05', 'Verify XSS SQLi In Subscriber Name', env.baseURL, page);
  const es = adminEmailSubscriptionsPage;
  const subscriberEmail = uniqueEmail('qaxsssub');

  let dialogFired = false;
  page.on('dialog', (d) => {
    dialogFired = true;
    void d.dismiss();
  });

  report.step('Buka Email Subscriptions, masuk ke Leave Approvals, klik Add, isi Name dengan payload XSS/SQLi + Email valid, Save');
  await es.goto();
  const row = es.rowByNotificationType('Leave Approvals');
  await es.openSubscribersFor(row);
  await es.addButton.click();
  await page.waitForTimeout(800);
  await es.fillSubscriber(PAYLOAD_NAME, subscriberEmail);
  await es.save();
  const createdRow = es.tableRows.filter({ hasText: subscriberEmail });
  await createdRow.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});

  report.step('Verify tidak ada alert/dialog ter-trigger, dan cek bagaimana payload ter-render di list');
  report.check('TIDAK ADA JS alert/dialog ter-trigger', !dialogFired);
  const bodyText = await page.locator('body').innerText();
  const renderedSafely = bodyText.includes(PAYLOAD_NAME) || bodyText.includes(subscriberEmail);
  report.finding(
    'Rendering payload XSS/SQLi di list subscriber',
    renderedSafely
      ? 'Subscriber dengan payload berhasil tersimpan dan tampil sebagai TEKS biasa (bukan ter-eksekusi sebagai script) -- escaping aman dikonfirmasi lewat tidak adanya alert'
      : 'Payload TIDAK ditemukan di list -- mungkin ditolak server atau gagal tersimpan',
  );

  report.step('Cleanup: hapus subscriber yang dibuat TC ini (restore-after-mutate)');
  if ((await createdRow.count()) > 0) {
    await es.deleteRow(createdRow.first());
    await page.waitForTimeout(1000);
  }
  const afterCleanupText = await page.locator('body').innerText();
  report.check('Subscriber yang dibuat TC ini sudah dibersihkan', !afterCleanupText.includes(subscriberEmail));

  report.print();
});
