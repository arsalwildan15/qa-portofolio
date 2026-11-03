import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AddEmployeePage extends BasePage {
  readonly firstNameInput: Locator;
  readonly middleNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly employeeIdInput: Locator;
  readonly createLoginDetailsCheckbox: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly fileInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  /** Field-level validation messages ("Required", "Should not exceed N characters", etc.). */
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.firstNameInput = page.getByPlaceholder('First Name');
    this.middleNameInput = page.getByPlaceholder('Middle Name');
    this.lastNameInput = page.getByPlaceholder('Last Name');
    this.employeeIdInput = page
      .locator('.oxd-input-group', { has: page.getByText('Employee Id', { exact: true }) })
      .locator('input');
    // Rendered as an .oxd-switch-wrapper with a visually-hidden native checkbox
    // input behind a custom-styled <span class="oxd-switch-input">; clicking the
    // role="checkbox" input itself never registers (confirmed live — isChecked()
    // stays false and the Username/Password fields never appear), so the visible
    // span must be clicked instead.
    this.createLoginDetailsCheckbox = page.locator('.oxd-switch-input');
    this.usernameInput = page
      .locator('.oxd-input-group', { has: page.getByText('Username', { exact: true }) })
      .locator('input')
      .first();
    this.passwordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.fileInput = page.locator('input[type="file"]');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/pim/addEmployee');
  }

  async fillName(firstName: string, lastName: string, middleName = ''): Promise<void> {
    await this.firstNameInput.fill(firstName);
    if (middleName) await this.middleNameInput.fill(middleName);
    await this.lastNameInput.fill(lastName);
  }

  async toggleCreateLoginDetails(): Promise<void> {
    await this.createLoginDetailsCheckbox.click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
