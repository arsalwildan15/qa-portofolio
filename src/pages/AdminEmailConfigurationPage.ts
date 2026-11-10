import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > Configuration > Email Configuration. Confirmed live:
 * /admin/listMailConfiguration.
 *
 * Fields (confirmed live): Mail Sent As* (the only field whose label shows
 * the "*" required marker directly, confirmed via page snapshot), Sending
 * Method (3 radios: SECURE SMTP / SMTP / Sendmail -- default on this demo
 * is Sendmail). Conditional fields depending on Sending Method:
 *   - Sendmail -> Path to Sendmail (text, prefilled "/usr/sbin/sendmail -bs"
 *     on this demo).
 *   - SMTP / SECURE SMTP -> SMTP Host, SMTP Port, "Use SMTP Authentication"
 *     (Yes/No radio), TLS (checkbox, optional).
 * "Send Test Mail" (checkbox) is present regardless of method -- confirmed
 * live it does NOT have its own standalone test button; it only adds a
 * "Mail To" field and actually sends on Save, so it is NOT a safe
 * non-mutating probe here (unlike LDAP's dedicated "Test Connection").
 * Buttons: Reset, Save (NOT "Test Connection" -- that only exists on LDAP
 * Configuration).
 *
 * [SAFETY CONSTRAINT -- PENTING] Save here persists the GLOBAL outgoing-
 * mail configuration used for every automated email the shared public demo
 * sends (password reset, notifications, etc.) to every concurrent user.
 * Mail Sent As DOES have working on-blur client-side validation confirmed
 * live (Required on empty, "Expected format: admin@example.com" on
 * malformed input, "Should not exceed 100 characters" on overlong input --
 * the same validation style as Organization Name elsewhere in Admin).
 * Even so, this suite treats this screen as HIGH-RISK-validate-only by
 * policy, same as Corporate Branding/LDAP/Modules/Localization/Social
 * Media Authentication: `saveButton` is exposed here for completeness
 * (e.g. TC-01's visibility check) but **no TC in this suite ever calls
 * `.click()` on it** -- every negative/boundary/security TC fills the
 * field, checks the on-blur validation message, then navigates away
 * WITHOUT saving and confirms via reload that the server-side value is
 * unchanged.
 *
 * [TEMUAN PROSES] `goto()` below waits for the underlying GET to resolve
 * before returning, same hydration-race guard as
 * AdminGeneralInformationPage.goto() -- reading `mailSentAsInput`
 * immediately after a blind goto() was confirmed live to race Vue's
 * hydration and misread "" even though the server's real value was
 * correct the whole time; this is NOT a server-side data-loss bug, purely
 * a test-timing hazard this suite guards against explicitly.
 *
 * [TEMUAN] "Path to Sendmail" (shown when Sending Method = Sendmail) is
 * rendered as READ-ONLY text (a `<p>`, confirmed live via page snapshot),
 * NOT an editable input -- the only field on this form that isn't.
 */
export class AdminEmailConfigurationPage extends BasePage {
  readonly mailSentAsInput: Locator;
  readonly secureSmtpRadioLabel: Locator;
  readonly smtpRadioLabel: Locator;
  readonly sendmailRadioLabel: Locator;
  /** Read-only `<p>` text, NOT an input -- confirmed live, see class JSDoc. */
  readonly pathToSendmailText: Locator;
  readonly smtpHostInput: Locator;
  readonly smtpPortInput: Locator;
  readonly resetButton: Locator;
  readonly saveButton: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    const byLabel = (label: string) =>
      page.locator('.oxd-input-group', { has: page.getByText(label, { exact: true }) }).locator('input');
    this.mailSentAsInput = byLabel('Mail Sent As');
    this.secureSmtpRadioLabel = page.getByText('SECURE SMTP', { exact: true });
    this.smtpRadioLabel = page.getByText('SMTP', { exact: true });
    this.sendmailRadioLabel = page.getByText('Sendmail', { exact: true });
    this.pathToSendmailText = page
      .locator('.oxd-input-group, .oxd-form-row', { has: page.getByText('Path to Sendmail', { exact: true }) })
      .locator('p');
    this.smtpHostInput = byLabel('SMTP Host');
    this.smtpPortInput = byLabel('SMTP Port');
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.fieldErrors = page.locator('.oxd-input-group .oxd-text--span, .oxd-form-row .oxd-text--span');
  }

  /**
   * Waits for the underlying GET to resolve before returning -- same
   * hydration-race guard as AdminGeneralInformationPage.goto(): reading
   * `mailSentAsInput` immediately after a blind goto() can race Vue's
   * hydration and observe "" even though the server's real value is
   * correct (confirmed live while authoring this suite).
   */
  async goto(): Promise<void> {
    const getPromise = this.page
      .waitForResponse((r) => r.url().includes('/api/v2/admin/email-configuration') && r.request().method() === 'GET', {
        timeout: 10_000,
      })
      .catch(() => null);
    await this.page.goto('/web/index.php/admin/listMailConfiguration');
    await getPromise;
    await this.page.waitForTimeout(500);
  }

  async selectSendingMethod(method: 'SECURE SMTP' | 'SMTP' | 'Sendmail'): Promise<void> {
    const label =
      method === 'SECURE SMTP' ? this.secureSmtpRadioLabel : method === 'SMTP' ? this.smtpRadioLabel : this.sendmailRadioLabel;
    await label.first().click();
    await this.page.waitForTimeout(500);
  }

  async snapshotMailSentAs(): Promise<string> {
    return this.mailSentAsInput.inputValue();
  }
}
