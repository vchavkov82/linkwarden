import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base/page";

export class LinksPage extends BasePage {
  container: Locator;
  addLinkButton: Locator;
  linkInput: Locator;
  submitButton: Locator;
  linkCards: Locator;
  searchInput: Locator;
  sortDropdown: Locator;
  viewToggle: Locator;

  constructor(page: Page) {
    super(page);
    this.container = this.page.getByTestId("links-container");
    this.addLinkButton = this.page.getByTestId("add-link-button");
    this.linkInput = this.page.getByTestId("link-url-input");
    this.submitButton = this.page.getByTestId("submit-link-button");
    this.linkCards = this.page.getByTestId("link-card");
    this.searchInput = this.page.getByTestId("search-input");
    this.sortDropdown = this.page.getByTestId("sort-dropdown");
    this.viewToggle = this.page.getByTestId("view-toggle");
  }

  async navigateToLinks() {
    await this.page.goto("/links");
  }

  async addLink(url: string) {
    await this.addLinkButton.click();
    await this.linkInput.fill(url);
    await this.submitButton.click();
  }

  async searchLinks(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press("Enter");
  }

  async getLinkCount() {
    return this.linkCards.count();
  }

  async getLinkByTitle(title: string) {
    return this.page.getByTestId("link-card").filter({ hasText: title });
  }
}
