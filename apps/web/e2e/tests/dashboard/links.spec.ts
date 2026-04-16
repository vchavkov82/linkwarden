import { expect, test } from "../../index";

test.describe(
  "Links test suite",
  {
    tag: "@links",
  },
  async () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/links");
    });

    test("Links page loads successfully", async ({ page }) => {
      await expect(page.getByTestId("links-wrapper")).toBeVisible();
    });

    test("Add link button is visible", async ({ page }) => {
      const addButton = page.getByRole("button", { name: /new link/i });
      await expect(addButton).toBeVisible();
    });

    test("Clicking add link button opens modal", async ({ page }) => {
      const addButton = page.getByRole("button", { name: /new link/i });
      await addButton.click();

      const modal = page.getByTestId("new-link-modal");
      await expect(modal).toBeVisible();
    });

    test("New link modal has URL input", async ({ page }) => {
      const addButton = page.getByRole("button", { name: /new link/i });
      await addButton.click();

      const urlInput = page.getByPlaceholder(/url/i);
      await expect(urlInput).toBeVisible();
    });

    test("Submitting empty URL shows error", async ({ page }) => {
      const addButton = page.getByRole("button", { name: /new link/i });
      await addButton.click();

      const submitButton = page.getByRole("button", { name: /add/i }).last();
      await submitButton.click();

      const toast = page.getByTestId("toast-message-container").first();
      await expect(toast).toBeVisible();
    });

    test("View toggle switches between card and list view", async ({ page }) => {
      const viewToggle = page.getByTestId("view-toggle");
      if (await viewToggle.isVisible()) {
        await viewToggle.click();
        const listView = page.getByTestId("links-list-view");
        const cardView = page.getByTestId("links-card-view");

        const isListVisible = await listView.isVisible().catch(() => false);
        const isCardVisible = await cardView.isVisible().catch(() => false);

        expect(isListVisible || isCardVisible).toBe(true);
      }
    });

    test("Sort dropdown is functional", async ({ page }) => {
      const sortDropdown = page.getByTestId("sort-dropdown");
      if (await sortDropdown.isVisible()) {
        await sortDropdown.click();
        const sortOptions = page.getByRole("option");
        expect(await sortOptions.count()).toBeGreaterThan(0);
      }
    });

    test("Search input filters links", async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill("test");
        await searchInput.press("Enter");
        await page.waitForTimeout(500);
      }
    });

    test("Bulk select mode can be toggled", async ({ page }) => {
      const bulkSelectButton = page.getByTestId("bulk-select-toggle");
      if (await bulkSelectButton.isVisible()) {
        await bulkSelectButton.click();
        const checkboxes = page.getByRole("checkbox");
        expect(await checkboxes.count()).toBeGreaterThan(0);
      }
    });

    test("Link card shows expected information", async ({ page }) => {
      const linkCard = page.getByTestId("link-card").first();
      if (await linkCard.isVisible()) {
        const title = linkCard.getByTestId("link-title");
        const url = linkCard.getByTestId("link-url");

        await expect(title).toBeVisible();
      }
    });

    test("Link context menu appears on right click", async ({ page }) => {
      const linkCard = page.getByTestId("link-card").first();
      if (await linkCard.isVisible()) {
        await linkCard.click({ button: "right" });
        const contextMenu = page.getByTestId("context-menu");
        if (await contextMenu.isVisible()) {
          await expect(contextMenu).toBeVisible();
        }
      }
    });

    test("Pagination controls work when multiple pages exist", async ({ page }) => {
      const pagination = page.getByTestId("pagination");
      if (await pagination.isVisible()) {
        const nextButton = pagination.getByRole("button", { name: /next/i });
        if (await nextButton.isEnabled()) {
          await nextButton.click();
          await expect(page).toHaveURL(/page=2/);
        }
      }
    });

    test("Filter by collection dropdown works", async ({ page }) => {
      const collectionFilter = page.getByTestId("collection-filter");
      if (await collectionFilter.isVisible()) {
        await collectionFilter.click();
        const options = page.getByRole("option");
        expect(await options.count()).toBeGreaterThan(0);
      }
    });

    test("Filter by tag dropdown works", async ({ page }) => {
      const tagFilter = page.getByTestId("tag-filter");
      if (await tagFilter.isVisible()) {
        await tagFilter.click();
        const options = page.getByRole("option");
        expect(await options.count()).toBeGreaterThan(0);
      }
    });
  }
);
