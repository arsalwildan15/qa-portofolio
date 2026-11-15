import { type Response } from '@playwright/test';
import { AssignClaimPage } from './AssignClaimPage';

/**
 * Claim > Submit Claim (ESS side). Same Event/Currency/Remarks form and the same Add Expense
 * dialog as Assign Claim, minus the Employee field; confirmed live: Create = POST
 * /api/v2/claim/requests (flat, own claim), detail page = claim/submitClaim/id/<id>, Submit =
 * PUT requests/<id>/action {action:"SUBMIT"}.
 */
export class SubmitClaimPage extends AssignClaimPage {
  override async goto(): Promise<void> {
    await this.page.goto('/web/index.php/claim/submitClaim');
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  override async gotoDetail(claimId: number): Promise<void> {
    await this.page.goto(`/web/index.php/claim/submitClaim/id/${claimId}`);
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  override async create(): Promise<Response | null> {
    const responsePromise = this.page
      .waitForResponse((r) => /\/api\/v2\/claim\/requests$/.test(r.url()) && r.request().method() === 'POST', { timeout: 15_000 })
      .catch(() => null);
    await this.createButton.click();
    return responsePromise;
  }
}
