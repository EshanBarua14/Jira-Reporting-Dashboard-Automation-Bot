import { describe, it, expect } from "vitest";
import { getFormattedFilename } from "../../src/utils/export";

describe("Export Utilities - getFormattedFilename", () => {
  it("should replace {project} and {date} template parameters correctly", () => {
    const template = "jira_report_{project}_{date}.csv";
    const projects = ["PROJ-A", "PROJ-B"];
    const result = getFormattedFilename(template, projects);
    const dateStr = new Date().toISOString().split("T")[0];

    expect(result).toBe(`jira_report_PROJ-A_PROJ-B_${dateStr}.csv`);
  });

  it("should fallback to ALL when projects array is empty", () => {
    const template = "report_{project}_{date}";
    const projects: string[] = [];
    const result = getFormattedFilename(template, projects);
    const dateStr = new Date().toISOString().split("T")[0];

    expect(result).toBe(`report_ALL_${dateStr}.csv`);
  });

  it("should ensure .csv extension is preserved", () => {
    const template = "custom_export";
    const result = getFormattedFilename(template, ["ALPHA"]);
    const dateStr = new Date().toISOString().split("T")[0];

    expect(result).toBe(`custom_export.csv`);
  });
});
