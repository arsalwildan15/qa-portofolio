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
 * run leaves behind a draft bug report, not just a red CI check. Fields
 * that can't be known from the failure alone (Expected Result, Severity,
 * Priority) are left as an explicit "[ISI MANUAL]" placeholder for QA
 * review, rather than guessed — Severity (technical impact) and Priority
 * (how urgently it should be fixed) are judgment calls a failing
 * assertion alone can't make.
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
    const steps = this.extractSteps(result);
    const actualResult = this.extractActualResult(result);
    const attachment = this.extractAttachment(result);

    this.pendingRows.push({
      bugId: '', // assigned when writing, after reading the current last ID
      summary: test.title,
      category: 'Bug',
      scope: 'E2E',
      environment: env.baseURL,
      modul,
      stepsToReproduce: steps,
      expectedResult: '[ISI MANUAL]',
      actualResult,
      severity: '[ISI MANUAL]',
      priority: '[ISI MANUAL]',
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

    let nextBugNumber = this.getNextBugNumber(sheet);
    for (const row of this.pendingRows) {
      row.bugId = `BG-${String(nextBugNumber).padStart(3, '0')}`;
      sheet.addRow(HEADERS.map((header) => this.fieldFor(row, header)));
      nextBugNumber += 1;
    }

    sheet.columns.forEach((column) => {
      column.width = 30;
    });

    await workbook.xlsx.writeFile(BUG_LIST_PATH);
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
    const match = /tests[/\\]([^/\\]+)[/\\]/.exec(filePath);
    const folder = match?.[1] ?? 'unknown';
    return folder.charAt(0).toUpperCase() + folder.slice(1);
  }

  private extractSteps(result: TestResult): string {
    const output = result.stdout
      .map((chunk) => chunk.toString())
      .join('')
      .split('\n')
      .filter((line) => line.trim().startsWith('[STEP'))
      .map((line) => line.trim());
    return output.length > 0 ? output.join('\n') : '[ISI MANUAL]';
  }

  private extractActualResult(result: TestResult): string {
    const firstError = result.errors[0];
    if (!firstError) return '[ISI MANUAL]';
    return (firstError.message ?? String(firstError.value)).replace(/\u001b\[[0-9;]*m/g, '').trim();
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
