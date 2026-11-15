import { type Page } from '@playwright/test';

/**
 * Simulates a dropped connection TEPAT SAAT a save/create request is in flight (not failing from
 * the start) by intercepting `urlPattern` and aborting it, then calling `triggerSave`. Lifted out
 * of the inline pattern already proven in TC-ADMIN-USER-08/TC-PIM-ADD-33/TC-RECRUITMENT-CANDIDATE-20/
 * TC-BUZZ-18 (the app-wide unhandled-exception finding, BG-199), parameterized so Phase 2's new
 * modules (Leave/Claim/Performance/Time) don't each re-derive the same route/abort/unroute dance.
 */
export async function dropConnectionDuringSave(
  page: Page,
  urlPattern: string,
  triggerSave: () => Promise<void>,
  settleMs = 2_500,
): Promise<void> {
  await page.route(urlPattern, (route) => route.abort('failed'));
  await triggerSave();
  await page.waitForTimeout(settleMs);
  await page.unroute(urlPattern);
}

/**
 * Simulates a mid-flight page refresh: delays `urlPattern`'s response by `delayMs`, fires
 * `triggerSave` WITHOUT awaiting it, then reloads before the delayed response ever arrives.
 * Same inline pattern already proven in TC-ADMIN-USER-07, parameterized for reuse.
 */
export async function refreshDuringPendingSave(
  page: Page,
  urlPattern: string,
  triggerSave: () => Promise<void>,
  delayMs = 4_000,
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.continue().catch(() => {});
  });
  void triggerSave().catch(() => {});
  await page.waitForTimeout(800);
  await page.reload().catch(() => {});
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForTimeout(3_000);
  await page.unroute(urlPattern);
}
