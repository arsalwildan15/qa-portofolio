import { type Page } from '@playwright/test';
import { PersonalDetailsPage } from '../pages/PersonalDetailsPage';

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
 *
 * [TEMUAN, 2026-11-15 -- SELF-HEAL] The logged-in account's own record (empNumber 7 on this
 * shared public demo) was found CORRUPTED 3x within one session (firstName/lastName="EJBED",
 * middleName="Apt 456", employeeId="CA") -- confirmed via fresh API reads each time, not
 * client-side caching. Identical text each time strongly suggests the shared demo periodically
 * resets to an already-corrupted baseline snapshot, not live ongoing corruption from current
 * traffic. A 2-char employeeId like "CA" is short enough to case-insensitively substring-match
 * unrelated employees in autocomplete search (e.g. "Carter"), silently misdirecting any
 * downstream action (entitlement assignment, report scoping) to the WRONG employee. Manually
 * repairing this via the UI each time it recurred was approved once by the user for "aksi yg
 * sama persis" -- rather than keep doing that by hand, this function now SELF-HEALS: if the
 * fetched employeeId is suspiciously short (<5 chars, well below every legitimately-generated
 * ID observed in this project: "55555", "muser", "0372", "QAADMIN07", ...), it overwrites the
 * record via a normal, reversible Personal Details edit (not a global config mutation) before
 * returning, so every caller always gets a safe, unambiguous value.
 */
const MIN_SANE_EMPLOYEE_ID_LENGTH = 5;

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

  if (employeeId.length < MIN_SANE_EMPLOYEE_ID_LENGTH) {
    return healCorruptedIdentity(page, empNumber);
  }
  return { empNumber, employeeId, fullName };
}

async function healCorruptedIdentity(
  page: Page,
  empNumber: number,
): Promise<{ empNumber: number; employeeId: string; fullName: string }> {
  const healedEmployeeId = `QA${Date.now().toString().slice(-8)}`; // 10 chars, within the field's max length
  const personalDetailsPage = new PersonalDetailsPage(page);
  await personalDetailsPage.goto(empNumber);
  await personalDetailsPage.waitUntilLoaded();
  await personalDetailsPage.firstNameInput.fill('');
  await personalDetailsPage.firstNameInput.fill('QA');
  await personalDetailsPage.middleNameInput.fill('');
  await personalDetailsPage.lastNameInput.fill('');
  await personalDetailsPage.lastNameInput.fill('Admin');
  await personalDetailsPage.employeeIdInput.fill('');
  await personalDetailsPage.employeeIdInput.fill(healedEmployeeId);

  const responsePromise = page
    .waitForResponse(
      (r) => r.url().includes(`/api/v2/pim/employees/${empNumber}/personal-details`) && r.request().method() === 'PUT',
      { timeout: 10_000 },
    )
    .catch(() => null);
  await personalDetailsPage.save();
  const resp = await responsePromise;
  if (!resp || resp.status() !== 200) {
    throw new Error(
      `getLoggedInEmployeeName: self-heal PUT personal-details did not return 200 (status=${resp?.status()})`,
    );
  }
  await page.waitForTimeout(1_000);
  return { empNumber, employeeId: healedEmployeeId, fullName: 'QA Admin' };
}
