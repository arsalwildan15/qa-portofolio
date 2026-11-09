import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Shared page object for the Admin sub-screens that are a plain single-text-
 * field add/edit/delete list: Admin > Job (Pay Grades, Employment Status,
 * Job Categories) and Admin > Qualifications + Nationalities (Education,
 * Licenses, Languages, Memberships, Nationalities). (Job Titles and Work
 * Shifts have extra fields and get their own page objects.) Confirmed live
 * via discovery run against OrangeHRM OS.
 *
 * The visible field label differs per screen (most are "Name", but
 * Qualifications > Education uses "Level" — confirmed live) hence the
 * `fieldLabel` constructor param. Skills is the one screen in this family
 * with a second field ("Description", a textarea) — confirmed live via
 * discovery — exposed here as the optional `descriptionTextarea` so this
 * one class still covers it without a dedicated page object.
 */
export class AdminSimpleListPage extends BasePage {
  readonly addButton: Locator;
  readonly nameInput: Locator;
  /** Only present on Skills; harmless-but-unused locator on every other screen that reuses this class. */
  readonly descriptionTextarea: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(
    page: Page,
    /** List-page relative path, e.g. '/web/index.php/admin/employmentStatus'. */
    private readonly listPath: string,
    /** Visible label of the main text field. Defaults to "Name"; pass "Level" for Education. */
    fieldLabel: string = 'Name',
  ) {
    super(page);
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.nameInput = page
      .locator('.oxd-input-group', { has: page.getByText(fieldLabel, { exact: true }) })
      .locator('input');
    this.descriptionTextarea = page
      .locator('.oxd-input-group', { has: page.getByText('Description', { exact: true }) })
      .locator('textarea');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
    this.confirmDeleteButton = page.getByRole('button', { name: /Yes, Delete/i });
  }

  async goto(): Promise<void> {
    await this.page.goto(this.listPath);
  }

  async gotoAdd(): Promise<void> {
    await this.goto();
    await this.addButton.click();
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
