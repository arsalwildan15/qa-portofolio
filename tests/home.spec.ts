import { test, expect } from '@playwright/test';
import { HomePage } from './pages/home.page';

test.describe('Home page', () => {
  test('should load successfully', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(home.heading).toBeVisible();
  });
});
