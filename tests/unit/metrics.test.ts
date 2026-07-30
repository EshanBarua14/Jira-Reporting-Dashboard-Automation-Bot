import { describe, it, expect } from "vitest";
import { JiraIssue } from "../../src/types";

// Helper function to calculate report metrics directly
export function calculateMetrics(issues: JiraIssue[]) {
  const totalIssues = issues.length;
  const doneIssues = issues.filter((i) => i.status === "Done" || i.mappedStatus === "Done");
  const doneCount = doneIssues.length;
  const completionPercentage = totalIssues > 0 ? Math.round((doneCount / totalIssues) * 100) : 0;
  const sprintVelocity = doneIssues.reduce((acc, curr) => acc + (curr.storyPoints || 0), 0);
  const overdueIssues = issues.filter((i) => {
    if (!i.dueDate || i.status === "Done" || i.mappedStatus === "Done") return false;
    return new Date(i.dueDate) < new Date("2026-07-30");
  }).length;
  const unassignedIssues = issues.filter(
    (i) => (!i.assignee || i.assignee === "Unassigned") && i.status !== "Done" && i.mappedStatus !== "Done"
  ).length;
  const blockedCount = issues.filter(
    (i) => i.status === "Blocked" || i.mappedStatus === "Blocked"
  ).length;

  return {
    totalIssues,
    doneCount,
    completionPercentage,
    sprintVelocity,
    overdueIssues,
    unassignedIssues,
    blockedCount,
  };
}

describe("PMO Metric Calculations Engine", () => {
  const mockIssues: JiraIssue[] = [
    {
      id: "1",
      key: "ALPHA-1",
      summary: "Task 1",
      type: "Story",
      status: "Done",
      mappedStatus: "Done",
      priority: "High",
      assignee: "Alex Rivera",
      assigneeId: "user-1",
      reporter: "Sarah Connor",
      created: "2026-07-01",
      updated: "2026-07-10",
      dueDate: "2026-07-10",
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
      key: "ALPHA-2",
      summary: "Task 2",
      type: "Story",
      status: "In Progress",
      mappedStatus: "In Progress",
      priority: "Medium",
      assignee: "Unassigned",
      assigneeId: undefined,
      reporter: "Sarah Connor",
      created: "2026-07-05",
      updated: "2026-07-12",
      dueDate: "2026-07-20", // overdue relative to 2026-07-30
      sprint: "Sprint 1",
      resolution: undefined,
      timeSpent: 0,
      originalEstimate: 0,
      remainingEstimate: 0,
      labels: [],
      components: [],
      storyPoints: 3,
    },
    {
      id: "3",
      key: "ALPHA-3",
      summary: "Task 3",
      type: "Bug",
      status: "Blocked",
      mappedStatus: "Blocked",
      priority: "Highest",
      assignee: "Elena Vance",
      assigneeId: "user-2",
      reporter: "Sarah Connor",
      created: "2026-07-15",
      updated: "2026-07-20",
      dueDate: "2026-08-01",
      sprint: "Sprint 1",
      resolution: undefined,
      timeSpent: 0,
      originalEstimate: 0,
      remainingEstimate: 0,
      labels: [],
      components: [],
      storyPoints: 2,
    },
  ];

  it("should calculate total issues, done count, and completion percentage correctly", () => {
    const metrics = calculateMetrics(mockIssues);
    expect(metrics.totalIssues).toBe(3);
    expect(metrics.doneCount).toBe(1);
    expect(metrics.completionPercentage).toBe(33); // 1/3 ~ 33%
  });

  it("should sum sprint velocity from completed issues story points only", () => {
    const metrics = calculateMetrics(mockIssues);
    expect(metrics.sprintVelocity).toBe(5); // Only ALPHA-1 is Done with 5 SP
  });

  it("should detect overdue issues, unassigned issues, and blocked count", () => {
    const metrics = calculateMetrics(mockIssues);
    expect(metrics.overdueIssues).toBe(1); // ALPHA-2
    expect(metrics.unassignedIssues).toBe(1); // ALPHA-2
    expect(metrics.blockedCount).toBe(1); // ALPHA-3
  });

  it("should return zeros for empty issue lists", () => {
    const metrics = calculateMetrics([]);
    expect(metrics.totalIssues).toBe(0);
    expect(metrics.doneCount).toBe(0);
    expect(metrics.completionPercentage).toBe(0);
    expect(metrics.sprintVelocity).toBe(0);
    expect(metrics.overdueIssues).toBe(0);
    expect(metrics.unassignedIssues).toBe(0);
    expect(metrics.blockedCount).toBe(0);
  });
});
