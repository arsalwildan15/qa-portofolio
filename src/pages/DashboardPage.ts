import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly userDropdown: Locator;
  readonly sidebarMenu: Locator;

  constructor(page: Page) {
    super(page);
    this.userDropdown = page.locator('.oxd-userdropdown-tab');
    this.sidebarMenu = page.locator('.oxd-sidepanel');
  }

  navItem(name: string): Locator {
    return this.page.getByRole('link', { name });
  }
}
