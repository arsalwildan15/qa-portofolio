import { type Browser, type Page } from '@playwright/test';
import { type AddEmployeePage } from '../pages/AddEmployeePage';
import { createEssAccount } from './createEssAccount';
import { loginAs } from './loginAs';

/**
 * Creates a fresh ESS account, logs it in (separate context), and creates one of its OWN claims
 * via the ESS API (setup only -- not the thing under test): POST claim/requests, optionally POST
 * requests/<id>/expenses, optionally PUT requests/<id>/action {SUBMIT}. Shapes confirmed live
 * 2026-11-15. Caller must `close()` the ESS context.
 */
export async function createEssClaim(
  page: Page,
  browser: Browser,
  addEmployeePage: AddEmployeePage,
  namePrefix: string,
  options: { expenseAmount?: string; submit?: boolean } = { expenseAmount: '150.50', submit: true },
): Promise<{
  ess: { empNumber: number; employeeId: string; fullName: string; username: string; password: string };
  essPage: Page;
  close: () => Promise<void>;
  claimId: number;
}> {
  const ess = await createEssAccount(page, addEmployeePage, namePrefix);
  const { page: essPage, close } = await loginAs(browser, ess.username, ess.password);

  const created = await essPage.request.post('/web/index.php/api/v2/claim/requests', {
    data: { claimEventId: 1, currencyId: 'AFN', remarks: null },
  });
  const claimId = (await created.json().catch(() => null))?.data?.id as number | undefined;
  if (!claimId) throw new Error(`createEssClaim: create status=${created.status()}`);

  if (options.expenseAmount) {
    const exp = await essPage.request.post(`/web/index.php/api/v2/claim/requests/${claimId}/expenses`, {
      data: { expenseTypeId: 1, date: '2026-07-07', amount: options.expenseAmount, note: null },
    });
    if (exp.status() !== 200) throw new Error(`createEssClaim: expense status=${exp.status()}`);
  }
  if (options.submit) {
    const sub = await essPage.request.put(`/web/index.php/api/v2/claim/requests/${claimId}/action`, { data: { action: 'SUBMIT' } });
    if (sub.status() !== 200) throw new Error(`createEssClaim: submit status=${sub.status()}`);
  }
  return { ess, essPage, close, claimId };
}
