import { execSync } from 'node:child_process';
import path from 'node:path';
import ExcelJS from 'exceljs';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { env } from '../config/env';

const BUG_LIST_PATH = path.join(__dirname, '..', '..', 'docs', 'Bug-List.xlsx');

const HEADERS = [
  'Bug ID',
  'Summary',
  'Category',
  'Scope',
  'Environment',
  'Modul',
  'Steps to Reproduce',
  'Expected Result',
  'Actual Result',
  'Severity',
  'Priority',
  'Attachment',
  'Detected On',
  'Detected By',
  'Status',
  'Assigned To',
  'Notes',
  'Script Test Case',
] as const;

interface FailedCheck {
  label: string;
  detail: string;
}

interface BugRow {
  bugId: string;
  summary: string;
  category: string;
  scope: string;
  environment: string;
  modul: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  severity: string;
  priority: string;
  attachment: string;
  detectedOn: string;
  detectedBy: string;
  status: string;
  assignedTo: string;
  notes: string;
  scriptTestCase: string;
}

/**
 * Appends one row per failed test case to docs/Bug-List.xlsx so a failing
 * run leaves behind a draft bug report, not just a red CI check. Summary,
 * Scope, Steps to Reproduce, Expected/Actual Result, Severity and Priority
 * are all derived from the `[CHECK_FAIL]` log lines TestReport.check()
 * emits for every failing check (label + detail). These are suggestions
 * a human should still spot-check, not a substitute for triage, since
 * Severity/Priority in particular are classified by keyword heuristics
 * rather than real judgment of business impact.
 */
export default class BugListReporter implements Reporter {
  private readonly pendingRows: BugRow[] = [];

  async onBegin(): Promise<void> {
    if (await this.fileExists(BUG_LIST_PATH)) return;

    const fs = await import('node:fs/promises');
    await fs.mkdir(path.dirname(BUG_LIST_PATH), { recursive: true });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bug List');
    this.writeHeader(sheet);
    sheet.columns.forEach((column) => {
      column.width = 30;
    });
    await workbook.xlsx.writeFile(BUG_LIST_PATH);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== 'failed' && result.status !== 'timedOut') return;

    const modul = this.extractModul(test.location.file);
    const failedChecks = this.extractFailedChecks(result);
    const steps = this.extractSteps(result);
    const scope = this.classifyScope(failedChecks);
    const { severity, priority } = this.classifySeverityAndPriority(failedChecks);
    const attachment = this.extractAttachment(result);

