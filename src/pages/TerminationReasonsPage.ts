import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class TerminationReasonsPage extends BasePage {
  readonly addButton: Locator;
  readonly nameInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.nameInput = page
      .locator('.oxd-input-group', { has: page.getByText('Name', { exact: true }) })
      .locator('input');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
    this.confirmDeleteButton = page.getByRole('button', { name: /Yes, Delete/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/pim/viewTerminationReasons');
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  async deleteRow(row: Locator): Promise<void> {
    await row.locator('.oxd-table-cell-actions button').first().click();
    await this.confirmDeleteButton.click();
  }
}
