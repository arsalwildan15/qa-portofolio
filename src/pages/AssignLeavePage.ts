import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Leave > Assign Leave. An admin directly books leave FOR an employee -- confirmed live,
 * the resulting request lands as "Scheduled" immediately (no approval step), unlike
 * self-service Apply which lands as "Pending Approval".
 *
 * [TEMUAN] If the target employee's balance for the chosen Leave Type is insufficient, Save
 * does NOT reject outright -- it opens a "Confirm Leave Assignment" dialog ("Employee does
 * not have sufficient leave balance for leave request. Click OK to confirm leave
 * assignment."). Confirming it OVERRIDES the balance check and creates the request anyway
 * (balance can go negative). This is a real business-logic finding worth a dedicated TC
 * either way: Cancel must abort cleanly with no record created, and Confirm must actually
 * create it despite the shortfall.
 */
export class AssignLeavePage extends BasePage {
  readonly employeeNameInput: Locator;
  readonly leaveTypeSelect: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly commentsInput: Locator;
  readonly assignButton: Locator;
  readonly confirmOverrideButton: Locator;
  readonly cancelOverrideButton: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.leaveTypeSelect = page.locator('.oxd-select-text').first();
    this.fromDateInput = page.locator('input[placeholder="yyyy-dd-mm"]').first();
    this.toDateInput = page.locator('input[placeholder="yyyy-dd-mm"]').last();
    this.commentsInput = page.locator('textarea');
    this.assignButton = page.getByRole('button', { name: 'Assign' });
    this.confirmOverrideButton = page.getByRole('button', { name: 'Ok' });
    this.cancelOverrideButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/leave/assignLeave');
  }

  async selectEmployee(searchTerm: string): Promise<string> {
    await this.employeeNameInput.fill(searchTerm);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    const option = this.page.locator('.oxd-autocomplete-option').first();
    const name = (await option.textContent()) ?? '';
    await option.click();
    return name;
  }

  async selectLeaveType(leaveTypeName: string): Promise<void> {
    await this.leaveTypeSelect.click();
    await this.page.waitForTimeout(300);
    const option = this.page
      .locator('.oxd-select-dropdown .oxd-select-option, [role="listbox"] [role="option"]')
      .filter({ hasText: leaveTypeName });
    await option.first().click();
  }

  async fillDateRange(fromDate: string, toDate: string): Promise<void> {
    await this.fromDateInput.fill('');
    await this.fromDateInput.fill(fromDate);
    await this.toDateInput.fill('');
    await this.toDateInput.fill(toDate);
  }

  /**
   * Clicks Assign. If the insufficient-balance override dialog appears, resolves it
   * according to `onOverride` ('confirm' | 'cancel' | undefined meaning "don't expect one").
   */
  async submit(onOverride?: 'confirm' | 'cancel') {
    const responsePromise = this.page
      .waitForResponse(
        (r) => r.url().includes('/api/v2/leave/employees/leave-requests') && r.request().method() === 'POST',
        { timeout: 15_000 },
      )
      .catch(() => null);
    await this.assignButton.click();
    await this.page.waitForTimeout(600);
    const overrideVisible = await this.confirmOverrideButton.isVisible({ timeout: 2_000 }).catch(() => false);
    if (overrideVisible && onOverride === 'confirm') {
      await this.confirmOverrideButton.click();
    } else if (overrideVisible && onOverride === 'cancel') {
      await this.cancelOverrideButton.click();
    }
    return { response: await responsePromise, overrideDialogShown: overrideVisible };
  }
}
