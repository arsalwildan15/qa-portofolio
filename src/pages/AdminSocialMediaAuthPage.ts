import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > Configuration > Social Media Authentication. Confirmed live:
 * /admin/openIdProvider.
 *
 * List: "Provider List" heading, "Add" button, table (Name/Actions). On
 * this demo it is currently empty ("No Records Found"). Clicking "Add"
 * navigates to /admin/addAuthProvider with 4 free-text fields: Name,
 * Provider URL, Client ID, Client Secret (all required, confirmed live
 * via "* Required" + 4 fields), and Cancel/Save buttons.
 *
 * [SAFETY CONSTRAINT -- PENTING] This registers a social login provider
 * (e.g. Google/Facebook-style OAuth) for the LOGIN PAGE every user of
 * this shared public demo sees. Unlike OAuth Client (which only affects
 * API/mobile-app token issuance), a provider added here plausibly changes
 * the actual browser login page for everyone. This suite's TCs therefore
 * NEVER click Save on this screen -- every negative/boundary/security TC
 * fills the dialog, inspects client-side validation/behavior, then
 * closes via Cancel/"x" WITHOUT ever saving.
 */
export class AdminSocialMediaAuthPage extends BasePage {
  readonly addButton: Locator;
  readonly nameInput: Locator;
  readonly providerUrlInput: Locator;
  readonly clientIdInput: Locator;
  readonly clientSecretInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: 'Add' });
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.nameInput = byLabel('Name');
    this.providerUrlInput = byLabel('Provider URL');
    this.clientIdInput = byLabel('Client ID');
    this.clientSecretInput = byLabel('Client Secret');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span, .oxd-form-row .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/openIdProvider');
  }

  async fillProvider(name: string, providerUrl: string, clientId: string, clientSecret: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.providerUrlInput.fill(providerUrl);
    await this.clientIdInput.fill(clientId);
    await this.clientSecretInput.fill(clientSecret);
  }
}
