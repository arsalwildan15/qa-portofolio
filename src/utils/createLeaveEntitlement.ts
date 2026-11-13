import { type LeaveEntitlementPage } from '../pages/LeaveEntitlementPage';

/**
 * Assigns a Leave Entitlement to the given employee so Apply Leave has a non-zero balance
 * to exercise -- confirmed live, Apply Leave shows "No Leave Types with Leave Balance" and
 * cannot be exercised at all without this step first. Handles the upsert-confirmation
 * dialog transparently (an entitlement for the same employee + leave type + period that was
 * already set by an earlier test run triggers a "value X will be updated to Y" confirm step).
 */
export async function createLeaveEntitlement(
  leaveEntitlementPage: LeaveEntitlementPage,
  employeeSearchTerm: string,
  leaveTypeName: string,
  days: string,
): Promise<{ employeeName: string; status: number | undefined }> {
  await leaveEntitlementPage.goto();
  const employeeName = await leaveEntitlementPage.selectEmployee(employeeSearchTerm);
  await leaveEntitlementPage.selectLeaveType(leaveTypeName);
  await leaveEntitlementPage.fillEntitlement(days);
  const resp = await leaveEntitlementPage.save();
  return { employeeName, status: resp?.status() };
}
