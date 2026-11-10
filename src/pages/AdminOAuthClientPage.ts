import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > Configuration > OAuth Client. Confirmed live:
 * /admin/registerOAuthClient (list), /admin/saveOAuthClient (Add form URL
 * after clicking Add).
 *
 * List: "OAuth Client List", 1 pre-existing seed row on this demo
 * ("OrangeHRM Mobile App", Status "Enabled") whose trash/pencil action
 * icons are BOTH `disabled` (confirmed live via innerHTML -- a protected
 * system client, cannot be edited/deleted via UI). Add dialog fields:
 * Name, Redirect URI (both required), "Enable Client" (checkbox,
 * unchecked by default), "Confidential Client" (checkbox, unchecked by
 * default). Buttons: Cancel, Save.
 *
 * [RISK -- koreksi atas asumsi awal scoping] OAuth Client registers a
 * client for API/mobile-app OAuth2 token issuance, NOT the browser login
 * page -- confirmed live this is a genuinely different, lower-risk
 * surface than Social Media Authentication (which does affect the login
 * page) despite both living under Configuration. Adding a new client is
 * additive and does not modify the existing protected seed row, so this
 * screen is treated like a normal "Add" list screen (e.g. Job Title)
 * rather than validate-only.
 *
 * [TEMUAN KOREKSI, dikonfirmasi live] Leaving "Enable Client" unchecked
 * does NOT result in a disabled client as assumed -- the created client
 * comes back with `enabled: true` in the API response regardless
 * (confirmed via a direct POST /api/v2/admin/oauth-clients response
 * body capture). This suite's TCs therefore expect Status "Enabled",
 * not "Disabled". A newly-created client's trash/pencil icons are
 * confirmed live to be ENABLED (unlike the protected seed row), so
 * cleanup via Delete works.
 *
 * [TEMUAN PROSES PENTING] The list does NOT auto-refresh after a
 * successful Save/Delete -- the POST/DELETE succeeds immediately, but
 * the new/removed row does not appear/disappear in the table even after
 * a long wait, requiring an explicit reload. `saveAndReload()` and
 * `deleteRow()` below both reload the list afterward for this reason;
 * plain `save()` is for the empty-submit negative case where the dialog
 * is expected to stay open (no reload needed or wanted).
 */
export class AdminOAuthClientPage extends BasePage {
  readonly addButton: Locator;
  readonly nameInput: Locator;
  readonly redirectUriInput: Locator;
  readonly enableClientCheckbox: Locator;
  readonly confidentialClientCheckbox: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.getByRole('button', { name: 'Add' });
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.nameInput = byLabel('Name');
    this.redirectUriInput = byLabel('Redirect URI');
    this.enableClientCheckbox = page
      .locator('.oxd-form-row', { has: page.getByText('Enable Client', { exact: true }) })
      .locator('input[type="checkbox"]');
    this.confidentialClientCheckbox = page
      .locator('.oxd-form-row', { has: page.getByText('Confidential Client', { exact: true }) })
      .locator('input[type="checkbox"]');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span, .oxd-form-row .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
    this.confirmDeleteButton = page.getByRole('button', { name: /Yes, Delete/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/registerOAuthClient');
    await this.tableRows.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  }

  async fillClient(name: string, redirectUri: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.redirectUriInput.fill(redirectUri);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * Clicks Save, then reloads the list -- confirmed live the list does
   * NOT auto-refresh after a successful Save (the POST succeeds, but
   * the new row never appears in the table without an explicit reload,
   * even after a long wait). Use this (not plain `save()`) whenever the
   * Save is expected to actually succeed and the new row needs to be
   * visible afterward.
   */
  async saveAndReload(): Promise<void> {
    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
    await this.goto();
  }

  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  /** Deletes a row, then reloads the list -- same no-auto-refresh caveat as `saveAndReload()`. */
  async deleteRow(row: Locator): Promise<void> {
    await row.locator('.oxd-table-cell-actions button').first().click();
    await this.confirmDeleteButton.click();
    await this.page.waitForTimeout(1000);
    await this.goto();
  }
}
