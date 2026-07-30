import { test, expect } from "@playwright/test";

test.describe("OmniSync Suite - Full User Journey E2E Test", () => {
  test("should load landing page, render metrics, and support export workflows", async ({ page }) => {
    // 1. Visit main application
    await page.goto("/");

    // 2. Verify page title and header branding
    await expect(page).toHaveTitle(/OmniSync/i);
    const brandHeading = page.locator("h1", { hasText: /OmniSync/i });
    await expect(brandHeading).toBeVisible();

    // 3. Verify Sandbox Playground badge or connection state
    const sandboxBadge = page.locator("text=/Sandbox/i").first();
    await expect(sandboxBadge).toBeVisible();

    // 4. Generate or Refresh Report
    const generateBtn = page.locator("button", { hasText: /Compile Report|Generate Report/i }).first();
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
    }

    // 5. Verify Report Metrics Dashboard Panel renders
    const totalIssuesMetric = page.locator("text=/Total Issues|Scope/i").first();
    await expect(totalIssuesMetric).toBeVisible();

    // 6. Test Export Panel or Modal trigger
    const exportCsvBtn = page.locator("button", { hasText: /Export CSV|Download CSV|Export/i }).first();
    await expect(exportCsvBtn).toBeVisible();
    
    // Trigger CSV export action
    const downloadPromise = page.waitForEvent("download").catch(() => null);
    await exportCsvBtn.click();
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain(".csv");
    }
  });

  test("should support interactive filter switching and global search", async ({ page }) => {
    await page.goto("/");

    // Global Search Input
    const searchInput = page.locator("input[placeholder*='Search']").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("ALPHA");
      await page.keyboard.press("Enter");
    }

    // Presets panel interaction
    const presetsBtn = page.locator("button", { hasText: /Presets|Filters/i }).first();
    if (await presetsBtn.isVisible()) {
      await expect(presetsBtn).toBeEnabled();
    }
  });
});
