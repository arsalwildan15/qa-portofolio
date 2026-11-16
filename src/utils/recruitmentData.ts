/**
 * Recruitment test-data helpers (API-level). Endpoints & bodies recorded LIVE 17 Nov 2026:
 *   candidate        GET/PUT recruitment/candidates/<id>
 *   candidate resume GET/PUT recruitment/candidate/<id>/attachment {currentAttachment, attachment}
 *   vacancy          GET/PUT recruitment/vacancies/<id>
 *   vacancy files    GET recruitment/vacancies/<id>/attachments, POST/DELETE recruitment/vacancy/attachments,
 *                    PUT recruitment/vacancies/<vid>/attachments/<id>
 * Every helper only touches records created by the calling test.
 */
import type { APIRequestContext, Page } from '@playwright/test';

export const API = '/web/index.php/api/v2/';
export const b64 = (s: string | Buffer): string => Buffer.from(s).toString('base64');
export const filePayload = (name: string, type: string, content: string | Buffer, size?: number) =>
  ({ name, type, size: size ?? Buffer.byteLength(content), base64: b64(content) });

export type CandidateBody = Record<string, unknown>;
export function candidateBody(vacancyId: number, over: CandidateBody = {}): CandidateBody {
  return { firstName: 'QaRec', middleName: null, lastName: 'Cand', email: 'qa.rec@example.com', contactNumber: null, comment: null, keywords: null, dateOfApplication: '2026-11-01', consentToKeepData: false, vacancyId, ...over };
}

/** Body for PUT recruitment/vacancies/<id>, read back from the server so only `over` changes. */
export async function vacancyBody(req: APIRequestContext, vacancyId: number, over: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const d = ((await (await req.get(`${API}recruitment/vacancies/${vacancyId}`)).json()) as { data: { name: string; description: string | null; numOfPositions: number; status: boolean; isPublished: boolean; jobTitle: { id: number }; hiringManager: { id: number } } }).data;
  return { name: d.name, jobTitleId: d.jobTitle.id, employeeId: d.hiringManager.id, numOfPositions: d.numOfPositions ?? 1, description: d.description ?? '', status: d.status, isPublished: d.isPublished, ...over };
}

export async function getJson<T = Record<string, unknown>>(req: APIRequestContext, path: string): Promise<T> {
  return ((await (await req.get(`${API}${path}`)).json()) as { data: T }).data;
}

export async function addVacancyAttachment(req: APIRequestContext, vacancyId: number, name = 'qa.pdf', comment = 'qa'): Promise<number> {
  const r = await req.post(`${API}recruitment/vacancy/attachments`, { data: { vacancyId, attachment: filePayload(name, 'application/pdf', '%PDF-1.4\n'), comment, attachmentType: 1 } });
  return ((await r.json()) as { data: { id: number } }).data.id;
}

export async function cleanupRecruitment(req: APIRequestContext, candidateIds: Array<number | undefined>, vacancyIds: Array<number | undefined>): Promise<void> {
  const c = candidateIds.filter((x): x is number => typeof x === 'number');
  const v = vacancyIds.filter((x): x is number => typeof x === 'number');
  if (c.length) await req.delete(`${API}recruitment/candidates`, { data: { ids: c } }).catch(() => null);
  if (v.length) await req.delete(`${API}recruitment/vacancies`, { data: { ids: v } }).catch(() => null);
}

/** Field-level validation messages currently shown on the page. */
export async function fieldErrors(page: Page): Promise<string[]> {
  return page.locator('.oxd-input-field-error-message').allInnerTexts();
}

/** Input/textarea inside the form group whose label is `label`. */
export function formField(page: Page, label: string) {
  return page.locator('.oxd-input-group').filter({ has: page.locator('label', { hasText: label }) }).locator('input, textarea').first();
}
