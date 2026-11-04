import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DataImportPage extends BasePage {
  readonly fileInput: Locator;
  readonly uploadButton: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.fileInput = page.locator('input[type="file"]');
    this.uploadButton = page.getByRole('button', { name: 'Upload' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/pim/pimCsvImport');
  }

  async upload(): Promise<void> {
    await this.uploadButton.click();
  }
}
