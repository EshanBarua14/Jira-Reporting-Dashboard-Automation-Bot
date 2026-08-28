import { describe, it, expect } from "vitest";
import {
  runMonteCarloSimulation,
  computeAdvancedMetrics,
  executeInChunks,
} from "../../src/utils/computationEngine";
import { MemoryStorageAdapter } from "../../src/db/storageAdapter";
import { JiraIssue } from "../../src/types";

describe("High-Performance Computation Engine & Monte Carlo Simulator", () => {
  const sampleIssues: JiraIssue[] = [
    {
      id: "1",
      key: "PERF-1",
      summary: "Optimize Database Queries",
      type: "Story",
      status: "Done",
      mappedStatus: "Done",
      priority: "High",
      assignee: "Eshan Barua",
      assigneeId: "user-1",
      reporter: "Sarah Connor",
      created: "2026-08-01",
      updated: "2026-08-05",
      dueDate: "2026-08-06",
      sprint: "Sprint 1",
      resolution: "Done",
      timeSpent: 0,
      originalEstimate: 0,
      remainingEstimate: 0,
      labels: [],
      components: [],
      storyPoints: 5,
    },
    {
      id: "2",
      key: "PERF-2",
      summary: "Add Redis Cache Layer",
      type: "Story",
      status: "In Progress",
      mappedStatus: "In Progress",
      priority: "Medium",
      assignee: "Sarah Chen",
      assigneeId: "user-2",
      reporter: "Sarah Connor",
      created: "2026-08-02",
      updated: "2026-08-07",
      dueDate: "2026-08-15",
      sprint: "Sprint 1",
      resolution: null,
      timeSpent: 0,
      originalEstimate: 0,
      remainingEstimate: 0,
      labels: [],
      components: [],
      storyPoints: 8,
    },
    {
      id: "3",
      key: "PERF-3",
      summary: "Refactor God Component",
      type: "Task",
      status: "To Do",
      mappedStatus: "To Do",
      priority: "High",
      assignee: "Alex Mercer",
      assigneeId: "user-3",
      reporter: "Sarah Connor",
      created: "2026-08-10",
      updated: "2026-08-10",
      dueDate: "2026-08-25",
      sprint: "Sprint 2",
      resolution: null,
      timeSpent: 0,
      originalEstimate: 0,
      remainingEstimate: 0,
      labels: [],
      components: [],
      storyPoints: 13,
    },
  ];

  it("should run Monte Carlo simulations deterministically and calculate valid percentiles", () => {
    const historicalThroughputs = [2.0, 3.5, 4.0, 2.5, 3.0];
    const remainingStoryPoints = 21;
    const result = runMonteCarloSimulation(historicalThroughputs, remainingStoryPoints, 1000);

    expect(result.simulationRuns).toBe(1000);
    expect(result.p50Days).toBeGreaterThan(0);
    expect(result.p85Days).toBeGreaterThanOrEqual(result.p50Days);
    expect(result.p95Days).toBeGreaterThanOrEqual(result.p85Days);
    expect(result.distributionHistogram.length).toBeGreaterThan(0);
    expect(result.estimatedP85Date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should handle zero remaining story points gracefully in Monte Carlo simulator", () => {
    const result = runMonteCarloSimulation([2.0, 3.0], 0, 500);
    expect(result.p50Days).toBe(0);
    expect(result.p85Days).toBe(0);
    expect(result.p95Days).toBe(0);
  });

  it("should compute advanced velocity standard deviation, cycle times, and anomaly metrics", async () => {
    const metrics = await computeAdvancedMetrics(sampleIssues);

    expect(metrics.totalIssues).toBe(3);
    expect(metrics.doneCount).toBe(1);
    expect(metrics.completionPercentage).toBe(33);
    expect(metrics.totalStoryPoints).toBe(26);
    expect(metrics.completedStoryPoints).toBe(5);
    expect(metrics.averageCycleTimeDays).toBeGreaterThan(0);
    expect(metrics.velocityStabilityScore).toBeGreaterThanOrEqual(20);
    expect(metrics.velocityStabilityScore).toBeLessThanOrEqual(100);
  });

  it("should execute time-sliced chunked computation across items without blocking", async () => {
    const largeList = Array.from({ length: 50 }, (_, i) => i + 1);
    const squared = await executeInChunks(largeList, 10, (x) => x * x);

    expect(squared.length).toBe(50);
    expect(squared[0]).toBe(1);
    expect(squared[49]).toBe(2500);
  });
});

describe("Storage Adapter Layer & Polymorphic Resilience", () => {
  it("should store, retrieve, and delete key-value settings in MemoryStorageAdapter", () => {
    const adapter = new MemoryStorageAdapter();
    adapter.init();

    expect(adapter.getStorageType()).toBe("memory");

    adapter.setSetting("theme", "dark");
    adapter.setSetting("view_mode", { mode: "simple", density: "compact" });

    expect(adapter.getSetting("theme")).toBe("dark");
    expect(adapter.getSetting("view_mode")).toEqual({ mode: "simple", density: "compact" });

    const all = adapter.getAllSettings();
    expect(Object.keys(all).length).toBe(2);

    adapter.deleteSetting("theme");
    expect(adapter.getSetting("theme")).toBeNull();
  });

  it("should save, list, and delete reports in MemoryStorageAdapter", () => {
    const adapter = new MemoryStorageAdapter();
    adapter.init();

    const reportId = "rep-test-01";
    adapter.saveReport(
      reportId,
      new Date().toISOString(),
      { jql: "project = TEST" },
      { summaryText: "Sprint on track" },
      [{ id: "1", key: "TEST-1" }]
    );

    const reports = adapter.getAllReports();
    expect(reports.length).toBe(1);
    expect(reports[0].id).toBe(reportId);
    expect(reports[0].config.jql).toBe("project = TEST");

    adapter.deleteReport(reportId);
    expect(adapter.getAllReports().length).toBe(0);
  });
});
