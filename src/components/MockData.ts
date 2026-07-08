import { JiraIssue, ReportConfig } from "../types";

export const SANDBOX_PROJECTS = [
  { key: "ALPHA", name: "Project Alpha (Enterprise SaaS)" },
  { key: "MOBI", name: "Project Mobile (iOS & Android App)" },
  { key: "SECU", name: "Project Security (Audit & Hardening)" },
];

export const SANDBOX_ISSUE_TYPES = [
  "Bug",
  "Story",
  "Task",
  "Epic",
  "Sub-task",
];

export const SANDBOX_STATUSES = [
  "Backlog",
  "To Do",
  "In Progress",
  "In Review",
  "QA Testing",
  "Blocked",
  "Done",
  "Resolved",
];

export const SANDBOX_ASSIGNEES = [
  { id: "usr-01", name: "Sarah Connor" },
  { id: "usr-02", name: "Miles Dyson" },
  { id: "usr-03", name: "John Connor" },
  { id: "usr-04", name: "Marcus Wright" },
  { id: "usr-05", name: "Kate Brewster" },
];

export const SANDBOX_SPRINTS = [
  "Sprint 1 (Kickoff)",
  "Sprint 2 (MVP Release)",
  "Sprint 3 (Stability & Security)",
  "Sprint 4 (Scaling & Perf)",
];

