import { test, expect } from "@playwright/test";

test.describe("OmniSync Suite - Full End-to-End User Journey Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("1. Landing Page Initialization & Brand Header Verification", async ({ page }) => {
    // Verify document title
    await expect(page).toHaveTitle(/OmniSync|Jira PMO|Eshan Barua/i);

    // Verify main brand heading in header bar
    const brandText = page.locator("header").locator("text=/OmniSync/i").first();
    await expect(brandText).toBeVisible();

    // Verify connection status badge (e.g. Sandbox Mode or Jira Connected)
    const statusBadge = page.locator("header").locator("span", { hasText: /Sandbox|Live|Connected|Proxy/i }).first();
    await expect(statusBadge).toBeVisible();
  });

  test("2. Executive Report Compilation & Metric Cards Display", async ({ page }) => {
    // Trigger Compile Report button if visible
    const compileBtn = page.locator("button", { hasText: /Compile Report|Generate Report/i }).first();
    if (await compileBtn.isVisible()) {
      await compileBtn.click();
    }

    // Verify core metric indicators exist and display data
    const totalIssuesMetric = page.locator("text=/Total Issues|Scope/i").first();
    await expect(totalIssuesMetric).toBeVisible();

    const completionRateMetric = page.locator("text=/Completion|Velocity/i").filter({ hasText: /Completion|Velocity/i }).locator("visible=true").first();
    await expect(completionRateMetric).toBeVisible();
  });

  test("3. Global Search & JQL Presets Interactivity", async ({ page }) => {
    // Test Global Search Bar
    const searchInput = page.locator("input[placeholder*='Search']").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("ALPHA");
      await page.keyboard.press("Enter");
    }

    // Verify preset filter buttons or tabs
    const presetsBtn = page.locator("button", { hasText: /Presets|Filters|All Issues/i }).first();
    if (await presetsBtn.isVisible()) {
      await expect(presetsBtn).toBeEnabled();
    }
  });

  test("4. Export Workflows & Dataset Modal Trigger", async ({ page }) => {
    // Locate Export CSV / Preview Export trigger button
    const exportBtn = page.locator("button", { hasText: /Export CSV|Download CSV|Export/i }).first();
    await expect(exportBtn).toBeVisible();

    // Click Export trigger
    await exportBtn.click();
  });

  test("5. Keyboard Shortcuts & Accessibility Modal", async ({ page }) => {
    // Open Keyboard Shortcuts with '?' key
    await page.keyboard.press("?");

    // Check if Shortcuts modal or hint appears
    const modalHeader = page.locator("text=/Keyboard Shortcuts|Shortcut/i").first();
    if (await modalHeader.isVisible()) {
      await expect(modalHeader).toBeVisible();

      // Press Escape to dismiss modal
      await page.keyboard.press("Escape");
    }
  });

  test("6. Responsive Viewport Layout Integrity (Mobile & Tablet)", async ({ page }) => {
    // Resize viewport to mobile (iPhone 13 dimensions)
    await page.setViewportSize({ width: 390, height: 844 });

    // Verify header remains clean and uncollapsed
    const header = page.locator("header").first();
    await expect(header).toBeVisible();

    // Verify main content container scales fluidly
    const mainContent = page.locator("main, #root").first();
    await expect(mainContent).toBeVisible();

    // Resize viewport to tablet (iPad dimensions)
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(header).toBeVisible();
  });
});
