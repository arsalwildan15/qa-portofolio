import { type Locator } from '@playwright/test';

/**
 * OrangeHRM date inputs render their placeholder from the site-wide Admin > Localization date
 * format, and on the shared public demo that format flips between "yyyy-dd-mm" and
 * "yyyy-mm-dd" across sessions (confirmed live 2026-11-15, same reset pattern as the identity
 * corruption). The TYPED value is parsed in whatever format is currently displayed -- typing
 * "2026-07-10" under yyyy-dd-mm is stored as 7 Oct. So date inputs must be (1) located by
 * either placeholder and (2) filled in the format they currently show.
 */
export const DATE_INPUT_SELECTOR = 'input[placeholder="yyyy-dd-mm"], input[placeholder="yyyy-mm-dd"]';

export type DateFormat = 'yyyy-dd-mm' | 'yyyy-mm-dd';

/** Re-orders `value` (given in `valueFormat`) into the format `input` currently displays, then fills it (clearing first: a bare fill() appends on these inputs). */
export async function fillDate(input: Locator, value: string, valueFormat: DateFormat): Promise<void> {
  const displayFormat = (await input.getAttribute('placeholder')) as DateFormat | null;
  const [yyyy, a, b] = value.split('-');
  const converted = displayFormat && displayFormat !== valueFormat ? `${yyyy}-${b}-${a}` : value;
  await input.fill('');
  await input.fill(converted);
}
