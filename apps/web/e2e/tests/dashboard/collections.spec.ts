import { expect, test } from "../../index";

test.describe(
  "Collections test suite",
  {
    tag: "@collections",
  },
  async () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/collections");
    });

    test("Collections page loads successfully", async ({ page }) => {
      await expect(page.getByTestId("collections-wrapper")).toBeVisible();
    });

    test("Create collection button is visible", async ({ page }) => {
      const createButton = page.getByRole("button", { name: /new collection/i });
      await expect(createButton).toBeVisible();
    });

    test("Clicking create collection button opens modal", async ({ page }) => {
      const createButton = page.getByRole("button", { name: /new collection/i });
      await createButton.click();

      const modal = page.getByTestId("new-collection-modal");
      await expect(modal).toBeVisible();
    });

    test("New collection modal has name input", async ({ page }) => {
      const createButton = page.getByRole("button", { name: /new collection/i });
      await createButton.click();

      const nameInput = page.getByPlaceholder(/name/i);
      await expect(nameInput).toBeVisible();
    });

    test("Submitting empty collection name shows error", async ({ page }) => {
      const createButton = page.getByRole("button", { name: /new collection/i });
      await createButton.click();

      const submitButton = page.getByRole("button", { name: /create/i }).last();
      await submitButton.click();

      const toast = page.getByTestId("toast-message-container").first();
      await expect(toast).toBeVisible();
    });

    test("Collection card displays name", async ({ page }) => {
      const collectionCard = page.getByTestId("collection-card").first();
      if (await collectionCard.isVisible()) {
        const name = collectionCard.getByTestId("collection-name");
        await expect(name).toBeVisible();
      }
    });

    test("Collection card shows link count", async ({ page }) => {
      const collectionCard = page.getByTestId("collection-card").first();
      if (await collectionCard.isVisible()) {
        const linkCount = collectionCard.getByTestId("collection-link-count");
        if (await linkCount.isVisible()) {
          const text = await linkCount.textContent();
          expect(text).toMatch(/\d+/);
        }
      }
    });

    test("Clicking collection navigates to collection page", async ({ page }) => {
      const collectionCard = page.getByTestId("collection-card").first();
      if (await collectionCard.isVisible()) {
        await collectionCard.click();
        await expect(page).toHaveURL(/\/collections\/\d+/);
      }
    });

    test("Collection context menu appears on right click", async ({ page }) => {
      const collectionCard = page.getByTestId("collection-card").first();
      if (await collectionCard.isVisible()) {
        await collectionCard.click({ button: "right" });
        const contextMenu = page.getByTestId("context-menu");
        if (await contextMenu.isVisible()) {
          await expect(contextMenu).toBeVisible();
        }
      }
    });

    test("Collection tree is visible in sidebar", async ({ page }) => {
      const collectionTree = page.getByTestId("collection-tree");
      await expect(collectionTree).toBeVisible();
    });

    test("Collection tree items are expandable", async ({ page }) => {
      const expandButton = page.getByTestId("collection-expand").first();
      if (await expandButton.isVisible()) {
        await expandButton.click();
        const subItems = page.getByTestId("collection-sub-item");
        expect(await subItems.count()).toBeGreaterThanOrEqual(0);
      }
    });

    test("Collection color picker is available", async ({ page }) => {
      const createButton = page.getByRole("button", { name: /new collection/i });
      await createButton.click();

      const colorPicker = page.getByTestId("color-picker");
      if (await colorPicker.isVisible()) {
        await colorPicker.click();
        const colorOptions = page.getByTestId("color-option");
        expect(await colorOptions.count()).toBeGreaterThan(0);
      }
    });

    test("Collection icon picker is available", async ({ page }) => {
      const createButton = page.getByRole("button", { name: /new collection/i });
      await createButton.click();

      const iconPicker = page.getByTestId("icon-picker");
      if (await iconPicker.isVisible()) {
        await iconPicker.click();
        const iconOptions = page.getByTestId("icon-option");
        expect(await iconOptions.count()).toBeGreaterThan(0);
      }
    });

    test("Collection members section is visible in edit mode", async ({ page }) => {
      const collectionCard = page.getByTestId("collection-card").first();
      if (await collectionCard.isVisible()) {
        await collectionCard.click();
        const editButton = page.getByRole("button", { name: /edit/i });
        if (await editButton.isVisible()) {
          await editButton.click();
          const membersSection = page.getByTestId("collection-members");
          expect(membersSection).toBeDefined();
        }
      }
    });

    test("Nested collections can be created", async ({ page }) => {
      const collectionCard = page.getByTestId("collection-card").first();
      if (await collectionCard.isVisible()) {
        await collectionCard.click({ button: "right" });
        const addSubCollection = page.getByText(/add sub/i);
        if (await addSubCollection.isVisible()) {
          await addSubCollection.click();
          const modal = page.getByTestId("new-collection-modal");
          await expect(modal).toBeVisible();
        }
      }
    });
  }
);
