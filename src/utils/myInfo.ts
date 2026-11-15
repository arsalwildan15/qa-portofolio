import { type Browser, type Page, type Locator, type Response } from '@playwright/test';
import { type AddEmployeePage } from '../pages/AddEmployeePage';
import { createEssAccount } from './createEssAccount';
import { loginAs } from './loginAs';

/**
 * My Info = the PIM employee tabs opened by the employee for THEMSELVES. Confirmed live 2026-11-16
 * with a fresh ESS account: Personal Details editable except Employee Id, Driver's License Number and
 * Date of Birth (disabled); Contact Details editable; Emergency Contacts, Dependents, Immigration,
 * Qualifications and Memberships offer Add; Job, Salary and Report-to are read-only (no buttons).
 */
export type EssSession = {
  ess: { empNumber: number; employeeId: string; fullName: string; username: string; password: string };
  essPage: Page;
  close: () => Promise<void>;
};

/** Fresh ESS account, logged in through the real login form in its own browser context. */
export async function newEssSession(page: Page, browser: Browser, addEmployeePage: AddEmployeePage, prefix: string): Promise<EssSession> {
  const ess = await createEssAccount(page, addEmployeePage, prefix);
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);
  return { ess, essPage, close };
}

/** Opens My Info through the sidebar menu (as a user would) and returns the employee's empNumber. */
export async function openMyInfoFromMenu(essPage: Page): Promise<number> {
  await essPage.goto('/web/index.php/dashboard/index');
  await essPage.locator('.oxd-main-menu-item', { hasText: 'My Info' }).click();
  await essPage.waitForURL(/empNumber\/\d+/, { timeout: 20_000 });
  return Number(/empNumber\/(\d+)/.exec(essPage.url())?.[1]);
}

/** Deletes the table row containing `text` via its trash icon + "Yes, Delete"; returns the DELETE response. */
export async function deleteRowContaining(page: Page, rows: Locator, text: string, apiPathPart: string): Promise<Response | null> {
  const row = rows.filter({ hasText: text }).first();
  await row.locator('.bi-trash').click();
  const resp = page
    .waitForResponse((r) => r.url().includes(apiPathPart) && r.request().method() === 'DELETE', { timeout: 15_000 })
    .catch(() => null);
  await page.getByRole('button', { name: /Yes, Delete/i }).click();
  return resp;
}

/** Waits for the next request of `method` whose URL contains `apiPathPart`. */
export function nextResponse(page: Page, apiPathPart: string, method: string): Promise<Response | null> {
  return page
    .waitForResponse((r) => r.url().includes(apiPathPart) && r.request().method() === method, { timeout: 15_000 })
    .catch(() => null);
}

/**
 * Navigates to a form-style tab and WAITS for the GET that hydrates it before returning. These tabs
 * (e.g. Contact Details, Personal Details) render their inputs first and then overwrite them when the
 * GET response arrives -- anything typed before that is wiped, so the saved body comes out empty
 * (confirmed live 2026-11-16). Call this instead of a bare page.goto() on such tabs.
 */
export async function gotoTabAndHydrate(page: Page, url: string, hydrateApiPart: string): Promise<void> {
  const hydrated = page
    .waitForResponse((r) => r.url().includes(hydrateApiPart) && r.request().method() === 'GET', { timeout: 20_000 })
    .catch(() => null);
  await page.goto(url);
  await hydrated;
}
