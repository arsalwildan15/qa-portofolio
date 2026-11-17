import { type Locator } from '@playwright/test';

/**
 * OrangeHRM date inputs render their placeholder from the site-wide Admin > Localization date
 * format, and on the shared public demo that format drifts across sessions (confirmed live
 * 2026-11-15: flips between "yyyy-dd-mm" and "yyyy-mm-dd"; confirmed live again 2026-11-17: a
 * THIRD variant, "dd-mm-yyyy", showed up and made every date-filling TC across Leave, PIM,
 * Admin, Recruitment, Performance and Time hang indefinitely -- DATE_INPUT_SELECTOR only
 * matched the first two placeholders, so the locator never resolved). The TYPED value is
 * parsed in whatever format is currently displayed -- typing "2026-07-10" under yyyy-dd-mm is
 * stored as 7 Oct. So date inputs must be (1) located by ANY placeholder built from the
 * {yyyy, mm, dd} tokens (not a fixed list of named formats) and (2) filled by re-ordering the
 * tokens into whatever order that placeholder currently shows, not by matching a hardcoded
 * format string -- the admin can configure more combinations than this suite has seen so far,
 * and a token-based fill survives ones it hasn't.
 */
const TOKENS = ['yyyy', 'mm', 'dd'] as const;
type Token = (typeof TOKENS)[number];

/** Matches a placeholder that is some permutation of yyyy/mm/dd joined by '-' (the separator OrangeHRM's date-format options always use). */
export const DATE_INPUT_SELECTOR = [
  'yyyy-mm-dd', 'yyyy-dd-mm', 'dd-mm-yyyy', 'mm-dd-yyyy', 'dd-yyyy-mm', 'mm-yyyy-dd',
].map((f) => `input[placeholder="${f}"]`).join(', ');

export type DateFormat = 'yyyy-dd-mm' | 'yyyy-mm-dd';

function tokensOf(format: string): Token[] | null {
  const parts = format.split('-');
  if (parts.length !== 3 || !parts.every((p): p is Token => (TOKENS as readonly string[]).includes(p))) return null;
  return parts as Token[];
}

/**
 * Re-orders `value` (given in `valueFormat`) into `displayFormat`'s token order. Shared by
 * `fillDate` (typing into an input) and anything that needs to match a date AS DISPLAYED
 * elsewhere on the page (e.g. `LeaveListPage.rowByDate` matching a table cell's text) --
 * both need the exact same yyyy/mm/dd re-ordering, and duplicating it with a hardcoded
 * 2-format swap (`${yyyy}-${b}-${a}`) is exactly the bug this file's own history already hit
 * once (confirmed live 2026-11-17: that duplicate in rowByDate was never updated for the
 * "dd-mm-yyyy" variant, so Leave List's row search silently matched nothing). Returns `value`
 * unchanged if either format isn't a recognizable yyyy/mm/dd permutation.
 */
export function convertDateFormat(value: string, valueFormat: string, displayFormat: string | null): string {
  const valueTokens = tokensOf(valueFormat);
  const displayTokens = displayFormat ? tokensOf(displayFormat) : null;
  if (!valueTokens || !displayTokens) return value;
  const parts = value.split('-');
  const byToken: Record<Token, string> = { yyyy: '', mm: '', dd: '' };
  valueTokens.forEach((t, i) => { byToken[t] = parts[i] ?? ''; });
  return displayTokens.map((t) => byToken[t]).join('-');
}

/**
 * Re-orders `value` (given in `valueFormat`, always yyyy/dd/mm or yyyy/mm/dd -- the two formats
 * every caller in this suite passes in) into whatever token order `input`'s placeholder
 * currently displays, then fills it (clearing first: a bare fill() appends on these inputs).
 * Falls back to filling `value` as-is if the placeholder isn't a recognizable yyyy/mm/dd
 * permutation (e.g. the field failed to render) -- the caller's own check then reports that
 * clearly instead of this helper hanging on a locator wait.
 */
export async function fillDate(input: Locator, value: string, valueFormat: DateFormat): Promise<void> {
  const placeholder = await input.getAttribute('placeholder').catch(() => null);
  const converted = convertDateFormat(value, valueFormat, placeholder);
  await input.fill('');
  await input.fill(converted);
}
