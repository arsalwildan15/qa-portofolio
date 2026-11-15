import { type Page, type Locator, type Response } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Time > Timesheets > Employee Timesheets (Admin/supervisor side), confirmed live 2026-11-15:
 * - list time/viewEmployeeTimesheet shows "Timesheets Pending Action" rows (employee name +
 *   period + "View").
 * - View opens time/viewTimesheet/employeeId/<empNumber>?startDate=<monday> with Edit / Reject /
 *   Approve buttons and one Comment textarea.
 * - Approve/Reject = PUT /api/v2/time/employees/<empNumber>/timesheets/<id> {action, comment?}.
 */
export class EmployeeTimesheetPage extends BasePage {
  readonly pendingRows: Locator;
  readonly commentInput: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pendingRows = page.locator('.oxd-table-card');
    this.commentInput = page.locator('textarea');
    this.approveButton = page.getByRole('button', { name: 'Approve', exact: true });
    this.rejectButton = page.getByRole('button', { name: 'Reject', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/time/viewEmployeeTimesheet');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  pendingRowFor(uniqueText: string): Locator {
    return this.pendingRows.filter({ hasText: uniqueText }).first();
  }

  async view(row: Locator): Promise<void> {
    await row.getByRole('button', { name: 'View' }).click();
    await this.page.waitForURL(/viewTimesheet\/employeeId\/\d+/, { timeout: 15_000 });
    await this.approveButton.or(this.rejectButton).first().waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** Optionally types a comment, clicks Approve/Reject, returns the PUT response. */
  async act(action: 'Approve' | 'Reject', comment?: string): Promise<Response | null> {
    if (comment !== undefined) await this.commentInput.fill(comment);
    const resp = this.page
      .waitForResponse((r) => /\/api\/v2\/time\/employees\/\d+\/timesheets\/\d+$/.test(r.url()) && r.request().method() === 'PUT', { timeout: 15_000 })
      .catch(() => null);
    await (action === 'Approve' ? this.approveButton : this.rejectButton).click();
    return resp;
  }
}
