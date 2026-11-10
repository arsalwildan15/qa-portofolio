/**
 * ================================================================================
 * TC-ADMIN-EMAILSUB-03: Verify Empty Submit Validation
 * Modul    : Admin - Configuration - Email Subscriptions
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMAILSUB-03-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/email-subscriptions/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Save pada dialog Add Subscriber (notification type
 *   "Leave Rejections") tanpa memilih employee memunculkan validasi
 *   Required dan tidak ada subscriber baru tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/email-subscriptions/TC-ADMIN-EMAILSUB-03-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-EMAILSUB-03: submitting Add Subscriber with no employee selected shows Required, nothing saved', async ({
  page,
  adminEmailSubscriptionsPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-EMAILSUB-03', 'Verify Empty Submit Validation', env.baseURL, page);
  const es = adminEmailSubscriptionsPage;

  const mutatingRequests: string[] = [];
  page.on('request', (r) => {
    if (['POST', 'PUT'].includes(r.method()) && r.url().includes('subscri')) mutatingRequests.push(`${r.method()} ${r.url()}`);
  });

  report.step('Buka Email Subscriptions, masuk ke Leave Rejections, klik Add, klik Save TANPA pilih employee');
  await es.goto();
  const row = es.rowByNotificationType('Leave Rejections');
  await es.openSubscribersFor(row);
  await es.addButton.click();
  await page.waitForTimeout(800);
  await es.save();
  await page.waitForTimeout(1000);

  report.step('Verify pesan Required muncul dan tidak ada POST/PUT subscriber terkirim');
  const errorText = await es.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.check('Pesan error Required muncul', (errorText ?? '').trim().length > 0, `error="${errorText}"`);
  report.check('TIDAK ADA POST/PUT subscriber terkirim', mutatingRequests.length === 0, `requests=${JSON.stringify(mutatingRequests)}`);

  report.print();
});
