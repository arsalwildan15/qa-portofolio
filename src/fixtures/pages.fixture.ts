import { test as base } from '@playwright/test';
import { env } from '../config/env';
import {
  LoginPage,
  DashboardPage,
  PimPage,
  LeavePage,
  EmployeeListPage,
  AddEmployeePage,
  PersonalDetailsPage,
} from '../pages';

interface Pages {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  pimPage: PimPage;
  leavePage: LeavePage;
  employeeListPage: EmployeeListPage;
  addEmployeePage: AddEmployeePage;
  personalDetailsPage: PersonalDetailsPage;
}

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  pimPage: async ({ page }, use) => {
    await use(new PimPage(page));
  },
  leavePage: async ({ page }, use) => {
    await use(new LeavePage(page));
  },
  employeeListPage: async ({ page }, use) => {
    await use(new EmployeeListPage(page));
  },
  addEmployeePage: async ({ page }, use) => {
    await use(new AddEmployeePage(page));
  },
  personalDetailsPage: async ({ page }, use) => {
    await use(new PersonalDetailsPage(page));
  },
});

export const authenticatedTest = test.extend<Pages>({
  page: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(env.username, env.password);
    await page.waitForURL('**/dashboard/index');
    await use(page);
  },
});

export { expect } from '@playwright/test';
