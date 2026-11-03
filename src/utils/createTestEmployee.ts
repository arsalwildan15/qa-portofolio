import { type Page } from '@playwright/test';
import { type AddEmployeePage } from '../pages/AddEmployeePage';
import { uniqueEmployeeName } from '../data/testData';

/**
 * Creates an employee via Add Employee, retrying on the auto-generated
 * Employee Id colliding with an existing one ("Employee Id already
 * exists") — confirmed live: this session has created hundreds of
 * employees across Phase 1 and Phase 2 testing, and OrangeHRM's
 * sequential auto-increment occasionally races/collides under that
 * volume, blocking Save client-side so the POST never fires (not a
 * server-slowness timeout, a real validation block — see TC-PIM-ADD-08
 * for the same mechanism documented as an intentional behavior).
 * Clearing Employee Id and letting the client re-derive a fresh one
 * resolves it; retried up to 3 times before giving up.
 */
export async function createTestEmployee(
  page: Page,
  addEmployeePage: AddEmployeePage,
  namePrefix: string,
): Promise<{ empNumber: number; firstName: string; lastName: string }> {
  const employee = uniqueEmployeeName(namePrefix);
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const responsePromise = page
      .waitForResponse(
        (r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST',
        { timeout: 10_000 },
      )
      .catch(() => null);
    await addEmployeePage.save();
    const resp = await responsePromise;

    if (resp && resp.status() === 200) {
      const body = await resp.json().catch(() => null);
      if (body?.data?.empNumber) {
        return { empNumber: body.data.empNumber, firstName: employee.firstName, lastName: employee.lastName };
      }
    }

    const duplicateIdError = page.getByText('Employee Id already exists');
    if (attempt < 3 && (await duplicateIdError.isVisible().catch(() => false))) {
      await addEmployeePage.employeeIdInput.fill('');
      await addEmployeePage.employeeIdInput.blur();
      continue;
    }
    if (attempt < 3) continue; // malformed/non-200 response — just retry rather than give up
    throw new Error(`createTestEmployee: Save did not produce a usable 200 response after ${attempt} attempt(s)`);
  }
  throw new Error('createTestEmployee: unreachable');
}
