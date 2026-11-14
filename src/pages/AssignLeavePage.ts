import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Leave > Assign Leave. An admin directly books leave FOR an employee -- confirmed live,
 * the resulting request lands as "Scheduled" immediately (no approval step), unlike
 * self-service Apply which lands as "Pending Approval".
 *
 * [TEMUAN] If the target employee's balance for the chosen Leave Type is insufficient, Save
 * does NOT reject outright -- it opens a "Confirm Leave Assignment" dialog ("Employee does
 * not have sufficient leave balance for leave request. Click OK to confirm leave
 * assignment."). Confirming it OVERRIDES the balance check and creates the request anyway
 * (balance can go negative). This is a real business-logic finding worth a dedicated TC
 * either way: Cancel must abort cleanly with no record created, and Confirm must actually
 * create it despite the shortfall.
 */
export class AssignLeavePage extends BasePage {
  readonly employeeNameInput: Locator;
  readonly leaveTypeSelect: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly commentsInput: Locator;
  readonly assignButton: Locator;
  readonly confirmOverrideButton: Locator;
  readonly cancelOverrideButton: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.leaveTypeSelect = page.locator('.oxd-select-text').first();
    this.fromDateInput = page.locator('input[placeholder="yyyy-dd-mm"]').first();
    this.toDateInput = page.locator('input[placeholder="yyyy-dd-mm"]').last();
    this.commentsInput = page.locator('textarea');
    this.assignButton = page.getByRole('button', { name: 'Assign' });
    // [BUG SCRIPT, diperbaiki] Tanpa .first(), locator ini ambigu kalau ada LEBIH dari satu
    // elemen "Cancel"/"Ok" di halaman -- Playwright strict mode melempar error di klik, yg
    // dulu diam2 ditelan oleh .catch(()=>{}) di submit(), membuat dialog override TETAP
    // terbuka dan memblokir klik assignButton pada attempt berikutnya di retry loop manapun
    // ("intercepts pointer events"). Confirmed live via reproduksi berulang.
    this.confirmOverrideButton = page.locator('.oxd-dialog-container, [role="dialog"]').getByRole('button', { name: 'Ok' }).first();
    this.cancelOverrideButton = page.locator('.oxd-dialog-container, [role="dialog"]').getByRole('button', { name: 'Cancel' }).first();
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span');
  }

  /**
   * Retries once on net::ERR_ABORTED -- same race as ApplyLeavePage.goto(): calling this
   * right after a prior page's own save() can collide with that page's delayed
   * self-redirect (confirmed live elsewhere in this suite).
   */
  async goto(): Promise<void> {
    try {
      await this.page.goto('/web/index.php/leave/assignLeave');
    } catch (error) {
      if (error instanceof Error && error.message.includes('ERR_ABORTED')) {
        await this.page.waitForTimeout(1_500);
        await this.page.goto('/web/index.php/leave/assignLeave');
      } else {
        throw error;
      }
    }
  }

  /**
   * [BUG SCRIPT, diperbaiki] Waktu tunggu lama sebelum ini tidak cukup saat server sedang
   * lambat (confirmed live: round-trip autocomplete bisa >5s) -- "Searching...." belum
   * hilang saat option.textContent() dibaca, jadi nama yg ditangkap adalah teks loading itu
   * sendiri, bukan nama employee. Diperbaiki dgn menunggu opsi autocomplete BENAR-BENAR
   * visible (bukan cuma delay tetap) sebelum membaca teksnya.
   */
  async selectEmployee(searchTerm: string): Promise<string> {
    await this.employeeNameInput.fill(searchTerm);
    await this.page.getByText('Searching....').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
    const option = this.page.locator('.oxd-autocomplete-option').first();
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    const name = (await option.textContent()) ?? '';
    await option.click();
    return name;
  }

  /**
   * [BUG SCRIPT, diperbaiki] Sama dgn race yg sudah ditemukan & diperbaiki di
   * ApplyLeavePage.selectLeaveType(): panel "Leave Balance" di-refresh via fetch ASYNC
   * sesaat SETELAH leave type dipilih, bukan sinkron. Versi awal method ini tidak menunggu
   * fetch itu sama sekali -- dikonfirmasi live via dump HTML: panel masih menunjukkan "0.00
   * Day(s)" tepat setelah selectLeaveType() return, walau entitlement 500 hari baru saja
   * di-assign, menyebabkan submit() ditolak 400 "No Working Days Selected" (server menolak
   * leave type dgn balance 0 yg terbaca stale, bukan krn tanggalnya benar2 weekend).
   */
  async selectLeaveType(leaveTypeName: string): Promise<void> {
    await this.leaveTypeSelect.click();
    const option = this.page
      .locator('.oxd-select-dropdown .oxd-select-option, [role="listbox"] [role="option"]')
      .filter({ hasText: leaveTypeName });
    await option.first().waitFor({ state: 'visible', timeout: 5_000 });
    const responsePromise = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/leave/employees') && r.request().method() === 'GET', {
        timeout: 8_000,
      })
      .catch(() => null);
    await option.first().click();
    await responsePromise;
    await this.page.waitForTimeout(300);
  }

  async fillDateRange(fromDate: string, toDate: string): Promise<void> {
    await this.fromDateInput.fill('');
    await this.fromDateInput.fill(fromDate);
    await this.toDateInput.fill('');
    await this.toDateInput.fill(toDate);
  }

  /**
   * Clicks Assign. If the insufficient-balance override dialog appears, resolves it
   * according to `onOverride` ('confirm' | 'cancel' | undefined meaning "don't expect one").
   */
  async submit(onOverride?: 'confirm' | 'cancel') {
    const responsePromise = this.page
      .waitForResponse(
        (r) => r.url().includes('/api/v2/leave/employees/leave-requests') && r.request().method() === 'POST',
        { timeout: 15_000 },
      )
      .catch(() => null);
    await this.assignButton.click();
    await this.page.waitForTimeout(600);
    const overrideVisible = await this.confirmOverrideButton.isVisible({ timeout: 2_000 }).catch(() => false);
    if (overrideVisible && onOverride === 'confirm') {
      await this.confirmOverrideButton.click();
    } else if (overrideVisible && onOverride === 'cancel') {
      await this.cancelOverrideButton.click();
    } else if (overrideVisible) {
      // [BUG SCRIPT, diperbaiki] Kalau dialog override MUNCUL tapi caller tidak memberi
      // `onOverride` (dialog tidak diharapkan, mis. dlm loop retry tanggal yg berasumsi
      // balance selalu cukup), dialog ini dulu dibiarkan terbuka -- confirmed live, dialog
      // yg nyangkut dari satu attempt ini lalu memblokir klik assignButton pada attempt
      // BERIKUTNYA di loop ("intercepts pointer events"), membuat seluruh loop macet.
      // Default ke Cancel: lebih aman drpd diam-diam Confirm override yg bisa bikin balance
      // negatif tanpa diminta.
      await this.cancelOverrideButton.click().catch(() => {});
    }
    return { response: await responsePromise, overrideDialogShown: overrideVisible };
  }
}
