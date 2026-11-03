import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class SalaryPage extends BasePage {
  readonly addButton: Locator;
  /** Plain text input, NOT a dropdown — confirmed live (screenshot showed an
   * empty rectangle with no "-- Select --" placeholder, unlike Pay Grade/Pay
   * Frequency/Currency which ARE selects). Earlier discovery mis-attributed
   * which 3 of the 6 labelled fields were selects. */
  readonly salaryComponentInput: Locator;
  readonly payGradeSelect: Locator;
  readonly payFrequencySelect: Locator;
  readonly currencySelect: Locator;
  readonly amountInput: Locator;
  readonly commentsInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: /Add/i }).first();
    const selectByLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('.oxd-select-text');
    this.salaryComponentInput = page
      .locator('.oxd-input-group', { has: page.getByText('Salary Component', { exact: true }) })
      .locator('input');
    this.payGradeSelect = selectByLabel('Pay Grade');
    this.payFrequencySelect = selectByLabel('Pay Frequency');
    this.currencySelect = selectByLabel('Currency');
    this.amountInput = page
      .locator('.oxd-input-group', { has: page.getByText('Amount', { exact: true }) })
      .locator('input');
    this.commentsInput = page.locator('textarea');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
  }

  async goto(empNumber: number): Promise<void> {
    await this.page.goto(`/web/index.php/pim/viewSalaryList/empNumber/${empNumber}`);
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
