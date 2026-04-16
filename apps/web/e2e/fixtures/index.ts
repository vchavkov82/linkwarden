import { test as baseTest } from "@playwright/test";
import { LoginPage } from "./login-page";
import { RegistrationPage } from "./registration-page";
import { DashboardPage } from "./base/dashboard-page";
import { LinksPage } from "./links-page";
import { CollectionsPage } from "./collections-page";
import { Sidebar } from "./sidebar";

export const test = baseTest.extend<{
  dashboardPage: DashboardPage;
  loginPage: LoginPage;
  registrationPage: RegistrationPage;
  linksPage: LinksPage;
  collectionsPage: CollectionsPage;
  sidebar: Sidebar;
}>({
  page: async ({ page }, use) => {
    await page.goto("/");
    use(page);
  },
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
  registrationPage: async ({ page }, use) => {
    const registrationPage = new RegistrationPage(page);
    await use(registrationPage);
  },
  linksPage: async ({ page }, use) => {
    const linksPage = new LinksPage(page);
    await use(linksPage);
  },
  collectionsPage: async ({ page }, use) => {
    const collectionsPage = new CollectionsPage(page);
    await use(collectionsPage);
  },
  sidebar: async ({ page }, use) => {
    const sidebar = new Sidebar(page);
    await use(sidebar);
  },
});
