import { beforeAll, afterAll, vi } from "vitest";

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = "test-secret-for-vitest";
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
});

afterAll(() => {
  vi.restoreAllMocks();
});
