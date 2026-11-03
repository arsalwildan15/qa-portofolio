import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ReportToPage extends BasePage {
  /** 3 "+ Add" buttons on this page: Supervisors (0), Subordinates (1), Attachments (2). */
  readonly addButtons: Locator;
  readonly nameAutocomplete: Locator;
  readonly reportingMethodSelect: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly supervisorRows: Locator;
  readonly subordinateRows: Locator;

  constructor(page: Page) {
    super(page);
    this.addButtons = page.getByRole('button', { name: /Add/i });
    this.nameAutocomplete = page
      .locator('.oxd-input-group', { has: page.getByText('Name', { exact: true }) })
      .getByPlaceholder('Type for hints...');
    this.reportingMethodSelect = page
      .locator('.oxd-input-group', { has: page.getByText('Reporting Method', { exact: true }) })
      .locator('.oxd-select-text');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.supervisorRows = page
      .locator('div', { has: page.getByText('Assigned Supervisors', { exact: true }) })
      .locator('.oxd-table-card');
    this.subordinateRows = page
      .locator('div', { has: page.getByText('Assigned Subordinates', { exact: true }) })
      .locator('.oxd-table-card');
  }

  async goto(empNumber: number): Promise<void> {
    await this.page.goto(`/web/index.php/pim/viewReportToDetails/empNumber/${empNumber}`);
  }

  async openAddSupervisor(): Promise<void> {
    await this.addButtons.nth(0).click();
  }

  async openAddSubordinate(): Promise<void> {
    await this.addButtons.nth(1).click();
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
