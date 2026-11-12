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
  readonly terminateButton: Locator;
  readonly activateButton: Locator;

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
    // "Employee Termination / Activiation" section (typo "Activiation" is in the app itself,
    // confirmed live 2026-11-12) below the Job Details form. Button label toggles between
    // "Terminate Employment" and "Activate Employment" depending on current employment state.
    this.terminateButton = page.getByRole('button', { name: /Terminate Employment/i });
    this.activateButton = page.getByRole('button', { name: /Activate Employment/i });
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

  /**
   * Opens the "Terminate Employment" modal and submits it. All field locators are scoped to
   * `page.getByRole('dialog')` deliberately -- the modal renders ON TOP of the still-present
   * Job Details form underneath it, and that background form has its own date input with the
   * SAME placeholder ("yyyy-dd-mm", the "Joined Date" field) and its own dropdown + Save button.
   * An unscoped locator for any of these resolves to 2 elements and throws a Playwright
   * strict-mode violation -- confirmed live 2026-11-12, the same root-cause pattern as the Buzz
   * "Edit Post" modal's duplicate <textarea> bug.
   */
  async terminateEmployment(terminationDate: string, reasonText: string, note = ''): Promise<import('@playwright/test').Response | null> {
    await this.terminateButton.click();
    const dialog = this.page.getByRole('dialog');
    await dialog.getByPlaceholder('yyyy-dd-mm').fill(terminationDate);
    await dialog.locator('.oxd-select-text').click();
    const option = this.page.getByRole('option').filter({ hasText: reasonText }).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
    if (note) {
      await dialog.locator('textarea').fill(note);
    }
    const [resp] = await Promise.all([
      this.page
        .waitForResponse((r) => r.url().includes('/terminations') && r.request().method() !== 'GET', { timeout: 15_000 })
        .catch(() => null),
      dialog.getByRole('button', { name: /^Save$/i }).click(),
    ]);
    return resp;
  }
}
