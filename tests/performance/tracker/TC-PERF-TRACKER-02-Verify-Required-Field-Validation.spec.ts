/**
 * ================================================================================
 * TC-PERF-TRACKER-02 — Verify Add Tracker Required-Field Validation
 * Modul    : Performance - Configure - Trackers
 * Kategori : Negative (-) 2.1
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PERF-TRACKER-02-Verify-Required-Field-Validation.spec.ts
 * Path     : tests/performance/tracker/
 * ================================================================================
 *
 * TUJUAN:
 *   Save form Add Performance Tracker dalam keadaan kosong ditolak CLIENT-SIDE: 3 pesan
 *   "Required" (Tracker Name, Employee Name, Reviewers), TIDAK ada POST terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/performance/tracker/TC-PERF-TRACKER-02-Verify-Required-Field-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-PERF-TRACKER-02: saving an empty Add Tracker form is blocked with 3 Required errors', async ({
  page,
  performanceTrackerPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PERF-TRACKER-02', 'Tracker Required Field Validation', env.baseURL, page);

  report.step('Buka Add Performance Tracker, langsung Save tanpa isi apapun');
  await performanceTrackerPage.gotoAdd();
  const resp = await performanceTrackerPage.save();
  report.check('TIDAK ada POST config/trackers terkirim', resp === null, `status=${resp?.status()}`);
  const required = (await performanceTrackerPage.fieldErrors.allInnerTexts()).filter((t) => t === 'Required');
  report.check('Ada 3 pesan "Required" (Tracker Name, Employee Name, Reviewers)', required.length === 3, `count=${required.length}`);

  report.print();
});
