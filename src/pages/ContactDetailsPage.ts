import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ContactDetailsPage extends BasePage {
  readonly street1Input: Locator;
  readonly street2Input: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly zipInput: Locator;
  readonly countrySelect: Locator;
  readonly homeTelephoneInput: Locator;
  readonly mobileInput: Locator;
  readonly workTelephoneInput: Locator;
  readonly workEmailInput: Locator;
  readonly otherEmailInput: Locator;
  readonly saveButton: Locator;
  readonly fieldErrors: Locator;
  readonly attachmentsAddButton: Locator;
  readonly attachmentsFileInput: Locator;

  constructor(page: Page) {
    super(page);
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.street1Input = byLabel('Street 1');
    this.street2Input = byLabel('Street 2');
    this.cityInput = byLabel('City');
    this.stateInput = byLabel('State/Province');
    this.zipInput = byLabel('Zip/Postal Code');
    this.countrySelect = page
      .locator('.oxd-input-group', { has: page.getByText('Country', { exact: true }) })
      .locator('.oxd-select-text');
    this.homeTelephoneInput = byLabel('Home');
    this.mobileInput = byLabel('Mobile');
    this.workTelephoneInput = byLabel('Work');
    this.workEmailInput = byLabel('Work Email');
    this.otherEmailInput = byLabel('Other Email');
    this.saveButton = page.getByRole('button', { name: 'Save' }).first();
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    // Attachments has its own "+ Add" below the main form's Save button.
    this.attachmentsAddButton = page.getByRole('button', { name: /Add/i }).last();
    this.attachmentsFileInput = page.locator('input[type="file"]');
  }

  async goto(empNumber: number): Promise<void> {
    await this.page.goto(`/web/index.php/pim/contactDetails/empNumber/${empNumber}`);
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
