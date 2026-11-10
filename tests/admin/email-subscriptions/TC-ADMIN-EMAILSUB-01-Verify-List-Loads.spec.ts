/**
 * ================================================================================
 * TC-ADMIN-EMAILSUB-01: Verify List Loads
 * Modul    : Admin - Configuration - Email Subscriptions
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMAILSUB-01-Verify-List-Loads.spec.ts
 * Path     : tests/admin/email-subscriptions/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Email Subscriptions menampilkan 5 notification type
 *   (Leave Applications/Approvals/Assignments/Cancellations/Rejections).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/email-subscriptions/TC-ADMIN-EMAILSUB-01-Verify-List-Loads.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-EMAILSUB-01: Email Subscriptions list shows all 5 notification types', async ({
  page,
  adminEmailSubscriptionsPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-EMAILSUB-01', 'Verify List Loads', env.baseURL, page);
  const es = adminEmailSubscriptionsPage;

  report.step('Buka Email Subscriptions');
  await es.goto();
  await page.waitForTimeout(1000);

  report.step('Verify 5 notification type tampil');
  const expected = ['Leave Applications', 'Leave Approvals', 'Leave Assignments', 'Leave Cancellations', 'Leave Rejections'];
  const rowCount = await es.tableRows.count();
  report.check('Jumlah baris = 5', rowCount === 5, `actual=${rowCount}`);
  for (const type of expected) {
    const visible = (await es.rowByNotificationType(type).count()) > 0;
    report.check(`Notification type "${type}" tampil`, visible);
  }

  report.print();
});
