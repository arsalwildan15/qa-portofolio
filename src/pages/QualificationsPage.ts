import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class QualificationsPage extends BasePage {
  /** 6 "+ Add" buttons: Work Experience(0), Education(1), Skills(2), Languages(3), License(4), Attachments(5). */
  readonly addButtons: Locator;
  // Work Experience modal fields
  readonly companyInput: Locator;
  readonly jobTitleInput: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly commentInput: Locator;
  // Education modal fields
  readonly educationLevelSelect: Locator;
  readonly educationYearInput: Locator;
  readonly educationGpaInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.addButtons = page.getByRole('button', { name: /Add/i });
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.companyInput = byLabel('Company');
    this.jobTitleInput = byLabel('Job Title');
    const dateInputs = page.locator('input[placeholder="yyyy-dd-mm"]');
    this.fromDateInput = dateInputs.nth(0);
    this.toDateInput = dateInputs.nth(1);
    this.commentInput = page.locator('textarea');
    this.educationLevelSelect = page
      .locator('.oxd-input-group', { has: page.getByText('Level', { exact: true }) })
      .locator('.oxd-select-text');
    this.educationYearInput = page
      .locator('.oxd-input-group', { has: page.getByText('Year', { exact: true }) })
      .locator('input');
    this.educationGpaInput = page
      .locator('.oxd-input-group', { has: page.getByText('GPA/Score', { exact: true }) })
      .locator('input');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
  }

  async goto(empNumber: number): Promise<void> {
    await this.page.goto(`/web/index.php/pim/viewQualifications/empNumber/${empNumber}`);
  }

  async openAddWorkExperience(): Promise<void> {
    await this.addButtons.nth(0).click();
  }

  async openAddEducation(): Promise<void> {
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
