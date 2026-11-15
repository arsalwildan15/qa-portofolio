import { type Page } from '@playwright/test';
import { type AddEmployeePage } from '../pages/AddEmployeePage';
import { type AdminUsersPage } from '../pages/AdminUsersPage';
import { createTestEmployee } from './createTestEmployee';
import { uniqueName } from '../data/testData';

/**
 * Creates a brand-new employee, then a second Admin-role login linked to that SAME employee via
 * Admin > User Management > Add User. Unlike createEssAccount() (which creates employee+login
 * atomically through Add Employee's own toggle), Admin-role login can ONLY be created through
 * this separate form -- Add Employee's "Create Login Details" toggle always produces ESS
 * (confirmed live, no role selector appears). Uses AdminUsersPage.selectEmployee() with the
 * exact unique name just created, not fillFirstEmployeeName()'s arbitrary "a" match, so the new
 * login is guaranteed linked to the employee this function just made, not some pre-existing one.
 */
export async function createSecondAdmin(
  page: Page,
  addEmployeePage: AddEmployeePage,
  adminUsersPage: AdminUsersPage,
  namePrefix: string,
  password = 'Passw0rd!2026',
): Promise<{ empNumber: number; employeeId: string; fullName: string; username: string; password: string }> {
  const employee = await createTestEmployee(page, addEmployeePage, namePrefix);
  const username = uniqueName(`${namePrefix}Admin`).toLowerCase();

  await adminUsersPage.gotoAdd();
  await adminUsersPage.selectUserRole('Admin');
  await adminUsersPage.selectEmployee(`${employee.firstName} ${employee.lastName}`);
  await adminUsersPage.selectStatus('Enabled');
  await adminUsersPage.usernameInput.fill(username);
  await adminUsersPage.passwordInput.fill(password);
  await adminUsersPage.confirmPasswordInput.fill(password);

  const responsePromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/users') && r.request().method() === 'POST', {
      timeout: 15_000,
    })
    .catch(() => null);
  await adminUsersPage.save();
  const resp = await responsePromise;

  if (!resp || resp.status() !== 200) {
    throw new Error(`createSecondAdmin: Save did not produce a 200 response (status=${resp?.status()})`);
  }

  return {
    empNumber: employee.empNumber,
    employeeId: employee.employeeId,
    fullName: `${employee.firstName} ${employee.lastName}`,
    username,
    password,
  };
}
