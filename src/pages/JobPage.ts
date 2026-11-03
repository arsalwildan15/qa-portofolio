import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class JobPage extends BasePage {
  readonly joinedDateInput: Locator;
  readonly jobTitleSelect: Locator;
  readonly jobCategorySelect: Locator;
  readonly subUnitSelect: Locator;
  readonly locationSelect: Locator;
  readonly employmentStatusSelect: Locator;
  readonly saveButton: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    const selectByLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('.oxd-select-text');
    this.joinedDateInput = page.locator('input[placeholder="yyyy-dd-mm"]').first();
    this.jobTitleSelect = selectByLabel('Job Title');
    this.jobCategorySelect = selectByLabel('Job Category');
    this.subUnitSelect = selectByLabel('Sub Unit');
    this.locationSelect = selectByLabel('Location');
    this.employmentStatusSelect = selectByLabel('Employment Status');
    this.saveButton = page.getByRole('button', { name: 'Save' }).first();
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
  }

  async goto(empNumber: number): Promise<void> {
    await this.page.goto(`/web/index.php/pim/viewJobDetails/empNumber/${empNumber}`);
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
