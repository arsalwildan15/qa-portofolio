import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Time > Timesheets > My Timesheet. Logs hours against a Project + Activity for the current
 * timesheet period, then submits it. Confirmed live via HTML dump: each day's duration cell
 * is a bare <input class="oxd-input oxd-input--active"> with no placeholder/name, inside a
 * <td class="orangehrm-timesheet-table-body-cell --duration-input"> -- must be addressed
 * positionally (Mon..Sun, 7 cells per row).
 */
export class MyTimesheetPage extends BasePage {
  readonly editButton: Locator;
  readonly submitButton: Locator;
  readonly saveButton: Locator;
  readonly addRowButton: Locator;
  readonly projectInput: Locator;
  readonly activitySelect: Locator;
  readonly durationInputs: Locator;
  readonly statusText: Locator;

  constructor(page: Page) {
    super(page);
    this.editButton = page.getByRole('button', { name: 'Edit' });
    this.submitButton = page.getByRole('button', { name: 'Submit' });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.addRowButton = page.getByText('Add Row');
    this.projectInput = page.getByPlaceholder('Type for hints...').first();
    this.activitySelect = page.locator('.oxd-select-text').first();
    this.durationInputs = page.locator('td.orangehrm-timesheet-table-body-cell.\\--duration-input input');
    this.statusText = page.getByText('Status:');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/time/viewMyTimesheet');
  }

  async startEdit(): Promise<void> {
    await this.editButton.click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(2_000);
  }

  /**
   * Fills the first (already-present, empty) row's Project + Activity. Tries each candidate
   * project in order and picks the first one whose Activity dropdown actually has options --
   * confirmed live, some projects in this shared demo's seed data have zero activities
   * configured, which would otherwise leave the row impossible to complete.
   */
  async fillFirstRow(projectCandidates: string[]): Promise<{ project: string; activity: string }> {
    for (const candidate of projectCandidates) {
      await this.projectInput.fill('');
      await this.projectInput.fill(candidate);
      await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
      await this.page.waitForTimeout(500);
      const option = this.page.locator('.oxd-autocomplete-option').first();
      if ((await option.count()) === 0) continue;
      const projectName = (await option.textContent()) ?? '';
      await option.click();
      await this.page.waitForTimeout(500);

      await this.activitySelect.click();
      await this.page.waitForTimeout(500);
      const activityOptions = this.page.locator('.oxd-select-dropdown .oxd-select-option, [role="listbox"] [role="option"]');
      const texts = await activityOptions.allInnerTexts();
      // [BUG SCRIPT, diperbaiki] index 0 adalah placeholder "-- Select --", BUKAN opsi
      // sungguhan -- dikonfirmasi live, versi awal method ini memilih placeholder itu sendiri
      // (fillFirstRow "berhasil" tapi dropdown tetap kosong), menyebabkan Save gagal diam2 dgn
      // error client-side "Select an Activity" yg baru terlihat stlh submit.
      const realOptions = texts.filter((t) => t !== '-- Select --' && t !== 'No Records Found');
      if (realOptions.length === 0) {
        await this.page.keyboard.press('Escape');
        continue;
      }
      const activityName = realOptions[0];
      await activityOptions.filter({ hasText: activityName }).first().click();
      return { project: projectName, activity: activityName };
    }
    throw new Error('fillFirstRow: no candidate project had any activities configured');
  }

  async fillDuration(dayIndex: number, hours: string): Promise<void> {
    await this.durationInputs.nth(dayIndex).fill(hours);
  }

  async save(): Promise<import('@playwright/test').Response | null> {
    const responsePromise = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/time/') && ['POST', 'PUT'].includes(r.request().method()), { timeout: 15_000 })
      .catch(() => null);
    await this.saveButton.click();
    return responsePromise;
  }
}
