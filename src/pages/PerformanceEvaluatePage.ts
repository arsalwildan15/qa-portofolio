import { type Page, type Locator, type Response } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Performance > Manage Reviews > Evaluate (reviewEvaluateByAdmin/<id>), confirmed live:
 * - Each KPI row has a rating <input> with NO type/placeholder plus a comment <textarea>
 *   (class orangehrm-evaluation-grid-comment); the General Comment textarea shares that class.
 *   The Final Rating input is the LAST placeholder-less input; Final Comments is the only
 *   textarea without the grid class.
 * - Save = PUT reviews/<id>/evaluation/supervisor (ratings by kpiId + generalComment) AND
 *   PUT reviews/<id>/evaluation/final with complete:false -> status "In Progress".
 * - Complete opens a "Confirm Review Submission" dialog (Cancel / Ok); Ok sends complete:true
 *   -> status "Completed" (read-only).
 * - The Date of Completion input is interpreted in the CURRENTLY displayed format (yyyy-dd-mm or
 *   yyyy-mm-dd flips between sessions) -- use dates whose day == month to stay unambiguous.
 */
export class PerformanceEvaluatePage extends BasePage {
  readonly ratingInputs: Locator;
  readonly finalRatingInput: Locator;
  readonly gridCommentTextareas: Locator;
  readonly finalCommentTextarea: Locator;
  readonly completionDateInput: Locator;
  readonly saveButton: Locator;
  readonly completeButton: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.ratingInputs = page.locator('input.oxd-input:not([placeholder])');
    this.finalRatingInput = this.ratingInputs.last();
    this.gridCommentTextareas = page.locator('textarea.orangehrm-evaluation-grid-comment');
    this.finalCommentTextarea = page.locator('textarea:not(.orangehrm-evaluation-grid-comment)');
    this.completionDateInput = page.locator('input[placeholder="yyyy-dd-mm"], input[placeholder="yyyy-mm-dd"]');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.completeButton = page.getByRole('button', { name: 'Complete' });
    this.fieldErrors = page.locator('.oxd-input-field-error-message');
  }

  async goto(reviewId: number): Promise<void> {
    await this.page.goto(`/web/index.php/performance/reviewEvaluateByAdmin/${reviewId}`);
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.ratingInputs.first().waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** KPI rating inputs only (excludes the trailing Final Rating input). */
  kpiRatingInput(index: number): Locator {
    return this.ratingInputs.nth(index);
  }

  async fillAllKpiRatings(kpiCount: number, value: string): Promise<void> {
    for (let i = 0; i < kpiCount; i += 1) await this.kpiRatingInput(i).fill(value);
  }

  async fillAllGridComments(text: string): Promise<void> {
    const count = await this.gridCommentTextareas.count();
    for (let i = 0; i < count; i += 1) await this.gridCommentTextareas.nth(i).fill(text);
  }

  async fillFinalization(finalRating: string, finalComment: string, completionDate: string): Promise<void> {
    await this.finalRatingInput.fill(finalRating);
    await this.finalCommentTextarea.fill(finalComment);
    await this.completionDateInput.fill(completionDate);
    await this.page.keyboard.press('Escape');
  }

  /** Clicks Save; resolves with the supervisor + final PUT responses (null if not sent). */
  async save(reviewId: number): Promise<{ supervisor: Response | null; final: Response | null }> {
    const supervisor = this.waitForPut(reviewId, 'evaluation/supervisor');
    const final = this.waitForPut(reviewId, 'evaluation/final');
    await this.saveButton.click();
    return { supervisor: await supervisor, final: await final };
  }

  /** Clicks Complete and confirms the dialog with Ok; resolves with the final PUT response. */
  async completeAndConfirm(reviewId: number): Promise<Response | null> {
    await this.completeButton.click();
    const dialog = this.page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 10_000 });
    const final = this.waitForPut(reviewId, 'evaluation/final');
    await dialog.getByRole('button', { name: 'Ok' }).click();
    return final;
  }

  private waitForPut(reviewId: number, path: string): Promise<Response | null> {
    return this.page
      .waitForResponse((r) => r.url().includes(`/api/v2/performance/reviews/${reviewId}/${path}`) && r.request().method() === 'PUT', { timeout: 15_000 })
      .catch(() => null);
  }
}
