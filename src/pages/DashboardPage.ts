import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly userDropdown: Locator;
  readonly sidebarMenu: Locator;
  readonly heading: Locator;
  readonly logoutMenuItem: Locator;

  constructor(page: Page) {
    super(page);
    this.userDropdown = page.locator('.oxd-userdropdown-tab');
    this.sidebarMenu = page.locator('.oxd-sidepanel');
    this.heading = page.getByRole('heading', { name: 'Dashboard' });
    this.logoutMenuItem = page.getByRole('menuitem', { name: 'Logout' });
  }

  navItem(name: string): Locator {
    return this.page.getByRole('link', { name });
  }

  async logout(): Promise<void> {
    await this.userDropdown.click();
    await this.logoutMenuItem.click();
  }
}
