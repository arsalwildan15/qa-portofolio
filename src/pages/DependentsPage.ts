import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DependentsPage extends BasePage {
  readonly addButton: Locator;
  readonly nameInput: Locator;
  readonly relationshipSelect: Locator;
  readonly dateOfBirthInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: /Add/i }).first();
    this.nameInput = page
      .locator('.oxd-input-group', { has: page.getByText('Name', { exact: true }) })
      .locator('input');
    this.relationshipSelect = page
      .locator('.oxd-input-group', { has: page.getByText('Relationship', { exact: true }) })
      .locator('.oxd-select-text');
    this.dateOfBirthInput = page.locator('input[placeholder="yyyy-dd-mm"]').first();
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
  }

  async goto(empNumber: number): Promise<void> {
    await this.page.goto(`/web/index.php/pim/viewDependents/empNumber/${empNumber}`);
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
