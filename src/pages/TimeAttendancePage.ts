import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { DATE_INPUT_SELECTOR } from '../utils/dateInput';

/**
 * Time > Attendance > Punch In/Out. A single form that toggles between "Punch In" (button
 * "In") when the employee has no open punch, and "Punch Out" (button "Out") once punched
 * in -- confirmed live, this page has no separate URL per state, the same route re-renders.
 */
export class TimeAttendancePage extends BasePage {
  readonly dateInput: Locator;
  readonly timeInput: Locator;
  readonly noteInput: Locator;
  readonly submitButton: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.dateInput = page.locator(DATE_INPUT_SELECTOR).first();
    this.timeInput = page.locator('input[placeholder="hh:mm"]').first();
    this.noteInput = page.locator('textarea');
    this.submitButton = page.locator('button[type="submit"]');
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
  }

  /** Navigates via the sidebar tabs (Time has no direct deep-link confirmed reliable for this page). */
  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/time/viewEmployeeTimesheet');
    await this.page.getByText('Attendance', { exact: true }).click();
    await this.page.waitForTimeout(400);
    await this.page.getByText('Punch In/Out', { exact: true }).click();
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async fillNote(text: string): Promise<void> {
    await this.noteInput.fill(text);
  }

  /**
   * Clicks the submit button (its label is "In" or "Out" depending on current state) and
   * waits for the punch API response.
   *
   * [BUG SCRIPT, diperbaiki] Punch In mengirim POST, tapi Punch Out mengirim PUT ke endpoint
   * yg SAMA (mengupdate record yg sama, bukan membuat baru) -- dikonfirmasi live. Versi awal
   * cuma menunggu POST, sehingga submit() saat Punch Out selalu timeout (response selalu
   * undefined) walau request-nya sendiri sukses.
   */
  async submit(): Promise<{ response: import('@playwright/test').Response | null }> {
    const responsePromise = this.page
      .waitForResponse(
        (r) => r.url().includes('/api/v2/attendance/records') && (r.request().method() === 'POST' || r.request().method() === 'PUT'),
        { timeout: 15_000 },
      )
      .catch(() => null);
    await this.submitButton.click();
    const response = await responsePromise;
    return { response };
  }
}
