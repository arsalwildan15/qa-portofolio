import { type Page } from '@playwright/test';
import { type AddEmployeePage } from '../pages/AddEmployeePage';
import { uniqueEmployeeName, uniqueName } from '../data/testData';

/**
 * Creates a brand-new employee WITH a linked ESS login in one atomic step, via Add Employee's
 * "Create Login Details" toggle -- confirmed live, this is the only employee-creation path with
 * guaranteed-correct employee<->user linkage (no ambiguous name/employeeId search involved, unlike
 * Admin > User Management > Add User, which searches an EXISTING employee by free-text name).
 * Confirmed live: toggling it reveals Username/Password/Confirm Password but NO role selector --
 * the resulting user is ALWAYS role ESS (verified via GET /api/v2/admin/users).
 */
export async function createEssAccount(
  page: Page,
  addEmployeePage: AddEmployeePage,
  namePrefix: string,
  password = 'Passw0rd!2026',
): Promise<{ empNumber: number; employeeId: string; fullName: string; username: string; password: string }> {
  const employee = uniqueEmployeeName(namePrefix);
  const username = uniqueName(`${namePrefix}Ess`).toLowerCase();

  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.toggleCreateLoginDetails();
  await addEmployeePage.usernameInput.fill(username);
  await addEmployeePage.passwordInput.fill(password);
  await addEmployeePage.confirmPasswordInput.fill(password);

  const responsePromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST', {
      timeout: 15_000,
    })
    .catch(() => null);
  await addEmployeePage.save();
  const resp = await responsePromise;

  if (!resp || resp.status() !== 200) {
    throw new Error(`createEssAccount: Save did not produce a 200 response (status=${resp?.status()})`);
  }
  const body = await resp.json().catch(() => null);
  if (!body?.data?.empNumber) {
    throw new Error('createEssAccount: 200 response had no empNumber');
  }

  return {
    empNumber: body.data.empNumber,
    employeeId: body.data.employeeId,
    fullName: `${employee.firstName} ${employee.lastName}`,
    username,
    password,
  };
}
