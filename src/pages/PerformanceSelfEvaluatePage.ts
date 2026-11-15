import { type Page, type Locator, type Response } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Performance > My Reviews > self-evaluation (ESS, performance/reviewEvaluate/id/<id>), confirmed
 * live 2026-11-15:
 * - One rating <input> (no placeholder) + one comment textarea (class
 *   orangehrm-evaluation-grid-comment) per KPI; the LAST grid textarea is the General Comment.
 *   The main-menu Search box is the only input WITH a placeholder, hence `:not([placeholder])`.
 * - Save = PUT reviews/<id>/evaluation/employee {complete:false, ratings[{kpiId,rating,comment}],
 *   generalComment}; Complete -> confirm dialog -> the same PUT with complete:true.
 * - After Complete: selfReviewStatus "Completed", overall status "In Progress", every rating input
 *   disabled, Save/Complete gone; a further PUT from the ESS user is refused with 403.
 */
export class PerformanceSelfEvaluatePage extends BasePage {
  readonly ratingInputs: Locator;
  readonly commentTextareas: Locator;
  readonly generalCommentTextarea: Locator;
  readonly saveButton: Locator;
  readonly completeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.ratingInputs = page.locator('.oxd-layout-context input.oxd-input:not([placeholder])');
    this.commentTextareas = page.locator('textarea.orangehrm-evaluation-grid-comment');
    this.generalCommentTextarea = this.commentTextareas.last();
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.completeButton = page.getByRole('button', { name: 'Complete' });
  }

  /**
   * The form renders its inputs BEFORE GET evaluation/employee returns; that response then
   * re-populates every field, wiping anything typed in between (confirmed live: ratings went out
   * as null). So every entry point waits for that GET before handing control back.
   */
  private savedEvaluationLoaded(): Promise<unknown> {
    return this.page
      .waitForResponse((r) => /\/api\/v2\/performance\/reviews\/\d+\/evaluation\/employee/.test(r.url()) && r.request().method() === 'GET', { timeout: 20_000 })
      .catch(() => null);
  }

  async goto(reviewId: number): Promise<void> {
    const loaded = this.savedEvaluationLoaded();
    await this.page.goto(`/web/index.php/performance/reviewEvaluate/id/${reviewId}`);
    await loaded;
    await this.ratingInputs.first().waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** Opens My Reviews and clicks the (icon-only) action of the first row -- the ESS entry point. */
  async openFromMyReviews(): Promise<void> {
    await this.page.goto('/web/index.php/performance/myPerformanceReview');
    const action = this.page.locator('.oxd-table-card button').first();
    await action.waitFor({ state: 'visible', timeout: 15_000 });
    const loaded = this.savedEvaluationLoaded();
    await action.click();
    await loaded;
    await this.ratingInputs.first().waitFor({ state: 'visible', timeout: 15_000 });
  }

  async fillRatings(values: string[]): Promise<void> {
    for (const [i, v] of values.entries()) await this.ratingInputs.nth(i).fill(v);
  }

  /** Clicks Complete, confirms the dialog when one appears, resolves with the employee PUT. */
  async completeAndConfirm(reviewId: number): Promise<Response | null> {
    const put = this.page
      .waitForResponse((r) => r.url().includes(`/api/v2/performance/reviews/${reviewId}/evaluation/employee`) && r.request().method() === 'PUT', { timeout: 20_000 })
      .catch(() => null);
    await this.completeButton.click();
    const confirm = this.page.getByRole('dialog').getByRole('button', { name: 'Ok' });
    if (await confirm.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false)) await confirm.click();
    return put;
  }
}
