/**
 * ================================================================================
 * TC-BUZZ-SECURITY-02: Verify SQL Injection Payload In Post Text
 * Modul    : Buzz - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-SECURITY-02-Verify-SQL-Injection-In-Post-Text.spec.ts
 * Path     : tests/buzz/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection di teks post tidak menyebabkan
 *   server error/crash, dan feed tetap bisa diakses normal setelahnya.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/security/TC-BUZZ-SECURITY-02-Verify-SQL-Injection-In-Post-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-BUZZ-SECURITY-02: a SQL injection payload in post text does not break the app', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-SECURITY-02', 'SQL Injection In Post Text', env.baseURL, page);
  const payload = "QaBuzzSQLi' OR '1'='1'; DROP TABLE ohrm_buzz_post; --";

  report.step('Isi composer dengan payload SQL injection, submit');
  await buzzPage.goto();
  await buzzPage.openComposer();
  const resp = await buzzPage.submitTextPost(payload).catch(() => null);

  report.step('Verify: request tidak menyebabkan 500, feed masih bisa di-reload normal');
  report.check(
    '[API] Response status < 500 (server tidak crash)',
    resp ? resp.status() < 500 : false,
    `status=${resp?.status()}`,
  );
  await buzzPage.goto();
  await page.waitForTimeout(3000);
  report.check(
    'Feed masih berfungsi normal setelah payload (minimal 1 card visible)',
    (await buzzPage.postCards.count()) > 0,
  );

  report.print();
});
