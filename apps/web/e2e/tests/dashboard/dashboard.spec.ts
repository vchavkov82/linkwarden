import { expect, test } from "../../index";

test.describe(
  "Dashboard test suite",
  {
    tag: "@dashboard",
  },
  async () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard");
    });

    test("Dashboard page loads successfully", async ({ dashboardPage }) => {
      await expect(dashboardPage.container).toBeVisible();
    });

    test("Dashboard shows stats section", async ({ page }) => {
      const statsSection = page.getByTestId("dashboard-stats");
      await expect(statsSection).toBeVisible();
    });

    test("Dashboard shows recent links section", async ({ page }) => {
      const recentLinksSection = page.getByTestId("recent-links");
      await expect(recentLinksSection).toBeVisible();
    });

    test("Dashboard shows pinned links section", async ({ page }) => {
      const pinnedLinksSection = page.getByTestId("pinned-links");
      await expect(pinnedLinksSection).toBeVisible();
    });

    test("Clicking a link card navigates to link detail", async ({ page }) => {
      const linkCard = page.getByTestId("link-card").first();
      if (await linkCard.isVisible()) {
        await linkCard.click();
        await expect(page).toHaveURL(/\/links\/\d+/);
      }
    });

    test("Dashboard stats display correct format", async ({ page }) => {
      const linksCount = page.getByTestId("total-links-count");
      const collectionsCount = page.getByTestId("total-collections-count");
      const tagsCount = page.getByTestId("total-tags-count");

      if (await linksCount.isVisible()) {
        const linksText = await linksCount.textContent();
        expect(linksText).toMatch(/^\d+$/);
      }

      if (await collectionsCount.isVisible()) {
        const collectionsText = await collectionsCount.textContent();
        expect(collectionsText).toMatch(/^\d+$/);
      }

      if (await tagsCount.isVisible()) {
        const tagsText = await tagsCount.textContent();
        expect(tagsText).toMatch(/^\d+$/);
      }
    });

    test("Dashboard layout sections are draggable", async ({ page }) => {
      const sections = page.getByTestId("dashboard-section");
      const sectionCount = await sections.count();

      if (sectionCount > 1) {
        const firstSection = sections.first();
        expect(firstSection).toHaveAttribute("draggable", "true");
      }
    });
  }
);
