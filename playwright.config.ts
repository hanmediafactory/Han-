import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/mobile",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3101", browserName: "chromium" },
  webServer: {
    command: "node tests/mobile-server.mjs",
    url: "http://127.0.0.1:3101/api/health",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
