import { describe, it, expect, beforeAll } from "vitest";
import {
  initDatabase,
  getSetting,
  setSetting,
  getAllSettings,
  deleteSetting,
  saveReport,
  getAllReports,
  deleteReport,
} from "../../database";

describe("SQLite Storage & Reports Database Layer", () => {
  beforeAll(() => {
    initDatabase();
  });

  it("should store, retrieve, and delete key-value settings", () => {
    const testKey = "test_theme_preference";
    const testVal = { mode: "dark", accent: "indigo" };

    setSetting(testKey, testVal);
    const retrieved = getSetting(testKey);
    expect(retrieved).toEqual(testVal);

    const all = getAllSettings();
    expect(all[testKey]).toEqual(testVal);

    deleteSetting(testKey);
    expect(getSetting(testKey)).toBeNull();
  });

  it("should save, list, and delete report records in SQLite", () => {
    const reportId = "report_test_123";
    const timestamp = "2026-08-08 12:00:00";
    const config = { selectedProjects: ["ALPHA"] };
    const summary = { totalIssues: 10, doneCount: 5 };
    const issues = [{ key: "ALPHA-1", summary: "First task" }];

    saveReport(reportId, timestamp, config, summary, issues);

    const reports = getAllReports();
    const found = reports.find((r) => r.id === reportId);
    expect(found).toBeDefined();
    expect(found.config).toEqual(config);
    expect(found.summary).toEqual(summary);
    expect(found.issues).toEqual(issues);

    deleteReport(reportId);
    const updatedReports = getAllReports();
    expect(updatedReports.find((r) => r.id === reportId)).toBeUndefined();
  });
});
