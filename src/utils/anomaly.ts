import { JiraIssue } from "../types";

export interface AnomalyItem {
  id: string;
  issueKey: string;
  summary: string;
  type: "cycle_time" | "story_point" | "blocked_critical" | "unassigned_critical" | "overdue";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  recommendation: string;
  issue: JiraIssue;
}

export function detectJiraAnomalies(issues: JiraIssue[], overdueThresholdDays = 14): AnomalyItem[] {
  const anomalies: AnomalyItem[] = [];
  const now = new Date();

  issues.forEach((issue) => {
    const key = issue.key;
    const status = issue.mappedStatus || issue.status || "To Do";
    const priority = issue.priority || "Medium";
    const sp = issue.storyPoints || 0;
    const rawAssignee = issue.assignee as any;
    const assignee = typeof rawAssignee === "object" ? rawAssignee?.displayName || rawAssignee?.emailAddress || "" : String(rawAssignee || "");

    // 1. Cycle Time Stale In-Progress Issue Anomaly
    if (status === "In Progress" || status === "In Review") {
      const createdDate = new Date(issue.created);
      const ageDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      if (ageDays >= overdueThresholdDays) {
        anomalies.push({
          id: `anomaly-cycle-${key}`,
          issueKey: key,
          summary: issue.summary,
          type: "cycle_time",
          severity: "critical",
          title: "Stale Cycle Time Alert",
          description: `Ticket has been active for ${ageDays} days without resolution (Threshold: ${overdueThresholdDays} days).`,
          recommendation: "Conduct sprint standup check or re-assign to unblock progress.",
          issue,
        });
      }
    }

    // 2. Story Point Estimate Anomaly
    if (sp > 13) {
      anomalies.push({
        id: `anomaly-sp-${key}`,
        issueKey: key,
        summary: issue.summary,
        type: "story_point",
        severity: "warning",
        title: "High Story Point Over-allocation",
        description: `Ticket estimate is ${sp} Story Points (exceeds recommended sprint batch cap of 13 SP).`,
        recommendation: "Decompose into smaller epic child tasks for better predictability.",
        issue,
      });
    }

    // 3. High Priority Blocked Anomaly
    if (status === "Blocked" && (priority === "Highest" || priority === "High")) {
      anomalies.push({
        id: `anomaly-blocked-${key}`,
        issueKey: key,
        summary: issue.summary,
        type: "blocked_critical",
        severity: "critical",
        title: "Blocked High-Priority Impediment",
        description: `${priority} priority ticket is in Blocked state holding up workflow velocity.`,
        recommendation: "Escalate impediment in PMO daily triage.",
        issue,
      });
    }

    // 4. Critical Unassigned Anomaly
    if ((!assignee || assignee.toLowerCase().includes("unassigned")) && (priority === "Highest" || priority === "High")) {
      anomalies.push({
        id: `anomaly-unassigned-${key}`,
        issueKey: key,
        summary: issue.summary,
        type: "unassigned_critical",
        severity: "warning",
        title: "Unassigned High-Urgency Ticket",
        description: `${priority} priority issue is unassigned to any active squad member.`,
        recommendation: "Assign immediately to lead developer or module owner.",
        issue,
      });
    }

    // 5. Overdue Non-Resolved Ticket
    if (issue.dueDate && status !== "Done") {
      const due = new Date(issue.dueDate);
      if (due < now) {
        const overdueDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        if (overdueDays > 0) {
          anomalies.push({
            id: `anomaly-overdue-${key}`,
            issueKey: key,
            summary: issue.summary,
            type: "overdue",
            severity: "critical",
            title: "Overdue Delivery SLA Breached",
            description: `Target delivery date passed ${overdueDays} day(s) ago (${issue.dueDate}).`,
            recommendation: "Update target release sprint or adjust completion scope.",
            issue,
          });
        }
      }
    }
  });

  return anomalies;
}
