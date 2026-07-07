export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  type: string; // e.g. Bug, Story, Task, Epic, Sub-task
  status: string; // original status
  mappedStatus: "To Do" | "In Progress" | "Done" | "Blocked";
  priority: string; // High, Medium, Low, etc.
  assignee: string; // Display Name
  assigneeId: string;
  reporter: string;
  created: string; // YYYY-MM-DD
  updated: string; // YYYY-MM-DD
  dueDate: string | null;
  storyPoints: number | null;
  sprint: string | null;
  resolution: string | null;
  timeSpent: number | null; // in seconds or hours
  remainingEstimate: number | null; // in seconds or hours
  labels: string[];
  components: string[];
}

export interface AuthCredentials {
  jiraUrl: string;
  email: string;
  token: string;
}

export interface StatusMapping {
  [statusName: string]: "To Do" | "In Progress" | "Done" | "Blocked";
}

export interface ColumnDefinition {
  id: string;
  label: string;
  enabled: boolean;
}

export interface MetricDefinition {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface ReportConfig {
  selectedProjects: string[];
  selectedIssueTypes: string[];
  createdDateStart: string;
  createdDateEnd: string;
  updatedDateStart: string;
  updatedDateEnd: string;
  selectedSprint: string;
  selectedAssignee: string;
  statusMapping: StatusMapping;
  columns: ColumnDefinition[];
  metrics: MetricDefinition[];
  visualizations: {
    pieChart: boolean;
    barChart: boolean;
    lineChart: boolean;
    table: boolean;
  };
  exportFormat: "CSV" | "PDF" | "Google Sheets";
  autoExport: boolean;
  fileNamingRule: string;
  selectedStatuses?: string[];
}

export interface ExecutiveSummary {
  summary: string;
  keyInsights: string[];
  bottlenecks: string[];
  recommendations: string[];
}

export interface GeneratedReport {
  timestamp: string;
  config: ReportConfig;
  issues: JiraIssue[];
  metrics: {
    totalIssues: number;
    doneCount: number;
    inProgressCount: number;
    todoCount: number;
    blockedCount: number;
    completionPercentage: number;
    overdueIssues: number;
    unassignedIssues: number;
    bugsToStoriesRatio: string;
    averageCycleTime: number; // in days
    sprintVelocity: number; // sum of SP for Done issues in Sprint
    issuesPerAssignee: { [assignee: string]: number };
  };
  aiSummary?: ExecutiveSummary;
}

export interface RecentExport {
  id: string;
  format: "CSV" | "PDF" | "Google Sheets";
  filename: string;
  timestamp: string;
  projects: string[];
  issuesSnapshot?: JiraIssue[];
}

export interface NetworkLog {
  timestamp: string;
  url: string;
  method: string;
  status: number | string;
  statusText: string;
  details?: string;
}


