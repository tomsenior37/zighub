import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
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
