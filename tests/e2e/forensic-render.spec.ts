import { test, expect } from "@playwright/test";

test.describe("Forensic Live Preview Render & Browser Runtime Verification", () => {
  test("1. Forensic Browser Boot: React mounts, boot marker transitions, and root element renders", async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("requestfailed", (req) => {
      failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    // Navigate to root
    const response = await page.goto("/", { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);

    // 1. Verify HTML Document Loaded
    const title = await page.title();
    expect(title).toContain("OmniSync");

    // 2. Verify window.__OMNISYNC_BOOT__ diagnostic state
    const bootState = await page.evaluate(() => window.__OMNISYNC_BOOT__);
    expect(bootState).toBeDefined();
    expect(bootState?.htmlLoaded).toBe(true);
    expect(bootState?.reactStarted).toBe(true);
    expect(bootState?.reactMounted).toBe(true);
    expect(bootState?.error).toBeNull();

    // 3. Verify the zero-dependency #boot-status element has transitioned out
    const bootStatusCount = await page.locator("#boot-status").count();
    expect(bootStatusCount).toBe(0);

    // 4. Verify #root is populated with actual application DOM
    const rootHtml = await page.locator("#root").innerHTML();
    expect(rootHtml.length).toBeGreaterThan(100);

    // 5. Inspect computed styles of #root to guarantee visibility
    const rootStyles = await page.evaluate(() => {
      const el = document.getElementById("root");
      if (!el) return null;
      const s = window.getComputedStyle(el);
      return {
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity,
        height: el.offsetHeight,
        width: el.offsetWidth,
      };
    });
    expect(rootStyles).not.toBeNull();
    expect(rootStyles?.display).not.toBe("none");
    expect(rootStyles?.visibility).not.toBe("hidden");
    expect(Number(rootStyles?.opacity)).toBeGreaterThan(0);
    expect(rootStyles?.height).toBeGreaterThan(0);
    expect(rootStyles?.width).toBeGreaterThan(0);

    // 6. Verify zero fatal module/CSP console errors
    const fatalErrors = consoleErrors.filter(
      (err) =>
        err.includes("SyntaxError") ||
        err.includes("Failed to fetch dynamically imported module") ||
        err.includes("Unexpected token") ||
        err.includes("Refused to execute script") ||
        err.includes("violates the following Content Security Policy")
    );
    expect(fatalErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });

  test("2. Iframe Context Simulation: Renders inside sandboxed iframe without frameguard blockage", async ({ page }) => {
    // Embed the app inside a dynamically constructed iframe on a host page
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>AI Studio Preview Frame Simulator</title></head>
        <body style="margin:0;padding:0;">
          <iframe id="preview-iframe" src="/" style="width:100vw;height:100vh;border:none;"></iframe>
        </body>
      </html>
    `);

    const frameElement = page.frameLocator("#preview-iframe");
    await frameElement.locator("#root").waitFor({ state: "visible", timeout: 10000 });

    // Verify main brand header renders inside the iframe
    const header = frameElement.locator("header").first();
    await expect(header).toBeVisible();

    // Verify iframe innerHTML has substantial DOM
    const frameHtml = await frameElement.locator("#root").innerHTML();
    expect(frameHtml.length).toBeGreaterThan(100);
  });

  test("3. API Failure Resilience: App renders cleanly even if API is unreachable", async ({ page }) => {
    // Intercept API routes and force 500 error
    await page.route("**/api/**", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Simulated Backend Downtime" }),
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Verify UI still renders with fallback sandbox state
    await page.locator("#root").waitFor({ state: "visible" });
    const rootHtml = await page.locator("#root").innerHTML();
    expect(rootHtml.length).toBeGreaterThan(100);

    const brand = page.locator("header").locator("text=/OmniSync/i").first();
    await expect(brand).toBeVisible();
  });
});
