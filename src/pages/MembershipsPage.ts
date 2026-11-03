import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class MembershipsPage extends BasePage {
  readonly addButton: Locator;
  readonly membershipSelect: Locator;
  readonly subscriptionPaidBySelect: Locator;
  readonly subscriptionAmountInput: Locator;
  readonly currencySelect: Locator;
  readonly commenceDateInput: Locator;
  readonly renewalDateInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: /Add/i }).first();
    const selectByLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('.oxd-select-text');
    this.membershipSelect = selectByLabel('Membership');
    this.subscriptionPaidBySelect = selectByLabel('Subscription Paid By');
    this.subscriptionAmountInput = page
      .locator('.oxd-input-group', { has: page.getByText('Subscription Amount', { exact: true }) })
      .locator('input');
    this.currencySelect = selectByLabel('Currency');
    const dateInputs = page.locator('input[placeholder="yyyy-dd-mm"]');
    this.commenceDateInput = dateInputs.nth(0);
    this.renewalDateInput = dateInputs.nth(1);
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
  }

  async goto(empNumber: number): Promise<void> {
    await this.page.goto(`/web/index.php/pim/viewMemberships/empNumber/${empNumber}`);
  }

  async selectDropdownOption(select: Locator, optionText: string): Promise<void> {
    await select.click();
    const option = this.page.getByRole('option').filter({ hasText: optionText }).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
