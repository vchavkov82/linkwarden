import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base/page";

export class Sidebar extends BasePage {
  container: Locator;
  dashboardLink: Locator;
  linksLink: Locator;
  collectionsLink: Locator;
  tagsLink: Locator;
  settingsLink: Locator;
  userMenu: Locator;
  logoutButton: Locator;
  collectionTree: Locator;

  constructor(page: Page) {
    super(page);
    this.container = this.page.getByTestId("sidebar");
    this.dashboardLink = this.page.getByTestId("sidebar-dashboard");
    this.linksLink = this.page.getByTestId("sidebar-links");
    this.collectionsLink = this.page.getByTestId("sidebar-collections");
    this.tagsLink = this.page.getByTestId("sidebar-tags");
    this.settingsLink = this.page.getByTestId("sidebar-settings");
    this.userMenu = this.page.getByTestId("user-menu");
    this.logoutButton = this.page.getByTestId("logout-button");
    this.collectionTree = this.page.getByTestId("collection-tree");
  }

  async navigateToDashboard() {
    await this.dashboardLink.click();
  }

  async navigateToLinks() {
    await this.linksLink.click();
  }

  async navigateToCollections() {
    await this.collectionsLink.click();
  }

  async navigateToTags() {
    await this.tagsLink.click();
  }

  async navigateToSettings() {
    await this.settingsLink.click();
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
  }
}