// Generate dynamic sandbox issues
export const getSandboxIssues = (): JiraIssue[] => {
  const issues: JiraIssue[] = [];
  
  // Project Alpha Issues
  const alphaIssues: Partial<JiraIssue>[] = [
    {
      key: "ALPHA-101",
      summary: "Implement OAuth2 client credential flow for external API partners",
      type: "Story",
      status: "Done",
      priority: "Highest",
      assignee: "Sarah Connor",
      assigneeId: "usr-01",
      reporter: "John Connor",
      created: "2026-06-15",
      updated: "2026-06-20",
      dueDate: "2026-06-20",
      storyPoints: 8,
      sprint: "Sprint 3 (Stability & Security)",
      resolution: "Done",
      timeSpent: 28800,
      remainingEstimate: 0,
      labels: ["auth", "api", "security"],
      components: ["Backend API"],
    },
    {
      key: "ALPHA-102",
      summary: "Database query timeout during heavy parallel batch exports",
      type: "Bug",
      status: "In Progress",
      priority: "High",
      assignee: "Miles Dyson",
      assigneeId: "usr-02",
      reporter: "Sarah Connor",
      created: "2026-06-18",
      updated: "2026-07-02",
      dueDate: "2026-07-08",
      storyPoints: 5,
      sprint: "Sprint 3 (Stability & Security)",
      resolution: null,
      timeSpent: 14400,
      remainingEstimate: 14400,
      labels: ["performance", "database"],
      components: ["Database"],
    },
    {
      key: "ALPHA-103",
      summary: "Update user profile billing portal UI with discount tier support",
      type: "Story",
      status: "In Review",
      priority: "Medium",
      assignee: "Kate Brewster",
      assigneeId: "usr-05",
      reporter: "Miles Dyson",
      created: "2026-06-22",
      updated: "2026-07-03",
      dueDate: "2026-07-05",
      storyPoints: 3,
      sprint: "Sprint 3 (Stability & Security)",
      resolution: null,
      timeSpent: 18000,
      remainingEstimate: 3600,
      labels: ["billing", "ui"],
      components: ["Web App UI"],
    },
    {
      key: "ALPHA-104",
      summary: "Critical security patch: sanitize Markdown preview rendering input",
      type: "Bug",
      status: "Blocked",
      priority: "Highest",
      assignee: "Marcus Wright",
      assigneeId: "usr-04",
      reporter: "John Connor",
      created: "2026-06-25",
      updated: "2026-07-04",
      dueDate: "2026-06-30", // Overdue!
      storyPoints: 5,
      sprint: "Sprint 3 (Stability & Security)",
      resolution: null,
      timeSpent: 7200,
      remainingEstimate: 21600,
      labels: ["security", "xss-vulnerability"],
      components: ["Web App UI", "Security Core"],
    },
    {
      key: "ALPHA-105",
      summary: "Draft architecture design document for serverless compute migration",
      type: "Task",
      status: "To Do",
      priority: "Low",
      assignee: "Miles Dyson",
      assigneeId: "usr-02",
      reporter: "Miles Dyson",
      created: "2026-06-28",
      updated: "2026-06-28",
      dueDate: "2026-07-20",
      storyPoints: 2,
      sprint: "Sprint 4 (Scaling & Perf)",
      resolution: null,
      timeSpent: 0,
      remainingEstimate: 7200,
      labels: ["cloud", "architecture"],
      components: ["Cloud Infra"],
    },
    {
      key: "ALPHA-106",
      summary: "Memory leak in background session cleanup daemon process",
      type: "Bug",
      status: "Done",
      priority: "High",
      assignee: "Miles Dyson",
      assigneeId: "usr-02",
      reporter: "Kate Brewster",
      created: "2026-06-10",
      updated: "2026-06-14",
      dueDate: "2026-06-15",
      storyPoints: 3,
      sprint: "Sprint 2 (MVP Release)",
      resolution: "Fixed",
      timeSpent: 21600,
      remainingEstimate: 0,
      labels: ["memory-leak", "daemon"],
      components: ["Backend API"],
    },
    {
      key: "ALPHA-107",
      summary: "Enable Slack notifications for immediate deployment alerts",
      type: "Story",
      status: "Done",
      priority: "Low",
      assignee: "John Connor",
      assigneeId: "usr-03",
      reporter: "Sarah Connor",
      created: "2026-06-05",
      updated: "2026-06-12",
      dueDate: "2026-06-12",
      storyPoints: 2,
      sprint: "Sprint 2 (MVP Release)",
      resolution: "Done",
      timeSpent: 7200,
      remainingEstimate: 0,
      labels: ["integrations", "slack"],
      components: ["Cloud Infra"],
    },
    {
      key: "ALPHA-108",
      summary: "Refactor database migrations to support zero-downtime rolling upgrades",
      type: "Task",
      status: "Backlog",
      priority: "Medium",
      assignee: "",
      assigneeId: "",
      reporter: "John Connor",
      created: "2026-07-01",
      updated: "2026-07-01",
      dueDate: null,
      storyPoints: 8,
      sprint: "",
      resolution: null,
      timeSpent: 0,
      remainingEstimate: 28800,
      labels: ["database", "refactoring"],
      components: ["Database"],
    },
  ];

  // Project Mobile Issues
  const mobileIssues: Partial<JiraIssue>[] = [
    {
      key: "MOBI-201",
      summary: "App crashes instantly on launch on iOS 16 if push permission is denied",
      type: "Bug",
      status: "Done",
      priority: "Highest",
      assignee: "Sarah Connor",
      assigneeId: "usr-01",
      reporter: "Kate Brewster",
      created: "2026-06-12",
      updated: "2026-06-14",
      dueDate: "2026-06-14",
      storyPoints: 5,
      sprint: "Sprint 2 (MVP Release)",
      resolution: "Fixed",
      timeSpent: 18000,
      remainingEstimate: 0,
      labels: ["ios", "crash", "push-notifications"],
      components: ["iOS App"],
    },
    {
      key: "MOBI-202",
      summary: "Integrate Apple Pay and Google Pay SDK payment methods in checkout",
      type: "Story",
      status: "In Progress",
      priority: "High",
      assignee: "Marcus Wright",
      assigneeId: "usr-04",
      reporter: "Sarah Connor",
      created: "2026-06-20",
      updated: "2026-07-01",
      dueDate: "2026-07-10",
      storyPoints: 8,
      sprint: "Sprint 3 (Stability & Security)",
      resolution: null,
      timeSpent: 43200,
      remainingEstimate: 28800,
      labels: ["apple-pay", "google-pay", "billing"],
      components: ["iOS App", "Android App"],
    },
    {
      key: "MOBI-203",
      summary: "Optimize image loading pipeline with caching for explore page grids",
      type: "Task",
      status: "QA Testing",
      priority: "Medium",
      assignee: "John Connor",
      assigneeId: "usr-03",
      reporter: "Miles Dyson",
      created: "2026-06-24",
      updated: "2026-07-04",
      dueDate: "2026-07-04",
      storyPoints: 3,
      sprint: "Sprint 3 (Stability & Security)",
      resolution: null,
      timeSpent: 14400,
      remainingEstimate: 3600,
      labels: ["performance", "caching"],
      components: ["iOS App", "Android App"],
    },
    {
      key: "MOBI-204",
      summary: "Write unit tests for checkout validation hooks and error overlays",
      type: "Story",
      status: "To Do",
      priority: "Low",
      assignee: "Kate Brewster",
      assigneeId: "usr-05",
      reporter: "Sarah Connor",
      created: "2026-06-29",
      updated: "2026-06-30",
      dueDate: "2026-07-15",
      storyPoints: 2,
      sprint: "Sprint 4 (Scaling & Perf)",
      resolution: null,
      timeSpent: 0,
      remainingEstimate: 7200,
      labels: ["unit-tests"],
      components: ["iOS App", "Android App"],
    },
    {
      key: "MOBI-205",
      summary: "Android push token fails to refresh after cold background starts",
      type: "Bug",
      status: "Blocked",
      priority: "High",
      assignee: "Marcus Wright",
      assigneeId: "usr-04",
      reporter: "Marcus Wright",
      created: "2026-06-27",
      updated: "2026-07-03",
      dueDate: "2026-07-02", // Overdue!
      storyPoints: 5,
      sprint: "Sprint 3 (Stability & Security)",
      resolution: null,
      timeSpent: 10800,
      remainingEstimate: 18000,
      labels: ["android", "push-notifications"],
      components: ["Android App"],
    },
    {
      key: "MOBI-206",
      summary: "Unassigned incoming app store review report tickets triaging",
      type: "Task",
      status: "Backlog",
      priority: "Low",
      assignee: "",
      assigneeId: "",
      reporter: "Kate Brewster",
      created: "2026-07-03",
      updated: "2026-07-03",
      dueDate: null,
      storyPoints: 1,
      sprint: "",
      resolution: null,
      timeSpent: 0,
      remainingEstimate: 0,
      labels: ["triage", "customer-feedback"],
      components: ["iOS App", "Android App"],
    },
  ];

  // Project Security Issues
  const securityIssues: Partial<JiraIssue>[] = [
    {
      key: "SECU-301",
      summary: "Run static application security testing (SAST) in CI/CD build runners",
      type: "Task",
      status: "Done",
      priority: "High",
      assignee: "Sarah Connor",
      assigneeId: "usr-01",
      reporter: "John Connor",
      created: "2026-06-14",
      updated: "2026-06-18",
      dueDate: "2026-06-18",
      storyPoints: 5,
      sprint: "Sprint 3 (Stability & Security)",
      resolution: "Done",
      timeSpent: 14400,
      remainingEstimate: 0,
      labels: ["security", "sast", "ci-cd"],
      components: ["CI/CD Pipeline"],
    },
    {
      key: "SECU-302",
      summary: "Rotate all database root passwords and staging connection secrets",
      type: "Task",
      status: "Done",
      priority: "Highest",
      assignee: "John Connor",
      assigneeId: "usr-03",
      reporter: "Sarah Connor",
      created: "2026-06-15",
      updated: "2026-06-16",
      dueDate: "2026-06-16",
      storyPoints: 3,
      sprint: "Sprint 3 (Stability & Security)",
      resolution: "Completed",
      timeSpent: 7200,
      remainingEstimate: 0,
      labels: ["credentials", "secrets", "database"],
      components: ["Database Secrets"],
    },
    {
      key: "SECU-303",
      summary: "Audit third-party npm libraries and fix critical CVE vulnerabilities",
      type: "Bug",
      status: "In Progress",
      priority: "Highest",
      assignee: "Miles Dyson",
      assigneeId: "usr-02",
      reporter: "Miles Dyson",
      created: "2026-06-20",
      updated: "2026-07-04",
      dueDate: "2026-06-25", // Overdue!
      storyPoints: 8,
      sprint: "Sprint 3 (Stability & Security)",
      resolution: null,
      timeSpent: 28800,
      remainingEstimate: 14400,
      labels: ["cve", "npm", "security"],
      components: ["Core Packages"],
    },
    {
      key: "SECU-304",
      summary: "Add rate-limiting middleware to authentication API endpoints to deter brute force",
      type: "Story",
      status: "QA Testing",
      priority: "High",
      assignee: "Marcus Wright",
      assigneeId: "usr-04",
      reporter: "John Connor",
      created: "2026-06-22",
      updated: "2026-07-04",
      dueDate: "2026-07-02", // Overdue!
      storyPoints: 5,
      sprint: "Sprint 3 (Stability & Security)",
      resolution: null,
      timeSpent: 18000,
      remainingEstimate: 0,
      labels: ["rate-limiting", "auth", "security"],
      components: ["API Gateway"],
    },
    {
      key: "SECU-305",
      summary: "Perform external black-box penetration testing on primary gateway domains",
      type: "Task",
      status: "To Do",
      priority: "Medium",
      assignee: "Sarah Connor",
      assigneeId: "usr-01",
      reporter: "John Connor",
      created: "2026-06-30",
      updated: "2026-06-30",
      dueDate: "2026-07-28",
      storyPoints: 13,
      sprint: "Sprint 4 (Scaling & Perf)",
      resolution: null,
      timeSpent: 0,
      remainingEstimate: 46800,
      labels: ["pentest", "external"],
      components: ["API Gateway"],
    },
  ];

  // Concatenate and backfill missing attributes to conform to JiraIssue interface
  const allRaw = [...alphaIssues, ...mobileIssues, ...securityIssues];
  
  return allRaw.map((issue, idx) => {
    const isDoneOrResolved = ["Done", "Resolved"].includes(issue.status || "");
    const mapped: "To Do" | "In Progress" | "Done" | "Blocked" = 
      isDoneOrResolved ? "Done" : 
      issue.status === "Blocked" ? "Blocked" :
      ["To Do", "Backlog"].includes(issue.status || "") ? "To Do" : "In Progress";

    return {
      id: `issue-${idx + 1000}`,
      key: issue.key || `MOCK-${idx}`,
      summary: issue.summary || "Mock summary description",
      type: issue.type || "Story",
      status: issue.status || "To Do",
      mappedStatus: mapped,
      priority: issue.priority || "Medium",
      assignee: issue.assignee || "Unassigned",
      assigneeId: issue.assigneeId || "unassigned",
      reporter: issue.reporter || "Sarah Connor",
      created: issue.created || "2026-06-01",
      updated: issue.updated || "2026-06-01",
      dueDate: issue.dueDate || null,
      storyPoints: issue.storyPoints !== undefined ? issue.storyPoints : null,
      sprint: issue.sprint || null,
      resolution: issue.resolution || null,
      timeSpent: issue.timeSpent !== undefined ? issue.timeSpent : null,
      remainingEstimate: issue.remainingEstimate !== undefined ? issue.remainingEstimate : null,
      labels: issue.labels || [],
      components: issue.components || [],
    } as JiraIssue;
  });
};

