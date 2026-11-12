import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly requiredValidationMessages: Locator;
  readonly forgotPasswordLink: Locator;
  readonly credentialHintBox: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByPlaceholder('Username');
    this.passwordInput = page.getByPlaceholder('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.errorMessage = page.locator('.oxd-alert--error');
    this.requiredValidationMessages = page.locator('.oxd-input-field-error-message');
    // Rendered as a <p> with a click handler, not an <a>, so no accessible link role.
    this.forgotPasswordLink = page.locator('.orangehrm-login-forgot-header');
    this.credentialHintBox = page.getByText('Username :');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/auth/login');
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async submitViaEnterKey(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.passwordInput.press('Enter');
  }

  async gotoResetPassword(): Promise<void> {
    await this.page.goto('/web/index.php/auth/requestPasswordResetCode');
  }

  get resetPasswordUsernameInput(): Locator {
    return this.page.locator('input[name="username"]');
  }

  get resetPasswordSubmitButton(): Locator {
    return this.page.getByRole('button', { name: /reset password/i });
  }
}