    this.pendingRows.push({
      bugId: '', // assigned when writing, after reading the current last ID
      summary: this.buildSummary(modul, failedChecks, test.title),
      category: 'Bug',
      scope,
      environment: env.baseURL,
      modul,
      stepsToReproduce: steps,
      expectedResult: this.buildExpectedResult(failedChecks),
      actualResult: this.buildActualResult(failedChecks),
      severity,
      priority,
      attachment,
      detectedOn: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      detectedBy: this.getDetectedBy(),
      status: 'Open',
      assignedTo: '',
      notes: '',
      scriptTestCase: path.basename(test.location.file),
    });
  }

  async onEnd(): Promise<void> {
    if (this.pendingRows.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    let sheet: ExcelJS.Worksheet;

    if (await this.fileExists(BUG_LIST_PATH)) {
      await workbook.xlsx.readFile(BUG_LIST_PATH);
      sheet = workbook.getWorksheet('Bug List') ?? workbook.addWorksheet('Bug List');
      if (sheet.rowCount === 0) this.writeHeader(sheet);
    } else {
      sheet = workbook.addWorksheet('Bug List');
      this.writeHeader(sheet);
    }

    const openStatusByKey = this.getOpenStatusByKey(sheet);
    let nextBugNumber = this.getNextBugNumber(sheet);
    for (const row of this.pendingRows) {
      const key = this.bugKey(row);
      // Same bug (same script + summary) already logged and still open:
      // skip, don't duplicate. Only log again if the prior entry was Closed
      // (a regression), or if this bug was never logged before.
      if (openStatusByKey.get(key) === true) continue;

      row.bugId = `BG-${String(nextBugNumber).padStart(3, '0')}`;
      sheet.addRow(HEADERS.map((header) => this.fieldFor(row, header)));
      nextBugNumber += 1;
    }

    sheet.columns.forEach((column) => {
      column.width = 30;
    });

    await workbook.xlsx.writeFile(BUG_LIST_PATH);
  }

  /** Identifies "the same bug" as the same test script + same test title. */
  private bugKey(row: Pick<BugRow, 'scriptTestCase' | 'summary'>): string {
    return `${row.scriptTestCase}::${row.summary}`;
  }

  /**
   * Maps each existing bug key to whether its most recent row is still open
   * (any status other than "Closed" counts as open). Rows are scanned in
   * sheet order, so a later row for the same key overrides an earlier one.
   */
  private getOpenStatusByKey(sheet: ExcelJS.Worksheet): Map<string, boolean> {
    const scriptCol = HEADERS.indexOf('Script Test Case') + 1;
    const summaryCol = HEADERS.indexOf('Summary') + 1;
    const statusCol = HEADERS.indexOf('Status') + 1;
    const result = new Map<string, boolean>();

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const script = String(row.getCell(scriptCol).value ?? '');
      const summary = String(row.getCell(summaryCol).value ?? '');
      const status = String(row.getCell(statusCol).value ?? '');
      if (!script && !summary) return;
      result.set(`${script}::${summary}`, status.trim().toLowerCase() !== 'closed');
    });

    return result;
  }

  private fieldFor(row: BugRow, header: (typeof HEADERS)[number]): string {
    const map: Record<(typeof HEADERS)[number], string> = {
      'Bug ID': row.bugId,
      Summary: row.summary,
      Category: row.category,
      Scope: row.scope,
      Environment: row.environment,
      Modul: row.modul,
      'Steps to Reproduce': row.stepsToReproduce,
      'Expected Result': row.expectedResult,
      'Actual Result': row.actualResult,
      Severity: row.severity,
      Priority: row.priority,
      Attachment: row.attachment,
      'Detected On': row.detectedOn,
      'Detected By': row.detectedBy,
      Status: row.status,
      'Assigned To': row.assignedTo,
      Notes: row.notes,
      'Script Test Case': row.scriptTestCase,
    };
    return map[header];
  }

  private writeHeader(sheet: ExcelJS.Worksheet): void {
    const headerRow = sheet.addRow([...HEADERS]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  private getNextBugNumber(sheet: ExcelJS.Worksheet): number {
    let maxNumber = 0;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const bugId = String(row.getCell(1).value ?? '');
      const match = /^BG-(\d+)$/.exec(bugId);
      if (match) maxNumber = Math.max(maxNumber, Number(match[1]));
    });
    return maxNumber + 1;
  }

  private extractModul(filePath: string): string {
    const match = /tests[/\\]([^/\\]+)[/\\]([^/\\]+)[/\\]/.exec(filePath);
    if (match) return `${this.titleCase(match[1] ?? '')} - ${this.titleCase(match[2] ?? '')}`;

    const topLevel = /tests[/\\]([^/\\]+)[/\\]/.exec(filePath);
    return this.titleCase(topLevel?.[1] ?? 'unknown');
  }

  private titleCase(slug: string): string {
    if (slug.toUpperCase() === 'PIM') return 'PIM';
    return slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /** Renumbered, plain-sentence steps (no "[STEP n]" prefix or trailing "..."). */
  private extractSteps(result: TestResult): string {
    const lines = this.stdoutLines(result).filter((line) => line.startsWith('[STEP'));
    if (lines.length === 0) return '[FILL MANUALLY]';

    return lines
      .map((line, i) => {
        const text = line.replace(/^\[STEP \d+\]\s*/, '').replace(/\.{3}$/, '').trim();
        return `${i + 1}. ${text}.`;
      })
      .join('\n');
  }

  /** Parses every `[CHECK_FAIL] <label> | <detail>` line TestReport.check() emits. */
  private extractFailedChecks(result: TestResult): FailedCheck[] {
    const lines = this.stdoutLines(result).filter((line) => line.startsWith('[CHECK_FAIL]'));
    const checks = lines.map((line) => {
      const body = line.replace(/^\[CHECK_FAIL\]\s*/, '');
      const [label = '', detail = ''] = body.split(/\s\|\s/);
      return { label: label.trim(), detail: detail.trim() };
    });
    if (checks.length > 0) return checks;

    // Fallback for failures that never reach a TestReport.check() call
    // (e.g. a raw exception thrown mid-test): use Playwright's own error.
    const firstError = result.errors[0];
    if (!firstError) return [];
    const message = (firstError.message ?? String(firstError.value))
      .replace(/\u001b\[[0-9;]*m/g, '')
      .trim();
    return [{ label: 'Unexpected error', detail: message }];
  }

  private stdoutLines(result: TestResult): string[] {
    return result.stdout
      .map((chunk) => chunk.toString())
      .join('')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  private buildSummary(modul: string, failedChecks: FailedCheck[], fallbackTitle: string): string {
    const first = failedChecks[0];
    if (!first) return `${modul}: ${fallbackTitle}`;
    const core = first.detail ? `${first.label}: ${this.truncate(first.detail, 90)}` : first.label;
    return this.truncate(`${modul}: ${core}`, 160);
  }

  private buildExpectedResult(failedChecks: FailedCheck[]): string {
    if (failedChecks.length === 0) return '[FILL MANUALLY]';
    return failedChecks
      .map((c) => (/^[A-Z]/.test(c.label) ? c.label : c.label.charAt(0).toUpperCase() + c.label.slice(1)))
      .map((label) => (label.endsWith('.') ? label : `${label}.`))
      .join('\n');
  }

  private buildActualResult(failedChecks: FailedCheck[]): string {
    if (failedChecks.length === 0) return '[FILL MANUALLY]';
    return failedChecks
      .map((c) => {
        if (!c.detail) return `Check "${c.label}" failed (no detail available from the assertion).`;
        if (this.isConsoleRelated(c))
          return `Browser console error: ${c.detail}`;
        if (this.isApiRelated(c)) return `API response: ${c.detail}`;
        return c.detail;
      })
      .join('\n');
  }

  /** FE / BE / FE & BE, from keyword patterns in the failed checks' text. */
  private classifyScope(failedChecks: FailedCheck[]): string {
    if (failedChecks.length === 0) return 'FE';
    const isFE = failedChecks.some((c) => this.isConsoleRelated(c) || this.isUiRelated(c));
    const isBE = failedChecks.some((c) => this.isApiRelated(c));
    if (isFE && isBE) return 'FE & BE';
    if (isBE) return 'BE';
    return 'FE';
  }

  /**
   * Keyword-based Severity/Priority suggestion, a starting point for QA
   * triage, not a final classification. Priority mirrors Severity by
   * default since business urgency needs context this reporter doesn't
   * have.
   */
  private classifySeverityAndPriority(failedChecks: FailedCheck[]): { severity: string; priority: string } {
    if (failedChecks.length === 0) return { severity: '[FILL MANUALLY]', priority: '[FILL MANUALLY]' };

    // Keywords cover both English and Indonesian since spec files currently
    // mix both languages in their step()/check() text.
    const text = failedChecks.map((c) => `${c.label} ${c.detail}`).join(' ').toLowerCase();
    const highPattern =
      /xss|sql injection|sqli|crash|uncaught exception|data (loss|lost|corrupt|hilang|rusak)|bypass (auth|login)|\b5\d{2}\b/;
    const mediumPattern =
      /\b422\b|\b400\b|\bnull\b|not valid|invalid|validation (bypassed|failed|loose)|incorrectly saved|inconsistent|tidak (ter)?valid|validasi (longgar|gagal)|salah simpan|tidak sesuai|inkonsisten/;

    const severity = highPattern.test(text) ? 'High' : mediumPattern.test(text) ? 'Medium' : 'Low';
    return { severity, priority: severity };
  }

  private isConsoleRelated(c: FailedCheck): boolean {
    return /console|render|uncaught exception/i.test(`${c.label} ${c.detail}`);
  }

  private isUiRelated(c: FailedCheck): boolean {
    return /\bui\b|visual|tampil|layout|css/i.test(`${c.label} ${c.detail}`);
  }

  private isApiRelated(c: FailedCheck): boolean {
    return /\bapi\b|status\s*=|endpoint|response|\b(get|post|put|patch|delete)\b.*\/|\bhttp\b/i.test(
      `${c.label} ${c.detail}`,
    );
  }

  private truncate(text: string, max: number): string {
    return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
  }

  private extractAttachment(result: TestResult): string {
    const media = result.attachments.find(
      (a) => a.name === 'screenshot' || a.name === 'video',
    );
    if (!media?.path) return '';
    return path.relative(path.join(__dirname, '..', '..'), media.path);
  }

  private getDetectedBy(): string {
    try {
      return execSync('git config user.name').toString().trim() || 'Automation';
    } catch {
      return 'Automation';
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await import('node:fs/promises').then((fs) => fs.access(filePath));
      return true;
    } catch {
      return false;
    }
  }
}
