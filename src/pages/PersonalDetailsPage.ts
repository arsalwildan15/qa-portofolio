import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class PersonalDetailsPage extends BasePage {
  readonly firstNameInput: Locator;
  readonly middleNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly employeeIdInput: Locator;
  readonly driversLicenseInput: Locator;
  /** yyyy-dd-mm date input, DOM order: License Expiry Date first, then Date of Birth. */
  readonly licenseExpiryDateInput: Locator;
  readonly dateOfBirthInput: Locator;
  readonly nationalitySelect: Locator;
  readonly maritalStatusSelect: Locator;
  readonly maleRadio: Locator;
  readonly femaleRadio: Locator;
  readonly saveButton: Locator;
  readonly fileInput: Locator;
  readonly removePhotoButton: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    // Same placeholders as AddEmployeePage; there is no heading element for the
    // name on this page (an earlier `h6.--strong` locator never matched anything
    // live) — these inputs ARE the display, pre-filled asynchronously after an
    // internal GET .../personal-details completes post-navigation.
    this.firstNameInput = page.getByPlaceholder('First Name');
    this.middleNameInput = page.getByPlaceholder('Middle Name');
    this.lastNameInput = page.getByPlaceholder('Last Name');
    this.employeeIdInput = page
      .locator('.oxd-input-group', { has: page.getByText('Employee Id', { exact: true }) })
      .locator('input');
    this.driversLicenseInput = page
      .locator('.oxd-input-group', { has: page.getByText("Driver's License Number", { exact: true }) })
      .locator('input');
    const dateInputs = page.locator('input[placeholder="yyyy-dd-mm"]');
    this.licenseExpiryDateInput = dateInputs.nth(0);
    this.dateOfBirthInput = dateInputs.nth(1);
    this.nationalitySelect = page.locator('.oxd-select-text').nth(0);
    this.maritalStatusSelect = page.locator('.oxd-select-text').nth(1);
    // `.oxd-radio-wrapper` filtered by hasText:'Male' also matches the Female
    // radio (both share a group wrapper that contains both labels) — confirmed
    // live as a Playwright strict-mode violation. The accessible radio role with
    // an exact name resolves to exactly one <input>, used here to read checked
    // state. The input itself is visually hidden behind a sibling
    // <span class="oxd-radio-input"> that intercepts pointer events — same
    // pattern as the Create Login Details switch — so `check()`/`click()` on
    // the raw input times out and even `{force: true}` doesn't update Vue's
    // bound state (the component listens on the span, not the input). Use
    // `clickMaleRadio()`/`clickFemaleRadio()` below to actually toggle it.
    this.maleRadio = page.getByRole('radio', { name: 'Male', exact: true });
    this.femaleRadio = page.getByRole('radio', { name: 'Female', exact: true });
    this.saveButton = page.getByRole('button', { name: 'Save' }).first();
    this.fileInput = page.locator('input[type="file"]');
    this.removePhotoButton = page.locator('.employee-image button');
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
  }

  async goto(empNumber: number): Promise<void> {
    await this.page.goto(`/web/index.php/pim/viewPersonalDetails/empNumber/${empNumber}`);
  }

  /**
   * Waits until the async GET .../personal-details fetch has populated the
   * First Name field — reading it immediately after navigation (even after
   * `waitForURL`) returns empty, since the URL changes before the data loads.
   */
  async waitUntilLoaded(timeout = 15_000): Promise<void> {
    await this.firstNameInput.waitFor({ state: 'visible', timeout });
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if ((await this.firstNameInput.inputValue()) !== '') return;
      await this.page.waitForTimeout(300);
    }
  }

  async clickMaleRadio(): Promise<void> {
    await this.maleRadio.locator('xpath=following-sibling::span').click();
  }

  async clickFemaleRadio(): Promise<void> {
    await this.femaleRadio.locator('xpath=following-sibling::span').click();
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
