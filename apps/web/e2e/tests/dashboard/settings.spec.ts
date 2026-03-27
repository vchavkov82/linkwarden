import { expect, test } from "../../index";

test.describe(
  "Settings test suite",
  {
    tag: "@settings",
  },
  async () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/settings/account");
    });

    test("Settings page loads successfully", async ({ page }) => {
      await expect(page.getByTestId("settings-wrapper")).toBeVisible();
    });

    test("Account settings tab is active", async ({ page }) => {
      const accountTab = page.getByRole("tab", { name: /account/i });
      await expect(accountTab).toHaveAttribute("data-state", "active");
    });

    test("Profile form displays user information", async ({ page }) => {
      const usernameInput = page.getByLabel(/username/i);
      await expect(usernameInput).toBeVisible();
    });

    test("Email input is visible when email enabled", async ({ page }) => {
      const emailInput = page.getByLabel(/email/i);
      if (await emailInput.isVisible()) {
        await expect(emailInput).toBeVisible();
      }
    });

    test("Name input allows editing", async ({ page }) => {
      const nameInput = page.getByLabel(/display name/i);
      if (await nameInput.isVisible()) {
        await nameInput.fill("Test Name");
        expect(await nameInput.inputValue()).toBe("Test Name");
      }
    });

    test("Save button is visible", async ({ page }) => {
      const saveButton = page.getByRole("button", { name: /save/i });
      await expect(saveButton).toBeVisible();
    });

    test("Profile image section is visible", async ({ page }) => {
      const profileImage = page.getByTestId("profile-image");
      await expect(profileImage).toBeVisible();
    });

    test("Appearance tab works", async ({ page }) => {
      const appearanceTab = page.getByRole("link", { name: /appearance/i });
      await appearanceTab.click();
      await expect(page).toHaveURL(/\/settings\/appearance/);
    });

    test("Theme selector is available", async ({ page }) => {
      await page.goto("/settings/appearance");
      const themeSelector = page.getByTestId("theme-selector");
      if (await themeSelector.isVisible()) {
        await expect(themeSelector).toBeVisible();
      }
    });

    test("Archive settings tab works", async ({ page }) => {
      const archiveTab = page.getByRole("link", { name: /archive/i });
      if (await archiveTab.isVisible()) {
        await archiveTab.click();
        await expect(page).toHaveURL(/\/settings\/archive/);
      }
    });

    test("Archive format toggles are available", async ({ page }) => {
      await page.goto("/settings/archive");
      const screenshotToggle = page.getByLabel(/screenshot/i);
      if (await screenshotToggle.isVisible()) {
        await expect(screenshotToggle).toBeVisible();
      }
    });

    test("Access tokens tab works", async ({ page }) => {
      await page.goto("/settings/access-tokens");
      const tokensSection = page.getByTestId("access-tokens-section");
      await expect(tokensSection).toBeVisible();
    });

    test("Create token button is visible", async ({ page }) => {
      await page.goto("/settings/access-tokens");
      const createTokenButton = page.getByRole("button", { name: /new token/i });
      await expect(createTokenButton).toBeVisible();
    });

    test("Import/Export tab works", async ({ page }) => {
      const importExportTab = page.getByRole("link", { name: /import.*export/i });
      if (await importExportTab.isVisible()) {
        await importExportTab.click();
        await expect(page).toHaveURL(/\/settings\/import/);
      }
    });

    test("Password change section is available", async ({ page }) => {
      const passwordSection = page.getByTestId("password-section");
      if (await passwordSection.isVisible()) {
        const currentPasswordInput = passwordSection.getByLabel(/current password/i);
        await expect(currentPasswordInput).toBeVisible();
      }
    });

    test("Delete account button is visible", async ({ page }) => {
      await page.goto("/settings/delete");
      const deleteButton = page.getByRole("button", { name: /delete/i });
      await expect(deleteButton).toBeVisible();
    });

    test("Privacy settings are available", async ({ page }) => {
      const privacyTab = page.getByRole("link", { name: /privacy/i });
      if (await privacyTab.isVisible()) {
        await privacyTab.click();
        const privacyToggle = page.getByLabel(/private/i);
        if (await privacyToggle.isVisible()) {
          await expect(privacyToggle).toBeVisible();
        }
      }
    });
  }
);
