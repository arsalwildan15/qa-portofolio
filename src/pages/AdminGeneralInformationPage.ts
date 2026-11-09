import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > Organization > General Information. Confirmed live:
 * /admin/viewOrganizationGeneralInformation.
 *
 * This is NOT an Add/Edit-form screen like the rest of Admin — it is a
 * single always-existing record shown as a READ-ONLY view by default (every
 * text field rendered as a `disabled` textbox). An "Edit" switch next to the
 * heading must be toggled on to enable the fields and reveal the "Save"
 * button. There is NO "Cancel" button on this screen (confirmed live) —
 * toggling "Edit" back off does NOT revert an unsaved edit visually (the
 * disabled field keeps showing the typed value until the page is reloaded),
 * even though the change was never sent to the server. See
 * TC-ADMIN-ORGGI-06 for this confirmed UX quirk.
 *
 * Fields (confirmed live): Organization Name (text, the ONLY required
 * field — confirmed via the single "Required" error left after clearing
 * it), Number of Employees (read-only computed value, never an input even
 * in edit mode), Registration Number, Tax ID, Phone, Fax, Email, Address
 * Street 1, Address Street 2, City, State/Province, Zip/Postal Code,
 * Country (a REAL select dropdown in edit mode, not a text field — confirmed
 * live via `.oxd-select-text`), Notes. NO file/logo upload input anywhere
 * on this screen (`input[type="file"]` count = 0 confirmed live, both in
 * view and edit mode) — the logo/banner uploads live only in Corporate
 * Branding (already covered in the Admin first pass), not here.
 *
 * API: PUT /api/v2/admin/organization (confirmed live; note PUT, not POST
 * like the rest of Admin's "Add" forms, since this is always an update to
 * the one existing record).
 *
 * [SAFETY] This record is a GLOBAL singleton shared by every user of the
 * public demo (shown in the app header/branding). Any TC that saves a
 * change here MUST restore the original value afterward in the same test —
 * see `snapshot()`/`restore()` below — the same shared-demo hygiene
 * discipline as Corporate Branding's safety constraint, just enforced via
 * revert-after-save instead of never-publish (this screen has no
 * "preview-only" option; Save always commits immediately).
 */
export class AdminGeneralInformationPage extends BasePage {
  readonly editToggle: Locator;
  readonly saveButton: Locator;
  readonly fieldErrors: Locator;
  readonly organizationNameInput: Locator;
  readonly registrationNumberInput: Locator;
  readonly taxIdInput: Locator;
  readonly phoneInput: Locator;
  readonly faxInput: Locator;
  readonly emailInput: Locator;
  readonly addressStreet1Input: Locator;
  readonly addressStreet2Input: Locator;
  readonly cityInput: Locator;
  readonly stateProvinceInput: Locator;
  readonly zipPostalCodeInput: Locator;
  readonly countrySelect: Locator;
  readonly notesField: Locator;

  constructor(page: Page) {
    super(page);
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.editToggle = page.getByText('Edit', { exact: true }).first();
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.organizationNameInput = byLabel('Organization Name');
    this.registrationNumberInput = byLabel('Registration Number');
    this.taxIdInput = byLabel('Tax ID');
    this.phoneInput = byLabel('Phone');
    this.faxInput = byLabel('Fax');
    this.emailInput = byLabel('Email');
    this.addressStreet1Input = byLabel('Address Street 1');
    this.addressStreet2Input = byLabel('Address Street 2');
    this.cityInput = byLabel('City');
    this.stateProvinceInput = byLabel('State/Province');
    this.zipPostalCodeInput = byLabel('Zip/Postal Code');
    this.countrySelect = page
      .locator('.oxd-input-group', { has: page.getByText('Country', { exact: true }) })
      .locator('.oxd-select-text');
    // Rendered as a (possibly multi-line) textbox; matches either tag.
    this.notesField = page
      .locator('.oxd-input-group', { has: page.getByText('Notes', { exact: true }) })
      .locator('input, textarea');
  }

  /**
   * Navigates to General Information and waits for the organization GET to
   * resolve before returning. Confirmed live this matters: reading a field's
   * value right after a blind `goto()` + short timeout can race Vue's
   * hydration and read the pre-fetch empty value, which looks exactly like
   * a lost save but is pure test-side flakiness (the raw API value is
   * correct throughout — confirmed via a direct `page.request.get` check).
   */
  async goto(): Promise<void> {
    const getPromise = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/admin/organization') && r.request().method() === 'GET', {
        timeout: 10_000,
      })
      .catch(() => null);
    await this.page.goto('/web/index.php/admin/viewOrganizationGeneralInformation');
    await getPromise;
    await this.page.waitForTimeout(500);
  }

  /**
   * Toggles the "Edit" switch on and waits for the fields to become
   * enabled. Confirmed live: the switch flips instantly but the underlying
   * Vue re-render that enables the inputs lags behind by roughly 1.5-2s —
   * filling too soon silently no-ops against a still-disabled input, so
   * this wait is load-bearing, not arbitrary padding.
   */
  async enableEdit(): Promise<void> {
    await this.editToggle.click();
    await this.page.waitForTimeout(1800);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async selectCountry(country: string): Promise<void> {
    await this.countrySelect.click();
    await this.page.getByRole('option', { name: country, exact: true }).click();
  }

  /** Snapshots the fields this suite's TCs mutate, so they can be restored after a save (shared-demo hygiene). */
  async snapshot(): Promise<{ organizationName: string; taxId: string; notes: string }> {
    return {
      organizationName: await this.organizationNameInput.inputValue(),
      taxId: await this.taxIdInput.inputValue(),
      notes: await this.notesField.inputValue(),
    };
  }

  /** Restores previously-snapshotted values via a fresh Edit -> fill -> Save cycle. */
  async restore(values: { organizationName: string; taxId: string; notes: string }): Promise<void> {
    await this.goto();
    await this.enableEdit();
    await this.organizationNameInput.fill(values.organizationName);
    await this.taxIdInput.fill(values.taxId);
    await this.notesField.fill(values.notes);
    await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/api/v2/admin/organization') && r.request().method() === 'PUT',
        { timeout: 10_000 },
      ).catch(() => null),
      this.save(),
    ]);
    await this.page.waitForTimeout(1000);
  }
}
