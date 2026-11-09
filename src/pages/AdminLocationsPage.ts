import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > Organization > Locations. Confirmed live:
 * list at /admin/viewLocations, Add/Edit form at /admin/saveLocation
 * (edit form is /admin/saveLocation/{id} — the numeric id is right in the
 * URL, a natural IDOR surface: see TC-ADMIN-LOCATION-09).
 *
 * API (confirmed live): GET /api/v2/admin/locations?limit=50&offset=0&
 * sortField=location.name&sortOrder=ASC (list), POST /api/v2/admin/
 * locations (add, 200), DELETE /api/v2/admin/locations (delete, body
 * carries the id(s)). Name uniqueness is checked live via GET
 * /api/v2/core/validation/unique?value=...&entityName=Location&
 * attributeName=name as the field is typed/blurred — confirmed via
 * network capture — so duplicate Name has real server-backed validation
 * here (unlike Pay Grade, where duplicates were just documented as-is).
 *
 * Form fields (confirmed live): Name (text, required), City (text,
 * required — the ONLY two required fields, confirmed via exactly 2
 * "Required" errors on an empty submit), State/Province, Zip/Postal
 * Code, Country (select dropdown), Phone, Fax, Address (textarea),
 * Notes (textarea). Unlike General Information, this screen DOES have a
 * "Cancel" button alongside "Save".
 *
 * Action icon order confirmed live: trash (delete) THEN pencil (edit) —
 * same delete-first convention already documented project-wide for every
 * other simple-list Admin screen.
 */
export class AdminLocationsPage extends BasePage {
  readonly addButton: Locator;
  readonly nameInput: Locator;
  readonly cityInput: Locator;
  readonly stateProvinceInput: Locator;
  readonly zipPostalCodeInput: Locator;
  readonly countrySelect: Locator;
  readonly phoneInput: Locator;
  readonly faxInput: Locator;
  readonly addressTextarea: Locator;
  readonly notesTextarea: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.nameInput = byLabel('Name');
    this.cityInput = byLabel('City');
    this.stateProvinceInput = byLabel('State/Province');
    this.zipPostalCodeInput = byLabel('Zip/Postal Code');
    this.countrySelect = page
      .locator('.oxd-input-group', { has: page.getByText('Country', { exact: true }) })
      .locator('.oxd-select-text');
    this.phoneInput = byLabel('Phone');
    this.faxInput = byLabel('Fax');
    this.addressTextarea = page
      .locator('.oxd-input-group', { has: page.getByText('Address', { exact: true }) })
      .locator('textarea');
    this.notesTextarea = page
      .locator('.oxd-input-group', { has: page.getByText('Notes', { exact: true }) })
      .locator('textarea');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
    this.confirmDeleteButton = page.getByRole('button', { name: /Yes, Delete/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/viewLocations');
  }

  async gotoAdd(): Promise<void> {
    await this.goto();
    await this.addButton.click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async selectCountry(country: string): Promise<void> {
    await this.countrySelect.click();
    await this.page.getByRole('option', { name: country, exact: true }).click();
  }

  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  async deleteRow(row: Locator): Promise<void> {
    await row.locator('.oxd-table-cell-actions button').first().click();
    await this.confirmDeleteButton.click();
  }

  async editRow(row: Locator): Promise<void> {
    await row.locator('.oxd-table-cell-actions button').nth(1).click();
  }
}
