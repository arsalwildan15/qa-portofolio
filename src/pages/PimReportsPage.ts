import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class PimReportsPage extends BasePage {
  readonly addButton: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly tableRows: Locator;

  readonly reportNameInput: Locator;
  readonly includeSelect: Locator;
  readonly displayFieldGroupSelect: Locator;
  readonly displayFieldSelect: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.searchInput = page
      .locator('.oxd-input-group', { has: page.getByText('Report Name', { exact: true }) })
      .locator('input');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.tableRows = page.locator('.oxd-table-card');

    this.reportNameInput = page
      .locator('.oxd-input-group', { has: page.getByText('Report Name', { exact: true }) })
      .locator('input');
    const selectByLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('.oxd-select-text');
    this.includeSelect = selectByLabel('Include');
    this.displayFieldGroupSelect = selectByLabel('Select Display Field Group');
    this.displayFieldSelect = selectByLabel('Select Display Field');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.confirmDeleteButton = page.getByRole('button', { name: /Yes, Delete/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/pim/viewDefinedPredefinedReports');
  }

  async gotoAddForm(): Promise<void> {
    await this.page.goto('/web/index.php/pim/definePredefinedReport');
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

  async search(): Promise<void> {
    await this.searchButton.click();
  }

  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  async deleteRow(row: Locator): Promise<void> {
    await row.locator('.oxd-table-cell-actions button').first().click();
    await this.confirmDeleteButton.click();
  }
}
