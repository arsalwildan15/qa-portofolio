import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class EmergencyContactsPage extends BasePage {
  readonly addButton: Locator;
  readonly nameInput: Locator;
  readonly relationshipInput: Locator;
  readonly homeTelephoneInput: Locator;
  readonly mobileInput: Locator;
  readonly workTelephoneInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly tableRows: Locator;
  readonly deleteButton: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    // Page has two "+ Add" buttons (Assigned Emergency Contacts, Attachments) — the
    // first is the record-add modal trigger.
    this.addButton = page.getByRole('button', { name: /Add/i }).first();
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.nameInput = byLabel('Name');
    this.relationshipInput = byLabel('Relationship');
    this.homeTelephoneInput = byLabel('Home Telephone');
    this.mobileInput = byLabel('Mobile');
    this.workTelephoneInput = byLabel('Work Telephone');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
    this.tableRows = page.locator('.oxd-table-card');
    this.deleteButton = page.locator('.oxd-table-card button').last();
    this.confirmDeleteButton = page.getByRole('button', { name: /Yes, Delete/i });
  }

  async goto(empNumber: number): Promise<void> {
    await this.page.goto(`/web/index.php/pim/viewEmergencyContacts/empNumber/${empNumber}`);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