// Filter Sandbox issues dynamically based on ReportConfig UI selections
export const filterSandboxIssues = (config: ReportConfig): JiraIssue[] => {
  let list = getSandboxIssues();

  // Filter projects (e.g. key prefix like ALPHA, MOBI, SECU)
  if (config.selectedProjects && config.selectedProjects.length > 0) {
    list = list.filter(issue => 
      config.selectedProjects.some(projKey => issue.key.startsWith(projKey))
    );
  }

  // Filter issue types
  if (config.selectedIssueTypes && config.selectedIssueTypes.length > 0) {
    list = list.filter(issue => 
      config.selectedIssueTypes.includes(issue.type)
    );
  }

  // Created date range
  if (config.createdDateStart) {
    list = list.filter(issue => issue.created >= config.createdDateStart);
  }
  if (config.createdDateEnd) {
    list = list.filter(issue => issue.created <= config.createdDateEnd);
  }

  // Updated date range
  if (config.updatedDateStart) {
    list = list.filter(issue => issue.updated >= config.updatedDateStart);
  }
  if (config.updatedDateEnd) {
    list = list.filter(issue => issue.updated <= config.updatedDateEnd);
  }

  // Sprint
  if (config.selectedSprint) {
    list = list.filter(issue => issue.sprint === config.selectedSprint);
  }

  // Assignee
  if (config.selectedAssignee) {
    list = list.filter(issue => issue.assignee === config.selectedAssignee);
  }

  // Status Filter
  if (config.selectedStatuses && config.selectedStatuses.length > 0) {
    list = list.filter(issue => config.selectedStatuses!.includes(issue.status));
  }

  // Re-map status dynamically based on user status mapping selections
  list = list.map(issue => {
    const userMappedBucket = (config && config.statusMapping) ? config.statusMapping[issue.status] : undefined;
    return {
      ...issue,
      mappedStatus: userMappedBucket || issue.mappedStatus || "To Do",
    };
  });

  return list;
};

