import { type Page } from '@playwright/test';

/**
 * Sidebar Search box (top of the main menu). Behaviour confirmed LIVE 2026-11-16:
 * the box filters the module list in the browser (no request is sent), matching a
 * case-insensitive substring of the MODULE names only (sub-menus such as "Leave List" are not
 * searched); a query with no match leaves the menu empty without any "no results" text.
 */
export const sidebarSearchBox = (page: Page) => page.locator('.oxd-sidepanel').getByPlaceholder('Search');
export const sidebarItems = (page: Page) => page.locator('.oxd-main-menu-item');

/** Types `query` and returns the module names left in the menu once the list has re-rendered. */
export async function searchSidebar(page: Page, query: string): Promise<string[]> {
  await sidebarSearchBox(page).fill(query);
  // The filter is a synchronous re-render; one animation frame is enough for the DOM to settle.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  return (await sidebarItems(page).allInnerTexts()).map((t) => t.trim());
}

/** What the filter is expected to show for `query`, derived from the full module list. */
export const expectedMatches = (all: string[], query: string) =>
  all.filter((m) => m.toLowerCase().includes(query.toLowerCase()));
