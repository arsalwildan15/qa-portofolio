import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/** Admin > Job > Job Titles. Confirmed live: list at /admin/viewJobTitleList, Add form at /admin/saveJobTitle. */
export class AdminJobTitlesPage extends BasePage {
  readonly addButton: Locator;
  readonly jobTitleInput: Locator;
  readonly jobDescriptionTextarea: Locator;
  readonly noteTextarea: Locator;
  /** "Job Specification" file upload — accepts a resume-style doc, confirmed via discovery. */
  readonly jobSpecificationFileInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: 'Add' });
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.jobTitleInput = byLabel('Job Title');
    this.jobDescriptionTextarea = page
      .locator('.oxd-input-group', { has: page.getByText('Job Description', { exact: true }) })
      .locator('textarea');
    this.noteTextarea = page
      .locator('.oxd-input-group', { has: page.getByText('Note', { exact: true }) })
      .locator('textarea');
    this.jobSpecificationFileInput = page.locator('input[type="file"]');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
    this.confirmDeleteButton = page.getByRole('button', { name: /Yes, Delete/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/viewJobTitleList');
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
