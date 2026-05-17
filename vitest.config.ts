import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/web/test-setup.ts",
        "src/web/main.tsx",
        "src/db/migrate-cli.ts",
        "src/index.ts",
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/web/**"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "web",
          include: ["src/web/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["./src/web/test-setup.ts"],
          globals: false,
        },
      },
    ],
  },
});