export const MOCK_CONFLUENCE_SPACES = [
  { key: "ENG", name: "Engineering Wiki" },
  { key: "PMO", name: "Product Management Office" },
  { key: "SEC", name: "Security Standards & Compliance" },
  { key: "MKT", name: "Marketing & Launch Strategy" }
];

export const MOCK_CONFLUENCE_PAGES = [
  { id: "pg-01", title: "API Gateway Architecture Design V2", spaceKey: "ENG", creator: "Sarah Connor", lastModifier: "Miles Dyson", lastModifiedDate: "2026-07-06T15:30:00Z", wordCount: 1450, status: "Published", viewCount: 230 },
  { id: "pg-02", title: "Continuous Delivery Pipeline Standards", spaceKey: "ENG", creator: "John Connor", lastModifier: "John Connor", lastModifiedDate: "2026-07-05T09:12:00Z", wordCount: 980, status: "Published", viewCount: 120 },
  { id: "pg-03", title: "Database Migration Rollback Plan", spaceKey: "ENG", creator: "Miles Dyson", lastModifier: "Miles Dyson", lastModifiedDate: "2026-07-07T11:00:00Z", wordCount: 650, status: "Published", viewCount: 85 },
  { id: "pg-04", title: "Sprint 3 Retro & Action Items", spaceKey: "PMO", creator: "Marcus Wright", lastModifier: "Kate Brewster", lastModifiedDate: "2026-07-02T16:45:00Z", wordCount: 1200, status: "Published", viewCount: 310 },
  { id: "pg-05", title: "Product Requirements Document (PRD) - Mobile Push", spaceKey: "PMO", creator: "Kate Brewster", lastModifier: "Kate Brewster", lastModifiedDate: "2026-07-07T08:20:00Z", wordCount: 2400, status: "Draft", viewCount: 45 },
  { id: "pg-06", title: "Risk Assessment Register & Mitigation Matrix", spaceKey: "PMO", creator: "Marcus Wright", lastModifier: "Marcus Wright", lastModifiedDate: "2026-06-30T10:00:00Z", wordCount: 1850, status: "Published", viewCount: 175 },
  { id: "pg-07", title: "ISO-27001 Security Audit Preparation Checklist", spaceKey: "SEC", creator: "Sarah Connor", lastModifier: "Sarah Connor", lastModifiedDate: "2026-07-06T14:00:00Z", wordCount: 3200, status: "Published", viewCount: 410 },
  { id: "pg-08", title: "IAM Roles & Least Privilege Boundary Guidelines", spaceKey: "SEC", creator: "John Connor", lastModifier: "Sarah Connor", lastModifiedDate: "2026-07-04T18:30:00Z", wordCount: 1100, status: "Published", viewCount: 190 },
  { id: "pg-09", title: "Secrets Management Best Practices using Vault", spaceKey: "SEC", creator: "Sarah Connor", lastModifier: "Sarah Connor", lastModifiedDate: "2026-07-07T02:00:00Z", wordCount: 520, status: "Published", viewCount: 65 },
  { id: "pg-10", title: "Q3 Product Launch Press Release Draft", spaceKey: "MKT", creator: "Kate Brewster", lastModifier: "Kate Brewster", lastModifiedDate: "2026-07-07T12:00:00Z", wordCount: 800, status: "Draft", viewCount: 12 },
];

