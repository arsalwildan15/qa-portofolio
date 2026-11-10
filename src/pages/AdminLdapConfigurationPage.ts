import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > Configuration > LDAP Configuration. Confirmed live:
 * /admin/ldapConfiguration.
 *
 * Sections (confirmed live): Server Settings (Host, Port, Encryption
 * select, LDAP Implementation select), Bind Settings (Bind Anonymously
 * checkbox, Distinguished Name, Password), User Lookup Settings (Base
 * Distinguished Name, Search Scope select, User Name Attribute, User
 * Search Filter, User Unique ID Attribute), Data Mapping (First/Middle/
 * Last Name, User Status, Work Email, Employee Id, each mapped to an
 * LDAP field), Additional Settings (Merge LDAP Users With Existing
 * System Users, Sync Interval). An explicit warning is shown above the
 * buttons: "Before activating the LDAP service, make sure that all LDAP
 * settings are functioning properly since incorrect configuration may
 * result in corrupted data. As a precaution, we recommend you to create
 * a backup of your database before continuing." Buttons: "Test
 * Connection", Save.
 *
 * [SAFETY CONSTRAINT -- PENTING, HIGHEST RISK SCREEN IN THIS SUITE]
 * Save here activates/reconfigures LDAP authentication for the whole
 * shared public demo instance -- the app's own warning text confirms
 * this is destructive-if-wrong. This suite's TCs NEVER click Save on
 * this screen under any circumstance. "Test Connection" is a genuinely
 * separate, non-mutating probe (confirmed live: it does not fire the
 * same PUT that Save would) and is the one safe interactive element used
 * here for negative/boundary/security scenarios, matching the explicit
 * allowance in this dispatch's brief ("if a screen has a Test Connection
 * ... that's fine to use").
 */
export class AdminLdapConfigurationPage extends BasePage {
  readonly hostInput: Locator;
  readonly portInput: Locator;
  readonly distinguishedNameInput: Locator;
  readonly testConnectionButton: Locator;
  readonly saveButton: Locator;
  readonly fieldErrors: Locator;
  readonly warningText: Locator;

  constructor(page: Page) {
    super(page);
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.hostInput = byLabel('Host');
    this.portInput = byLabel('Port');
    this.distinguishedNameInput = byLabel('Distinguished Name');
    this.testConnectionButton = page.getByRole('button', { name: 'Test Connection' });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span, .oxd-form-row .oxd-text--span');
    this.warningText = page.getByText('Before activating the LDAP service', { exact: false });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/ldapConfiguration');
    await this.hostInput.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  }

  async testConnection(): Promise<void> {
    await this.testConnectionButton.click();
  }
}
