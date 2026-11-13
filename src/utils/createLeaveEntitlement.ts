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
  // After a successful save, the app shows a success toast and then redirects itself (a
  // client-side JS timer, not a network event networkidle can see) a moment later. Calling
  // page.goto() elsewhere right in that window races the app's own pending redirect and
  // throws net::ERR_ABORTED -- confirmed live, reproduced 3x identically. No DOM/network
  // signal marks when that timer fires, so this fixed wait is a deliberate exception to the
  // "no arbitrary waits" rule, not a flakiness band-aid.
  await leaveEntitlementPage.settleAfterSave();
  return { employeeName, status: resp?.status() };
}
