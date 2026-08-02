import { describe, it, expect } from "vitest";
import { getFormattedFilename } from "../../src/utils/export";

// Helper CSV row transformer mirroring internal exportToCSV logic for unit testing
export function transformIssueToCsvRow(
  issue: Record<string, any>,
  columns: { id: string; label: string; enabled: boolean }[]
): string {
  let activeColumns = columns.filter((c) => c.enabled);
  if (!activeColumns.some((c) => c.id === "mappedStatus")) {
    activeColumns = [...activeColumns, { id: "mappedStatus", label: "Mapping Name", enabled: true }];
  }

  return activeColumns
    .map((col) => {
      let rawVal = issue[col.id];
      if (Array.isArray(rawVal)) {
        rawVal = rawVal.join("; ");
      } else if (rawVal === null || rawVal === undefined) {
        rawVal = "";
      }
      const stringified = String(rawVal).replace(/"/g, '""');
      return `"${stringified}"`;
    })
    .join(",");
}

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

    expect(result).toBe(`custom_export.csv`);
  });
});

describe("Export Utilities - CSV Transformation & Escaping Logic", () => {
  const columns = [
    { id: "key", label: "Key", enabled: true },
    { id: "summary", label: "Summary", enabled: true },
    { id: "components", label: "Components", enabled: true },
    { id: "mappedStatus", label: "Mapping Name", enabled: true },
  ];

  it("should escape quotes and format array fields correctly in CSV rows", () => {
    const issue = {
      key: "PROJ-101",
      summary: 'Fix "Critical" authentication crash',
      components: ["Backend", "Security"],
      mappedStatus: "In Progress",
    };

    const row = transformIssueToCsvRow(issue, columns);
    expect(row).toBe('"PROJ-101","Fix ""Critical"" authentication crash","Backend; Security","In Progress"');
  });

  it("should append mappedStatus automatically if not present in columns list", () => {
    const partialColumns = [{ id: "key", label: "Key", enabled: true }];
    const issue = { key: "DEMO-1", mappedStatus: "Done" };

    const row = transformIssueToCsvRow(issue, partialColumns);
    expect(row).toBe('"DEMO-1","Done"');
  });
});

