import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > Configuration > Language Packages. Confirmed live:
 * /admin/languagePackage.
 *
 * List: 9 language packages on this demo (e.g. "Chinese (Simplified,
 * China) - 中文（简体，中国）", "English (United States)", ...), each row with
 * a checkbox (bulk-select column), an upload icon (import translation
 * file) and a 2nd action icon (confirmed live to be Delete, same
 * "Yes, Delete" confirm dialog pattern as every other list screen in this
 * suite). "Add" opens a dialog with a single "Name" select (-- Select --,
 * listing locales not yet added) + an informational Note + Cancel/Save.
 *
 * [RISK] Adding/removing a language package changes which languages are
 * SELECTABLE instance-wide in Localization's Language dropdown, but does
 * NOT change anyone's currently-active language -- an additive, low-
 * blast-radius change (same risk class as adding a Job Title), unlike
 * Localization itself (which changes the ACTIVE default for everyone).
 * TCs that add a package remove it again in the same test
 * (restore-after-mutate).
 */
export class AdminLanguagePackagesPage extends BasePage {
  readonly addButton: Locator;
  readonly nameSelect: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.nameSelect = page
      .locator('.oxd-input-group', { has: page.getByText('Name', { exact: true }) })
      .locator('.oxd-select-text');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span, .oxd-form-row .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
    this.confirmDeleteButton = page.getByRole('button', { name: /Yes, Delete/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/languagePackage');
  }

  async selectLanguageToAdd(language: string): Promise<void> {
    await this.nameSelect.click();
    await this.page.getByRole('option', { name: language, exact: false }).first().click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  /** Second action icon per row (after the upload icon) -- confirmed live to be Delete. */
  async deleteRow(row: Locator): Promise<void> {
    await row.locator('.oxd-table-cell-actions button').nth(1).click();
    await this.confirmDeleteButton.click();
  }
}
