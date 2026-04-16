import { Locator, Page } from "@playwright/test";
import { BasePage } from "./base/page";

export class CollectionsPage extends BasePage {
  container: Locator;
  collectionList: Locator;
  createCollectionButton: Locator;
  collectionNameInput: Locator;
  collectionDescriptionInput: Locator;
  submitButton: Locator;
  collectionItems: Locator;

  constructor(page: Page) {
    super(page);
    this.container = this.page.getByTestId("collections-container");
    this.collectionList = this.page.getByTestId("collection-list");
    this.createCollectionButton = this.page.getByTestId("create-collection-button");
    this.collectionNameInput = this.page.getByTestId("collection-name-input");
    this.collectionDescriptionInput = this.page.getByTestId("collection-description-input");
    this.submitButton = this.page.getByTestId("submit-collection-button");
    this.collectionItems = this.page.getByTestId("collection-item");
  }

  async navigateToCollections() {
    await this.page.goto("/collections");
  }

  async createCollection(name: string, description?: string) {
    await this.createCollectionButton.click();
    await this.collectionNameInput.fill(name);
    if (description) {
      await this.collectionDescriptionInput.fill(description);
    }
    await this.submitButton.click();
  }

  async getCollectionCount() {
    return this.collectionItems.count();
  }

  async getCollectionByName(name: string) {
    return this.collectionItems.filter({ hasText: name });
  }
}
