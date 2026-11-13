import { type Page } from '@playwright/test';

/**
 * Identifies the currently logged-in user's employee record reliably: empNumber via the
 * deterministic "My Info" redirect (/pim/viewMyDetails always 302s to
 * /pim/viewPersonalDetails/empNumber/<N> for whoever is logged in), then that employee's
 * CURRENT name via a direct API call (GET /api/v2/pim/employees/<empNumber>).
 *
 * [TEMUAN -- root cause of a real, hard-to-spot bug in this suite] The topbar user
 * dropdown's display name (".oxd-userdropdown-tab") was tried first and found UNRELIABLE:
 * confirmed live, it read "Ankit Pal" at one point while the SAME empNumber's actual PIM
 * record, queried via API in the same test run moments later, was "John Mike Doe" --
 * apparently a client-side caching lag versus the live record, not merely the shared
 * demo being renamed between page loads (both reads happened within the same session).
 * Searching Add Entitlement's employee autocomplete by a stale/wrong name then assigns the
 * entitlement to a DIFFERENT employee than the one Apply Leave actually applies for
 * (self-service, keyed by empNumber from the session) -- causing a confusing downstream
 * "Leave Balance Exceeded" on Apply that has nothing to do with the entered values. Always
 * resolve empNumber/employeeId/name through this helper right before using them, rather
 * than trusting the topbar or a cached name string.
 *
 * `employeeId` (the short internal code, e.g. "55555") is the field callers should actually
 * SEARCH with in autocomplete fields -- confirmed live, it returns exactly one unambiguous
 * match, unlike a display name which can collide with other employees in this ~500-person
 * shared demo or be read stale. `fullName` is returned for logging/readability only.
 */
export async function getLoggedInEmployeeName(
  page: Page,
): Promise<{ empNumber: number; employeeId: string; fullName: string }> {
  await page.goto('/web/index.php/pim/viewMyDetails');
  await page.waitForLoadState('networkidle').catch(() => {});
  const match = /empNumber\/(\d+)/.exec(page.url());
  const empNumber = match ? Number(match[1]) : NaN;
  if (!Number.isFinite(empNumber)) {
    throw new Error(`getLoggedInEmployeeName: could not parse empNumber from URL "${page.url()}"`);
  }

  const resp = await page.request.get(`/web/index.php/api/v2/pim/employees/${empNumber}`);
  const body = await resp.json().catch(() => null);
  const data = body?.data;
  const fullName = [data?.firstName, data?.middleName, data?.lastName].filter(Boolean).join(' ');
  const employeeId = data?.employeeId;
  if (!fullName || !employeeId) {
    throw new Error(`getLoggedInEmployeeName: could not read employee details for empNumber ${empNumber}`);
  }
  return { empNumber, employeeId, fullName };
}
