import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > Corporate Branding. Confirmed live: form at /admin/addTheme.
 * Fields: 6 color pickers (Primary/Secondary Color, Primary/Secondary Font
 * Color, Primary Gradient Color 1/2) and 3 file uploads (Client Logo,
 * Client Banner, Login Banner). Buttons: "Reset to Default", "Preview",
 * "Publish" (NOT "Save" — different label from the rest of Admin).
 * HIGH-PRIORITY upload-security target: same extension-vs-content bypass
 * pattern already confirmed in PIM/Recruitment (TC-PIM-ADD-28/29,
 * TC-RECRUITMENT-CANDIDATE-11).
 */
export class AdminCorporateBrandingPage extends BasePage {
  readonly clientLogoFileInput: Locator;
  readonly clientBannerFileInput: Locator;
  readonly loginBannerFileInput: Locator;
  readonly resetToDefaultButton: Locator;
  readonly previewButton: Locator;
  readonly publishButton: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    const fileInputs = page.locator('input[type="file"]');
    this.clientLogoFileInput = fileInputs.nth(0);
    this.clientBannerFileInput = fileInputs.nth(1);
    this.loginBannerFileInput = fileInputs.nth(2);
    this.resetToDefaultButton = page.getByRole('button', { name: 'Reset to Default' });
    this.previewButton = page.getByRole('button', { name: 'Preview' });
    this.publishButton = page.getByRole('button', { name: 'Publish' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span, .oxd-form-row .oxd-text--span');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/addTheme');
  }

  async publish(): Promise<void> {
    await this.publishButton.click();
  }
}
