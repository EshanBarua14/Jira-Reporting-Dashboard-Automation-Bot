import { describe, it, expect } from "vitest";
import { detectJiraAnomalies } from "../../src/utils/anomaly";
import { JiraIssue } from "../../src/types";

describe("Anomaly Detection Engine", () => {
  const sampleIssues: JiraIssue[] = [
    {
      id: "1",
      key: "PROJ-1",
      summary: "Stale task in progress",
      type: "Story",
      mappedStatus: "In Progress",
      status: "In Progress",
      priority: "High",
      storyPoints: 5,
      created: "2026-06-01T00:00:00Z", // old created date
      updated: "2026-06-02T00:00:00Z",
      dueDate: null,
      sprint: "Sprint 1",
      resolution: null,
      timeSpent: null,
      remainingEstimate: null,
      labels: [],
      components: [],
      assignee: "Alice",
      assigneeId: "a1",
      reporter: "Lead",
    },
    {
      id: "2",
      key: "PROJ-2",
      summary: "Massive story point task",
      type: "Story",
      mappedStatus: "To Do",
      status: "To Do",
      priority: "Medium",
      storyPoints: 21, // >13 SP
      created: "2026-07-20T00:00:00Z",
      updated: "2026-07-21T00:00:00Z",
      dueDate: null,
      sprint: "Sprint 1",
      resolution: null,
      timeSpent: null,
      remainingEstimate: null,
      labels: [],
      components: [],
      assignee: "Bob",
      assigneeId: "b2",
      reporter: "Lead",
    },
    {
      id: "3",
      key: "PROJ-3",
      summary: "High priority blocked ticket",
      type: "Bug",
      mappedStatus: "Blocked",
      status: "Blocked",
      priority: "Highest",
      storyPoints: 3,
      created: "2026-07-25T00:00:00Z",
      updated: "2026-07-26T00:00:00Z",
      dueDate: null,
      sprint: "Sprint 1",
      resolution: null,
      timeSpent: null,
      remainingEstimate: null,
      labels: [],
      components: [],
      assignee: "Charlie",
      assigneeId: "c3",
      reporter: "Lead",
    },
  ];

  it("should flag stale in-progress tickets as cycle_time anomaly", () => {
    const anomalies = detectJiraAnomalies(sampleIssues, 14);
    const staleAnomaly = anomalies.find((a) => a.issueKey === "PROJ-1" && a.type === "cycle_time");
    expect(staleAnomaly).toBeDefined();
    expect(staleAnomaly?.severity).toBe("critical");
  });

  it("should flag story point estimates >13 as story_point anomaly", () => {
    const anomalies = detectJiraAnomalies(sampleIssues, 14);
    const spAnomaly = anomalies.find((a) => a.issueKey === "PROJ-2" && a.type === "story_point");
    expect(spAnomaly).toBeDefined();
    expect(spAnomaly?.description).toContain("21 Story Points");
  });

  it("should flag highest priority blocked tickets as blocked_critical anomaly", () => {
    const anomalies = detectJiraAnomalies(sampleIssues, 14);
    const blockedAnomaly = anomalies.find((a) => a.issueKey === "PROJ-3" && a.type === "blocked_critical");
    expect(blockedAnomaly).toBeDefined();
    expect(blockedAnomaly?.severity).toBe("critical");
  });
});
