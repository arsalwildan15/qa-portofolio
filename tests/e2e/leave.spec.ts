import { authenticatedTest as test, expect } from '../../src/fixtures/pages.fixture';
import { futureLeaveDate } from '../../src/data/testData';

test.describe('Leave - Apply', () => {
  // The shared public OrangeHRM demo account has no assigned leave entitlement, so every
  // leave type consistently shows "Balance not sufficient" once a date range is selected.
  // We assert on that deterministic, environment-verified behavior rather than a
  // successful submission, which would require entitlement this public demo doesn't grant.
  test('selecting a date range with no entitlement blocks submission', async ({ leavePage }) => {
    const fromDate = futureLeaveDate(60);
    const toDate = futureLeaveDate(61);

    await leavePage.goto();
    await leavePage.selectLeaveType('US - Vacation');
    await leavePage.setDateRange(fromDate, toDate);

    await expect(leavePage.leaveBalance).toHaveText('Balance not sufficient');
  });
});
