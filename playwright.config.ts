import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "3100";
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-safari", use: { ...devices["iPhone SE"] } },
  ],
  webServer: {
    command: `next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
  },
});
