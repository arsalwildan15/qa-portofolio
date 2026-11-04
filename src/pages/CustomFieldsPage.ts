import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class CustomFieldsPage extends BasePage {
  readonly addButton: Locator;
  readonly fieldNameInput: Locator;
  readonly screenSelect: Locator;
  readonly typeSelect: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.fieldNameInput = page
      .locator('.oxd-input-group', { has: page.getByText('Field Name', { exact: true }) })
      .locator('input');
    const selectByLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('.oxd-select-text');
    this.screenSelect = selectByLabel('Screen');
    this.typeSelect = selectByLabel('Type');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/pim/listCustomFields');
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

  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  async deleteRow(row: Locator): Promise<void> {
    await row.locator('.oxd-table-cell-actions button').first().click();
    await this.page.getByRole('button', { name: 'Yes, Delete' }).click();
  }
}
