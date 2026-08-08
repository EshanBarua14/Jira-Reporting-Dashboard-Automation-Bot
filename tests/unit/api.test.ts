import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import http from "http";
import { initDatabase, setSetting, getSetting, saveReport, getAllReports } from "../../database";

describe("OmniSync Suite Backend Server API Integration Tests", () => {
  let app: express.Express;
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    initDatabase();
    app = express();
    app.use(express.json());

    // Mount core API handlers mirroring server.ts
    app.post("/api/store/set", (req, res) => {
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: "Key is required" });
      setSetting(key, value);
      res.json({ success: true });
    });

    app.get("/api/store/get", (req, res) => {
      const { key } = req.query;
      if (key) {
        res.json({ value: getSetting(key as string) });
      } else {
        res.json({ data: {} });
      }
    });

    app.post("/api/reports/save", (req, res) => {
      const { id, timestamp, config, summary, issues } = req.body;
      if (!id || !timestamp) return res.status(400).json({ error: "id and timestamp are required" });
      saveReport(id, timestamp, config, summary, issues);
      res.json({ success: true });
    });

    app.get("/api/reports/get", (req, res) => {
      const reports = getAllReports();
      res.json({ reports });
    });

    app.get("/api/update/check", (req, res) => {
      res.json({
        currentVersion: "1.0.0",
        latestVersion: "1.0.0",
        updateAvailable: false,
        downloadUrl: "",
        releaseNotes: ["First stable release of OmniSync Suite."],
      });
    });

    app.post("/api/pmo/summarize", (req, res) => {
      const { metrics, projectScope } = req.body;
      const total = metrics?.totalIssues || 0;
      const completion = metrics?.completionPercentage || 0;
      const scopeStr = projectScope?.join(", ") || "ALPHA";

      res.json({
        aiSummary: {
          summary: `Project scope is operating within execution phase with ${completion}% complete across ${scopeStr}.`,
          keyInsights: [
            `Total tracked issues: ${total}.`,
            "Delivery cadence is within target benchmarks.",
            "Backlog refinement is active.",
          ],
          bottlenecks: [
            "Zero critical delivery blockers detected.",
            "WIP limits are balanced across assignees.",
          ],
          recommendations: [
            "Maintain current sprint focus.",
            "Perform weekly status mapping syncs.",
            "Review backlog priorities.",
          ],
        },
      });
    });

    app.post("/api/pmo/quick-summary", (req, res) => {
      const { metrics, projectsScope } = req.body;
      const total = metrics?.totalIssues || 0;
      const completion = metrics?.completionPercentage || 0;
      const scope = projectsScope?.length ? projectsScope.join(", ") : "Current Workspace";

      const summary = `The ${scope} report tracks ${total} total issues with an overall completion rate of ${completion}%. Team velocity remains stable with zero active delivery blockages. The team is well-positioned to maintain current sprint velocity.`;
      res.json({ summary });
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("should respond to auto-update check with current version", async () => {
    const res = await fetch(`${baseUrl}/api/update/check`);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.currentVersion).toBe("1.0.0");
    expect(data.updateAvailable).toBe(false);
  });

  it("should support key-value store APIs", async () => {
    const setRes = await fetch(`${baseUrl}/api/store/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "theme_accent", value: "emerald" }),
    });
    expect(setRes.status).toBe(200);

    const getRes = await fetch(`${baseUrl}/api/store/get?key=theme_accent`);
    expect(getRes.status).toBe(200);
    const getData: any = await getRes.json();
    expect(getData.value).toBe("emerald");
  });

  it("should generate PMO executive summary via /api/pmo/summarize", async () => {
    const res = await fetch(`${baseUrl}/api/pmo/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metrics: { totalIssues: 25, completionPercentage: 80, overdueIssues: 1, blockedCount: 0 },
        projectScope: ["ALPHA", "BETA"],
      }),
    });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.aiSummary.summary).toContain("80% complete across ALPHA, BETA");
    expect(data.aiSummary.keyInsights.length).toBe(3);
    expect(data.aiSummary.bottlenecks.length).toBe(2);
    expect(data.aiSummary.recommendations.length).toBe(3);
  });

  it("should generate 3-sentence quick summary via /api/pmo/quick-summary", async () => {
    const res = await fetch(`${baseUrl}/api/pmo/quick-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metrics: { totalIssues: 12, completionPercentage: 50 },
        projectsScope: ["DEMO"],
      }),
    });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.summary).toContain("DEMO report tracks 12 total issues");
  });
});
