import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "**/*.test.ts",
        "**/e2e/**",
        "**/*.config.*",
      ],
    },
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/web"),
      "@linkwarden/lib": path.resolve(__dirname, "./packages/lib"),
      "@linkwarden/types": path.resolve(__dirname, "./packages/types"),
      "@linkwarden/prisma": path.resolve(__dirname, "./packages/prisma"),
    },
  },
});
