import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Resolves to true/false instead of throwing — unlike `locator.isVisible()`,
 * this WAITS (up to `timeout`ms) for the element to become visible before
 * giving up, so a not-yet-rendered element isn't misreported as absent.
 * Use this when feeding a boolean into `TestReport.check()`.
 */
export async function isVisibleWithWait(locator: Locator, timeout = 10_000): Promise<boolean> {
  return locator
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);
}

/** Same as `isVisibleWithWait`, but waits for the element to be hidden/gone. */
export async function isHiddenWithWait(locator: Locator, timeout = 10_000): Promise<boolean> {
  return locator
    .waitFor({ state: 'hidden', timeout })
    .then(() => true)
    .catch(() => false);
}

/**
 * Resolves to true/false instead of throwing — unlike reading `page.url()`
 * right after a click, this WAITS (up to `timeout`ms) for the URL to match
 * `pattern` before giving up, so a client-side redirect that hasn't
 * finished yet isn't misreported as "didn't navigate".
 */
export async function urlMatchesWithWait(
  page: Page,
  pattern: RegExp,
  timeout = 10_000,
): Promise<boolean> {
  return page
    .waitForURL(pattern, { timeout })
    .then(() => true)
    .catch(() => false);
}

/**
 * Logs a numbered step to the console in the form "[STEP n] description...".
 * Call this right before performing the action it describes.
 */
export function step(n: number, description: string): void {
  console.log(`[STEP ${n}] ${description}...`);
}

interface ConsoleErrorEntry {
  text: string;
}

interface CheckEntry {
  label: string;
  passed: boolean;
  detail?: string;
}

interface FindingEntry {
  label: string;
  detail: string;
}

/**
 * Collects step logs, soft-asserted checks, and free-form findings for a
 * single test case, then prints a human-readable summary block at the end
 * (checks table, findings, failed-checks recap, pass/fail totals).
 *
 * Checks are recorded via `expect.soft()`, so a failing check does not stop
 * the test body — every remaining step and check still runs and gets
 * reported, and Playwright marks the test as failed overall once the test
 * finishes (matching the "collect everything, report once" style).
 */
export class TestReport {
  private readonly checks: CheckEntry[] = [];
  private readonly findings: FindingEntry[] = [];
  private readonly consoleErrors: ConsoleErrorEntry[] = [];
  private readonly startedAt = Date.now();
  private stepCount = 0;

  /**
   * `page` is optional only for call sites that predate this parameter;
   * pass it to automatically fail the TC on any unexpected browser
   * console error (no need to wire this up per test).
   */
  constructor(
    private readonly tcId: string,
    private readonly title: string,
    private readonly env: string,
    page?: Page,
  ) {
    if (page) {
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          this.consoleErrors.push({ text: msg.text() });
        }
      });
      page.on('pageerror', (error) => {
        this.consoleErrors.push({ text: `Uncaught exception: ${error.message}` });
      });
    }
  }

  /** Logs the next numbered step automatically (no manual counter needed). */
  step(description: string): void {
    this.stepCount += 1;
    step(this.stepCount, description);
  }

  /** Records a verification result. Failing checks do not halt the test. */
  check(label: string, passed: boolean, detail?: string): void {
    this.checks.push({ label, passed, detail });
    expect.soft(passed, label).toBeTruthy();
  }

  /** Records an observational note that isn't a pass/fail assertion. */
  finding(label: string, detail: string): void {
    this.findings.push({ label, detail });
  }

  /** Prints the full summary block. Call once at the end of the test body. */
  print(): void {
    if (this.consoleErrors.length > 0) {
      this.check(
        'Tidak ada console error di browser',
        false,
        this.consoleErrors.map((e) => e.text).join(' | '),
      );
    } else {
      this.check('Tidak ada console error di browser', true);
    }

    const durationMs = Date.now() - this.startedAt;
    const passedCount = this.checks.filter((c) => c.passed).length;
    const failedChecks = this.checks.filter((c) => !c.passed);
    const bar = '='.repeat(80);
    const thin = '-'.repeat(80);

    console.log(bar);
    console.log(`${this.tcId} | ${this.title}`);
    console.log(`Env      : ${this.env}`);
    console.log(`Mulai    : ${new Date(this.startedAt).toLocaleString('id-ID')}`);
    console.log(`Durasi   : ${(durationMs / 1000).toFixed(1)}s`);
    console.log(`Langkah  : ${this.stepCount}`);
    console.log(thin);
    console.log(`HASIL VERIFIKASI (${this.checks.length} check)`);
    console.log(thin);
    this.checks.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.passed ? '✓' : '✗'} ${c.label}`);
      if (c.detail) console.log(`        └─ ${c.detail}`);
    });

    if (this.findings.length > 0) {
      console.log(thin);
      console.log(`TEMUAN / OBSERVASI (${this.findings.length})`);
      console.log(thin);
      this.findings.forEach((f) => {
        console.log(`  • ${f.label}`);
        console.log(`        └─ ${f.detail}`);
      });
    }

    if (failedChecks.length > 0) {
      console.log(thin);
      console.log(`CHECK YANG GAGAL (${failedChecks.length})`);
      console.log(thin);
      failedChecks.forEach((c, i) => {
        console.log(`  ${i + 1}. ✗ ${c.label}`);
        if (c.detail) console.log(`        └─ ${c.detail}`);
      });
    }

    console.log(bar);
    console.log(
      `RINGKASAN: ${this.checks.length} check -> ${passedCount} lolos, ${failedChecks.length} gagal` +
        (this.findings.length > 0 ? `  |  ${this.findings.length} temuan` : ''),
    );
    console.log(`STATUS: ${failedChecks.length === 0 ? 'PASSED' : 'FAILED'}`);
    console.log(bar);
  }
}
