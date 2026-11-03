import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ImmigrationPage extends BasePage {
  readonly addButton: Locator;
  /** "Document" radio group: value=1 Passport, value=2 Visa. Native input is
   * visually hidden behind a sibling span (same pattern as Gender/Create Login
   * Details in Phase 1) — click the span via clickPassportRadio/clickVisaRadio. */
  readonly passportRadio: Locator;
  readonly visaRadio: Locator;
  readonly numberInput: Locator;
  readonly issuedDateInput: Locator;
  readonly expiryDateInput: Locator;
  /** Confirmed live via screenshot: "Eligible Status" is a plain text input
   * and "Issued By" is the dropdown — the inverse of what the field names
   * suggest, and the opposite of an earlier (wrong) assumption. */
  readonly eligibleStatusInput: Locator;
  readonly issuedBySelect: Locator;
  readonly eligibleReviewDateInput: Locator;
  readonly commentsInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: /Add/i }).first();
    const radios = page.getByRole('radio');
    this.passportRadio = radios.nth(0);
    this.visaRadio = radios.nth(1);
    this.numberInput = page
      .locator('.oxd-input-group', { has: page.getByText('Number', { exact: true }) })
      .locator('input');
    const dateInputs = page.locator('input[placeholder="yyyy-dd-mm"]');
    this.issuedDateInput = dateInputs.nth(0);
    this.expiryDateInput = dateInputs.nth(1);
    this.eligibleReviewDateInput = dateInputs.nth(2);
    this.eligibleStatusInput = page
      .locator('.oxd-input-group', { has: page.getByText('Eligible Status', { exact: true }) })
      .locator('input');
    this.issuedBySelect = page
      .locator('.oxd-input-group', { has: page.getByText('Issued By', { exact: true }) })
      .locator('.oxd-select-text');
    this.commentsInput = page.locator('textarea');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
  }

  async goto(empNumber: number): Promise<void> {
    await this.page.goto(`/web/index.php/pim/viewImmigration/empNumber/${empNumber}`);
  }

  async clickPassportRadio(): Promise<void> {
    await this.passportRadio.locator('xpath=following-sibling::span').click();
  }

  async clickVisaRadio(): Promise<void> {
    await this.visaRadio.locator('xpath=following-sibling::span').click();
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
