import { beforeAll, afterAll, vi } from "vitest";

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = "test-secret-for-vitest";
  // DATABASE_URL is only set for DB integration tests via RUN_INTEGRATION_TESTS (see importFromHTMLFile.test.ts).
});

afterAll(() => {
  vi.restoreAllMocks();
});
