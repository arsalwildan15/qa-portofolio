/**
 * ================================================================================
 * TC-ADMIN-EMAILSUB-04: Verify Cancel Discards Add Subscriber Dialog
 * Modul    : Admin - Configuration - Email Subscriptions
 * Kategori : Unexpected/Edge (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMAILSUB-04-Verify-Cancel-Discards.spec.ts
 * Path     : tests/admin/email-subscriptions/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Cancel pada dialog Add Subscriber (notification type
 *   "Leave Assignments", field Name+Email free text -- lihat TEMUAN
 *   KOREKSI di TC-ADMIN-EMAILSUB-02) membatalkan penambahan, tidak ada
 *   subscriber baru tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/email-subscriptions/TC-ADMIN-EMAILSUB-04-Verify-Cancel-Discards.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName, uniqueEmail } from '../../../src/data/testData';

test('TC-ADMIN-EMAILSUB-04: Cancel on Add Subscriber discards without saving', async ({
  page,
  adminEmailSubscriptionsPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-EMAILSUB-04', 'Verify Cancel Discards', env.baseURL, page);
  const es = adminEmailSubscriptionsPage;
  const subscriberName = uniqueName('QaCancelSub');
  const subscriberEmail = uniqueEmail('qacancelsub');

  report.step('Buka Email Subscriptions, masuk ke Leave Assignments, catat baseline (jumlah baris), klik Add, isi Name+Email, klik Cancel');
  await es.goto();
  const row = es.rowByNotificationType('Leave Assignments');
  await es.openSubscribersFor(row);
  const baselineRowCount = await es.tableRows.count();

  await es.addButton.click();
  await page.waitForTimeout(800);
  await es.fillSubscriber(subscriberName, subscriberEmail);
  await es.cancelButton.click();
  await page.waitForTimeout(1000);

  report.step('Verify subscriber baru TIDAK muncul di list, dan jumlah baris tidak berubah dari baseline');
  const afterCancelText = await page.locator('body').innerText();
  report.check('Subscriber baru TIDAK muncul di list setelah Cancel', !afterCancelText.includes(subscriberName));
  const afterCancelRowCount = await es.tableRows.count();
  report.check(
    'Jumlah baris subscriber tidak berubah setelah Cancel',
    afterCancelRowCount === baselineRowCount,
    `baseline=${baselineRowCount} afterCancel=${afterCancelRowCount}`,
  );

  report.print();
});
