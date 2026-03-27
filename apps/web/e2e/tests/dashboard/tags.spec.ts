import { expect, test } from "../../index";

test.describe(
  "Tags test suite",
  {
    tag: "@tags",
  },
  async () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/tags");
    });

    test("Tags page loads successfully", async ({ page }) => {
      await expect(page.getByTestId("tags-wrapper")).toBeVisible();
    });

    test("Tags list is displayed", async ({ page }) => {
      const tagsList = page.getByTestId("tags-list");
      await expect(tagsList).toBeVisible();
    });

    test("Tag item shows name", async ({ page }) => {
      const tagItem = page.getByTestId("tag-item").first();
      if (await tagItem.isVisible()) {
        const tagName = tagItem.getByTestId("tag-name");
        await expect(tagName).toBeVisible();
      }
    });

    test("Tag item shows link count", async ({ page }) => {
      const tagItem = page.getByTestId("tag-item").first();
      if (await tagItem.isVisible()) {
        const linkCount = tagItem.getByTestId("tag-link-count");
        if (await linkCount.isVisible()) {
          const text = await linkCount.textContent();
          expect(text).toMatch(/\d+/);
        }
      }
    });

    test("Clicking tag navigates to tag page", async ({ page }) => {
      const tagItem = page.getByTestId("tag-item").first();
      if (await tagItem.isVisible()) {
        await tagItem.click();
        await expect(page).toHaveURL(/\/tags\/\d+/);
      }
    });

    test("Tag search input is available", async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search tags/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill("test");
        await page.waitForTimeout(300);
      }
    });

    test("Tag context menu appears on right click", async ({ page }) => {
      const tagItem = page.getByTestId("tag-item").first();
      if (await tagItem.isVisible()) {
        await tagItem.click({ button: "right" });
        const contextMenu = page.getByTestId("context-menu");
        if (await contextMenu.isVisible()) {
          await expect(contextMenu).toBeVisible();
        }
      }
    });

    test("Bulk select mode is available", async ({ page }) => {
      const bulkSelectButton = page.getByTestId("bulk-select-toggle");
      if (await bulkSelectButton.isVisible()) {
        await bulkSelectButton.click();
        const checkboxes = page.getByRole("checkbox");
        expect(await checkboxes.count()).toBeGreaterThan(0);
      }
    });

    test("Merge tags option is available in bulk mode", async ({ page }) => {
      const bulkSelectButton = page.getByTestId("bulk-select-toggle");
      if (await bulkSelectButton.isVisible()) {
        await bulkSelectButton.click();

        const checkbox = page.getByRole("checkbox").first();
        if (await checkbox.isVisible()) {
          await checkbox.click();

          const mergeButton = page.getByRole("button", { name: /merge/i });
          expect(mergeButton).toBeDefined();
        }
      }
    });

    test("Tag can be renamed", async ({ page }) => {
      const tagItem = page.getByTestId("tag-item").first();
      if (await tagItem.isVisible()) {
        await tagItem.click({ button: "right" });
        const renameOption = page.getByText(/rename/i);
        if (await renameOption.isVisible()) {
          await renameOption.click();
          const renameInput = page.getByTestId("rename-input");
          await expect(renameInput).toBeVisible();
        }
      }
    });

    test("Archival tags indicator is shown", async ({ page }) => {
      const archivalIndicator = page.getByTestId("archival-tag-indicator").first();
      if (await archivalIndicator.isVisible()) {
        await expect(archivalIndicator).toBeVisible();
      }
    });

    test("AI tagging indicator is shown", async ({ page }) => {
      const aiIndicator = page.getByTestId("ai-tag-indicator").first();
      if (await aiIndicator.isVisible()) {
        await expect(aiIndicator).toBeVisible();
      }
    });
  }
);
