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
  originalEstimate?: number | null; // in seconds or hours
  labels: string[];
  components: string[];
  description?: string;
  subtasksCount?: number;
  subtasks?: { key: string; summary: string; status: string }[];
  comments?: { id: string; author: string; body: string; created: string }[];
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
    trendAnalysis?: boolean;
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

export interface SprintComparison {
  currentSprintName: string;
  previousSprintName: string;
  currentMetrics: {
    totalIssues: number;
    doneCount: number;
    completionPercentage: number;
    sprintVelocity: number;
    bugsCount: number;
  };
  previousMetrics: {
    totalIssues: number;
    doneCount: number;
    completionPercentage: number;
    sprintVelocity: number;
    bugsCount: number;
  };
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
  sprintComparison?: SprintComparison;
  confluencePages?: any[];
  confluenceMetrics?: {
    totalPages: number;
    spaceCount: number;
    avgWordCount: number;
    activeContributors: number;
    draftRatio: number;
    pagesBySpace: { [space: string]: number };
  };
  discordMessages?: any[];
  discordMetrics?: {
    totalMessages: number;
    uniqueAuthors: number;
    totalReactions: number;
    avgMessageLength: number;
    activeHour: number;
    messagesByChannel: { [channel: string]: number };
  };
  comparisonMetrics?: {
    totalIssues: number;
    doneCount: number;
    inProgressCount: number;
    todoCount: number;
    blockedCount: number;
    completionPercentage: number;
    overdueIssues: number;
    unassignedIssues: number;
    bugsToStoriesRatio: string;
    averageCycleTime: number;
    sprintVelocity: number;
    issuesPerAssignee: { [assignee: string]: number };
  };
  comparisonConfig?: {
    enabled: boolean;
    startDate: string;
    endDate: string;
  };
}

export interface RecentExport {
  id: string;
  format: "CSV" | "PDF" | "Google Sheets" | "JSON";
  filename: string;
  timestamp: string;
  projects: string[];
  issuesSnapshot?: JiraIssue[];
}

export interface DashboardLayoutPreset {
  id: string;
  name: string;
  description?: string;
  timestamp: string;
  panelOrder: string[];
  collapsedPanels: Record<string, boolean>;
  visualizations: {
    pieChart: boolean;
    barChart: boolean;
    lineChart: boolean;
    table: boolean;
    trendAnalysis?: boolean;
    customChart?: boolean;
  };
}

export interface CustomChartConfig {
  enabled: boolean;
  chartType: "bar" | "line" | "area";
  xAxisField: "assignee" | "status" | "type" | "priority" | "sprint";
  primaryMetric: "issueCount" | "storyPoints" | "timeSpent" | "avgAge";
  secondaryMetric: "none" | "issueCount" | "storyPoints" | "timeSpent" | "overdueCount";
  chartTitle: string;
}

export interface NetworkLog {
  timestamp: string;
  url: string;
  method: string;
  status: number | string;
  statusText: string;
  details?: string;
}

export interface AppAccountUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  authProvider: "email" | "google" | "phone";
  is2FAEnabled: boolean;
  secret2FA?: string;
  backupCodes?: string[];
  createdAt: string;
  lastLoginAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  category: "STATUS_MAPPING" | "PRESET_LOAD" | "SCOPE_FILTER" | "REPORT_GEN" | "EXPORT" | "AUTH" | "CONFIG";
  details: string;
  severity: "info" | "warning" | "success" | "critical";
}



