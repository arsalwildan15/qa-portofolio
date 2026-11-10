import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > Configuration > Email Subscriptions. Confirmed live:
 * /admin/viewEmailNotification.
 *
 * List: 5 notification types (Leave Applications, Leave Approvals, Leave
 * Assignments, Leave Cancellations, Leave Rejections), each row with an
 * Actions column holding 2 controls: a "person-plus" icon button (opens
 * that type's subscriber-management sub-page, confirmed live it navigates
 * to /admin/saveSubscriber/{notificationTypeId}) and a switch toggle
 * (left UNTOUCHED by every TC in this suite -- its exact semantics were
 * not fully confirmed live, and this screen's actual scope turned out to
 * be GLOBAL notification routing, not merely "which emails the current
 * admin personally receives" as originally assumed in scoping -- see
 * CATATAN CAKUPAN in TC-Admin.txt).
 *
 * The subscriber sub-page shows "Subscribers: <Notification Type>" with
 * its own "Add" button, a Name/Email/Actions table (0 subscribers by
 * default on this demo, confirmed live via "No Records Found").
 * [TEMUAN PENTING, dikonfirmasi live -- KOREKSI atas asumsi awal] The Add
 * dialog is NOT an employee autocomplete (unlike Users' Employee Name /
 * Recruitment's Hiring Manager) -- it is 2 PLAIN FREE-TEXT fields, "Name"
 * and "Email" (both required, confirmed via DOM inspection: 2
 * `oxd-input-field-required` labels, no `.oxd-autocomplete-option` or
 * "Type for hints..." placeholder anywhere on this dialog). A subscriber
 * here is an arbitrary name+email pair, NOT a lookup against existing
 * employee records.
 *
 * [SAFETY] Adding a subscriber changes who receives a real HR notification
 * email type for the shared public demo -- a real, if modest, change to
 * shared infrastructure. Every TC here that adds a subscriber removes it
 * again in the same test (restore-after-mutate, same discipline as
 * AdminGeneralInformationPage.snapshot()/restore()).
 */
export class AdminEmailSubscriptionsPage extends BasePage {
  readonly tableRows: Locator;
  readonly addButton: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly fieldErrors: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(page: Page) {
    super(page);
    this.tableRows = page.locator('.oxd-table-card');
    this.addButton = page.getByRole('button', { name: 'Add' });
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.nameInput = byLabel('Name');
    this.emailInput = byLabel('Email');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span, .oxd-form-row .oxd-text--span');
    this.confirmDeleteButton = page.getByRole('button', { name: /Yes, Delete/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/viewEmailNotification');
    await this.tableRows.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  }

  rowByNotificationType(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  /** Clicks the "person-plus" icon (first action button) to open that notification type's subscriber sub-page. */
  async openSubscribersFor(row: Locator): Promise<void> {
    await row.locator('.oxd-table-cell-actions button').first().click();
    await this.addButton.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  async fillSubscriber(name: string, email: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async deleteRow(row: Locator): Promise<void> {
    await row.locator('.oxd-table-cell-actions button').first().click();
    await this.confirmDeleteButton.click();
  }
}