export const MOCK_DISCORD_CHANNELS = [
  { id: "ch-01", name: "general" },
  { id: "ch-02", name: "engineering" },
  { id: "ch-03", name: "announcements" },
  { id: "ch-04", name: "prod-deployments" }
];

export const MOCK_DISCORD_MESSAGES = [
  { id: "msg-01", author: "Sarah Connor", authorAvatar: "", content: "Just completed the audit prep checklist. We look solid for the ISO audit on Monday!", timestamp: "2026-07-07T09:30:00Z", channelName: "engineering", reactionsCount: 8 },
  { id: "msg-02", author: "Miles Dyson", authorAvatar: "", content: "I've reviewed the API gateway design. Let's merge the branch this afternoon.", timestamp: "2026-07-07T10:15:00Z", channelName: "engineering", reactionsCount: 4 },
  { id: "msg-03", author: "John Connor", authorAvatar: "", content: "Can we check why the staging pipeline failed on the master branch?", timestamp: "2026-07-07T11:02:00Z", channelName: "engineering", reactionsCount: 2 },
  { id: "msg-04", author: "Marcus Wright", authorAvatar: "", content: "Deploying build v2.4.1-rc3 to production staging container now.", timestamp: "2026-07-07T11:20:00Z", channelName: "prod-deployments", reactionsCount: 5 },
  { id: "msg-05", author: "System Bot", authorAvatar: "", content: "✅ DEPLOY SUCCESSFUL: ALPHA-v2.4.1-rc3 is now live on GCP Cloud Run container cluster.", timestamp: "2026-07-07T11:25:00Z", channelName: "prod-deployments", reactionsCount: 12 },
  { id: "msg-06", author: "Kate Brewster", authorAvatar: "", content: "Welcome everyone to our new workspace Discord! Let's build something epic.", timestamp: "2026-07-05T08:00:00Z", channelName: "general", reactionsCount: 15 },
  { id: "msg-07", author: "Marcus Wright", authorAvatar: "", content: "Who is planning the sprint 4 kickoff meeting? We need to schedule it soon.", timestamp: "2026-07-06T14:10:00Z", channelName: "general", reactionsCount: 3 },
  { id: "msg-08", author: "John Connor", authorAvatar: "", content: "Don't forget we have a team social this Thursday at 5 PM local time!", timestamp: "2026-07-06T16:00:00Z", channelName: "general", reactionsCount: 9 },
  { id: "msg-09", author: "Sarah Connor", authorAvatar: "", content: "📢 IMPORTANT ANNOUNCEMENT: All developers must update their API tokens by end-of-week.", timestamp: "2026-07-06T09:00:00Z", channelName: "announcements", reactionsCount: 14 },
  { id: "msg-10", author: "Kate Brewster", authorAvatar: "", content: "Sprint 3 velocity exceeded our forecast by 12%! Massive congrats to the whole squad! 🚀", timestamp: "2026-07-07T15:00:00Z", channelName: "announcements", reactionsCount: 22 },
];

export interface ConfluenceFilterConfig {
  selectedSpaces: string[];
  pageStatus: string;
  creator: string;
}

export const filterSandboxConfluence = (config: ConfluenceFilterConfig) => {
  let list = [...MOCK_CONFLUENCE_PAGES];
  if (config.selectedSpaces && config.selectedSpaces.length > 0) {
    list = list.filter(p => config.selectedSpaces.includes(p.spaceKey));
  }
  if (config.pageStatus && config.pageStatus !== "All") {
    list = list.filter(p => p.status === config.pageStatus);
  }
  if (config.creator) {
    list = list.filter(p => p.creator === config.creator);
  }
  return list;
};

export interface DiscordFilterConfig {
  selectedChannels: string[];
  author: string;
  minReactions: number;
}

export const filterSandboxDiscord = (config: DiscordFilterConfig) => {
  let list = [...MOCK_DISCORD_MESSAGES];
  if (config.selectedChannels && config.selectedChannels.length > 0) {
    list = list.filter(m => config.selectedChannels.includes(m.channelName));
  }
  if (config.author) {
    list = list.filter(m => m.author === config.author);
  }
  if (config.minReactions > 0) {
    list = list.filter(m => m.reactionsCount >= config.minReactions);
  }
  return list;
};
