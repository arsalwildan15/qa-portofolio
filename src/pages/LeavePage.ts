import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LeavePage extends BasePage {
  readonly applyTab: Locator;
  readonly leaveTypeDropdown: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly applyButton: Locator;
  readonly successToast: Locator;
  readonly leaveBalance: Locator;

  constructor(page: Page) {
    super(page);
    this.applyTab = page.getByRole('link', { name: 'Apply' });
    // OrangeHRM's Apply Leave form has no accessible name/placeholder on these fields.
    this.leaveTypeDropdown = page.locator('.oxd-select-text').first();
    this.fromDateInput = page.locator('.oxd-input').nth(1);
    this.toDateInput = page.locator('.oxd-input').nth(2);
    this.applyButton = page.getByRole('button', { name: 'Apply' });
    this.successToast = page.getByText('Successfully Saved');
    this.leaveBalance = page.locator('.orangehrm-leave-balance-text');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/leave/applyLeave');
    await this.page.getByRole('heading', { name: 'Apply Leave' }).waitFor();
  }

  async selectLeaveType(leaveType: string): Promise<void> {
    await this.leaveTypeDropdown.click();
    await this.page.getByRole('option', { name: leaveType }).click();
  }

  async setDateRange(fromDate: string, toDate: string): Promise<void> {
    // These masked date inputs don't fully clear via fill(); select-all + type instead.
    await this.fillDateField(this.fromDateInput, fromDate);
    await this.fillDateField(this.toDateInput, toDate);
  }

  private async fillDateField(field: Locator, value: string): Promise<void> {
    await field.click();
    await field.press('Control+A');
    await field.pressSequentially(value);
  }
}
