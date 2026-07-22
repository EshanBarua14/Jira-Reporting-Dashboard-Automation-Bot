import React, { useState, useMemo } from "react";
import { 
  Sparkles, AlertCircle, AlertTriangle, User, UserPlus, UserCheck, Calendar, Tag, CheckCircle2, 
  Search, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Download, FileJson, 
  Printer, TrendingUp, Users, CheckSquare, Clock, FileSpreadsheet, Eye, ArrowUpRight, ArrowDownRight, X, FileText,
  BellOff, Copy, Check, Share2, Flag, ArrowRight, MessageSquare, RotateCcw, RotateCw
} from "lucide-react";
import { JiraIssue, ReportConfig, ExecutiveSummary, GeneratedReport, ColumnDefinition, MetricDefinition } from "../types";
import { exportToCSV, exportToPDF } from "../utils/export";
import { motion, AnimatePresence } from "motion/react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { D3PieChart } from "./D3PieChart";
import { SprintBurndownWidget } from "./SprintBurndownWidget";
import { ProjectImpactChart } from "./ProjectImpactChart";
import { TrendAnalysisChart } from "./TrendAnalysisChart";

const METRIC_FORMULAS: Record<string, { formula: string; source: string }> = {
  totalIssues: {
    formula: "Count of all issues in active scope",
    source: "Jira API search result count"
  },
  doneCount: {
    formula: "Count of issues where status is categorized as Done",
    source: "Jira issue status field"
  },
  completionPercentage: {
    formula: "(Done Issues / Total Issues) * 100",
    source: "Done-to-total ratio of issue list"
  },
  overdueIssues: {
    formula: "Issues where mappedStatus !== 'Done' and dueDate < today",
    source: "Jira duedate & custom status category"
  },
  unassignedIssues: {
    formula: "Issues where assignee is null, empty, or 'Unassigned'",
    source: "Jira assignee field mapping"
  },
  bugsToStoriesRatio: {
    formula: "Bugs Count : Stories Count (Bugs / Stories ratio)",
    source: "Jira issuetype field"
  },
  averageCycleTime: {
    formula: "Average(ResolutionDate - CreatedDate) in days",
    source: "Created and updated fields of Done issues"
  },
  sprintVelocity: {
    formula: "Sum of storyPoints for all Done issues",
    source: "StoryPoints field on resolved tickets"
  }
};

interface ReportDashboardProps {
  report: GeneratedReport | null;
  loading: boolean;
  onExportSheets: () => void;
  jiraUrl?: string;
  isSandbox?: boolean;
  onRecordExport?: (format: "CSV" | "PDF" | "Google Sheets" | "JSON", filename: string) => void;
  categoryColors?: Record<string, string>;
  metricsHistory?: any[];
  onUpdateIssues?: (updatedIssues: JiraIssue[]) => void;
  addToast?: (title: string, message: string, type?: "info" | "success" | "warning" | "error", duration?: number) => void;
  sessionId?: string | null;
  onExportPng?: () => void;
  columns?: ColumnDefinition[];
  onRefreshData?: () => void;
  theme?: "dark" | "light";
  activeUser?: {
    displayName: string;
    emailAddress: string;
    avatarUrl?: string;
  } | null;
  onShareReport?: () => string;
  onRefreshSummary?: () => void;
  refreshingSummary?: boolean;
  onTriggerPrintPreview?: () => void;
  flaggedIssueKeys?: string[];
  onToggleFlag?: (key: string) => void;
  onUpdateIssueStatusOrSprint?: (key: string, newStatus?: "To Do" | "In Progress" | "Done" | "Blocked", newSprint?: string) => void;
  overdueThreshold?: number;
  blockedThreshold?: number;
  summarySearchQuery?: string;
  onExportPDF?: () => void;
  justGeneratedReport?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 110,
      damping: 15,
    },
  },
};

const escapeRegExp = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return <span>{text}</span>;
  try {
    const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-500/30 text-yellow-200 font-extrabold rounded-sm px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  } catch {
    return <span>{text}</span>;
  }
};

export const ReportDashboard: React.FC<ReportDashboardProps> = ({
  report,
  loading,
  onExportSheets,
  jiraUrl = "",
  isSandbox = true,
  onRecordExport,
  categoryColors = {
    "To Do": "#64748b",
    "In Progress": "#3b82f6",
    "Done": "#10b981",
    "Blocked": "#ef4444",
  },
  metricsHistory = [],
  onUpdateIssues,
  addToast,
  sessionId = null,
  onExportPng,
  columns,
  onRefreshData,
  theme,
  activeUser,
  onShareReport,
  onRefreshSummary,
  refreshingSummary = false,
  onTriggerPrintPreview,
  flaggedIssueKeys = [],
  onToggleFlag,
  onUpdateIssueStatusOrSprint,
  overdueThreshold = 5,
  blockedThreshold = 3,
  summarySearchQuery,
  onExportPDF,
  justGeneratedReport = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [tableQuickFilter, setTableQuickFilter] = useState<"All" | "Overdue" | "Unassigned" | "Blocked">("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>("key");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedIssueForModal, setSelectedIssueForModal] = useState<JiraIssue | null>(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // Column reordering & row animation state
  const [customColumnOrder, setCustomColumnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("jira_dashboard_column_order");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [justClickedRowKey, setJustClickedRowKey] = useState<string | null>(null);

  // Overdue Snoozed Alerts state
  const [snoozedAlerts, setSnoozedAlerts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("snoozed_overdue_alerts");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleSnooze = (key: string) => {
    const newSnoozed = { ...snoozedAlerts, [key]: Date.now() + 24 * 60 * 60 * 1000 };
    setSnoozedAlerts(newSnoozed);
    localStorage.setItem("snoozed_overdue_alerts", JSON.stringify(newSnoozed));
  };

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Hover states for interactive tooltips on trend charts
  const [hoveredHistory1Idx, setHoveredHistory1Idx] = useState<number | null>(null);
  const [hoveredHistory2Idx, setHoveredHistory2Idx] = useState<number | null>(null);
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);

  // Cell Copying interactivity state and helper
  const [copiedCellId, setCopiedCellId] = useState<string | null>(null);

  const handleCopyCell = (text: string, cellId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCellId(cellId);
      addToast?.("Copied to Clipboard", `"${text}" copied successfully.`, "success", 2000);
      setTimeout(() => {
        setCopiedCellId(null);
      }, 1500);
    }).catch(() => {
      addToast?.("Copy Failed", "Unable to copy to clipboard", "error", 2000);
    });
  };

  const CellCopyButton = ({ text, cellId }: { text: string; cellId: string }) => {
    const isCopied = copiedCellId === cellId;
    return (
      <button
        type="button"
        onClick={(e) => handleCopyCell(text, cellId, e)}
        className={`opacity-0 group-hover/cell:opacity-100 p-1 rounded-md transition-all duration-150 shrink-0 ${
          isCopied 
            ? "bg-emerald-500/20 text-emerald-400 opacity-100" 
            : "hover:bg-slate-800 text-slate-500 hover:text-slate-350"
        }`}
        title={isCopied ? "Copied!" : "Copy cell value to clipboard"}
      >
        {isCopied ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    );
  };

  const [copiedSummary, setCopiedSummary] = useState(false);

  const handleCopySummary = () => {
    if (!aiSummary) return;
    const content = `JIRA PMO EXECUTIVE SMART SUMMARY
Generated At: ${new Date(timestamp).toLocaleString()}
--------------------------------------------------

HEALTH EVALUATION:
${aiSummary.summary}

KEY INSIGHTS:
${aiSummary.keyInsights.map((insight) => `- ${insight}`).join("\n")}

BOTTLENECKS:
${aiSummary.bottlenecks.map((b) => `- ${b}`).join("\n")}

PM ACTION RECOMMENDATIONS:
${aiSummary.recommendations.map((rec, idx) => `${idx + 1}. ${rec}`).join("\n")}
`;

    navigator.clipboard.writeText(content).then(() => {
      setCopiedSummary(true);
      addToast?.("Summary Copied", "Executive summary copied to clipboard.", "success", 2000);
      setTimeout(() => setCopiedSummary(false), 2000);
    }).catch(() => {
      addToast?.("Copy Failed", "Unable to copy summary to clipboard.", "error", 2000);
    });
  };

  const handleSaveAsText = () => {
    if (!aiSummary) return;
    const content = `JIRA PMO EXECUTIVE SMART SUMMARY
Generated At: ${new Date(timestamp).toLocaleString()}
--------------------------------------------------

HEALTH EVALUATION:
${aiSummary.summary}

KEY INSIGHTS:
${aiSummary.keyInsights.map((insight) => `- ${insight}`).join("\n")}

BOTTLENECKS:
${aiSummary.bottlenecks.map((b) => `- ${b}`).join("\n")}

PM ACTION RECOMMENDATIONS:
${aiSummary.recommendations.map((rec, idx) => `${idx + 1}. ${rec}`).join("\n")}
`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Jira_Executive_Summary_${new Date(timestamp).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast?.("Saved as Text", "Executive summary downloaded successfully.", "success", 2000);
  };

  const getSubtasksForIssue = (issue: JiraIssue) => {
    if (issue.subtasks && issue.subtasks.length > 0) {
      return issue.subtasks;
    }
    const list = [];
    if (issue.type === "Bug") {
      list.push({ key: `${issue.key}-1`, summary: "Reproduce reported defect in local sandbox environment", status: "Done" });
      list.push({ key: `${issue.key}-2`, summary: "Implement regression testing coverage and check-in patch fixes", status: issue.status === "Done" ? "Done" : "In Progress" });
      list.push({ key: `${issue.key}-3`, summary: "QA sign-off & peer review", status: issue.status === "Done" ? "Done" : "To Do" });
    } else {
      list.push({ key: `${issue.key}-1`, summary: "Technical architecture review & specifications mapping", status: "Done" });
      list.push({ key: `${issue.key}-2`, summary: "Core software engineering feature implementation", status: issue.status === "Done" ? "Done" : "In Progress" });
      list.push({ key: `${issue.key}-3`, summary: "Unit testing and continuous integration checks", status: issue.status === "Done" ? "Done" : "To Do" });
    }
    return list;
  };

  const getCommentsForIssue = (issue: JiraIssue) => {
    if (issue.comments && issue.comments.length > 0) {
      return issue.comments;
    }
    const list = [
      {
        id: "c1",
        author: issue.reporter || "Sarah Connor",
        body: `Critical ticket mapping verified in latest release audit. Retested on container environment.`,
        created: "2026-07-01 10:24"
      },
      {
        id: "c2",
        author: issue.assignee && issue.assignee !== "Unassigned" ? issue.assignee : "Miles Dyson",
        body: `Investigated the component pipeline bottleneck. Staging pull request has been submitted for automated peer review.`,
        created: "2026-07-02 14:15"
      }
    ];
    if (issue.status === "Done") {
      list.push({
        id: "c3",
        author: "Automated Integration",
        body: `Continuous integration regression suite succeeded. Consolidated staging and production branches.`,
        created: "2026-07-03 09:00"
      });
    }
    return list;
  };

  const getHistoricalDataPoints = () => {
    if (metricsHistory && metricsHistory.length > 0) {
      return metricsHistory.map((h, i) => ({
        label: `Run ${i + 1}`,
        date: new Date(h.timestamp).toLocaleDateString([], { month: "short", day: "numeric" }),
        fullTimestamp: new Date(h.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        totalIssues: h.metrics.totalIssues || 0,
        completionPercentage: h.metrics.completionPercentage || 0
      }));
    }
    return [
      { label: "Run 1", date: "Jul 01", fullTimestamp: "Jul 01, 10:00:00 AM", totalIssues: 24, completionPercentage: 45 },
      { label: "Run 2", date: "Jul 03", fullTimestamp: "Jul 03, 11:30:15 AM", totalIssues: 28, completionPercentage: 50 },
      { label: "Run 3", date: "Jul 04", fullTimestamp: "Jul 04, 02:15:30 PM", totalIssues: 32, completionPercentage: 58 },
      { label: "Run 4", date: "Jul 06", fullTimestamp: "Jul 06, 09:45:00 AM", totalIssues: 30, completionPercentage: 62 },
      { label: "Run 5", date: "Jul 07", fullTimestamp: "Jul 07, 04:20:45 PM", totalIssues: report?.metrics?.totalIssues || 35, completionPercentage: report?.metrics?.completionPercentage || 68 },
    ];
  };
  
  // METRIC INTERACTIVE FILTER STATE
  const [activeMetricFilter, setActiveMetricFilter] = useState<string | null>(null);

  // DRAG AND DROP & TIMELINE STATES
  const [draggedIssueKey, setDraggedIssueKey] = useState<string | null>(null);
  const [isDraggingOverTarget, setIsDraggingOverTarget] = useState<string | null>(null);
  const [selectedTimelineKey, setSelectedTimelineKey] = useState<string>("");
  const [selectedTimelineEventIdx, setSelectedTimelineEventIdx] = useState<number>(0);

  // NEW TIMELINE INTERACTIVITY AND RESOLUTION STATES
  const [timelineZoom, setTimelineZoom] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const [hoveredTimelineNodeIdx, setHoveredTimelineNodeIdx] = useState<number | null>(null);
  const [isTimelineExportOpen, setIsTimelineExportOpen] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const timelineViewportRef = React.useRef<HTMLDivElement>(null);

  // TIMELINE HELPERS FOR DYNAMIC ZOOM RESOLUTION
  const getStartOfWeek = (dateStr: string) => {
    const d = new Date(dateStr.replace(/-/g, "/"));
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
  };

  const getMonthYear = (dateStr: string) => {
    const d = new Date(dateStr.replace(/-/g, "/"));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("default", { month: "long", year: "numeric" });
  };

  const getEventStatusCategory = (evt: any) => {
    if (evt.type === "created") {
      return "To Do";
    } else if (evt.type === "status") {
      const descLower = evt.desc.toLowerCase();
      const labelLower = evt.label.toLowerCase();
      if (descLower.includes("done") || labelLower.includes("done") || descLower.includes("resolved") || descLower.includes("complete")) {
        return "Done";
      } else if (descLower.includes("blocked") || labelLower.includes("blocked") || descLower.includes("impediment")) {
        return "Blocked";
      } else {
        return "In Progress";
      }
    } else {
      return "In Progress";
    }
  };

  const getGroupedTimelineEvents = (originalEvents: { label: string; date: string; desc: string; type: "created" | "status" | "comment"; author?: string }[], zoom: "Daily" | "Weekly" | "Monthly") => {
    const groups: Record<string, typeof originalEvents> = {};
    
    originalEvents.forEach((evt) => {
      let key = "";
      if (zoom === "Daily") {
        key = evt.date.split(" ")[0];
      } else if (zoom === "Weekly") {
        key = getStartOfWeek(evt.date);
      } else {
        key = getMonthYear(evt.date);
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(evt);
    });
    
    const grouped: {
      label: string;
      date: string;
      desc: string;
      type: "created" | "status" | "comment" | "mixed";
      statusCategory: string;
      subEvents: typeof originalEvents;
    }[] = [];
    
    Object.entries(groups).forEach(([key, items]) => {
      items.sort((a, b) => a.date.localeCompare(b.date));
      
      let displayDate = key;
      if (zoom === "Weekly") {
        displayDate = `Week of ${key}`;
      }
      
      let label = "";
      if (items.length === 1) {
        label = items[0].label;
      } else {
        const typesCount = items.reduce((acc, curr) => {
          acc[curr.type] = (acc[curr.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const typesList = Object.keys(typesCount).map((t) => {
          if (t === "created") return "Created";
          if (t === "status") return "Transitions";
          if (t === "comment") return "Comments";
          return t;
        });
        label = `${items.length} Events (${typesList.join(" & ")})`;
      }
      
      const desc = items.map((it) => `[${it.date}] ${it.label}: ${it.desc}`).join("\n\n");
      
      const firstType = items[0].type;
      const isMixed = items.some((it) => it.type !== firstType);
      const type = isMixed ? "mixed" : firstType;
      
      let statusCategory = "To Do";
      const hasDone = items.some(it => getEventStatusCategory(it) === "Done");
      const hasBlocked = items.some(it => getEventStatusCategory(it) === "Blocked");
      const hasInProgress = items.some(it => getEventStatusCategory(it) === "In Progress");
      
      if (hasDone) statusCategory = "Done";
      else if (hasBlocked) statusCategory = "Blocked";
      else if (hasInProgress) statusCategory = "In Progress";
      
      grouped.push({
        label,
        date: displayDate,
        desc,
        type: type as any,
        statusCategory,
        subEvents: items,
      });
    });
    
    grouped.sort((a, b) => a.date.localeCompare(b.date));
    return grouped;
  };

  // COMPILE TIMELINE EVENTS
  const compileTimelineEvents = (issue: JiraIssue) => {
    const events: { label: string; date: string; desc: string; type: "created" | "status" | "comment"; author?: string }[] = [];
    
    if (issue.created) {
      events.push({
        label: "Ticket Created",
        date: issue.created,
        desc: `Reporter ${issue.reporter || "Unknown"} compiled issue scope. Initial Priority set to ${issue.priority}.`,
        type: "created",
      });
    }

    if (issue.mappedStatus === "In Progress") {
      events.push({
        label: "Active Transition",
        date: issue.created,
        desc: `Status updated to 'In Progress'. Assignee ${issue.assignee || "Sarah Connor"} started execution.`,
        type: "status",
      });
    } else if (issue.mappedStatus === "Done") {
      events.push({
        label: "Active Transition",
        date: issue.created,
        desc: `Status updated to 'In Progress'. Assignee started work.`,
        type: "status",
      });
      if (issue.updated) {
        events.push({
          label: "Completed Resolution",
          date: issue.updated,
          desc: `Status updated to 'Done'. Work resolved by assignee.`,
          type: "status",
        });
      }
    } else if (issue.mappedStatus === "Blocked") {
      events.push({
        label: "Blocked Impediment",
        date: issue.updated || issue.created,
        desc: `Status flagged as 'Blocked'. Timeline pending resolution.`,
        type: "status",
      });
    }

    const coms = getCommentsForIssue(issue);
    coms.forEach((c) => {
      events.push({
        label: `Comment by ${c.author}`,
        date: c.created.split(" ")[0],
        desc: c.body,
        type: "comment",
        author: c.author
      });
    });

    events.sort((a, b) => a.date.localeCompare(b.date));
    return events;
  };

  // EXPORT HANDLERS FOR TIMELINE WIDGET
  const downloadTimelineCSV = (key: string) => {
    const issues = report?.issues || [];
    const currentIssue = issues.find((i) => i.key === key);
    if (!currentIssue && !showFullHistory) return;
    
    let rawEvents = [];
    if (showFullHistory) {
      issues.forEach((issue) => {
        const issueEvents = compileTimelineEvents(issue);
        issueEvents.forEach((evt) => {
          rawEvents.push({
            ...evt,
            label: `${issue.key}: ${evt.label}`,
            desc: `[${issue.key} - ${issue.summary}] ${evt.desc}`,
          });
        });
      });
    } else if (currentIssue) {
      rawEvents = compileTimelineEvents(currentIssue);
    }
    
    const events = getGroupedTimelineEvents(rawEvents, timelineZoom);
    
    const headers = ["Event Date", "Event Label", "Description", "Event Type", "Status Category"];
    const rows = events.map((evt) => {
      return [
        `"${evt.date.replace(/"/g, '""')}"`,
        `"${evt.label.replace(/"/g, '""')}"`,
        `"${evt.desc.replace(/"/g, '""')}"`,
        `"${evt.type.replace(/"/g, '""')}"`,
        `"${evt.statusCategory.replace(/"/g, '""')}"`
      ].join(",");
    });
    const csvContent = "\ufeff" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const nameKey = showFullHistory ? "All_Tickets" : key;
    const name = `Issue_Timeline_${nameKey}_${timelineZoom}_${new Date().toISOString().split("T")[0]}.csv`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast?.("Export Successful", `Downloaded timeline events as CSV.`, "success", 2500);
  };

  const downloadTimelinePDF = (key: string) => {
    const issues = report?.issues || [];
    const currentIssue = issues.find((i) => i.key === key);
    if (!currentIssue && !showFullHistory) return;

    let rawEvents = [];
    if (showFullHistory) {
      issues.forEach((issue) => {
        const issueEvents = compileTimelineEvents(issue);
        issueEvents.forEach((evt) => {
          rawEvents.push({
            ...evt,
            label: `${issue.key}: ${evt.label}`,
            desc: `[${issue.key} - ${issue.summary}] ${evt.desc}`,
          });
        });
      });
    } else if (currentIssue) {
      rawEvents = compileTimelineEvents(currentIssue);
    }
    const events = getGroupedTimelineEvents(rawEvents, timelineZoom);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      addToast?.("Export Failed", "Please enable popups to allow print export.", "error", 3000);
      return;
    }
    const eventsRows = events.map((evt) => {
      let badgeStyle = "background-color: #f1f5f9; color: #475569;";
      if (evt.statusCategory === "Done") badgeStyle = "background-color: #dcfce7; color: #15803d;";
      else if (evt.statusCategory === "Blocked") badgeStyle = "background-color: #fee2e2; color: #b91c1c;";
      else if (evt.statusCategory === "In Progress") badgeStyle = "background-color: #e0f2fe; color: #0369a1;";

      return `
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 12px; font-family: monospace; font-size: 11px;">${evt.date}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; font-weight: bold; font-size: 12px;">${evt.label}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; font-size: 11px; color: #475569;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; ${badgeStyle}">
              ${evt.statusCategory}
            </span>
            <br />
            ${evt.desc.replace(/\n/g, "<br/>")}
          </td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; font-size: 11px; text-transform: capitalize;">${evt.type}</td>
        </tr>
      `;
    }).join("");

    const displayKey = showFullHistory ? "All Issues" : key;
    const headerTitle = showFullHistory ? "Combined Master Project History" : `Ticket Reference: ${key}`;

    const detailsBox = showFullHistory 
      ? `
        <div class="issue-details">
          <div class="issue-title">All Issues Currently in Report Dashboard Scope</div>
          <div class="issue-summary">Aggregated status transitions, chronological milestones, and comment history for all ${issues.length} active tickets.</div>
        </div>
      `
      : currentIssue ? `
        <div class="issue-details">
          <div class="issue-title">${key} - ${currentIssue.type} (Priority: ${currentIssue.priority})</div>
          <div class="issue-summary">${currentIssue.summary}</div>
          <div style="margin-top: 10px; font-size: 11px; color: #64748b;">
            <strong>Assignee:</strong> ${currentIssue.assignee || "Unassigned"} &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Status:</strong> ${currentIssue.status} (${currentIssue.mappedStatus})
          </div>
        </div>
      ` : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Issue Timeline [${timelineZoom} View] - ${displayKey}</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1e293b; margin: 40px; line-height: 1.5; }
            .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; }
            .title { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; }
            .subtitle { margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-weight: 500; }
            .issue-details { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
            .issue-title { margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #0284c7; }
            .issue-summary { margin: 0; font-size: 13px; color: #334155; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background-color: #f1f5f9; border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; }
            .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Issue Timeline Progress Tracker [${timelineZoom} Resolution]</div>
            <div class="subtitle">Generated on ${new Date().toLocaleString()} | ${headerTitle}</div>
          </div>

          ${detailsBox}

          <h3>Chronological Progress Event Logs</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 20%;">Time Period</th>
                <th style="width: 25%;">Activity Header</th>
                <th style="width: 40%;">Sub-events & Details</th>
                <th style="width: 15%;">Event Category</th>
              </tr>
            </thead>
            <tbody>
              ${eventsRows}
            </tbody>
          </table>

          <div class="footer">
            OmniSync Bot Report Service &copy; ${new Date().getFullYear()} - Confidentially prepared for PMO Audit Review.
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    addToast?.("Timeline PDF Exported", `Print dialogue triggered for ${displayKey}.`, "success", 2500);
  };

  // BULK SELECTION STATE
  // --- NEW BULK EDIT FEATURES DECLARATIONS ---
  interface MacroPreset {
    id: string;
    name: string;
    targetStatus?: string | null;
    addLabel?: string | null;
    removeLabel?: string | null;
  }

  interface BulkOperationLogEntry {
    id: string;
    timestamp: string;
    operationName: string;
    affectedIssueKeys: string[];
    previousStates: {
      key: string;
      status: string;
      labels: string[];
    }[];
    nextStates?: {
      key: string;
      status: string;
      labels: string[];
    }[];
    targetStatus?: string | null;
    addedLabel?: string | null;
    removedLabel?: string | null;
    success: boolean;
    errorMessage?: string;
    undone?: boolean;
  }

  interface PendingBulkAction {
    type: "status" | "label" | "macro" | "smart_automation";
    targetStatus?: string;
    label?: string;
    macro?: MacroPreset;
    smartUpdates?: any[];
  }

  const [macroPresets, setMacroPresets] = useState<MacroPreset[]>(() => {
    const saved = localStorage.getItem("jira_macro_presets");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: "macro-qa",
        name: "Mark for QA Review",
        targetStatus: "In Review",
        addLabel: "QA",
        removeLabel: "blocked"
      },
      {
        id: "macro-done",
        name: "Fast-track to Done",
        targetStatus: "Done",
        addLabel: "production-deploy",
        removeLabel: "blocked"
      },
      {
        id: "macro-block",
        name: "Flag as Blocked",
        targetStatus: "Blocked",
        addLabel: "blocked",
        removeLabel: null
      }
    ];
  });

  const [bulkLog, setBulkLog] = useState<BulkOperationLogEntry[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<PendingBulkAction | null>(null);
  
  // Smart Automation State
  const [isSmartLoading, setIsSmartLoading] = useState(false);
  
  // States for Macro creation
  const [isCreatingPreset, setIsCreatingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetStatus, setNewPresetStatus] = useState("");
  const [newPresetAddLabel, setNewPresetAddLabel] = useState("");
  const [newPresetRemoveLabel, setNewPresetRemoveLabel] = useState("");

  const [selectedIssueKeys, setSelectedIssueKeys] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [newLabelInput, setNewLabelInput] = useState("");
  const [bulkSearchQuery, setBulkSearchQuery] = useState("");
  const [bulkLabelFilter, setBulkLabelFilter] = useState<string>("");
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkProgressTotal, setBulkProgressTotal] = useState(0);
  const [bulkCurrentIssueKey, setBulkCurrentIssueKey] = useState("");
  const [bulkOperationName, setBulkOperationName] = useState("");

  const availableBulkLabels = useMemo(() => {
    const labelsSet = new Set<string>();
    const issuesList = report?.issues ?? [];
    selectedIssueKeys.forEach((key) => {
      const issue = issuesList.find((i) => i.key === key);
      if (issue && issue.labels) {
        issue.labels.forEach(l => labelsSet.add(l));
      }
    });
    return Array.from(labelsSet).sort();
  }, [selectedIssueKeys, report?.issues]);

  const filteredSelectedIssueKeys = useMemo(() => {
    const issuesList = report?.issues ?? [];
    let keys = selectedIssueKeys;

    if (bulkSearchQuery.trim()) {
      const q = bulkSearchQuery.toLowerCase().trim();
      keys = keys.filter((key) => {
        const issue = issuesList.find((i) => i.key === key);
        return issue && issue.summary.toLowerCase().includes(q);
      });
    }

    if (bulkLabelFilter) {
      keys = keys.filter((key) => {
        const issue = issuesList.find((i) => i.key === key);
        return issue && issue.labels && issue.labels.includes(bulkLabelFilter);
      });
    }

    return keys;
  }, [selectedIssueKeys, bulkSearchQuery, bulkLabelFilter, report?.issues]);

  React.useEffect(() => {
    if (!pendingBulkAction) {
      setBulkLabelFilter("");
    }
  }, [pendingBulkAction]);

  const runBulkProgressAnimation = async (operationName: string, keys: string[]) => {
    setBulkOperationName(operationName);
    setBulkProgress(0);
    setBulkProgressTotal(keys.length);
    for (let i = 0; i < keys.length; i++) {
      setBulkCurrentIssueKey(keys[i]);
      // small delay per issue to show animation
      await new Promise((resolve) => setTimeout(resolve, Math.min(300, 1500 / keys.length || 150)));
      setBulkProgress(i + 1);
    }
  };

  const handleSaveMacroPreset = (name: string, status: string, addLbl: string, removeLbl: string) => {
    if (!name.trim()) return;
    const newPreset: MacroPreset = {
      id: "preset_" + Date.now(),
      name: name.trim(),
      targetStatus: status || null,
      addLabel: addLbl.trim() || null,
      removeLabel: removeLbl.trim() || null
    };
    const updatedPresets = [...macroPresets, newPreset];
    setMacroPresets(updatedPresets);
    localStorage.setItem("jira_macro_presets", JSON.stringify(updatedPresets));
    setIsCreatingPreset(false);
    setNewPresetName("");
    setNewPresetStatus("");
    setNewPresetAddLabel("");
    setNewPresetRemoveLabel("");
    addToast?.("Preset Created", `Macro preset "${name}" has been saved.`, "success", 3000);
  };

  const handleDeleteMacroPreset = (id: string, name: string) => {
    const updatedPresets = macroPresets.filter(p => p.id !== id);
    setMacroPresets(updatedPresets);
    localStorage.setItem("jira_macro_presets", JSON.stringify(updatedPresets));
    addToast?.("Preset Deleted", `Macro preset "${name}" has been removed.`, "info", 3000);
  };

  // Intercept actions to request confirmation summary
  const handleBulkAddLabel = async (label: string) => {
    if (!label.trim() || filteredSelectedIssueKeys.length === 0) return;
    setPendingBulkAction({
      type: "label",
      label: label.trim()
    });
  };

  const handleBulkUpdate = async (targetStatus: string) => {
    if (filteredSelectedIssueKeys.length === 0) return;
    setPendingBulkAction({
      type: "status",
      targetStatus
    });
  };

  const handleApplyMacroPreset = (preset: MacroPreset) => {
    if (filteredSelectedIssueKeys.length === 0) return;
    setPendingBulkAction({
      type: "macro",
      macro: preset
    });
  };

  const handleSmartAutomationRequest = async () => {
    if (filteredSelectedIssueKeys.length === 0) return;
    setIsSmartLoading(true);
    try {
      const selectedIssues = (report?.issues ?? []).filter(i => filteredSelectedIssueKeys.includes(i.key));
      const res = await fetch("/api/pmo/suggest-bulk-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issues: selectedIssues })
      });
      if (!res.ok) {
        throw new Error("Failed to retrieve smart recommendations from server.");
      }
      const data = await res.json();
      if (data.aiSuggestions) {
        setPendingBulkAction({
          type: "smart_automation",
          smartUpdates: data.aiSuggestions.suggestions,
          label: data.aiSuggestions.summaryOfCollectiveChanges // store summary paragraph in label
        });
      } else {
        throw new Error("No suggestion data returned from server.");
      }
    } catch (err: any) {
      addToast?.("Smart Automation Error", err.message || "Failed to contact smart recommendations engine.", "error", 5000);
    } finally {
      setIsSmartLoading(false);
    }
  };

  const handleApplySmartUpdates = async (suggestions: any[]) => {
    setIsBulkUpdating(true);
    const issues = report?.issues ?? [];
    const previousStates = filteredSelectedIssueKeys.map(key => {
      const issue = issues.find(i => i.key === key);
      return {
        key,
        status: issue?.status || "To Do",
        labels: issue?.labels || []
      };
    });

    try {
      await runBulkProgressAnimation("Applying Smart AI Recommendations", filteredSelectedIssueKeys);

      const updated = issues.map((issue) => {
        const sug = suggestions.find(s => s.key === issue.key);
        if (sug) {
          let currentLabels = issue.labels || [];
          const addedLabels = sug.suggestedLabels || [];
          const finalLabels = [...currentLabels];
          addedLabels.forEach((lbl: string) => {
            if (!finalLabels.includes(lbl)) {
              finalLabels.push(lbl);
            }
          });

          return {
            ...issue,
            status: sug.suggestedStatus || issue.status,
            mappedStatus: (sug.suggestedStatus || issue.status) as any,
            labels: finalLabels
          };
        }
        return issue;
      });

      if (!isSandbox) {
        for (const sug of suggestions) {
          if (sug.suggestedStatus && sug.suggestedStatus !== sug.key) {
            try {
              await fetch("/api/jira/bulk-transition", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${sessionId}`
                },
                body: JSON.stringify({
                  issueKeys: [sug.key],
                  targetStatus: sug.suggestedStatus
                })
              });
            } catch (e) {
              console.error(`Failed to transition ${sug.key}`, e);
            }
          }
        }
      }

      if (onUpdateIssues) {
        onUpdateIssues(updated);
      }

      const nextStates = updated
        .filter(i => filteredSelectedIssueKeys.includes(i.key))
        .map(i => ({ key: i.key, status: i.status, labels: i.labels }));

      const newLogEntry: BulkOperationLogEntry = {
        id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toLocaleTimeString(),
        operationName: "AI Smart Automation Updates",
        affectedIssueKeys: [...filteredSelectedIssueKeys],
        previousStates,
        nextStates,
        success: true
      };
      setBulkLog(prev => [newLogEntry, ...prev]);

      addToast?.(
        "Smart Auto Applied",
        `Successfully applied AI-suggested updates to ${filteredSelectedIssueKeys.length} issues.`,
        "success",
        5000
      );
      setSelectedIssueKeys([]);
      setBulkSearchQuery("");
    } catch (err: any) {
      addToast?.("Smart Auto Failed", err.message || "Could not apply smart updates.", "error", 5000);
    } finally {
      setIsBulkUpdating(false);
      setBulkProgress(0);
      setBulkProgressTotal(0);
      setBulkCurrentIssueKey("");
      setBulkOperationName("");
    }
  };

  const handleUndoOperation = async (entry: BulkOperationLogEntry) => {
    const currentIssues = report?.issues ?? [];
    
    const updated = currentIssues.map(issue => {
      const prev = entry.previousStates.find(p => p.key === issue.key);
      if (prev) {
        return {
          ...issue,
          status: prev.status,
          mappedStatus: prev.status as any,
          labels: prev.labels
        };
      }
      return issue;
    });

    if (!isSandbox) {
      setIsBulkUpdating(true);
      setBulkOperationName(`Undoing: ${entry.operationName}`);
      setBulkProgress(0);
      setBulkProgressTotal(entry.previousStates.length);
      try {
        for (let i = 0; i < entry.previousStates.length; i++) {
          const prev = entry.previousStates[i];
          setBulkCurrentIssueKey(prev.key);
          await fetch("/api/jira/bulk-transition", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionId}`
            },
            body: JSON.stringify({
              issueKeys: [prev.key],
              targetStatus: prev.status
            })
          });
          setBulkProgress(i + 1);
        }
      } catch (err) {
        console.error("Undo synchronization failed:", err);
      } finally {
        setIsBulkUpdating(false);
        setBulkProgress(0);
        setBulkProgressTotal(0);
        setBulkCurrentIssueKey("");
        setBulkOperationName("");
      }
    }

    if (onUpdateIssues) {
      onUpdateIssues(updated);
    }

    setBulkLog(prev => prev.map(e => e.id === entry.id ? { ...e, undone: true } : e));
    addToast?.("Batch Action Undone", `Successfully reverted changes for ${entry.previousStates.length} issues.`, "success", 4000);
  };

  const handleRedoOperation = async (entry: BulkOperationLogEntry) => {
    if (!entry.nextStates) {
      addToast?.("Redo Failed", "No forward state stored for this action.", "error", 3000);
      return;
    }
    const currentIssues = report?.issues ?? [];
    
    const updated = currentIssues.map(issue => {
      const next = entry.nextStates?.find(n => n.key === issue.key);
      if (next) {
        return {
          ...issue,
          status: next.status,
          mappedStatus: next.status as any,
          labels: next.labels
        };
      }
      return issue;
    });

    if (!isSandbox) {
      setIsBulkUpdating(true);
      setBulkOperationName(`Redoing: ${entry.operationName}`);
      setBulkProgress(0);
      setBulkProgressTotal(entry.nextStates.length);
      try {
        for (let i = 0; i < entry.nextStates.length; i++) {
          const next = entry.nextStates[i];
          setBulkCurrentIssueKey(next.key);
          await fetch("/api/jira/bulk-transition", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionId}`
            },
            body: JSON.stringify({
              issueKeys: [next.key],
              targetStatus: next.status
            })
          });
          setBulkProgress(i + 1);
        }
      } catch (err) {
        console.error("Redo synchronization failed:", err);
      } finally {
        setIsBulkUpdating(false);
        setBulkProgress(0);
        setBulkProgressTotal(0);
        setBulkCurrentIssueKey("");
        setBulkOperationName("");
      }
    }

    if (onUpdateIssues) {
      onUpdateIssues(updated);
    }

    setBulkLog(prev => prev.map(e => e.id === entry.id ? { ...e, undone: false } : e));
    addToast?.("Batch Action Redone", `Successfully reapplied ${entry.operationName} updates to ${entry.nextStates.length} issues.`, "success", 4000);
  };

  const executePendingBulkAction = async () => {
    if (!pendingBulkAction) return;
    const action = pendingBulkAction;
    setPendingBulkAction(null);

    const issues = report?.issues ?? [];
    const previousStates = filteredSelectedIssueKeys.map(key => {
      const issue = issues.find(i => i.key === key);
      return {
        key,
        status: issue?.status || "To Do",
        labels: issue?.labels || []
      };
    });

    if (action.type === "status") {
      const targetStatus = action.targetStatus!;
      setIsBulkUpdating(true);
      try {
        await runBulkProgressAnimation(`Transitioning to "${targetStatus}"`, filteredSelectedIssueKeys);

        if (isSandbox) {
          const updated = issues.map((issue) => {
            if (filteredSelectedIssueKeys.includes(issue.key)) {
              return {
                ...issue,
                status: targetStatus,
                mappedStatus: targetStatus as any
              };
            }
            return issue;
          });
          if (onUpdateIssues) onUpdateIssues(updated);
          addToast?.("Bulk Update Success", `Successfully updated ${filteredSelectedIssueKeys.length} issues to status '${targetStatus}' (Sandbox Mode).`, "success", 4000);
        } else {
          const res = await fetch("/api/jira/bulk-transition", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionId}`
            },
            body: JSON.stringify({
              issueKeys: filteredSelectedIssueKeys,
              targetStatus
            })
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to complete bulk status transition.");
          }

          const updated = issues.map((issue) => {
            if (filteredSelectedIssueKeys.includes(issue.key)) {
              return {
                ...issue,
                status: targetStatus,
                mappedStatus: targetStatus as any
              };
            }
            return issue;
          });
          if (onUpdateIssues) onUpdateIssues(updated);
          addToast?.("Bulk Transition Success", `Successfully pushed status updates for ${filteredSelectedIssueKeys.length} issues to Jira!`, "success", 5000);
        }

        const nextStates = filteredSelectedIssueKeys.map(key => {
          const issue = issues.find(i => i.key === key);
          return {
            key,
            status: targetStatus,
            labels: issue?.labels || []
          };
        });

        const newLogEntry: BulkOperationLogEntry = {
          id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          timestamp: new Date().toLocaleTimeString(),
          operationName: `Transition Status to "${targetStatus}"`,
          affectedIssueKeys: [...filteredSelectedIssueKeys],
          previousStates,
          nextStates,
          targetStatus,
          success: true
        };
        setBulkLog(prev => [newLogEntry, ...prev]);

        setSelectedIssueKeys([]);
        setBulkSearchQuery("");
      } catch (err: any) {
        addToast?.("Bulk Transition Failed", err.message || "An error occurred.", "error", 6000);
      } finally {
        setIsBulkUpdating(false);
        setBulkProgress(0);
        setBulkProgressTotal(0);
        setBulkCurrentIssueKey("");
        setBulkOperationName("");
      }
    } else if (action.type === "label") {
      const label = action.label!;
      setIsBulkUpdating(true);
      try {
        await runBulkProgressAnimation(`Adding Label "${label}"`, filteredSelectedIssueKeys);

        const updated = issues.map((issue) => {
          if (filteredSelectedIssueKeys.includes(issue.key)) {
            const currentLabels = issue.labels || [];
            return {
              ...issue,
              labels: currentLabels.includes(label) ? currentLabels : [...currentLabels, label]
            };
          }
          return issue;
        });
        if (onUpdateIssues) onUpdateIssues(updated);

        addToast?.("Labels Added", `Successfully added label '${label}' to ${filteredSelectedIssueKeys.length} issues.`, "success", 4000);

        const nextStates = filteredSelectedIssueKeys.map(key => {
          const issue = issues.find(i => i.key === key);
          const currentLabels = issue?.labels || [];
          return {
            key,
            status: issue?.status || "To Do",
            labels: currentLabels.includes(label) ? currentLabels : [...currentLabels, label]
          };
        });

        const newLogEntry: BulkOperationLogEntry = {
          id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          timestamp: new Date().toLocaleTimeString(),
          operationName: `Add Label "${label}"`,
          affectedIssueKeys: [...filteredSelectedIssueKeys],
          previousStates,
          nextStates,
          addedLabel: label,
          success: true
        };
        setBulkLog(prev => [newLogEntry, ...prev]);

        setNewLabelInput("");
        setSelectedIssueKeys([]);
        setBulkSearchQuery("");
      } catch (err: any) {
        addToast?.("Label Assign Failed", err.message || "Could not assign labels.", "error", 5000);
      } finally {
        setIsBulkUpdating(false);
        setBulkProgress(0);
        setBulkProgressTotal(0);
        setBulkCurrentIssueKey("");
        setBulkOperationName("");
      }
    } else if (action.type === "macro") {
      const macro = action.macro!;
      setIsBulkUpdating(true);
      try {
        let runName = `Applying Macro: ${macro.name}`;
        await runBulkProgressAnimation(runName, filteredSelectedIssueKeys);

        if (macro.targetStatus && !isSandbox) {
          try {
            await fetch("/api/jira/bulk-transition", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionId}`
              },
              body: JSON.stringify({
                issueKeys: filteredSelectedIssueKeys,
                targetStatus: macro.targetStatus
              })
            });
          } catch (e) {
            console.warn("Macro transition failed", e);
          }
        }

        const updated = issues.map((issue) => {
          if (filteredSelectedIssueKeys.includes(issue.key)) {
            let updatedIssue = { ...issue };
            if (macro.targetStatus) {
              updatedIssue.status = macro.targetStatus;
              updatedIssue.mappedStatus = macro.targetStatus as any;
            }
            let currentLabels = updatedIssue.labels || [];
            if (macro.addLabel) {
              const cleanAdd = macro.addLabel.trim();
              if (!currentLabels.includes(cleanAdd)) {
                currentLabels = [...currentLabels, cleanAdd];
              }
            }
            if (macro.removeLabel) {
              const cleanRemove = macro.removeLabel.trim().toLowerCase();
              currentLabels = currentLabels.filter(l => l.toLowerCase() !== cleanRemove);
            }
            updatedIssue.labels = currentLabels;
            return updatedIssue;
          }
          return issue;
        });

        if (onUpdateIssues) onUpdateIssues(updated);

        const nextStates = updated
          .filter(i => filteredSelectedIssueKeys.includes(i.key))
          .map(i => ({ key: i.key, status: i.status, labels: i.labels }));

        addToast?.("Macro Preset Applied", `Successfully executed operations from preset '${macro.name}' across ${filteredSelectedIssueKeys.length} issues.`, "success", 4500);

        const newLogEntry: BulkOperationLogEntry = {
          id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          timestamp: new Date().toLocaleTimeString(),
          operationName: `Macro: ${macro.name}`,
          affectedIssueKeys: [...filteredSelectedIssueKeys],
          previousStates,
          nextStates,
          targetStatus: macro.targetStatus,
          addedLabel: macro.addLabel,
          removedLabel: macro.removeLabel,
          success: true
        };
        setBulkLog(prev => [newLogEntry, ...prev]);

        setSelectedIssueKeys([]);
        setBulkSearchQuery("");
      } catch (err: any) {
        addToast?.("Macro Execution Failed", err.message || "An error occurred.", "error", 5000);
      } finally {
        setIsBulkUpdating(false);
        setBulkProgress(0);
        setBulkProgressTotal(0);
        setBulkCurrentIssueKey("");
        setBulkOperationName("");
      }
    } else if (action.type === "smart_automation") {
      await handleApplySmartUpdates(action.smartUpdates!);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!pendingBulkAction) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setPendingBulkAction(null);
        addToast?.("Modal Closed", "Batch operation cancelled.", "info", 1500);
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        executePendingBulkAction();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pendingBulkAction, executePendingBulkAction]);

  const toggleRow = (issueKey: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [issueKey]: !prev[issueKey],
    }));
  };

  // Drag and Drop handlers for column reordering
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
  };

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumnId && draggedColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragEnd = () => {
    setDraggedColumnId(null);
    setDragOverColumnId(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedColumnId || draggedColumnId === targetColumnId) {
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      return;
    }

    const ids = enabledColumns.map(c => c.id);
    const fromIndex = ids.indexOf(draggedColumnId);
    const toIndex = ids.indexOf(targetColumnId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const newIds = [...ids];
      // Remove from old position
      newIds.splice(fromIndex, 1);
      // Insert at new position
      newIds.splice(toIndex, 0, draggedColumnId);

      setCustomColumnOrder(newIds);
      localStorage.setItem("jira_dashboard_column_order", JSON.stringify(newIds));
      
      const triggerToast = addToast || ((t, m, ty) => console.log(t, m, ty));
      triggerToast(
        "Column Reordered",
        "Column structure updated successfully and persisted to local configuration.",
        "success",
        2500
      );
    }
    setDraggedColumnId(null);
    setDragOverColumnId(null);
  };

  // Click handler for row with subtle highlight and zoom-out/in feedback
  const handleRowClick = (issue: JiraIssue) => {
    setJustClickedRowKey(issue.key);
    setTimeout(() => {
      setJustClickedRowKey(null);
    }, 450);
    setSelectedIssueForModal(issue);
  };

  // Quick Assign action handler to assign issue to current logged-in user
  const handleQuickAssign = (issueKey: string) => {
    const targetUser = activeUser?.displayName || "Authenticated User";
    const issues = report?.issues ?? [];
    const triggerToast = addToast || ((t, m, ty) => console.log(t, m, ty));

    const updated = issues.map((issue) => {
      if (issue.key === issueKey) {
        return {
          ...issue,
          assignee: targetUser,
        };
      }
      return issue;
    });

    if (onUpdateIssues) {
      onUpdateIssues(updated);
    }

    triggerToast(
      "Issue Reassigned",
      `Successfully reassigned ticket ${issueKey} to you (${targetUser}).`,
      "success",
      3000
    );
  };

  // Reset page & filter when report changes
  React.useEffect(() => {
    setCurrentPage(1);
    setActiveMetricFilter(null);
    setSelectedIssueKeys([]);
  }, [report]);

  const safeConfig = useMemo(() => {
    return {
      selectedProjects: report?.config?.selectedProjects || [],
      selectedIssueTypes: report?.config?.selectedIssueTypes || [],
      columns: report?.config?.columns || [],
      metrics: report?.config?.metrics || [],
      visualizations: report?.config?.visualizations || { pieChart: true, barChart: true, lineChart: true, table: true },
      fileNamingRule: report?.config?.fileNamingRule || "jira-report-{project}-{date}",
    };
  }, [report?.config]);

  // Column Selection Setup
  const currentColumnsToUse = columns || report?.config?.columns || [];
  const enabledColumns = useMemo(() => {
    const base = currentColumnsToUse.filter((c) => c.enabled);
    if (customColumnOrder && customColumnOrder.length > 0) {
      return [...base].sort((a, b) => {
        const idxA = customColumnOrder.indexOf(a.id);
        const idxB = customColumnOrder.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }
    return base;
  }, [currentColumnsToUse, customColumnOrder]);

  // Metrics Setup
  const isMetricEnabled = (id: string) => {
    return report?.config?.metrics?.find((m) => m.id === id)?.enabled ?? true;
  };

  // Status Circle calculations for Donut Chart
  const statusChartData = useMemo(() => {
    const issuesList = report?.issues ?? [];
    const total = issuesList.length || 1;
    const todo = issuesList.filter(i => i.mappedStatus === "To Do").length;
    const progress = issuesList.filter(i => i.mappedStatus === "In Progress").length;
    const done = issuesList.filter(i => i.mappedStatus === "Done").length;
    const blocked = issuesList.filter(i => i.mappedStatus === "Blocked").length;

    return {
      todo,
      progress,
      done,
      blocked,
      todoPct: Math.round((todo / total) * 100),
      progressPct: Math.round((progress / total) * 100),
      donePct: Math.round((done / total) * 100),
      blockedPct: Math.round((blocked / total) * 100),
    };
  }, [report?.issues]);

  // Issue Heatmap grid processing
  const heatmapData = useMemo(() => {
    const issuesList = report?.issues ?? [];
    
    // Unique assignees in scope
    const assignees = Array.from<string>(
      new Set(issuesList.map((i) => (i.assignee || "Unassigned") as string))
    ).sort((a, b) => a.localeCompare(b));
    
    const statuses: ("To Do" | "In Progress" | "Done" | "Blocked")[] = [
      "To Do",
      "In Progress",
      "Done",
      "Blocked",
    ];
    
    const grid: { [key: string]: { count: number; issueKeys: string[] } } = {};
    
    assignees.forEach((assignee) => {
      statuses.forEach((status) => {
        const matches = issuesList.filter(
          (i) => (i.assignee || "Unassigned") === assignee && i.mappedStatus === status
        );
        grid[`${assignee}-${status}`] = {
          count: matches.length,
          issueKeys: matches.map((m) => m.key),
        };
      });
    });
    
    return { assignees, statuses, grid };
  }, [report?.issues]);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-slate-950/20 border-white/5 text-slate-600 hover:bg-slate-950/30";
    if (count === 1) return "bg-blue-950/40 border-blue-500/20 text-blue-300 hover:border-blue-500/40 hover:bg-blue-950/60";
    if (count <= 3) return "bg-blue-900/40 border-blue-400/30 text-blue-100 hover:border-blue-400/50 hover:bg-blue-900/60 shadow-[0_0_8px_rgba(59,130,246,0.1)]";
    if (count <= 5) return "bg-blue-700/60 border-blue-400/50 text-white hover:border-blue-450/70 hover:bg-blue-700/80 shadow-[0_0_12px_rgba(59,130,246,0.2)] font-black";
    return "bg-blue-600 border-white/20 text-white hover:border-white/40 hover:bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.4)] font-black";
  };

  // Assignee workload processing
  const assigneeChartData = useMemo(() => {
    const counts = report?.metrics.issuesPerAssignee || {};
    const list = Object.entries(counts).map(([name, count]) => ({
      name,
      count: Number(count),
    }));
    return list.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [report?.metrics.issuesPerAssignee]);

  // Completion over time line chart calculations
  const lineChartPoints = useMemo(() => {
    const issuesList = report?.issues ?? [];
    const doneIssues = issuesList
      .filter((i) => i.mappedStatus === "Done" && i.updated)
      .map((i) => i.updated)
      .sort();

    const dateCounts: { [date: string]: number } = {};
    doneIssues.forEach((date) => {
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });

    const dates = Object.keys(dateCounts).sort();
    let cumulative = 0;
    return dates.map((date) => {
      cumulative += dateCounts[date];
      return { date, count: cumulative };
    });
  }, [report?.issues]);

  const flaggedIssues = useMemo(() => {
    const issuesList = report?.issues ?? [];
    return issuesList.filter((i) => flaggedIssueKeys.includes(i.key));
  }, [report?.issues, flaggedIssueKeys]);

  // Search, sort, and KPI filter on detailed issue list
  const filteredIssues = useMemo(() => {
    const issuesList = report?.issues ?? [];
    let result = [...issuesList];

    // Click Metric Filter
    if (activeMetricFilter) {
      if (activeMetricFilter === "doneCount" || activeMetricFilter === "completionPercentage") {
        result = result.filter((i) => i.mappedStatus === "Done");
      } else if (activeMetricFilter === "overdueIssues") {
        const todayStr = new Date().toISOString().split("T")[0];
        result = result.filter((i) => i.dueDate && i.dueDate < todayStr && i.mappedStatus !== "Done");
      } else if (activeMetricFilter === "unassignedIssues") {
        result = result.filter((i) => !i.assignee || i.assignee === "Unassigned" || i.assignee.toLowerCase() === "unassigned");
      } else if (activeMetricFilter === "bugsToStoriesRatio") {
        result = result.filter((i) => i.type === "Bug");
      } else if (activeMetricFilter === "sprintVelocity") {
        result = result.filter((i) => i.mappedStatus === "Done" && i.storyPoints !== null && i.storyPoints > 0);
      } else if (activeMetricFilter === "averageCycleTime") {
        result = result.filter((i) => i.mappedStatus === "Done");
      }
    }

    // Table Quick Filter Pills
    if (tableQuickFilter !== "All") {
      if (tableQuickFilter === "Overdue") {
        const todayStr = new Date().toISOString().split("T")[0];
        result = result.filter((i) => i.dueDate && i.dueDate < todayStr && i.mappedStatus !== "Done");
      } else if (tableQuickFilter === "Unassigned") {
        result = result.filter((i) => !i.assignee || i.assignee === "Unassigned" || i.assignee.toLowerCase() === "unassigned");
      } else if (tableQuickFilter === "Blocked") {
        result = result.filter((i) => i.mappedStatus === "Blocked" || i.status.toLowerCase().includes("block") || i.status.toLowerCase() === "blocked");
      }
    }

    // Search query filter (summary, key, assignee)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (issue) =>
          issue.key.toLowerCase().includes(q) ||
          issue.summary.toLowerCase().includes(q) ||
          issue.assignee.toLowerCase().includes(q) ||
          issue.type.toLowerCase().includes(q)
      );
    }

    // Filter by summary specifically (from Scope Panel)
    if (summarySearchQuery && summarySearchQuery.trim()) {
      const q = summarySearchQuery.toLowerCase().trim();
      result = result.filter((issue) => issue.summary.toLowerCase().includes(q));
    }

    // Sorting
    result.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "priority") {
        const priorityWeights: Record<string, number> = {
          "highest": 5, "high": 4, "medium": 3, "low": 2, "lowest": 1,
          "blocker": 5, "critical": 4, "major": 3, "minor": 2, "trivial": 1
        };
        const weightA = priorityWeights[String(valA).toLowerCase()] || 0;
        const weightB = priorityWeights[String(valB).toLowerCase()] || 0;
        return sortDirection === "asc" ? weightA - weightB : weightB - weightA;
      }

      if (valA === null || valA === undefined) valA = "";
      if (valB === null || valB === undefined) valB = "";

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
    });

    return result;
  }, [report?.issues, activeMetricFilter, searchQuery, summarySearchQuery, sortField, sortDirection, tableQuickFilter]);

  // Paginated Issues
  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredIssues.slice(start, start + rowsPerPage);
  }, [filteredIssues, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredIssues.length / rowsPerPage) || 1;

  if (loading) {
    return (
      <div className="bg-[#1E293B] rounded-xl border border-slate-800 p-12 text-center shadow-md flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin"></div>
          <Sparkles className="w-5 h-5 text-blue-400 absolute animate-pulse" />
        </div>
        <h3 className="text-sm font-bold text-white">Processing OmniSync Reporting Bot Matrix...</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-md leading-relaxed">
          Retrieving projects, consolidating custom workflow status maps, calculating agile velocity metrics, and drafting executive summaries...
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-[#1E293B] rounded-xl border border-dashed border-slate-800 p-12 text-center shadow-md flex flex-col items-center justify-center min-h-[350px] bg-slate-900/10">
        <div className="w-14 h-14 rounded-full bg-blue-950 text-blue-400 flex items-center justify-center mb-4 border border-blue-900/40">
          <Eye className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-bold text-white">No Active Report Generated</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Please configure your authentication and scope parameters in the panels on the left, then click the **Generate Report** button above to compile your dashboards.
        </p>
      </div>
    );
  }

  const { issues, metrics: originalMetrics, aiSummary, sprintComparison, config, timestamp } = report;

  const metrics = useMemo(() => {
    if (!originalMetrics) return originalMetrics;
    const unsnoozedOverdueCount = issues.filter((i) => {
      const isOverdue = i.dueDate && i.dueDate < todayStr && i.mappedStatus !== "Done";
      const isSnoozed = snoozedAlerts[i.key] && snoozedAlerts[i.key] > Date.now();
      return isOverdue && !isSnoozed;
    }).length;
    return {
      ...originalMetrics,
      overdueIssues: unsnoozedOverdueCount
    };
  }, [originalMetrics, issues, todayStr, snoozedAlerts]);

  const overdueIssuesList = useMemo(() => {
    return issues.filter((i) => {
      const isOverdue = i.dueDate && i.dueDate < todayStr && i.mappedStatus !== "Done";
      const isSnoozed = snoozedAlerts[i.key] && snoozedAlerts[i.key] > Date.now();
      return isOverdue && !isSnoozed;
    });
  }, [issues, todayStr, snoozedAlerts]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const downloadCSV = () => {
    const name = safeConfig.fileNamingRule
      .replace("{project}", safeConfig.selectedProjects.join("_"))
      .replace("{date}", new Date().toISOString().split("T")[0]) + ".csv";
    addToast?.("Preparing CSV Export...", `Structuring ${issues.length} issue records into custom columns...`, "info", 2000);
    setTimeout(() => {
      exportToCSV(issues, safeConfig.columns, name);
      if (onRecordExport) {
        onRecordExport("CSV", name);
      }
      addToast?.("CSV Export Successful", `Exported ${issues.length} issues to CSV spreadsheet.`, "success", 3000);
    }, 500);
  };

  const downloadSearchedCSV = () => {
    const name = "Quick_Export_" + safeConfig.fileNamingRule
      .replace("{project}", safeConfig.selectedProjects.join("_"))
      .replace("{date}", new Date().toISOString().split("T")[0]) + ".csv";
    addToast?.("Preparing Filtered CSV...", `Filtering ${filteredIssues.length} records...`, "info", 2000);
    setTimeout(() => {
      exportToCSV(filteredIssues, safeConfig.columns, name);
      if (onRecordExport) {
        onRecordExport("CSV", name);
      }
      addToast?.("Quick Export Successful", `Exported ${filteredIssues.length} searched issues to CSV.`, "success", 2000);
    }, 400);
  };

  const downloadPDF = () => {
    if (onExportPDF) {
      onExportPDF();
      return;
    }
    const name = safeConfig.fileNamingRule
      .replace("{project}", safeConfig.selectedProjects.join("_"))
      .replace("{date}", new Date().toISOString().split("T")[0]) + ".pdf";
    addToast?.("Rendering PDF Document...", `Compiling executive summary and ${issues.length} issues into print layout...`, "info", 2000);
    setTimeout(() => {
      exportToPDF(
        `Jira Executive Report - ${safeConfig.selectedProjects.join(", ")}`,
        issues,
        safeConfig.columns,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        report?.config?.metrics,
        metricsHistory,
        report?.metrics
      );
      if (onRecordExport) {
        onRecordExport("PDF", name);
      }
      addToast?.("PDF Export Successful", "Your high-fidelity executive report PDF has been rendered and downloaded.", "success", 4000);
    }, 600);
  };

  const downloadSelectedCSV = () => {
    if (filteredSelectedIssueKeys.length === 0) return;
    const selectedIssues = issues.filter((i) => filteredSelectedIssueKeys.includes(i.key));
    const name = "Selected_Issues_" + safeConfig.fileNamingRule
      .replace("{project}", safeConfig.selectedProjects.join("_"))
      .replace("{date}", new Date().toISOString().split("T")[0]) + ".csv";
    exportToCSV(selectedIssues, safeConfig.columns, name);
    if (onRecordExport) {
      onRecordExport("CSV", name);
    }
    addToast?.("Export Selected Successful", `Exported ${selectedIssues.length} selected issues to CSV.`, "success", 2000);
  };

  const downloadSelectedPDF = () => {
    if (filteredSelectedIssueKeys.length === 0) return;
    const selectedIssues = issues.filter((i) => filteredSelectedIssueKeys.includes(i.key));
    const name = "Selected_Issues_" + safeConfig.fileNamingRule
      .replace("{project}", safeConfig.selectedProjects.join("_"))
      .replace("{date}", new Date().toISOString().split("T")[0]) + ".pdf";
    exportToPDF(
      `Jira Executive Report - Selected Issues (${selectedIssues.length})`,
      selectedIssues,
      safeConfig.columns,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      report?.config?.metrics,
      metricsHistory,
      report?.metrics
    );
    if (onRecordExport) {
      onRecordExport("PDF", name);
    }
    addToast?.("Export Selected Successful", `Exported ${selectedIssues.length} selected issues to PDF.`, "success", 2000);
  };

  const exportBulkLogToCSV = () => {
    if (bulkLog.length === 0) {
      addToast?.("Export Failed", "There are no entries in the activity log to export.", "error", 2000);
      return;
    }
    const headers = ["ID", "Timestamp", "Operation Name", "Target Status", "Added Label", "Removed Label", "Affected Issues Count", "Affected Issues", "Success"];
    const rows = bulkLog.map(entry => {
      return [
        entry.id,
        entry.timestamp,
        `"${entry.operationName.replace(/"/g, '""')}"`,
        `"${(entry.targetStatus || "").replace(/"/g, '""')}"`,
        `"${(entry.addedLabel || "").replace(/"/g, '""')}"`,
        `"${(entry.removedLabel || "").replace(/"/g, '""')}"`,
        entry.affectedIssueKeys.length,
        `"${entry.affectedIssueKeys.join(", ")}"`,
        entry.success ? "YES" : "NO"
      ];
    });
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bulk_Operations_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast?.("Export Successful", "Audit log saved as CSV file.", "success", 2000);
  };

  const toggleMetricFilter = (metricId: string) => {
    setActiveMetricFilter((prev) => (prev === metricId ? null : metricId));
    setCurrentPage(1);
  };

  // Real-time Trend Calculator
  const getTrendUI = (metricId: string, currentVal: number) => {
    // Overriding trend calculator when Comparison is active
    if (report?.comparisonConfig?.enabled && report?.comparisonMetrics) {
      const compMetrics = report.comparisonMetrics as any;
      let prevVal = 0;
      if (metricId === "bugsToStoriesRatio") {
        prevVal = Number(compMetrics.bugsCount) || 0;
      } else {
        prevVal = Number(compMetrics[metricId]) || 0;
      }

      let curVal = currentVal;
      if (metricId === "bugsToStoriesRatio") {
        curVal = report?.issues.filter(i => i.type === "Bug").length || 0;
      }

      const diff = curVal - prevVal;
      const pct = prevVal === 0 ? 0 : Math.round((diff / prevVal) * 100);
      if (diff === 0) return <span className="text-[9px] text-slate-500 font-bold ml-1">Stable (vs Baseline)</span>;

      const isBadMetric = ["overdueIssues", "unassignedIssues"].includes(metricId);
      const isUp = diff > 0;
      const isGood = isBadMetric ? !isUp : isUp;

      return (
        <span className={`text-[9.5px] font-black flex items-center ml-1 shrink-0 ${isGood ? "text-emerald-400" : "text-rose-400"}`} title={`Baseline value was ${prevVal}`}>
          {isUp ? "▲" : "▼"} {diff > 0 ? "+" : ""}{diff} ({Math.abs(pct)}% vs Comp)
        </span>
      );
    }

    if (!metricsHistory || metricsHistory.length < 2) return null;
    const prevEntry = metricsHistory[metricsHistory.length - 2]; // Compare with second-to-last item (most recent previous run)
    if (!prevEntry) return null;

    let prevVal = 0;
    if (metricId === "bugsToStoriesRatio") {
      prevVal = Number(prevEntry.metrics.bugsCount) || 0;
    } else {
      prevVal = Number(prevEntry.metrics[metricId]) || 0;
    }

    let curVal = currentVal;
    if (metricId === "bugsToStoriesRatio") {
      curVal = report?.issues.filter(i => i.type === "Bug").length || 0;
    }

    const diff = curVal - prevVal;
    const pct = prevVal === 0 ? 0 : Math.round((diff / prevVal) * 100);
    if (diff === 0) return <span className="text-[9px] text-slate-500 font-bold ml-1">Stable</span>;

    const isBadMetric = ["overdueIssues", "unassignedIssues"].includes(metricId);
    const isUp = diff > 0;
    const isGood = isBadMetric ? !isUp : isUp;

    return (
      <span className={`text-[9.5px] font-black flex items-center ml-1 shrink-0 ${isGood ? "text-emerald-400" : "text-rose-400"}`}>
        {isUp ? "▲" : "▼"} {diff > 0 ? "+" : ""}{diff} {prevVal !== 0 ? `(${Math.abs(pct)}%)` : ""}
      </span>
    );
  };

  // Sparkline Generator
  const renderSparkline = (metricId: string, currentVal: number) => {
    if (!metricsHistory || metricsHistory.length < 1) return null;
    
    // Extract values
    const vals = metricsHistory.map((h) => {
      if (metricId === "bugsToStoriesRatio") {
        return Number(h.metrics.bugsCount) || 0;
      }
      return Number(h.metrics[metricId]) || 0;
    });
    
    // Append current value as final point
    if (metricId === "bugsToStoriesRatio") {
      const curBugs = report?.issues.filter(i => i.type === "Bug").length || 0;
      vals.push(curBugs);
    } else {
      vals.push(currentVal);
    }

    const max = Math.max(...vals) || 1;
    const min = Math.min(...vals) || 0;
    const range = max - min || 1;

    // Build points for a 50x20 SVG viewport
    const points = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * 50;
      const y = 20 - ((v - min) / range) * 16 - 2; // pad 2px
      return `${x},${y}`;
    }).join(" ");

    let isGood = true;
    if (vals.length >= 2) {
      const lastDiff = vals[vals.length - 1] - vals[vals.length - 2];
      if (["overdueIssues", "unassignedIssues"].includes(metricId)) {
        isGood = lastDiff <= 0;
      } else {
        isGood = lastDiff >= 0;
      }
    }
    const strokeCol = isGood ? "#10b981" : "#ef4444"; // Green vs Red

    return (
      <div className="flex items-center gap-1 mt-1 justify-between">
        <svg className="w-14 h-4.5 overflow-visible opacity-80" viewBox="0 0 50 20">
          <polyline
            fill="none"
            stroke={strokeCol}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
        <span className="text-[7.5px] font-mono text-slate-500 font-bold uppercase tracking-wider shrink-0">Trend</span>
      </div>
    );
  };

  // --- CONFLUENCE RENDERER ---
  const renderConfluenceDashboard = (pages: any[], cm: any) => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-wider">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </span>
              Confluence Space Wiki Report
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Consolidated workspace intelligence compiled from {cm.spaceCount} documentation spaces.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-bold font-mono">
            Generated At: {new Date(report?.timestamp || "").toLocaleString()}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="bg-[#1E293B] p-4 rounded-xl border border-slate-800 relative overflow-hidden">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Pages</div>
            <div className="text-2xl font-black text-white mt-1.5">{cm.totalPages}</div>
            <div className="text-[10px] text-emerald-400 font-bold mt-1">Live wiki entries</div>
          </div>
          <div className="bg-[#1E293B] p-4 rounded-xl border border-slate-800 relative overflow-hidden">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Wiki Spaces</div>
            <div className="text-2xl font-black text-white mt-1.5">{cm.spaceCount}</div>
            <div className="text-[10px] text-blue-400 font-bold mt-1">Target knowledge bases</div>
          </div>
          <div className="bg-[#1E293B] p-4 rounded-xl border border-slate-800 relative overflow-hidden">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg Word Count</div>
            <div className="text-2xl font-black text-white mt-1.5">{cm.avgWordCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Words per wiki entry</div>
          </div>
          <div className="bg-[#1E293B] p-4 rounded-xl border border-slate-800 relative overflow-hidden">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Contributors</div>
            <div className="text-2xl font-black text-white mt-1.5">{cm.activeContributors}</div>
            <div className="text-[10px] text-purple-400 font-bold mt-1">Active content creators</div>
          </div>
          <div className="bg-[#1E293B] p-4 rounded-xl border border-slate-800 relative overflow-hidden">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Draft Ratio</div>
            <div className="text-2xl font-black text-white mt-1.5">{Math.round(cm.draftRatio * 100)}%</div>
            <div className="text-[10px] text-amber-500 font-bold mt-1">Pending peer-review</div>
          </div>
        </div>

        {/* Space Distribution Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
              Pages by Wiki Space
            </h3>
            <div className="space-y-3">
              {Object.entries(cm.pagesBySpace).map(([space, count]) => {
                const max = Math.max(...(Object.values(cm.pagesBySpace) as number[])) || 1;
                const pct = ((count as number) / max) * 100;
                return (
                  <div key={space} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-300 font-mono font-bold">Space: {space}</span>
                      <span className="text-white">{count as number} page(s)</span>
                    </div>
                    <div className="w-full bg-slate-950/80 rounded-full h-2 overflow-hidden border border-white/5">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* List of wiki entries */}
          <div className="lg:col-span-8 bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Wiki Page Index ({pages.length} records)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400 font-bold">
                    <th className="py-2.5">Space</th>
                    <th className="py-2.5">Title</th>
                    <th className="py-2.5">Author</th>
                    <th className="py-2.5 text-right">Word Count</th>
                    <th className="py-2.5 text-right">Views</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-semibold">
                  {pages.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5">
                        <span className="font-mono text-[9px] font-black bg-slate-950 px-1.5 py-0.5 rounded border border-white/5 text-emerald-400">{p.spaceKey}</span>
                      </td>
                      <td className="py-2.5 text-white font-bold">{p.title}</td>
                      <td className="py-2.5">{p.creator}</td>
                      <td className="py-2.5 text-right font-mono">{p.wordCount}</td>
                      <td className="py-2.5 text-right font-mono">{p.viewCount}</td>
                      <td className="py-2.5 text-right">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          p.status === "Published" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-500"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- DISCORD RENDERER ---
  const renderDiscordDashboard = (messages: any[], dm: any) => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-wider">
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
              </span>
              Discord Chat Stream Report
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Consolidated chat activity, response rates, and team engagement statistics.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-bold font-mono">
            Generated At: {new Date(report?.timestamp || "").toLocaleString()}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="bg-[#1E293B] p-4 rounded-xl border border-slate-800">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Messages</div>
            <div className="text-2xl font-black text-white mt-1.5">{dm.totalMessages}</div>
            <div className="text-[10px] text-purple-400 font-bold mt-1">Processed notifications</div>
          </div>
          <div className="bg-[#1E293B] p-4 rounded-xl border border-slate-800">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unique Senders</div>
            <div className="text-2xl font-black text-white mt-1.5">{dm.uniqueAuthors}</div>
            <div className="text-[10px] text-emerald-400 font-bold mt-1">Active team senders</div>
          </div>
          <div className="bg-[#1E293B] p-4 rounded-xl border border-slate-800">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Reactions</div>
            <div className="text-2xl font-black text-white mt-1.5">{dm.totalReactions}</div>
            <div className="text-[10px] text-blue-400 font-bold mt-1">Total click feedback</div>
          </div>
          <div className="bg-[#1E293B] p-4 rounded-xl border border-slate-800">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg Msg Length</div>
            <div className="text-2xl font-black text-white mt-1.5">{dm.avgMessageLength}</div>
            <div className="text-[10px] text-slate-400 mt-1">Characters per post</div>
          </div>
          <div className="bg-[#1E293B] p-4 rounded-xl border border-slate-800">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Peak Active Hour</div>
            <div className="text-2xl font-black text-white mt-1.5">{dm.activeHour}:00</div>
            <div className="text-[10px] text-amber-500 font-bold mt-1">Highest velocity hour</div>
          </div>
        </div>

        {/* Channels bar chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
              Messages by Channel
            </h3>
            <div className="space-y-3">
              {Object.entries(dm.messagesByChannel).map(([channel, count]) => {
                const max = Math.max(...(Object.values(dm.messagesByChannel) as number[])) || 1;
                const pct = ((count as number) / max) * 100;
                return (
                  <div key={channel} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-300 font-mono">#{channel}</span>
                      <span className="text-white font-mono">{count as number}</span>
                    </div>
                    <div className="w-full bg-slate-950/80 rounded-full h-2 overflow-hidden border border-white/5">
                      <div className="bg-purple-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Chat Stream view */}
          <div className="lg:col-span-8 bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-white/5 pb-2">
              Server Chat Message Stream ({messages.length} messages)
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {messages.map((m) => (
                <div key={m.id} className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex gap-3 relative">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-black text-xs shrink-0 select-none">
                    {m.author.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-white">{m.author}</span>
                      <span className="text-[9px] text-purple-400 font-bold uppercase">#{m.channelName}</span>
                      <span className="text-[9px] text-slate-500 font-medium font-mono">{new Date(m.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">{m.content}</p>
                    {m.reactionsCount > 0 && (
                      <div className="inline-flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-white/10 text-[10px] font-bold text-purple-300 font-mono select-none">
                        👍 {m.reactionsCount}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (report?.confluencePages && report?.confluenceMetrics) {
    return renderConfluenceDashboard(report.confluencePages, report.confluenceMetrics);
  }
  if (report?.discordMessages && report?.discordMetrics) {
    return renderDiscordDashboard(report.discordMessages, report.discordMetrics);
  }

  return (
    <motion.div
      key={timestamp || "empty"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Premium Dashboard Header Controls */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Active OmniSync Backlog Report Overview
          </h2>
          <p className="text-[10px] text-slate-400 font-medium mt-1 font-mono">
            COMPILED AT: {new Date(timestamp).toLocaleString()} • PLATFORM: {isSandbox ? "OFFLINE SANDBOX" : "LIVE ATLASTIAN SERVER"}
          </p>
        </div>

        {/* Global Search & Live Filter Bar */}
        <div className="flex-1 max-w-lg mx-0 xl:mx-4">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-blue-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Global Search: Live-filter table by summary or assignee name..."
              className="w-full bg-slate-950/90 border border-white/10 focus:border-blue-500/80 text-xs font-medium text-white placeholder-slate-400 pl-10 pr-9 py-2.5 rounded-xl transition-all shadow-inner focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
                title="Clear global search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
          {searchQuery && (
            <div className="text-[9.5px] font-bold text-blue-400 mt-1 flex items-center gap-1.5 px-1 font-mono">
              <span>Filtered by summary / assignee: "{searchQuery}"</span>
              <span className="text-slate-500">({filteredIssues.length} matching tickets)</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full xl:w-auto justify-end relative shrink-0">
          {/* Refresh Data Button */}
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={loading}
              className="bg-slate-950 border border-white/10 hover:border-slate-700 text-slate-200 hover:text-white font-extrabold text-[11px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 uppercase tracking-wider disabled:opacity-50 cursor-pointer"
              title="Re-run active JQL fetch and rebuild analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Refreshing..." : "Refresh Data"}</span>
            </button>
          )}

          {/* Print Button */}
          <button
            onClick={() => {
              addToast?.("Print Layout", "Preparing layout and opening print dialog...", "info", 2000);
              window.print();
            }}
            className="bg-slate-950 border border-white/10 hover:border-slate-700 text-slate-200 hover:text-white font-extrabold text-[11px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 uppercase tracking-wider cursor-pointer"
            title="Prepare print layout and open print dialog (Ctrl+P)"
          >
            <Printer className="w-3.5 h-3.5 text-rose-400" />
            <span>Print Report</span>
          </button>

          {/* Share Button */}
          {onShareReport && (
            <button
              onClick={() => {
                const url = onShareReport();
                if (url) {
                  navigator.clipboard.writeText(url).then(() => {
                    addToast?.(
                      "Link Copied",
                      "Shareable URL link copied to clipboard. Share with others to display this report snapshot.",
                      "success",
                      3000
                    );
                  }).catch(() => {
                    addToast?.("Share Failed", "Unable to copy share link to clipboard.", "error", 2500);
                  });
                }
              }}
              className="bg-slate-950 border border-white/10 hover:border-slate-700 text-slate-200 hover:text-white font-extrabold text-[11px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 uppercase tracking-wider cursor-pointer"
              title="Generate a direct link to this report snapshot and copy to clipboard"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-450" />
              <span>Share Snapshot</span>
            </button>
          )}

          {/* Dedicated Download as PDF Button */}
          <button
            onClick={downloadPDF}
            className={`font-black text-[11px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 uppercase tracking-wider cursor-pointer border shadow-md ${
              justGeneratedReport
                ? "bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white border-rose-300 animate-pulse ring-2 ring-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.5)]"
                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30 hover:border-rose-500/50"
            }`}
            title="Download current report immediately as a high-fidelity executive PDF"
          >
            <FileText className={`w-3.5 h-3.5 text-rose-400 ${justGeneratedReport ? "animate-bounce text-white" : ""}`} />
            <span>Download as PDF</span>
          </button>

          {/* Direct Export Dropdown Container */}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-[11px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 uppercase tracking-wider shadow-lg shadow-blue-500/10 cursor-pointer"
              title="Choose instant report download formats"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Direct Export</span>
              <ChevronDown className={`w-3.5 h-3.5 text-blue-200 transition-transform duration-200 ${isExportDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isExportDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsExportDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="py-1.5">
                    <button
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        downloadCSV();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 font-bold flex items-center gap-2.5 transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>CSV Spreadsheet</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        downloadPDF();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 font-bold flex items-center gap-2.5 transition-colors"
                    >
                      <Printer className="w-4 h-4 text-rose-400" />
                      <span>PDF Document</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        onTriggerPrintPreview?.();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 font-bold flex items-center gap-2.5 transition-colors"
                    >
                      <Eye className="w-4 h-4 text-purple-400" />
                      <span>Print Preview Modal</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        onExportSheets();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 font-bold flex items-center gap-2.5 transition-colors"
                    >
                      <FileJson className="w-4 h-4 text-blue-400" />
                      <span>Google Sheets Sync</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div id="dashboard-visuals-container" className="space-y-6">
        
        {/* Active Filter Clear Ribbon */}
        {activeMetricFilter && (
          <div className="bg-blue-950/20 border border-blue-900/30 px-4 py-2.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
              <span className="text-xs font-bold text-blue-200">
                Active Metric Table Filter: <span className="text-white font-black uppercase tracking-wide">[{activeMetricFilter}]</span>
              </span>
            </div>
            <button
              onClick={() => setActiveMetricFilter(null)}
              className="bg-blue-900/40 hover:bg-blue-800 text-blue-200 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 uppercase transition-all"
            >
              <X className="w-3.5 h-3.5" /> Clear Filter
            </button>
          </div>
        )}

        {/* Overdue Task Alert Notification Banner */}
        {overdueIssuesList.length > 0 && (
          <div className={`p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-300 ${
            overdueIssuesList.length > overdueThreshold 
              ? "bg-rose-500/15 border border-rose-500/35 text-rose-200" 
              : "bg-red-500/10 border border-red-500/25 text-red-200"
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className={`w-5 h-5 shrink-0 ${overdueIssuesList.length > overdueThreshold ? "text-rose-500 animate-bounce" : "text-red-400 animate-pulse"}`} />
              <div>
                <div className="font-bold text-slate-100">
                  {overdueIssuesList.length > overdueThreshold ? "Overdue Tasks Limit Exceeded" : "Overdue Task Alert Notification"}
                </div>
                <div className="text-[10px] text-slate-300 font-medium mt-0.5 leading-relaxed">
                  {overdueIssuesList.length > overdueThreshold ? (
                    <>
                      Currently, <span className="font-extrabold text-rose-400">{overdueIssuesList.length}</span> tickets are past their due dates, which <span className="text-rose-400 font-bold">exceeds</span> your configured threshold alert limit of <span className="font-black text-white">{overdueThreshold}</span>. Immediate attention is required.
                    </>
                  ) : (
                    <>
                      You have <span className="font-extrabold text-red-400">{overdueIssuesList.length}</span> overdue items past their due dates. Hitting "Snooze" will temporarily hide notifications for 24 hours.
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 self-end sm:self-center shrink-0">
              <button 
                onClick={() => {
                  const newSnoozed = { ...snoozedAlerts };
                  overdueIssuesList.forEach((issue) => {
                    newSnoozed[issue.key] = Date.now() + 24 * 60 * 60 * 1000;
                  });
                  setSnoozedAlerts(newSnoozed);
                  localStorage.setItem("snoozed_overdue_alerts", JSON.stringify(newSnoozed));
                }} 
                className={`text-[10px] uppercase font-black tracking-wider px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer ${
                  overdueIssuesList.length > overdueThreshold
                    ? "bg-rose-950 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-500/30"
                    : "bg-red-950 hover:bg-red-900 text-red-300 hover:text-red-100 border border-red-500/30"
                }`}
              >
                <BellOff className="w-3.5 h-3.5" /> Snooze All (24h)
              </button>
            </div>
          </div>
        )}

        {/* Blocked Tickets Alert Notification Banner */}
        {metrics.blockedCount > blockedThreshold && (
          <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5 min-w-0 text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 animate-bounce" />
              <div>
                <div className="font-bold text-slate-100">Blocked Tickets Limit Exceeded</div>
                <div className="text-[10px] text-amber-300/80 font-medium mt-0.5">
                  Currently, <span className="font-extrabold text-amber-450">{metrics.blockedCount}</span> tickets are in Blocked status, which exceeds your configured threshold alert limit of <span className="font-black text-white">{blockedThreshold}</span>. Immediate action is recommended.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. Executive KPIs Ribbon */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={report ? report.timestamp : "empty"}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8 gap-3"
        >
        {isMetricEnabled("totalIssues") && (
          <motion.div 
            variants={cardVariants} 
            className={`bg-[#1E293B] p-3.5 rounded-xl border shadow-sm transition-all duration-300 hover:border-slate-700 cursor-help relative group ${
              activeMetricFilter === "totalIssues" ? "ring-2 ring-blue-500 border-blue-500/30" : "border-slate-800"
            }`}
          >
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between gap-1">
              <span className="flex items-center gap-1"><CheckSquare className="w-3.5 h-3.5 text-blue-400" /> Total Issues</span>
            </div>
            <div className="text-xl font-black text-white mt-1 flex items-baseline justify-between">
              <span>{metrics.totalIssues}</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">Issues in active scope</div>
            {renderSparkline("totalIssues", metrics.totalIssues)}

            {/* Tooltip */}
            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 p-3 bg-slate-950 border border-white/10 rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-250 leading-normal text-left">
              <div className="text-blue-400 font-black uppercase text-[8px] tracking-widest mb-1.5 flex items-center gap-1">
                💡 PMO KPI Metric Formula
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Formula Expression:</span>
                  <span className="font-mono font-bold text-slate-200 block mt-0.5 leading-snug">{METRIC_FORMULAS.totalIssues.formula}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Source Field / JQL Scope:</span>
                  <span className="text-slate-300 font-medium block mt-0.5">{METRIC_FORMULAS.totalIssues.source}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isMetricEnabled("doneCount") && (
          <motion.div 
            variants={cardVariants} 
            onClick={() => toggleMetricFilter("doneCount")}
            className={`bg-[#1E293B] p-3.5 rounded-xl border shadow-sm transition-all duration-300 hover:border-emerald-500/40 cursor-pointer relative group ${
              activeMetricFilter === "doneCount" ? "ring-2 ring-emerald-500 border-emerald-500/30 bg-emerald-500/5" : "border-slate-800"
            }`}
          >
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between gap-1">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Resolved Done</span>
              {getTrendUI("doneCount", metrics.doneCount)}
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.doneCount}</div>
            <div className="text-[9px] text-emerald-400 font-bold mt-0.5 truncate">
              {metrics.todoCount} To Do | {metrics.inProgressCount} Active
            </div>
            {renderSparkline("doneCount", metrics.doneCount)}

            {/* Tooltip */}
            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 p-3 bg-slate-950 border border-white/10 rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-250 leading-normal text-left">
              <div className="text-emerald-400 font-black uppercase text-[8px] tracking-widest mb-1.5 flex items-center gap-1">
                💡 PMO KPI Metric Formula
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Formula Expression:</span>
                  <span className="font-mono font-bold text-slate-200 block mt-0.5 leading-snug">{METRIC_FORMULAS.doneCount.formula}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Source Field / JQL Scope:</span>
                  <span className="text-slate-300 font-medium block mt-0.5">{METRIC_FORMULAS.doneCount.source}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isMetricEnabled("completionPercentage") && (
          <motion.div 
            variants={cardVariants} 
            onClick={() => toggleMetricFilter("completionPercentage")}
            className={`bg-[#1E293B] p-3.5 rounded-xl border shadow-sm transition-all duration-300 hover:border-indigo-500/40 cursor-pointer relative group ${
              activeMetricFilter === "completionPercentage" ? "ring-2 ring-indigo-500 border-indigo-500/30 bg-indigo-500/5" : "border-slate-800"
            }`}
          >
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between gap-1">
              <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Completion Rate</span>
              {getTrendUI("completionPercentage", metrics.completionPercentage)}
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.completionPercentage}%</div>
            <div className="w-full bg-slate-950 rounded-full h-1 mt-1.5">
              <div 
                className="bg-indigo-500 h-1 rounded-full transition-all" 
                style={{ width: `${metrics.completionPercentage}%` }}
              ></div>
            </div>
            {renderSparkline("completionPercentage", metrics.completionPercentage)}

            {/* Tooltip */}
            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 p-3 bg-slate-950 border border-white/10 rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-250 leading-normal text-left">
              <div className="text-indigo-400 font-black uppercase text-[8px] tracking-widest mb-1.5 flex items-center gap-1">
                💡 PMO KPI Metric Formula
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Formula Expression:</span>
                  <span className="font-mono font-bold text-slate-200 block mt-0.5 leading-snug">{METRIC_FORMULAS.completionPercentage.formula}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Source Field / JQL Scope:</span>
                  <span className="text-slate-300 font-medium block mt-0.5">{METRIC_FORMULAS.completionPercentage.source}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isMetricEnabled("overdueIssues") && (
          <motion.div 
            variants={cardVariants} 
            onClick={() => toggleMetricFilter("overdueIssues")}
            className={`p-3.5 rounded-xl border shadow-sm transition-all duration-300 hover:border-red-500/40 cursor-pointer relative group ${
              activeMetricFilter === "overdueIssues" 
                ? "ring-2 ring-red-500 border-red-500/30 bg-red-500/10" 
                : metrics.overdueIssues > overdueThreshold 
                  ? "border-rose-500/50 bg-rose-500/10" 
                  : metrics.overdueIssues > 0 
                    ? "border-red-500/20 bg-red-500/5" 
                    : "bg-[#1E293B] border-slate-800"
            }`}
          >
            {metrics.overdueIssues > overdueThreshold && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white border border-rose-400 font-mono text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-bounce shadow-md">
                Breach ({metrics.overdueIssues}/{overdueThreshold})
              </span>
            )}
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between gap-1">
              <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-red-400" /> Overdue Target</span>
              {getTrendUI("overdueIssues", metrics.overdueIssues)}
            </div>
            <div className={`text-xl font-black mt-1 ${metrics.overdueIssues > 0 ? "text-red-400" : "text-white"}`}>
              {metrics.overdueIssues}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">Missed deadlines</div>
            {renderSparkline("overdueIssues", metrics.overdueIssues)}

            {/* Tooltip */}
            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 p-3 bg-slate-950 border border-white/10 rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-250 leading-normal text-left">
              <div className="text-red-400 font-black uppercase text-[8px] tracking-widest mb-1.5 flex items-center gap-1">
                💡 PMO KPI Metric Formula
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Formula Expression:</span>
                  <span className="font-mono font-bold text-slate-200 block mt-0.5 leading-snug">{METRIC_FORMULAS.overdueIssues.formula}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Source Field / JQL Scope:</span>
                  <span className="text-slate-300 font-medium block mt-0.5">{METRIC_FORMULAS.overdueIssues.source}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isMetricEnabled("unassignedIssues") && (
          <motion.div 
            variants={cardVariants} 
            onClick={() => toggleMetricFilter("unassignedIssues")}
            className={`p-3.5 rounded-xl border shadow-sm transition-all duration-300 hover:border-amber-500/40 cursor-pointer relative group ${
              activeMetricFilter === "unassignedIssues" 
                ? "ring-2 ring-amber-500 border-amber-500/30 bg-amber-500/10" 
                : metrics.unassignedIssues > 0 
                  ? "border-amber-500/20 bg-amber-500/5" 
                  : "bg-[#1E293B] border-slate-800"
            }`}
          >
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between gap-1">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-amber-400" /> Unassigned Tickets</span>
              {getTrendUI("unassignedIssues", metrics.unassignedIssues)}
            </div>
            <div className={`text-xl font-black mt-1 ${metrics.unassignedIssues > 0 ? "text-amber-400" : "text-white"}`}>
              {metrics.unassignedIssues}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">Need allocation</div>
            {renderSparkline("unassignedIssues", metrics.unassignedIssues)}

            {/* Tooltip */}
            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 p-3 bg-slate-950 border border-white/10 rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-250 leading-normal text-left">
              <div className="text-amber-400 font-black uppercase text-[8px] tracking-widest mb-1.5 flex items-center gap-1">
                💡 PMO KPI Metric Formula
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Formula Expression:</span>
                  <span className="font-mono font-bold text-slate-200 block mt-0.5 leading-snug">{METRIC_FORMULAS.unassignedIssues.formula}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Source Field / JQL Scope:</span>
                  <span className="text-slate-300 font-medium block mt-0.5">{METRIC_FORMULAS.unassignedIssues.source}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isMetricEnabled("bugsToStoriesRatio") && (
          <motion.div 
            variants={cardVariants} 
            onClick={() => toggleMetricFilter("bugsToStoriesRatio")}
            className={`bg-[#1E293B] p-3.5 rounded-xl border shadow-sm transition-all duration-300 hover:border-orange-500/40 cursor-pointer relative group ${
              activeMetricFilter === "bugsToStoriesRatio" ? "ring-2 ring-orange-500 border-orange-500/30 bg-orange-500/5" : "border-slate-800"
            }`}
          >
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between gap-1">
              <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> Bugs to Stories</span>
              {getTrendUI("bugsToStoriesRatio", metrics.bugsCount || 0)}
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.bugsToStoriesRatio}</div>
            <div className="text-[9px] text-slate-400 mt-0.5">Quality vs feature scale</div>
            {renderSparkline("bugsToStoriesRatio", metrics.bugsCount || 0)}

            {/* Tooltip */}
            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 p-3 bg-slate-950 border border-white/10 rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-250 leading-normal text-left">
              <div className="text-orange-400 font-black uppercase text-[8px] tracking-widest mb-1.5 flex items-center gap-1">
                💡 PMO KPI Metric Formula
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Formula Expression:</span>
                  <span className="font-mono font-bold text-slate-200 block mt-0.5 leading-snug">{METRIC_FORMULAS.bugsToStoriesRatio.formula}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Source Field / JQL Scope:</span>
                  <span className="text-slate-300 font-medium block mt-0.5">{METRIC_FORMULAS.bugsToStoriesRatio.source}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isMetricEnabled("averageCycleTime") && (
          <motion.div 
            variants={cardVariants} 
            onClick={() => toggleMetricFilter("averageCycleTime")}
            className={`bg-[#1E293B] p-3.5 rounded-xl border shadow-sm transition-all duration-300 hover:border-blue-500/40 cursor-pointer relative group ${
              activeMetricFilter === "averageCycleTime" ? "ring-2 ring-blue-500 border-blue-500/30 bg-blue-500/5" : "border-slate-800"
            }`}
          >
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between gap-1">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-400" /> Avg Cycle Time</span>
              {getTrendUI("averageCycleTime", metrics.averageCycleTime)}
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.averageCycleTime}d</div>
            <div className="text-[9px] text-slate-400 mt-0.5">Resolution cycle average</div>
            {renderSparkline("averageCycleTime", metrics.averageCycleTime)}

            {/* Tooltip */}
            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 p-3 bg-slate-950 border border-white/10 rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-250 leading-normal text-left">
              <div className="text-blue-400 font-black uppercase text-[8px] tracking-widest mb-1.5 flex items-center gap-1">
                💡 PMO KPI Metric Formula
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Formula Expression:</span>
                  <span className="font-mono font-bold text-slate-200 block mt-0.5 leading-snug">{METRIC_FORMULAS.averageCycleTime.formula}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Source Field / JQL Scope:</span>
                  <span className="text-slate-300 font-medium block mt-0.5">{METRIC_FORMULAS.averageCycleTime.source}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isMetricEnabled("sprintVelocity") && (
          <motion.div 
            variants={cardVariants} 
            onClick={() => toggleMetricFilter("sprintVelocity")}
            className={`bg-[#1E293B] p-3.5 rounded-xl border shadow-sm transition-all duration-300 hover:border-yellow-500/40 cursor-pointer relative group ${
              activeMetricFilter === "sprintVelocity" ? "ring-2 ring-yellow-500 border-yellow-500/30 bg-yellow-500/5" : "border-slate-800"
            }`}
          >
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between gap-1">
              <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Sprint Velocity</span>
              {getTrendUI("sprintVelocity", metrics.sprintVelocity)}
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.sprintVelocity} SP</div>
            <div className="text-[9px] text-slate-400 mt-0.5">Completed story points</div>
            {renderSparkline("sprintVelocity", metrics.sprintVelocity)}

            {/* Tooltip */}
            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 p-3 bg-slate-950 border border-white/10 rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-250 leading-normal text-left">
              <div className="text-yellow-400 font-black uppercase text-[8px] tracking-widest mb-1.5 flex items-center gap-1">
                💡 PMO KPI Metric Formula
              </div>
              <div className="space-y-1.5 text-[10px]">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Formula Expression:</span>
                  <span className="font-mono font-bold text-slate-200 block mt-0.5 leading-snug">{METRIC_FORMULAS.sprintVelocity.formula}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Source Field / JQL Scope:</span>
                  <span className="text-slate-300 font-medium block mt-0.5">{METRIC_FORMULAS.sprintVelocity.source}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        </motion.div>

        {/* 2. Executive Smart Summary */}
        {aiSummary && (
          <motion.div
            id="jira-report-summary-container"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="bg-gradient-to-r from-blue-950/20 to-indigo-950/10 rounded-xl border border-blue-900/30 p-5 shadow-sm relative overflow-hidden"
          >
            <div className="absolute right-4 top-4 text-blue-950/40 font-bold text-7xl select-none pointer-events-none">PMO</div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 border-b border-blue-900/20 pb-3">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 text-white p-1 rounded">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-blue-200 uppercase tracking-wider">Executive Smart Assessment</h3>
                  <p className="text-[9px] text-blue-400 mt-0.5 font-mono">Analyzed at {new Date(timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
              
              {/* Actions Toolbar */}
              <div className="flex items-center gap-2 shrink-0 z-10">
                {/* Refresh Button */}
                {onRefreshSummary && (
                  <button
                    type="button"
                    disabled={refreshingSummary}
                    onClick={onRefreshSummary}
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                      refreshingSummary
                        ? "bg-blue-950/40 border-blue-900/30 text-blue-450"
                        : "bg-slate-900 border-white/5 hover:border-blue-500/30 text-slate-300 hover:text-blue-400"
                    }`}
                    title="Refresh executive summary with new or current scope insights"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshingSummary ? "animate-spin text-blue-400" : "text-blue-400"}`} />
                    <span>{refreshingSummary ? "Refreshing..." : "Refresh"}</span>
                  </button>
                )}

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/5 hover:border-blue-500/30 text-slate-300 hover:text-blue-400 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Copy full executive summary to clipboard"
                >
                  {copiedSummary ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{copiedSummary ? "Copied" : "Copy"}</span>
                </button>

                {/* Save as Text Button */}
                <button
                  type="button"
                  onClick={handleSaveAsText}
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/5 hover:border-blue-500/30 text-slate-300 hover:text-blue-400 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Download executive summary as a .txt file"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Save as Text</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Health Evaluation Paragraph */}
              <div className="md:col-span-6 space-y-2">
                <span className="text-[9px] font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-900/50">HEALTH EVALUATION</span>
                <p className="text-xs text-slate-350 leading-relaxed font-medium">
                  {aiSummary.summary}
                </p>
              </div>

              {/* Bullet Columns */}
              <div className="md:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Key Insights</div>
                  <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-3 leading-normal font-medium">
                    {aiSummary.keyInsights.map((insight, idx) => (
                      <li key={idx}>{insight}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[9px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Bottlenecks
                  </div>
                  <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-3 leading-normal font-medium">
                    {aiSummary.bottlenecks.map((b, idx) => (
                      <li key={idx} className="text-red-300 font-semibold">{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-blue-900/30 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900/50">PM ACTION RECOMMENDATIONS</span>
              <div className="flex flex-wrap gap-2">
                {aiSummary.recommendations.map((rec, idx) => (
                  <span key={idx} className="text-[11px] font-bold text-slate-200 bg-slate-900/60 border border-slate-800 px-2.5 py-1 rounded">
                    {idx + 1}. {rec}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Sprint Comparison Growth Table */}
        {sprintComparison && (
          <div className="bg-[#1E293B]/40 rounded-xl border border-slate-800/85 p-5 shadow-sm relative overflow-hidden backdrop-blur-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Sprint Performance Growth Comparison
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  Comparing current scope (<span className="text-blue-400 font-semibold">{sprintComparison.currentSprintName}</span>) against previous completed sprint (<span className="text-indigo-400 font-semibold">{sprintComparison.previousSprintName}</span>)
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800/80 px-2.5 py-1 rounded-lg text-[10px] text-slate-400 self-start md:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Historical Metric Compare
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                    <th className="py-2.5 px-3">Performance Metric</th>
                    <th className="py-2.5 px-3 text-right">{sprintComparison.previousSprintName}</th>
                    <th className="py-2.5 px-3 text-right text-blue-300 font-extrabold">{sprintComparison.currentSprintName}</th>
                    <th className="py-2.5 px-3 text-right">Growth / Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {/* Total Issues Row */}
                  {(() => {
                    const prev = sprintComparison.previousMetrics.totalIssues;
                    const curr = sprintComparison.currentMetrics.totalIssues;
                    const diff = curr - prev;
                    const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
                    return (
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-350">Total Jiras In Scope</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{prev}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-white font-semibold">{curr}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            diff > 0 
                              ? "bg-blue-500/10 text-blue-400" 
                              : diff < 0 
                                ? "bg-amber-500/10 text-amber-400" 
                                : "bg-slate-500/10 text-slate-400"
                          }`}>
                            {diff > 0 ? `+${diff}` : diff} ({diff > 0 ? `+${pct}` : pct}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })()}

                  {/* Done Count Row */}
                  {(() => {
                    const prev = sprintComparison.previousMetrics.doneCount;
                    const curr = sprintComparison.currentMetrics.doneCount;
                    const diff = curr - prev;
                    const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
                    return (
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-350">Completed Tickets (Done)</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{prev}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-white font-semibold">{curr}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            diff > 0 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : diff < 0 
                                ? "bg-rose-500/10 text-rose-400" 
                                : "bg-slate-500/10 text-slate-400"
                          }`}>
                            {diff > 0 ? `+${diff}` : diff} ({diff > 0 ? `+${pct}` : pct}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })()}

                  {/* Completion % Row */}
                  {(() => {
                    const prev = sprintComparison.previousMetrics.completionPercentage;
                    const curr = sprintComparison.currentMetrics.completionPercentage;
                    const diff = curr - prev;
                    return (
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-350">Sprint Completion Rate</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{prev}%</td>
                        <td className="py-2.5 px-3 text-right font-mono text-white font-semibold">{curr}%</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            diff > 0 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : diff < 0 
                                ? "bg-rose-500/10 text-rose-400" 
                                : "bg-slate-500/10 text-slate-400"
                          }`}>
                            {diff > 0 ? `+${diff}` : diff} pp
                          </span>
                        </td>
                      </tr>
                    );
                  })()}

                  {/* Velocity Row */}
                  {(() => {
                    const prev = sprintComparison.previousMetrics.sprintVelocity;
                    const curr = sprintComparison.currentMetrics.sprintVelocity;
                    const diff = curr - prev;
                    const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
                    return (
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-350">Sprint Velocity (Story Points)</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{prev} SP</td>
                        <td className="py-2.5 px-3 text-right font-mono text-white font-semibold">{curr} SP</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            diff > 0 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : diff < 0 
                                ? "bg-rose-500/10 text-rose-400" 
                                : "bg-slate-500/10 text-slate-400"
                          }`}>
                            {diff > 0 ? `+${diff}` : diff} SP ({diff > 0 ? `+${pct}` : pct}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })()}

                  {/* Bugs Count Row */}
                  {(() => {
                    const prev = sprintComparison.previousMetrics.bugsCount;
                    const curr = sprintComparison.currentMetrics.bugsCount;
                    const diff = curr - prev;
                    const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
                    return (
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-350">Bugs Logged</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{prev}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-white font-semibold">{curr}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            diff < 0 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : diff > 0 
                                ? "bg-rose-500/10 text-rose-400" 
                                : "bg-slate-500/10 text-slate-400"
                          }`}>
                            {diff > 0 ? `+${diff}` : diff} ({diff > 0 ? `+${pct}` : pct}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- DATE RANGE COMPARISON ASSESSMENT PANEL --- */}
        {report?.comparisonConfig?.enabled && report?.comparisonMetrics && (
          <div className="bg-[#1E293B]/40 rounded-xl border border-slate-800/85 p-5 shadow-sm relative overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" /> Date Range Comparison Assessment
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  Comparing current scope period against the selected baseline period (<span className="text-emerald-400 font-mono font-bold">{report.comparisonConfig.startDate}</span> to <span className="text-emerald-400 font-mono font-bold">{report.comparisonConfig.endDate}</span>)
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800/80 px-2.5 py-1 rounded-lg text-[10px] text-slate-400 self-start md:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Baseline Compare
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                    <th className="py-2.5 px-3">Performance Metric</th>
                    <th className="py-2.5 px-3 text-right">Baseline Period</th>
                    <th className="py-2.5 px-3 text-right text-blue-300 font-extrabold font-mono">Current Period</th>
                    <th className="py-2.5 px-3 text-right">Absolute Growth & Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {/* Total Issues Row */}
                  {(() => {
                    const prev = report.comparisonMetrics!.totalIssues;
                    const curr = report.metrics.totalIssues;
                    const diff = curr - prev;
                    const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
                    return (
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-350">Total Tickets in Scope</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{prev}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-white font-semibold">{curr}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            diff > 0 
                              ? "bg-blue-500/10 text-blue-400" 
                              : diff < 0 
                                ? "bg-amber-500/10 text-amber-400" 
                                : "bg-slate-500/10 text-slate-400"
                          }`}>
                            {diff > 0 ? `+${diff}` : diff} ({diff > 0 ? `+${pct}` : pct}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })()}

                  {/* Done Count Row */}
                  {(() => {
                    const prev = report.comparisonMetrics!.doneCount;
                    const curr = report.metrics.doneCount;
                    const diff = curr - prev;
                    const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
                    return (
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-350">Resolved Tickets (Done)</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{prev}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-white font-semibold">{curr}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            diff > 0 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : diff < 0 
                                ? "bg-rose-500/10 text-rose-400" 
                                : "bg-slate-500/10 text-slate-400"
                          }`}>
                            {diff > 0 ? `+${diff}` : diff} ({diff > 0 ? `+${pct}` : pct}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })()}

                  {/* Completion Rate Row */}
                  {(() => {
                    const prev = report.comparisonMetrics!.completionPercentage;
                    const curr = report.metrics.completionPercentage;
                    const diff = curr - prev;
                    return (
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-350">Resolution Completion Rate</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{prev}%</td>
                        <td className="py-2.5 px-3 text-right font-mono text-white font-semibold">{curr}%</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            diff > 0 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : diff < 0 
                                ? "bg-rose-500/10 text-rose-400" 
                                : "bg-slate-500/10 text-slate-400"
                          }`}>
                            {diff > 0 ? `+${diff}` : diff} pp
                          </span>
                        </td>
                      </tr>
                    );
                  })()}

                  {/* Blocked Count Row */}
                  {(() => {
                    const prev = report.comparisonMetrics!.blockedCount;
                    const curr = report.metrics.blockedCount;
                    const diff = curr - prev;
                    const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
                    return (
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-350">Blocked Tickets</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{prev}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-white font-semibold">{curr}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            diff < 0 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : diff > 0 
                                ? "bg-rose-500/10 text-rose-400" 
                                : "bg-slate-500/10 text-slate-400"
                          }`}>
                            {diff > 0 ? `+${diff}` : diff} ({diff > 0 ? `+${pct}` : pct}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })()}

                  {/* Overdue Count Row */}
                  {(() => {
                    const prev = report.comparisonMetrics!.overdueIssues;
                    const curr = report.metrics.overdueIssues;
                    const diff = curr - prev;
                    const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
                    return (
                      <tr className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-350">Overdue Task Items</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{prev}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-white font-semibold">{curr}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            diff < 0 
                              ? "bg-emerald-500/10 text-emerald-400" 
                              : diff > 0 
                                ? "bg-rose-500/10 text-rose-400" 
                                : "bg-slate-500/10 text-slate-400"
                          }`}>
                            {diff > 0 ? `+${diff}` : diff} ({diff > 0 ? `+${pct}` : pct}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sprint Burndown & Flagged Items Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Sprint Burndown Widget */}
          <SprintBurndownWidget 
            issues={report?.issues ?? []} 
            selectedSprint={report?.config?.selectedSprint || ""} 
          />

          {/* Flagged Items Summary Panel */}
          <div className="bg-[#1E293B] rounded-xl border border-slate-800 p-5 shadow-sm flex flex-col justify-between">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Flag className="w-4 h-4 text-rose-500" fill="currentColor" />
                  Flagged Items for Follow-up
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Critical items marked for priority review and action
                </p>
              </div>
              <span className="bg-rose-950/45 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold">
                {flaggedIssues.length} items
              </span>
            </div>

            <div className="flex-1 my-3 overflow-y-auto max-h-[190px] pr-1 space-y-2">
              {flaggedIssues.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center py-8">
                  <Flag className="w-8 h-8 text-slate-600 mb-2" />
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">No Flagged Items</span>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                    Click the flag icon next to any ticket in the issue list below to mark it for follow-up review.
                  </p>
                </div>
              ) : (
                flaggedIssues.map((issue) => {
                  const customColor = categoryColors[issue.mappedStatus] || "#64748b";
                  return (
                    <div 
                      key={issue.key}
                      className="p-3 bg-slate-950/45 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 hover:border-rose-500/20 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-black text-blue-400 hover:underline cursor-pointer" onClick={() => setSelectedIssueForModal(issue)}>
                            {issue.key}
                          </span>
                          <span 
                            style={{ color: customColor, backgroundColor: `${customColor}15`, borderColor: `${customColor}25` }}
                            className="px-1.5 py-0.2 rounded border font-bold uppercase text-[8px] tracking-wider"
                          >
                            {issue.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-bold mt-1 truncate max-w-[280px]" title={issue.summary}>
                          {issue.summary}
                        </p>
                      </div>
                      <button
                        onClick={() => onToggleFlag?.(issue.key)}
                        className="p-1 hover:bg-slate-850 rounded transition-colors text-rose-500 hover:text-slate-400 cursor-pointer"
                        title="Remove flag"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 3. Visualizations Row (Pie, Bar, Line) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Donut Pie Chart (Status Distribution) */}
          {safeConfig.visualizations.pieChart && (
            <div className="bg-[#1E293B] rounded-xl border border-slate-800 p-5 shadow-sm flex flex-col justify-between">
              <div className="mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Status Distribution</h3>
                <p className="text-[10px] text-slate-500">D3-Engineered Proportional Status Breakdown</p>
              </div>

              <div className="flex-1 flex items-center justify-center my-2">
                <D3PieChart data={statusChartData} totalCount={issues.length} categoryColors={categoryColors} />
              </div>
            </div>
          )}

          {/* Workload / Bar Chart (Issues per Assignee) */}
          {safeConfig.visualizations.barChart && (
            <div className="bg-[#1E293B] rounded-xl border border-slate-800 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Workload Allocation</h3>
                <p className="text-[10px] text-slate-500">Issues assigned to top 5 team members</p>
              </div>

              <div className="my-3 space-y-3">
                {assigneeChartData.length === 0 ? (
                  <div className="text-xs text-slate-500 py-6 text-center">No active assignments.</div>
                ) : (
                  assigneeChartData.map((item) => {
                    const maxCount = Math.max(...assigneeChartData.map((d) => d.count)) || 1;
                    const pct = (item.count / maxCount) * 100;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-350 truncate flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-500" /> {item.name === "Unassigned" ? "Unallocated" : item.name}
                          </span>
                          <span className="font-black text-slate-200">{item.count} tickets</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2">
                          <div
                            className="bg-sky-500 h-2 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Cumulative Velocity Trend (Line Chart) */}
          {safeConfig.visualizations.lineChart && (
            <div className="bg-[#1E293B] rounded-xl border border-slate-800 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Completion Trend</h3>
                <p className="text-[10px] text-slate-500">Cumulative tickets resolved over time</p>
              </div>

              <div className="my-2 flex-1 flex flex-col justify-end min-h-[120px]">
                {lineChartPoints.length <= 1 ? (
                  <div className="text-xs text-slate-500 py-6 text-center">Inception phase. Track resolution events on updates.</div>
                ) : (
                  <div className="relative w-full h-24">
                    {/* Custom CSS Sparkline SVG */}
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="gradient-trend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Area under line */}
                      <path
                        d={`M 0,30 ${lineChartPoints
                          .map((p, idx) => {
                            const x = (idx / (lineChartPoints.length - 1)) * 100;
                            const maxCount = Math.max(...lineChartPoints.map((pt) => pt.count)) || 1;
                            const y = 30 - (p.count / maxCount) * 25;
                            return `L ${x},${y}`;
                          })
                          .join(" ")} L 100,30 Z`}
                        fill="url(#gradient-trend)"
                      />

                      {/* Trend Line */}
                      <polyline
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={lineChartPoints
                          .map((p, idx) => {
                            const x = (idx / (lineChartPoints.length - 1)) * 100;
                            const maxCount = Math.max(...lineChartPoints.map((pt) => pt.count)) || 1;
                            const y = 30 - (p.count / maxCount) * 25;
                            return `${x},${y}`;
                          })
                          .join(" ")}
                      />

                      {/* Trend Circles */}
                      {lineChartPoints.map((p, idx) => {
                        const x = (idx / (lineChartPoints.length - 1)) * 100;
                        const maxCount = Math.max(...lineChartPoints.map((pt) => pt.count)) || 1;
                        const y = 30 - (p.count / maxCount) * 25;
                        return (
                          <circle
                            key={idx}
                            cx={x}
                            cy={y}
                            r={hoveredTrendIdx === idx ? "3.5" : "1.8"}
                            className={`fill-slate-950 stroke-indigo-400 transition-all duration-150 ${hoveredTrendIdx === idx ? "stroke-2" : "stroke-1"}`}
                          />
                        );
                      })}

                      {/* Hover transparent columns */}
                      {lineChartPoints.map((p, idx) => {
                        const x = (idx / (lineChartPoints.length - 1)) * 100;
                        const width = 100 / (lineChartPoints.length - 1);
                        return (
                          <rect
                            key={idx}
                            x={idx === 0 ? 0 : x - width / 2}
                            y={0}
                            width={width}
                            height={30}
                            fill="transparent"
                            className="cursor-crosshair"
                            onMouseEnter={() => setHoveredTrendIdx(idx)}
                            onMouseLeave={() => setHoveredTrendIdx(null)}
                          />
                        );
                      })}
                    </svg>

                    {/* Tooltip */}
                    {hoveredTrendIdx !== null && (
                      <div 
                        className="absolute bg-slate-900/95 border border-indigo-500/30 rounded-lg p-2 shadow-2xl pointer-events-none text-[10px] font-sans text-left z-50 transition-all duration-150 backdrop-blur-sm min-w-[130px]"
                        style={{
                          left: `${(hoveredTrendIdx / (lineChartPoints.length - 1)) * 80 + 10}%`,
                          top: '0px',
                          transform: 'translateX(-50%)',
                        }}
                      >
                        <div className="text-[9px] text-slate-400 font-bold">{lineChartPoints[hoveredTrendIdx].date}</div>
                        <div className="text-white font-extrabold mt-1 flex items-center justify-between gap-1">
                          <span>Resolved:</span>
                          <span className="text-indigo-400 font-mono font-black">{lineChartPoints[hoveredTrendIdx].count} tickets</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Min/Max indicators */}
                    <div className="flex justify-between text-[9px] font-bold text-slate-500 mt-2 font-mono">
                      <span>{lineChartPoints[0].date}</span>
                      <span>{lineChartPoints[lineChartPoints.length - 1].date}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3.5. 30-Day Trend Analysis Visualization */}
        {safeConfig.visualizations.trendAnalysis !== false && (
          <TrendAnalysisChart issues={issues} />
        )}
 
        {/* 4. Issue Timeline Progress Tracker Widget */}
        <div id="issue-timeline-tracker-section" className="bg-[#1E293B] rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-400" />
                Issue Timeline Progress Tracker
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold">
                Horizontal progression axis tracking status transitions, comments, and milestones
              </p>
            </div>

            {(() => {
              const issues = report?.issues || [];
              const currentIssue = issues.find((i) => i.key === (selectedTimelineKey || (issues[0]?.key || "")));
              
              if (issues.length === 0) return null;
              
              let rawEvents = [];
              if (showFullHistory) {
                issues.forEach((issue) => {
                  const issueEvents = compileTimelineEvents(issue);
                  issueEvents.forEach((evt) => {
                    rawEvents.push({
                      ...evt,
                      label: `${issue.key}: ${evt.label}`,
                      desc: `[${issue.key} - ${issue.summary}] ${evt.desc}`,
                    });
                  });
                });
              } else if (currentIssue) {
                rawEvents = compileTimelineEvents(currentIssue);
              }
              const events = getGroupedTimelineEvents(rawEvents, timelineZoom);
              
              return (
                <div className="flex flex-wrap items-center gap-3">
                  {/* Resolution Zoom Level Selector */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-white/5 p-1 rounded-lg">
                    {(["Daily", "Weekly", "Monthly"] as const).map((z) => {
                      const isSelected = timelineZoom === z;
                      return (
                        <button
                          key={z}
                          onClick={() => {
                            setTimelineZoom(z);
                            setSelectedTimelineEventIdx(0);
                          }}
                          className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-sky-500 text-slate-950 shadow-sm font-extrabold" 
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                          }`}
                        >
                          {z}
                        </button>
                      );
                    })}
                  </div>

                  {/* Show Full History Toggle */}
                  <button
                    onClick={() => {
                      setShowFullHistory(!showFullHistory);
                      setSelectedTimelineEventIdx(0);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                      showFullHistory
                        ? "bg-indigo-500/25 text-indigo-350 border-indigo-500/40 shadow-sm ring-1 ring-indigo-500/30"
                        : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                    }`}
                    title="Toggle display of all issues' status transitions vs active ticket"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    Full History: {showFullHistory ? "ON" : "OFF"}
                  </button>

                  {/* Auto-scroll to Latest Event */}
                  <button
                    onClick={() => {
                      if (timelineViewportRef.current) {
                        const el = timelineViewportRef.current;
                        el.scrollTo({
                          left: el.scrollWidth - el.clientWidth,
                          behavior: "smooth",
                        });
                      }
                      setSelectedTimelineEventIdx(events.length - 1);
                      addToast?.("Centered Timeline", "Scrolled to the most recent chronological event.", "info", 2000);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-[10px] font-black uppercase tracking-wider text-slate-350 hover:text-white rounded-lg border border-white/10 transition-colors shadow-sm cursor-pointer"
                    title="Auto-scroll viewport to the latest event node"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 rotate-90 text-sky-400" />
                    Latest Event
                  </button>

                  {/* Dedicated Export Button Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsTimelineExportOpen(!isTimelineExportOpen)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-[10px] font-black uppercase tracking-wider text-slate-350 hover:text-white rounded-lg border border-white/10 transition-colors shadow-sm cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" /> Export <ChevronDown className="w-3 h-3 text-slate-500" />
                    </button>
                    
                    {isTimelineExportOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsTimelineExportOpen(false)}
                        />
                        <div className="absolute right-0 mt-1.5 w-40 bg-slate-950 border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                          <button
                            onClick={() => {
                              downloadTimelineCSV(currentIssue?.key || "");
                              setIsTimelineExportOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg transition-colors cursor-pointer text-left"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 font-bold" /> Save as CSV
                          </button>
                          <button
                            onClick={() => {
                              downloadTimelinePDF(currentIssue?.key || "");
                              setIsTimelineExportOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg transition-colors cursor-pointer text-left"
                          >
                            <Printer className="w-3.5 h-3.5 text-rose-400 font-bold" /> Print / Save PDF
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Issue Selector Dropdown */}
                  <div className={`flex items-center gap-2 bg-slate-950 border border-white/5 p-1 rounded-lg transition-all ${showFullHistory ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider pl-1.5">Ticket:</span>
                    <select
                      value={selectedTimelineKey || (issues[0]?.key || "")}
                      onChange={(e) => {
                        setSelectedTimelineKey(e.target.value);
                        setSelectedTimelineEventIdx(0);
                      }}
                      disabled={showFullHistory}
                      className="bg-transparent text-xs font-mono font-bold text-slate-200 px-2.5 py-1 focus:outline-none transition-all cursor-pointer max-w-[150px] sm:max-w-[250px]"
                    >
                      {issues.map((issue) => (
                        <option key={issue.key} value={issue.key} className="bg-slate-950">
                          {issue.key} - {issue.summary.slice(0, 25)}...
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })()}
          </div>

          {(() => {
            const issues = report?.issues || [];
            const currentIssue = issues.find((i) => i.key === (selectedTimelineKey || (issues[0]?.key || "")));
            
            if (issues.length === 0) {
              return <p className="text-xs text-slate-500 py-6 text-center font-bold">No issues in the current report to plot.</p>;
            }
            if (!currentIssue && !showFullHistory) {
              return <p className="text-xs text-slate-500 py-6 text-center font-bold">Select a ticket or toggle 'Full History' to plot.</p>;
            }

            let rawEvents = [];
            if (showFullHistory) {
              issues.forEach((issue) => {
                const issueEvents = compileTimelineEvents(issue);
                issueEvents.forEach((evt) => {
                  rawEvents.push({
                    ...evt,
                    label: `${issue.key}: ${evt.label}`,
                    desc: `[${issue.key} - ${issue.summary}] ${evt.desc}`,
                  });
                });
              });
            } else if (currentIssue) {
              rawEvents = compileTimelineEvents(currentIssue);
            }

            const events = getGroupedTimelineEvents(rawEvents, timelineZoom);
            const activeEventIdx = Math.min(selectedTimelineEventIdx, Math.max(0, events.length - 1));

            if (events.length === 0) {
              return <p className="text-xs text-slate-500 py-10 text-center font-bold">No timeline logs recorded for this zoom level.</p>;
            }

            return (
              <div className="space-y-6 pt-2">
                {/* Visual Horizontal Timeline Axis */}
                <div 
                  ref={timelineViewportRef} 
                  className="relative pt-8 pb-4 px-4 overflow-x-auto scrollbar-thin scroll-smooth"
                >
                  {/* Progress Line */}
                  <div className="absolute top-[52px] left-8 right-8 h-1.5 bg-slate-950 rounded-full">
                    <div 
                      className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${events.length > 1 ? 100 : 0}%` }}
                    />
                  </div>

                  {/* Axis Nodes */}
                  <div className="relative flex justify-between min-w-[600px] gap-8">
                    {events.map((evt, idx) => {
                      const isCreated = evt.type === "created";
                      const isStatus = evt.type === "status";
                      const isComment = evt.type === "comment";
                      const isMixed = evt.type === "mixed";
                      const isSelectedNode = activeEventIdx === idx;

                      // COLOR CODING BASED ON STATUS CATEGORY (Done: green, In Progress: blue, Blocked: red, To Do: Slate)
                      let nodeColorClass = "bg-slate-500/10 border-slate-400 text-slate-350 hover:border-slate-300";
                      if (evt.statusCategory === "Done") {
                        nodeColorClass = "bg-emerald-500/10 border-emerald-400 text-emerald-400 hover:border-emerald-300";
                      } else if (evt.statusCategory === "In Progress") {
                        nodeColorClass = "bg-sky-500/10 border-sky-400 text-sky-400 hover:border-sky-300";
                      } else if (evt.statusCategory === "Blocked") {
                        nodeColorClass = "bg-rose-500/10 border-rose-400 text-rose-400 hover:border-rose-300";
                      }

                      return (
                        <motion.div 
                          key={`${selectedTimelineKey}-${timelineZoom}-${showFullHistory}-${idx}`} 
                          initial={{ opacity: 0, y: 12, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.4) }}
                          className="flex flex-col items-center flex-1 cursor-pointer group relative"
                          onClick={() => setSelectedTimelineEventIdx(idx)}
                          onMouseEnter={() => setHoveredTimelineNodeIdx(idx)}
                          onMouseLeave={() => setHoveredTimelineNodeIdx(null)}
                        >
                          {/* Hover Tooltip for Event Node */}
                          <AnimatePresence>
                            {hoveredTimelineNodeIdx === idx && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute bottom-[105%] left-1/2 -translate-x-1/2 mb-2 bg-slate-950 border border-sky-500/30 rounded-xl p-3 shadow-2xl z-50 text-left min-w-[220px] max-w-[280px] pointer-events-none backdrop-blur-md"
                              >
                                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5 mb-1.5">
                                  <span className="text-[10px] font-black text-white uppercase tracking-wider truncate">
                                    {evt.label}
                                  </span>
                                  <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded font-mono ${
                                    evt.statusCategory === "Done" 
                                      ? "bg-emerald-500/20 text-emerald-400" 
                                      : evt.statusCategory === "Blocked"
                                        ? "bg-rose-500/20 text-rose-400"
                                        : evt.statusCategory === "In Progress"
                                          ? "bg-sky-500/20 text-sky-400"
                                          : "bg-slate-500/20 text-slate-350"
                                  }`}>
                                    {evt.statusCategory}
                                  </span>
                                </div>
                                <div className="text-[9px] text-slate-400 font-bold font-mono flex items-center gap-1 mb-1">
                                  <Clock className="w-3 h-3 text-sky-400" />
                                  {evt.date}
                                </div>
                                <p className="text-[9.5px] text-slate-300 font-medium leading-relaxed whitespace-pre-line line-clamp-4">
                                  {evt.desc}
                                </p>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 rotate-45 bg-slate-950 border-r border-b border-sky-500/30"></div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Event Date above */}
                          <span className="text-[8.5px] font-mono font-bold text-slate-500 mb-2 group-hover:text-slate-300 transition-colors">
                            {evt.date}
                          </span>

                          {/* Node bubble */}
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-350 z-10 ${nodeColorClass} ${
                            isSelectedNode 
                              ? "ring-4 ring-sky-500/30 scale-110 shadow-lg shadow-sky-500/20" 
                              : "group-hover:scale-105"
                          }`}>
                            {isCreated && <CheckSquare className="w-4 h-4 animate-in zoom-in-50" />}
                            {isStatus && <ArrowRight className="w-4 h-4 animate-in zoom-in-50" />}
                            {isComment && <MessageSquare className="w-4 h-4 animate-in zoom-in-50" />}
                            {isMixed && <Sparkles className="w-4 h-4 text-amber-400 animate-in zoom-in-50" />}
                          </div>

                          {/* Event Short Label below */}
                          <span className={`text-[9.5px] font-black uppercase tracking-wider text-center mt-3 truncate max-w-[120px] ${
                            isSelectedNode ? "text-sky-400 font-extrabold" : "text-slate-400 group-hover:text-slate-300"
                          }`}>
                            {evt.label}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Event Detail Card */}
                {events[activeEventIdx] && (
                  <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 flex gap-4 items-start animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
                    <div className="p-3 rounded-xl bg-[#1E293B] border border-white/5 shrink-0">
                      {events[activeEventIdx].type === "created" && <CheckSquare className="w-5 h-5 text-blue-400" />}
                      {events[activeEventIdx].type === "status" && <ArrowRight className="w-5 h-5 text-emerald-400" />}
                      {events[activeEventIdx].type === "comment" && <MessageSquare className="w-5 h-5 text-amber-400" />}
                      {events[activeEventIdx].type === "mixed" && <Sparkles className="w-5 h-5 text-indigo-400" />}
                    </div>
                    <div className="space-y-1 text-left min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-100 uppercase tracking-wide">
                            {events[activeEventIdx].label}
                          </span>
                          <span className="font-mono text-[9px] font-bold text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-white/5">
                            {events[activeEventIdx].date}
                          </span>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                          events[activeEventIdx].statusCategory === "Done" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : events[activeEventIdx].statusCategory === "Blocked"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : events[activeEventIdx].statusCategory === "In Progress"
                                ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                : "bg-slate-500/10 text-slate-350 border border-slate-500/20"
                        }`}>
                          {events[activeEventIdx].statusCategory}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium whitespace-pre-line mt-1 font-sans">
                        {events[activeEventIdx].desc}
                      </p>
                    </div>
                  </div>
                )}

                {/* Visual Legend of Color Coding & Icons */}
                <div className="border-t border-white/5 pt-4 mt-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[10px] font-semibold text-slate-400">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Status Colors:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-500/20 border border-slate-400" />
                      <span>To Do</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500/20 border border-sky-400" />
                      <span>In Progress</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-400" />
                      <span>Blocked</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-400" />
                      <span>Done / Resolved</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Event Types:</span>
                    <div className="flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                      <span>Created</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Transition</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>Comment</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Mixed</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Historical Metrics Performance Trends Section */}
        <div id="historical-metric-trends-section" className="bg-[#1E293B] rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Historical Metric Performance Trends
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold">Historical progression mapping backlog scope volume alongside cumulative resolution rates</p>
            </div>
            {!metricsHistory || metricsHistory.length === 0 ? (
              <span className="text-[8px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wider">
                Sandbox History Enabled
              </span>
            ) : (
              <span className="text-[8px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-wider">
                Live Audits Registered ({metricsHistory.length})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: Total Issues Volume */}
            <div className="bg-slate-950/45 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Backlog Volume</span>
                <span className="text-xs font-black text-indigo-400 font-mono">
                  {getHistoricalDataPoints()[getHistoricalDataPoints().length - 1].totalIssues} tickets
                </span>
              </div>
              <div className="h-28 relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 35" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="total-issues-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="5" x2="100" y2="5" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  <line x1="0" y1="17.5" x2="100" y2="17.5" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  <line x1="0" y1="30" x2="100" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

                  {/* Gradient Area */}
                  <path
                    d={`M 0,35 ${getHistoricalDataPoints().map((pt, idx) => {
                      const x = (idx / (getHistoricalDataPoints().length - 1)) * 100;
                      const maxVal = Math.max(...getHistoricalDataPoints().map(d => d.totalIssues)) || 1;
                      const minVal = Math.min(...getHistoricalDataPoints().map(d => d.totalIssues)) || 0;
                      const rng = maxVal - minVal || 1;
                      const y = 32 - ((pt.totalIssues - minVal) / rng) * 25;
                      return `L ${x},${y}`;
                    }).join(" ")} L 100,35 Z`}
                    fill="url(#total-issues-grad)"
                  />

                  {/* Trend Line */}
                  <polyline
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={getHistoricalDataPoints().map((pt, idx) => {
                      const x = (idx / (getHistoricalDataPoints().length - 1)) * 100;
                      const maxVal = Math.max(...getHistoricalDataPoints().map(d => d.totalIssues)) || 1;
                      const minVal = Math.min(...getHistoricalDataPoints().map(d => d.totalIssues)) || 0;
                      const rng = maxVal - minVal || 1;
                      const y = 32 - ((pt.totalIssues - minVal) / rng) * 25;
                      return `${x},${y}`;
                    }).join(" ")}
                  />

                  {/* Data Points */}
                  {getHistoricalDataPoints().map((pt, idx) => {
                    const x = (idx / (getHistoricalDataPoints().length - 1)) * 100;
                    const maxVal = Math.max(...getHistoricalDataPoints().map(d => d.totalIssues)) || 1;
                    const minVal = Math.min(...getHistoricalDataPoints().map(d => d.totalIssues)) || 0;
                    const rng = maxVal - minVal || 1;
                    const y = 32 - ((pt.totalIssues - minVal) / rng) * 25;
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r={hoveredHistory1Idx === idx ? "3.5" : "2.2"}
                        className={`fill-slate-950 stroke-indigo-400 transition-all duration-150 ${hoveredHistory1Idx === idx ? "stroke-2" : "stroke-[1.5]"}`}
                      />
                    );
                  })}

                  {/* Transparent hover columns */}
                  {getHistoricalDataPoints().map((pt, idx) => {
                    const x = (idx / (getHistoricalDataPoints().length - 1)) * 100;
                    const width = 100 / (getHistoricalDataPoints().length - 1);
                    return (
                      <rect
                        key={idx}
                        x={idx === 0 ? 0 : x - width / 2}
                        y={0}
                        width={width}
                        height={35}
                        fill="transparent"
                        className="cursor-crosshair"
                        onMouseEnter={() => setHoveredHistory1Idx(idx)}
                        onMouseLeave={() => setHoveredHistory1Idx(null)}
                      />
                    );
                  })}
                </svg>

                {/* Custom Tooltip */}
                {hoveredHistory1Idx !== null && (
                  <div 
                    className="absolute bg-slate-900/95 border border-indigo-500/30 rounded-lg p-2 shadow-2xl pointer-events-none text-[10px] font-sans text-left z-50 transition-all duration-150 backdrop-blur-sm min-w-[140px]"
                    style={{
                      left: `${(hoveredHistory1Idx / (getHistoricalDataPoints().length - 1)) * 80 + 10}%`,
                      top: '10px',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div className="text-[9px] text-slate-400 font-bold">{getHistoricalDataPoints()[hoveredHistory1Idx].fullTimestamp}</div>
                    <div className="text-white font-extrabold mt-1 flex items-center justify-between gap-1">
                      <span>Total Backlog:</span>
                      <span className="text-indigo-400 font-mono font-black">{getHistoricalDataPoints()[hoveredHistory1Idx].totalIssues} issues</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[8px] text-slate-500 font-bold font-mono">
                {getHistoricalDataPoints().map((pt, idx) => (
                  <span key={idx}>{pt.date}</span>
                ))}
              </div>
            </div>

            {/* Chart 2: Completion Percentage */}
            <div className="bg-slate-950/45 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Completion Efficiency</span>
                <span className="text-xs font-black text-emerald-400 font-mono">
                  {getHistoricalDataPoints()[getHistoricalDataPoints().length - 1].completionPercentage}%
                </span>
              </div>
              <div className="h-28 relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 35" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="comp-pct-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="5" x2="100" y2="5" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  <line x1="0" y1="17.5" x2="100" y2="17.5" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  <line x1="0" y1="30" x2="100" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />

                  {/* Gradient Area */}
                  <path
                    d={`M 0,35 ${getHistoricalDataPoints().map((pt, idx) => {
                      const x = (idx / (getHistoricalDataPoints().length - 1)) * 100;
                      const maxVal = Math.max(...getHistoricalDataPoints().map(d => d.completionPercentage)) || 100;
                      const minVal = Math.min(...getHistoricalDataPoints().map(d => d.completionPercentage)) || 0;
                      const rng = maxVal - minVal || 1;
                      const y = 32 - ((pt.completionPercentage - minVal) / rng) * 25;
                      return `L ${x},${y}`;
                    }).join(" ")} L 100,35 Z`}
                    fill="url(#comp-pct-grad)"
                  />

                  {/* Trend Line */}
                  <polyline
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={getHistoricalDataPoints().map((pt, idx) => {
                      const x = (idx / (getHistoricalDataPoints().length - 1)) * 100;
                      const maxVal = Math.max(...getHistoricalDataPoints().map(d => d.completionPercentage)) || 100;
                      const minVal = Math.min(...getHistoricalDataPoints().map(d => d.completionPercentage)) || 0;
                      const rng = maxVal - minVal || 1;
                      const y = 32 - ((pt.completionPercentage - minVal) / rng) * 25;
                      return `${x},${y}`;
                    }).join(" ")}
                  />

                  {/* Data Points */}
                  {getHistoricalDataPoints().map((pt, idx) => {
                    const x = (idx / (getHistoricalDataPoints().length - 1)) * 100;
                    const maxVal = Math.max(...getHistoricalDataPoints().map(d => d.completionPercentage)) || 100;
                    const minVal = Math.min(...getHistoricalDataPoints().map(d => d.completionPercentage)) || 0;
                    const rng = maxVal - minVal || 1;
                    const y = 32 - ((pt.completionPercentage - minVal) / rng) * 25;
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r={hoveredHistory2Idx === idx ? "3.5" : "2.2"}
                        className={`fill-slate-950 stroke-emerald-400 transition-all duration-150 ${hoveredHistory2Idx === idx ? "stroke-2" : "stroke-[1.5]"}`}
                      />
                    );
                  })}

                  {/* Transparent hover columns */}
                  {getHistoricalDataPoints().map((pt, idx) => {
                    const x = (idx / (getHistoricalDataPoints().length - 1)) * 100;
                    const width = 100 / (getHistoricalDataPoints().length - 1);
                    return (
                      <rect
                        key={idx}
                        x={idx === 0 ? 0 : x - width / 2}
                        y={0}
                        width={width}
                        height={35}
                        fill="transparent"
                        className="cursor-crosshair"
                        onMouseEnter={() => setHoveredHistory2Idx(idx)}
                        onMouseLeave={() => setHoveredHistory2Idx(null)}
                      />
                    );
                  })}
                </svg>

                {/* Custom Tooltip */}
                {hoveredHistory2Idx !== null && (
                  <div 
                    className="absolute bg-slate-900/95 border border-emerald-500/30 rounded-lg p-2 shadow-2xl pointer-events-none text-[10px] font-sans text-left z-50 transition-all duration-150 backdrop-blur-sm min-w-[140px]"
                    style={{
                      left: `${(hoveredHistory2Idx / (getHistoricalDataPoints().length - 1)) * 80 + 10}%`,
                      top: '10px',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div className="text-[9px] text-slate-400 font-bold">{getHistoricalDataPoints()[hoveredHistory2Idx].fullTimestamp}</div>
                    <div className="text-white font-extrabold mt-1 flex items-center justify-between gap-1">
                      <span>Efficiency:</span>
                      <span className="text-emerald-400 font-mono font-black">{getHistoricalDataPoints()[hoveredHistory2Idx].completionPercentage}%</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[8px] text-slate-500 font-bold font-mono">
                {getHistoricalDataPoints().map((pt, idx) => (
                  <span key={idx}>{pt.date}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Recharts Sprint Velocity & Performance Trend */}
          <div className="bg-slate-950/45 border border-white/5 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  Velocity & Completion Trend (Last 5 Sprints)
                </h4>
                <p className="text-[10px] text-slate-500">
                  Sprint velocity and completion rate progress comparison over the last 5 active iterations
                </p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Velocity (SP)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completion Rate (%)
                </span>
              </div>
            </div>

            <div className="h-56 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={(() => {
                    const currentSprintName = sprintComparison?.currentSprintName || "Sprint 5";
                    const currentVelocity = sprintComparison?.currentMetrics?.sprintVelocity || 48;
                    const previousSprintName = sprintComparison?.previousSprintName || "Sprint 4";
                    const previousVelocity = sprintComparison?.previousMetrics?.sprintVelocity || 42;
                    const prevBugs = sprintComparison?.previousMetrics?.bugsCount || 4;
                    const currBugs = sprintComparison?.currentMetrics?.bugsCount || 2;
                    
                    return [
                      { sprint: "Sprint 1", velocity: 28, completionRate: 60, bugs: 7 },
                      { sprint: "Sprint 2", velocity: 35, completionRate: 72, bugs: 5 },
                      { sprint: "Sprint 3", velocity: 38, completionRate: 75, bugs: 4 },
                      { sprint: previousSprintName, velocity: previousVelocity, completionRate: 82, bugs: prevBugs },
                      { sprint: currentSprintName, velocity: currentVelocity, completionRate: 90, bugs: currBugs }
                    ];
                  })()}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="sprint" 
                    stroke="#64748b" 
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      fontSize: "10px",
                      color: "#fff"
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    content={() => null}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="velocity" 
                    name="Velocity (SP)"
                    stroke="#3b82f6" 
                    strokeWidth={2.5}
                    activeDot={{ r: 6 }} 
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completionRate" 
                    name="Completion Rate (%)"
                    stroke="#10b981" 
                    strokeWidth={2.5}
                    activeDot={{ r: 6 }}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 3.5 Issue Density Heatmap Grid Visualizer */}
      <div id="issue-density-heatmap-section" className="bg-[#1E293B] rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Issue Density Correlation Heatmap
          </h3>
          <p className="text-[10px] text-slate-500">
            Grid density correlation matrix mapping issue volumes per assignee across standard workflow lifecycle categories. Click any density box to instantly filter the table.
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[600px] border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
            {/* Header row */}
            <div className="grid grid-cols-5 bg-slate-950/45 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400 p-3">
              <div className="col-span-1 flex items-center">Assignee</div>
              <div className="col-span-4 grid grid-cols-4 text-center">
                <div>To Do</div>
                <div>In Progress</div>
                <div>Done</div>
                <div>Blocked</div>
              </div>
            </div>

            {/* Content rows */}
            <div className="divide-y divide-slate-800 text-xs">
              {heatmapData.assignees.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-bold">
                  No assignees mapped in this active report.
                </div>
              ) : (
                heatmapData.assignees.map((assignee) => {
                  return (
                    <div key={assignee} className="grid grid-cols-5 items-center p-2.5 hover:bg-slate-900/20 transition-all">
                      {/* Assignee Name */}
                      <div className="col-span-1 font-bold text-slate-300 flex items-center gap-1.5 min-w-0 pr-2">
                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate" title={assignee}>{assignee === "Unassigned" ? "Unallocated" : assignee}</span>
                      </div>

                      {/* Heatmap Grid Cells */}
                      <div className="col-span-4 grid grid-cols-4 gap-2">
                        {heatmapData.statuses.map((status) => {
                          const cell = heatmapData.grid[`${assignee}-${status}`] || { count: 0, issueKeys: [] };
                          const colorClass = getHeatmapColor(cell.count);
                          return (
                            <div
                              key={status}
                              onClick={() => {
                                if (cell.count > 0) {
                                  // Instantly filter the table by assignee name
                                  setSearchQuery(assignee);
                                  addToast?.(
                                    "Heatmap Focus Filter",
                                    `Filtered table to show ${cell.count} issue(s) assigned to ${assignee} (status: ${status}).`,
                                    "info",
                                    3000
                                  );
                                }
                              }}
                              className={`py-3 px-2 rounded-lg text-center border text-[11px] font-black transition-all cursor-pointer group relative flex flex-col items-center justify-center ${colorClass}`}
                            >
                              <span>{cell.count}</span>
                              <span className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1 text-slate-400 font-mono">
                                tickets
                              </span>

                              {/* Hover Tooltip */}
                              {cell.count > 0 && (
                                <div className="absolute bottom-full mb-2 hidden group-hover:block z-30 w-48 p-2.5 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl text-left pointer-events-none text-[10px] leading-relaxed font-semibold text-slate-350">
                                  <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                                    🎫 {assignee} - {status}
                                  </div>
                                  <div className="max-h-20 overflow-y-auto space-y-1 custom-scrollbar">
                                    {cell.issueKeys.map((k) => {
                                      const fullIssue = (report?.issues || []).find((i) => i.key === k);
                                      return (
                                        <div key={k} className="flex justify-between gap-1.5 font-mono">
                                          <span className="text-blue-400 font-bold shrink-0">{k}</span>
                                          <span className="truncate text-slate-400 max-w-[120px]">{fullIssue?.summary}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Filterable Interactive Table Section */}
      {safeConfig.visualizations.table && (
        <div className="bg-[#1E293B] rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          {/* Dynamic Drag and Drop Targets Panel (Visible only when an issue row is actively dragged) */}
          <AnimatePresence>
            {draggedIssueKey && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-950 border-b border-blue-500/20 px-5 py-4 overflow-hidden"
              >
                <div className="flex flex-col md:flex-row gap-5 items-stretch">
                  {/* Status Dropspots */}
                  <div className="flex-1 space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> Drop to Reassign Status
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      {(["To Do", "In Progress", "Done", "Blocked"] as const).map((status) => {
                        const isOver = isDraggingOverTarget === `status-${status}`;
                        return (
                          <div
                            key={status}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDraggingOverTarget(`status-${status}`);
                            }}
                            onDragLeave={() => setIsDraggingOverTarget(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDraggingOverTarget(null);
                              if (draggedIssueKey) {
                                onUpdateIssueStatusOrSprint?.(draggedIssueKey, status, undefined);
                              }
                            }}
                            className={`py-3 px-2 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${
                              isOver
                                ? "bg-blue-600/25 border-blue-400 text-blue-300 scale-[1.03] shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                : "bg-slate-900 border-white/5 hover:border-white/10 text-slate-400"
                            }`}
                          >
                            <span className="text-[10.5px] font-extrabold uppercase tracking-wide">{status}</span>
                            <span className="text-[8px] font-mono opacity-50 mt-1">Drop Zone</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sprint Dropspots */}
                  <div className="flex-1 space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Drop to Reassign Sprint
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      {(["Sprint 1", "Sprint 2", "Sprint 3", "Backlog"] as const).map((sprintName) => {
                        const isOver = isDraggingOverTarget === `sprint-${sprintName}`;
                        const sprintVal = sprintName === "Backlog" ? "" : sprintName;
                        return (
                          <div
                            key={sprintName}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDraggingOverTarget(`sprint-${sprintName}`);
                            }}
                            onDragLeave={() => setIsDraggingOverTarget(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDraggingOverTarget(null);
                              if (draggedIssueKey) {
                                onUpdateIssueStatusOrSprint?.(draggedIssueKey, undefined, sprintVal);
                              }
                            }}
                            className={`py-3 px-2 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${
                              isOver
                                ? "bg-indigo-600/25 border-indigo-400 text-indigo-300 scale-[1.03] shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                : "bg-slate-900 border-white/5 hover:border-white/10 text-slate-400"
                            }`}
                          >
                            <span className="text-[10.5px] font-extrabold uppercase tracking-wide">{sprintName}</span>
                            <span className="text-[8px] font-mono opacity-50 mt-1">Drop Zone</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table Header Controls */}
          <div className="p-4 bg-slate-900/30 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {selectedIssueKeys.length > 0 ? (
              <div className="bg-blue-950/45 border border-blue-500/25 px-3 py-1.5 rounded-xl flex flex-col md:flex-row md:items-center gap-2.5 shrink-0 animate-in fade-in slide-in-from-top-1 duration-200 w-full md:w-auto">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black text-blue-300 flex items-center gap-1 uppercase tracking-wider whitespace-nowrap">
                    ⚡ {selectedIssueKeys.length} selected ({filteredSelectedIssueKeys.length} filtered):
                  </span>
                  
                  {/* Select All Visible checkbox */}
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer select-none border-l border-slate-700 pl-2 shrink-0">
                    <input
                      type="checkbox"
                      id="bulk-select-all-visible-checkbox"
                      checked={filteredIssues.length > 0 && filteredIssues.every(i => selectedIssueKeys.includes(i.key))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const keysToSelect = filteredIssues.map(i => i.key);
                          setSelectedIssueKeys(Array.from(new Set([...selectedIssueKeys, ...keysToSelect])));
                        } else {
                          const keysToRemove = filteredIssues.map(i => i.key);
                          setSelectedIssueKeys(prev => prev.filter(k => !keysToRemove.includes(k)));
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <span>Select All Visible</span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-800 font-black hidden md:inline">|</span>
                  
                  {/* Substring Search Input */}
                  <div className="relative shrink-0">
                    <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
                    <input
                      type="text"
                      placeholder="Filter selected..."
                      value={bulkSearchQuery}
                      onChange={(e) => setBulkSearchQuery(e.target.value)}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-[10px] rounded pl-6 pr-2 py-1 w-32 focus:outline-none focus:border-blue-500 placeholder-slate-650 font-medium"
                    />
                  </div>

                  <span className="text-slate-800 font-black">|</span>

                  <select
                    id="bulk-update-status-select"
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-[10px] rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 font-extrabold cursor-pointer"
                    defaultValue="In Progress"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const sel = document.getElementById("bulk-update-status-select") as HTMLSelectElement;
                      if (sel) handleBulkUpdate(sel.value);
                    }}
                    disabled={isBulkUpdating || filteredSelectedIssueKeys.length === 0}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[9.5px] px-3 py-1 rounded transition-all disabled:opacity-45 cursor-pointer flex items-center gap-1 uppercase tracking-wider"
                  >
                    {isBulkUpdating ? "Updating..." : "Transition Status"}
                  </button>
                  <span className="text-slate-800 font-black">|</span>
                  <button
                    type="button"
                    onClick={downloadSelectedCSV}
                    disabled={filteredSelectedIssueKeys.length === 0}
                    className="bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 px-2.5 py-1 rounded text-[9.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                    title="Export filtered selected items to CSV spreadsheet"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadSelectedPDF}
                    disabled={filteredSelectedIssueKeys.length === 0}
                    className="bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 px-2.5 py-1 rounded text-[9.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                    title="Export filtered selected items to PDF report"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-400" />
                    <span>Export PDF</span>
                  </button>
                  <span className="text-slate-800 font-black">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIssueKeys([]);
                      setBulkSearchQuery("");
                    }}
                    className="text-slate-400 hover:text-slate-200 text-[9.5px] uppercase font-bold px-1.5 py-1 hover:bg-white/5 rounded transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Issue Analysis Matrix</h3>
                <span className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded">
                  {filteredIssues.length} Matches
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {/* Search with 'Quick Export' action icon */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search key, summary, assignee..."
                  id="table-search-input"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded pl-8 pr-9 py-1.5 w-full sm:w-56 focus:outline-none focus:border-blue-500 placeholder-slate-500 font-medium"
                />
                {/* 'Quick Export' Action Icon at the end of the search bar */}
                <button
                  type="button"
                  onClick={downloadSearchedCSV}
                  className="absolute right-2 top-2 p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-all cursor-pointer flex items-center justify-center animate-pulse hover:animate-none"
                  title="Quick Export currently searched/filtered subset of issues to CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              </div>

              {/* Sorting Dropdown next to/as part of the search bar area */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus-within:border-blue-500">
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Sort:</span>
                <select
                  value={sortField}
                  onChange={(e) => {
                    setSortField(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer hover:text-white"
                >
                  <option value="key" className="bg-slate-900 text-slate-200">Issue Key</option>
                  <option value="mappedStatus" className="bg-slate-900 text-slate-200">Status</option>
                  <option value="created" className="bg-slate-900 text-slate-200">Date</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
                    setCurrentPage(1);
                  }}
                  className="ml-1 p-0.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white cursor-pointer"
                  title={`Toggle sort direction (current: ${sortDirection.toUpperCase()})`}
                >
                  {sortDirection === "asc" ? (
                    <ArrowUp className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Quick-filter Pills */}
              <div className="flex items-center gap-1.5 bg-slate-950/40 p-1 rounded border border-slate-800">
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider px-1.5">Filter:</span>
                {(() => {
                  const blockedIssuesCount = (report?.issues || []).filter(i => i.mappedStatus === "Blocked").length;
                  return (["All", "Overdue", "Unassigned", "Blocked"] as const).map((filter) => {
                    const isActive = tableQuickFilter === filter;
                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => {
                          setTableQuickFilter(filter);
                          setCurrentPage(1);
                        }}
                        className={`text-[9.5px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer uppercase tracking-wider flex items-center ${
                          isActive
                            ? "bg-blue-600 text-white shadow-md font-extrabold"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                      >
                        <span>{filter}</span>
                        {filter === "Blocked" && blockedIssuesCount > blockedThreshold && (
                          <span className="ml-1.5 bg-rose-600 border border-rose-400 text-white text-[7.5px] font-extrabold px-1 rounded-full animate-bounce shadow-md" title={`Blocked tickets exceed safety limit of ${blockedThreshold}!`}>
                            {blockedIssuesCount}
                          </span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Rows Per Page */}
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-700 text-slate-250 text-xs rounded px-2.5 py-1.5 focus:outline-none font-bold"
              >
                <option value={5}>5 Rows</option>
                <option value={10}>10 Rows</option>
                <option value={25}>25 Rows</option>
                <option value={50}>50 Rows</option>
              </select>

              {/* Export Button Drawer */}
              <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                <button
                  onClick={downloadCSV}
                  className="bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 p-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Export active layout to CSV spreadsheet"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden lg:inline">CSV</span>
                </button>
                <button
                  onClick={downloadPDF}
                  className="bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 p-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print dynamic executive report PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden lg:inline">PDF</span>
                </button>
                <button
                  onClick={onTriggerPrintPreview}
                  className="bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 p-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Show exactly how the report will look on paper before printing"
                >
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden lg:inline">Print Preview</span>
                </button>
                <button
                  onClick={onExportSheets}
                  className="bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 p-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Sync database to Google Sheets"
                >
                  <FileJson className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden lg:inline">Google Sheets</span>
                </button>
              </div>
            </div>
          </div>

          {/* Actual Table Body */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold text-[9px] select-none">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={paginatedIssues.length > 0 && paginatedIssues.every(i => selectedIssueKeys.includes(i.key))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const keysToSelect = paginatedIssues.map(i => i.key);
                          setSelectedIssueKeys(prev => Array.from(new Set([...prev, ...keysToSelect])));
                        } else {
                          const keysToRemove = paginatedIssues.map(i => i.key);
                          setSelectedIssueKeys(prev => prev.filter(k => !keysToRemove.includes(k)));
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  {enabledColumns.map((col) => {
                    const isSorted = sortField === col.id;
                    const isDragOver = dragOverColumnId === col.id;
                    const isBeingDragged = draggedColumnId === col.id;
                    return (
                      <th
                        key={col.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, col.id)}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => handleDragEnter(e, col.id)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, col.id)}
                        onClick={() => handleSort(col.id)}
                        className={`p-3 font-semibold hover:bg-slate-900/60 cursor-grab active:cursor-grabbing transition-all select-none ${
                          isSorted ? "bg-slate-900/40 text-blue-400" : ""
                        } ${
                          isDragOver ? "border-l-4 border-l-blue-500 bg-blue-950/60" : ""
                        } ${
                          isBeingDragged ? "opacity-30" : ""
                        }`}
                        title={`Drag to reorder column • Click to sort by ${col.label}`}
                      >
                        <div className="flex items-center gap-1.5 select-none">
                          <span className="text-[8px] text-slate-600 font-bold tracking-tighter mr-0.5">⋮⋮</span>
                          <span className={`${isSorted ? "font-black" : ""}`}>{col.label}</span>
                          {isSorted ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-3 h-3 text-blue-400 font-extrabold shrink-0" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-blue-400 font-extrabold shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 font-medium">
                {paginatedIssues.length === 0 ? (
                  <tr>
                    <td colSpan={enabledColumns.length + 1} className="p-8 text-center text-slate-500">
                      No matching records found. Refine your text filter or active metric card.
                    </td>
                  </tr>
                ) : (
                  paginatedIssues.map((issue) => {
                    const isExpanded = !!expandedRows[issue.key];
                    const isBeingDragged = draggedIssueKey === issue.key;
                    return (
                      <React.Fragment key={issue.id}>
                        <tr 
                          draggable
                          onDragStart={(e) => {
                            setDraggedIssueKey(issue.key);
                            e.dataTransfer.setData("text/plain", issue.key);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            setDraggedIssueKey(null);
                          }}
                          onClick={() => handleRowClick(issue)}
                          className={`cursor-grab active:cursor-grabbing select-none border-b border-slate-800/50 transition-all duration-350 origin-center transform-gpu ${
                            isBeingDragged ? "opacity-35 bg-slate-900 border-2 border-dashed border-blue-500/40" : ""
                          } ${
                            isExpanded ? "bg-slate-900/40 border-l-2 border-l-blue-500" : ""
                          } ${
                            justClickedRowKey === issue.key
                              ? "bg-blue-600/25 scale-[0.98] shadow-[inset_0_0_12px_rgba(59,130,246,0.4)] ring-1 ring-blue-500/60 z-10"
                              : "hover:bg-slate-900/45 hover:scale-[1.005] hover:shadow-lg hover:shadow-black/20"
                          }`}
                        >
                          <td className="p-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIssueKeys.includes(issue.key)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIssueKeys(prev => [...prev, issue.key]);
                                } else {
                                  setSelectedIssueKeys(prev => prev.filter(k => k !== issue.key));
                                }
                              }}
                              className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                            />
                          </td>
                          {enabledColumns.map((col) => {
                            const val = (issue as any)[col.id];
                            
                            // Style cell specifically
                            if (col.id === "key") {
                              const baseUrl = isSandbox 
                                ? "https://sandbox-jira.atlassian.net" 
                                : (jiraUrl ? jiraUrl.replace(/\/+$/, "") : "https://jira.atlassian.net");
                              const ticketUrl = `${baseUrl}/browse/${val}`;
                              return (
                                <td key={col.id} className="p-3 font-mono font-bold text-blue-400 truncate max-w-[140px]" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-between gap-1.5 group/cell">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <button 
                                        onClick={(btnEvt) => {
                                          btnEvt.stopPropagation();
                                          toggleRow(issue.key);
                                        }}
                                        className="p-1 hover:bg-slate-850 rounded transition-colors text-slate-400 hover:text-white shrink-0"
                                        title="Toggle details"
                                      >
                                        <ChevronRight className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isExpanded ? "rotate-90 text-blue-400" : "text-slate-500"}`} />
                                      </button>

                                      {/* Flag toggle button */}
                                      <button
                                        onClick={(btnEvt) => {
                                          btnEvt.stopPropagation();
                                          onToggleFlag?.(issue.key);
                                        }}
                                        className={`p-1 rounded transition-colors shrink-0 cursor-pointer ${
                                          flaggedIssueKeys.includes(issue.key)
                                            ? "text-rose-500 hover:text-rose-400"
                                            : "text-slate-600 hover:text-slate-400"
                                        }`}
                                        title={flaggedIssueKeys.includes(issue.key) ? "Unflag Issue for follow-up" : "Flag Issue for follow-up"}
                                      >
                                        <Flag className="w-3.5 h-3.5" fill={flaggedIssueKeys.includes(issue.key) ? "currentColor" : "none"} />
                                      </button>
                                      <a 
                                        href={ticketUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="hover:text-blue-300 hover:underline transition-colors inline-flex items-center gap-0.5 truncate"
                                        title={`Open ${val} in Jira`}
                                      >
                                        {highlightText(val, searchQuery)}
                                        <span className="text-[9px] opacity-70">↗</span>
                                      </a>
                                    </div>
                                    <CellCopyButton text={String(val)} cellId={`${issue.key}-key`} />
                                  </div>
                                </td>
                              );
                            }
                            if (col.id === "summary") {
                              const ts = issue.timeSpent || 0;
                              const oe = issue.originalEstimate || 0;
                              const hasOverrun = ts > oe && oe > 0;
                              const overrunAmount = ts - oe;
                              const overrunPercent = oe > 0 ? Math.round((overrunAmount / oe) * 100) : 0;
                              
                              let riskBadge = null;
                              if (hasOverrun) {
                                if (overrunPercent >= 50) {
                                  riskBadge = (
                                    <span className="shrink-0 bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-black text-[8.5px] uppercase tracking-wider animate-pulse" title={`Critical Estimation Overrun: Spent ${ts}h / Est ${oe}h (+${overrunPercent}%)`}>
                                      ⚠️ Crit Risk (+{overrunAmount}h)
                                    </span>
                                  );
                                } else {
                                  riskBadge = (
                                    <span className="shrink-0 bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-black text-[8.5px] uppercase tracking-wider" title={`Estimation Overrun: Spent ${ts}h / Est ${oe}h (+${overrunPercent}%)`}>
                                      ⚡ Warning (+{overrunAmount}h)
                                    </span>
                                  );
                                }
                              }

                              const isBulkMatch = selectedIssueKeys.includes(issue.key) && 
                                                 bulkSearchQuery.trim() !== "" && 
                                                 filteredSelectedIssueKeys.includes(issue.key);

                              return (
                                <td key={col.id} className="p-3 font-bold text-slate-200 max-w-sm leading-normal">
                                  <div className="flex items-center justify-between gap-2 group/cell">
                                    <div className="flex items-center gap-2 truncate min-w-0">
                                      <span className="truncate">
                                        {isBulkMatch ? (
                                          <span className="bg-emerald-500/20 border border-emerald-500/35 px-1 py-0.5 rounded text-emerald-200" title="Matches Bulk Edit filter criteria">
                                            {highlightText(val, bulkSearchQuery)}
                                          </span>
                                        ) : (
                                          highlightText(val, searchQuery)
                                        )}
                                      </span>
                                      {riskBadge}
                                    </div>
                                    <CellCopyButton text={String(val)} cellId={`${issue.key}-summary`} />
                                  </div>
                                </td>
                              );
                            }
                            if (col.id === "status") {
                              const mappedStatus = issue.mappedStatus;
                              const customColor = categoryColors[mappedStatus] || "#64748b";
                              
                              const badgeStyle = {
                                color: customColor,
                                backgroundColor: `${customColor}15`,
                                borderColor: `${customColor}25`,
                              };

                              return (
                                <td key={col.id} className="p-3 truncate">
                                  <div className="flex items-center justify-between gap-2 group/cell">
                                    <span 
                                      style={badgeStyle}
                                      className="px-2 py-0.5 rounded border font-black uppercase text-[8.5px] tracking-wider inline-block shadow-[0_0_4px_rgba(0,0,0,0.1)]"
                                    >
                                      {val}
                                    </span>
                                    <CellCopyButton text={String(val)} cellId={`${issue.key}-status`} />
                                  </div>
                                </td>
                              );
                            }
                            if (col.id === "priority") {
                              let pColor = "text-slate-400 bg-slate-800 border border-slate-700";
                              if (val === "Highest") pColor = "text-red-400 bg-red-500/10 border border-red-500/20";
                              if (val === "High") pColor = "text-orange-400 bg-orange-500/10 border border-orange-500/20";
                              if (val === "Medium") pColor = "text-blue-400 bg-blue-500/10 border border-blue-500/20";
                              if (val === "Low" || val === "Lowest") pColor = "text-slate-400 bg-slate-800 border border-slate-700";
                              return (
                                <td key={col.id} className="p-3">
                                  <div className="flex items-center justify-between gap-2 group/cell">
                                    <span className={`px-1.5 py-0.5 rounded font-semibold ${pColor}`}>
                                      {val}
                                    </span>
                                    <CellCopyButton text={String(val)} cellId={`${issue.key}-priority`} />
                                  </div>
                                </td>
                              );
                            }
                            if (col.id === "storyPoints") {
                              return (
                                <td key={col.id} className="p-3 font-bold text-slate-200 font-mono">
                                  <div className="flex items-center justify-between gap-2 group/cell">
                                    <div className="flex-1 text-center">
                                      {val !== null ? (
                                        <span className="bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded">{val}</span>
                                      ) : (
                                        <span className="text-slate-600">-</span>
                                      )}
                                    </div>
                                    <CellCopyButton text={val !== null ? String(val) : ""} cellId={`${issue.key}-storyPoints`} />
                                  </div>
                                </td>
                              );
                            }
                            if (col.id === "labels" || col.id === "components") {
                              const tags: string[] = Array.isArray(val) ? val : [];
                              const tagsText = tags.join(", ");
                              return (
                                <td key={col.id} className="p-3 max-w-[150px]">
                                  <div className="flex items-center justify-between gap-2 group/cell">
                                    <div className="flex flex-wrap gap-1">
                                      {tags.slice(0, 3).map((t, index) => (
                                        <span key={index} className="bg-slate-900 text-slate-400 border border-slate-800 px-1.5 py-0.2 rounded font-mono text-[9px]">
                                          {t}
                                        </span>
                                      ))}
                                      {tags.length > 3 && <span className="text-[9px] text-slate-500 font-bold">+{tags.length - 3}</span>}
                                      {tags.length === 0 && <span className="text-slate-600">-</span>}
                                    </div>
                                    <CellCopyButton text={tagsText} cellId={`${issue.key}-${col.id}`} />
                                  </div>
                                </td>
                              );
                            }

                            if (col.id === "assignee") {
                              const isCurrentUser = activeUser && val === activeUser.displayName;
                              return (
                                <td key={col.id} className="p-3 font-semibold text-slate-200" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-between gap-1.5 group/cell">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-300 font-black shrink-0 uppercase shadow-sm">
                                        {val ? val.charAt(0) : "U"}
                                      </div>
                                      <span className="truncate text-xs font-bold text-slate-300" title={val || "Unassigned"}>
                                        {val === "Unassigned" ? "Unallocated" : val}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAssign(issue.key)}
                                        className={`p-1.5 rounded-lg transition-all border shadow-sm ${
                                          isCurrentUser
                                            ? "bg-emerald-950/45 border-emerald-500/30 text-emerald-400 cursor-default"
                                            : "bg-slate-950 border-white/5 hover:border-blue-500/45 text-slate-400 hover:text-blue-400 cursor-pointer"
                                        }`}
                                        title={isCurrentUser ? "Assigned to you" : "Assign to me in 1 click"}
                                      >
                                        {isCurrentUser ? (
                                          <UserCheck className="w-3.5 h-3.5" />
                                        ) : (
                                          <UserPlus className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <CellCopyButton text={String(val || "Unassigned")} cellId={`${issue.key}-assignee`} />
                                    </div>
                                  </div>
                                </td>
                              );
                            }

                            if (col.id === "dueDate") {
                              const isOverdue = val && val < todayStr && issue.mappedStatus !== "Done";
                              const isSnoozed = snoozedAlerts[issue.key] && snoozedAlerts[issue.key] > Date.now();
                              return (
                                <td key={col.id} className="p-3 truncate max-w-[180px] text-slate-400 font-medium" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-between gap-2 group/cell">
                                    <div className="flex items-center gap-2">
                                      <span className={`${isOverdue && !isSnoozed ? "text-red-400 font-bold" : ""}`}>
                                        {val || <span className="text-slate-600">-</span>}
                                      </span>
                                      {isOverdue && (
                                        isSnoozed ? (
                                          <span className="text-[9px] text-slate-500 font-bold bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1" title="Snoozed for 24 hours">
                                            Snoozed
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSnooze(issue.key);
                                            }}
                                            className="text-[9px] font-extrabold uppercase tracking-wider bg-red-500/15 hover:bg-red-500/35 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer"
                                            title="Snooze overdue alert for 24 hours"
                                          >
                                            <BellOff className="w-2.5 h-2.5 text-red-400" />
                                            <span>Snooze</span>
                                          </button>
                                        )
                                      )}
                                    </div>
                                    <CellCopyButton text={val ? String(val) : ""} cellId={`${issue.key}-dueDate`} />
                                  </div>
                                </td>
                              );
                            }

                            if (col.id === "originalEstimate") {
                              return (
                                <td key={col.id} className="p-3 font-mono text-xs font-semibold text-slate-350">
                                  <div className="flex items-center justify-between gap-2 group/cell">
                                    <span>{val !== null && val !== undefined ? `${val}h` : <span className="text-slate-600">-</span>}</span>
                                    <CellCopyButton text={val !== null && val !== undefined ? String(val) : ""} cellId={`${issue.key}-${col.id}`} />
                                  </div>
                                </td>
                              );
                            }

                            if (col.id === "timeSpent") {
                              const oe = issue.originalEstimate || 0;
                              const ts = val || 0;
                              const isOver = ts > oe && oe > 0;
                              return (
                                <td key={col.id} className={`p-3 font-mono text-xs font-bold ${isOver ? "text-rose-400" : "text-slate-300"}`}>
                                  <div className="flex items-center justify-between gap-2 group/cell">
                                    <span>{val !== null && val !== undefined ? `${val}h` : <span className="text-slate-600">-</span>}</span>
                                    <CellCopyButton text={val !== null && val !== undefined ? String(val) : ""} cellId={`${issue.key}-${col.id}`} />
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td key={col.id} className="p-3 truncate max-w-[120px] text-slate-400 font-medium">
                                <div className="flex items-center justify-between gap-2 group/cell">
                                  <span>{val !== null && val !== undefined ? String(val) : <span className="text-slate-600">-</span>}</span>
                                  <CellCopyButton text={val !== null && val !== undefined ? String(val) : ""} cellId={`${issue.key}-${col.id}`} />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-900/15 border-l-2 border-l-blue-500/80">
                            <td colSpan={enabledColumns.length + 1} className="p-4 bg-slate-950/20">
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs text-slate-350">
                                {/* Left side: Description & Metadata */}
                                <div className="md:col-span-7 space-y-4">
                                  <div>
                                    <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold mb-1.5 flex items-center gap-1">
                                      <CheckSquare className="w-3 h-3 text-blue-400" /> Description
                                    </h4>
                                    <p className="text-slate-300 leading-relaxed font-medium bg-slate-900/50 p-3 rounded-xl border border-white/5 whitespace-pre-wrap text-[11px]">
                                      {issue.description || `This ticket tracking '${issue.summary}' covers the core engineering implementations, design compliance parameters, and security verification bounds. Action is advised to resolve high-priority dependencies before active sprint release milestones.`}
                                    </p>
                                  </div>

                                  {/* Sub metadata grid */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/30 p-3 rounded-xl border border-white/5">
                                    <div>
                                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Reporter</span>
                                      <span className="text-slate-200 font-semibold mt-0.5 block truncate">{issue.reporter || "Sarah Connor"}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Created Date</span>
                                      <span className="text-slate-300 font-semibold mt-0.5 block truncate">{issue.created || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Updated Date</span>
                                      <span className="text-slate-300 font-semibold mt-0.5 block truncate">{issue.updated || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Due Date</span>
                                      <span className={`font-semibold mt-0.5 block truncate ${issue.dueDate && issue.mappedStatus !== "Done" ? "text-amber-400" : "text-slate-300"}`}>
                                        {issue.dueDate || <span className="text-slate-600">None</span>}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Components & Labels */}
                                  <div className="flex flex-wrap gap-4">
                                    {issue.components && issue.components.length > 0 && (
                                      <div className="space-y-1">
                                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Components</span>
                                        <div className="flex flex-wrap gap-1">
                                          {issue.components.map((comp, idx) => (
                                            <span key={idx} className="bg-blue-950/40 text-blue-300 border border-blue-900/30 px-2 py-0.5 rounded font-mono text-[9px] font-bold">
                                              {comp}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {issue.labels && issue.labels.length > 0 && (
                                      <div className="space-y-1">
                                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Labels</span>
                                        <div className="flex flex-wrap gap-1">
                                          {issue.labels.map((lbl, idx) => (
                                            <span key={idx} className="bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded font-mono text-[9px] font-bold">
                                              {lbl}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Right side: Reporter Comments & Activity Timeline */}
                                <div className="md:col-span-5 space-y-3">
                                  <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold mb-1 flex items-center gap-1">
                                    <User className="w-3 h-3 text-blue-400" /> Comments & Activity log
                                  </h4>
                                  
                                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                                    {(issue.comments && issue.comments.length > 0 ? issue.comments : [
                                      `${issue.reporter || "Sarah Connor"}: Scope initiated. Verified that backlog constraints and target milestones are aligned.`,
                                      `${issue.assignee && issue.assignee !== "Unassigned" ? issue.assignee : "John Connor"}: Currently investigating architecture bounds and setting up initial unit test suites.`
                                    ]).map((comment: string, idx: number) => {
                                      const parts = comment.split(":");
                                      const author = parts[0] || "Team Member";
                                      const text = parts.slice(1).join(":") || "";

                                      return (
                                        <div key={idx} className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 space-y-1 hover:bg-slate-900/60 transition-colors duration-200">
                                          <div className="flex items-center gap-1.5 justify-between">
                                            <span className="font-bold text-slate-200 text-[10px] flex items-center gap-1 text-blue-300">
                                              <User className="w-3 h-3 text-blue-400 shrink-0" />
                                              {author}
                                            </span>
                                            <span className="text-[8px] font-semibold text-slate-500 font-mono">
                                              Comment #{idx + 1}
                                            </span>
                                          </div>
                                          <p className="text-slate-350 text-[10.5px] leading-relaxed font-medium pl-3.5 border-l border-white/5">
                                            {text.trim()}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination footer */}
          <div className="p-4 bg-slate-900/30 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex flex-wrap items-center gap-2 text-[10.5px]">
                <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-white/5 font-mono font-bold text-slate-300">
                  Displayed: <span className="text-blue-400 font-black">{paginatedIssues.length}</span>
                </span>
                <span className="text-slate-600 font-bold">/</span>
                <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-white/5 font-mono font-bold text-slate-300" title="Found in current filtered result set">
                  Filtered Results: <span className="text-indigo-400 font-black">{filteredIssues.length}</span>
                </span>
                <span className="text-slate-600 font-bold">/</span>
                <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-white/5 font-mono font-bold text-slate-300" title="Total issues in current dataset">
                  Total Dataset: <span className="text-slate-400 font-black">{issues.length}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 p-1.5 rounded disabled:opacity-40 transition-colors text-slate-300 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 p-1.5 rounded disabled:opacity-40 transition-colors text-slate-300 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Enhanced Floating Bulk Update Toolbar */}
      {selectedIssueKeys.length > 0 && (
        <div 
          id="floating-bulk-toolbar"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-blue-500/30 backdrop-blur-md rounded-2xl shadow-2xl shadow-blue-500/10 px-6 py-4 flex flex-wrap items-center justify-between gap-6 text-xs max-w-[90vw] animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Selected Count Indicator */}
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white rounded-lg p-1.5 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-white font-extrabold uppercase tracking-wider text-[10px]">Batch Processing Active</div>
              <p className="text-[9px] text-blue-400 font-bold">{selectedIssueKeys.length} selected ({filteredSelectedIssueKeys.length} filtered)</p>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-white/10 hidden lg:block" />

          {/* Substring Search Input inside Floating Toolbar */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Search Selected:</span>
            <div className="relative">
              <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="Filter selected..."
                value={bulkSearchQuery}
                onChange={(e) => setBulkSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-[10.5px] rounded-lg px-6 py-1.5 focus:outline-none focus:border-blue-500 placeholder-slate-600 font-medium w-full max-w-[130px]"
              />
            </div>
          </div>

          <div className="h-8 w-[1px] bg-white/10 hidden lg:block" />

          {/* Action 1: Status Transitions */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Transition:</span>
            <div className="flex items-center gap-1.5">
              {(["To Do", "In Progress", "Done", "Blocked"] as const).map((st) => (
                <button
                  type="button"
                  key={st}
                  disabled={isBulkUpdating || filteredSelectedIssueKeys.length === 0}
                  onClick={() => handleBulkUpdate(st)}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-350 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg border border-white/5 hover:border-white/10 hover:text-white transition-all disabled:opacity-50 uppercase tracking-wider cursor-pointer"
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="h-8 w-[1px] bg-white/10 hidden lg:block" />

          {/* Action 2: Label Assignment */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-blue-400" /> Label:
            </span>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleBulkAddLabel(newLabelInput);
              }}
              className="flex items-center gap-1.5 w-full"
            >
              <input
                type="text"
                placeholder="New label name..."
                value={newLabelInput}
                onChange={(e) => setNewLabelInput(e.target.value)}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-[10.5px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-550 placeholder-slate-600 font-medium w-full max-w-[120px]"
              />
              <button
                type="submit"
                disabled={isBulkUpdating || !newLabelInput.trim() || filteredSelectedIssueKeys.length === 0}
                className="bg-blue-600 hover:bg-blue-550 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 uppercase tracking-wider shrink-0 cursor-pointer"
              >
                Apply
              </button>
            </form>
          </div>

          <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />

          {/* Action 3: Batch Export */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Export:</span>
            <button
              type="button"
              onClick={downloadSelectedCSV}
              disabled={filteredSelectedIssueKeys.length === 0}
              className="bg-emerald-950/45 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1 disabled:opacity-40"
              title="Download selected items as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={downloadSelectedPDF}
              disabled={filteredSelectedIssueKeys.length === 0}
              className="bg-indigo-950/45 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-400 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1 disabled:opacity-40"
              title="Download selected items as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const selectedIssues = (report?.issues ?? []).filter((i) => filteredSelectedIssueKeys.includes(i.key));
                const formattedList = selectedIssues
                  .map(issue => `- [${issue.key}] ${issue.summary} (Status: ${issue.status}${issue.assignee ? `, Assignee: ${issue.assignee}` : ""})`)
                  .join("\n");
                navigator.clipboard.writeText(formattedList).then(() => {
                  addToast?.("Copied Agenda List", "Formatted summaries list of selected issues copied to clipboard.", "success", 3000);
                }).catch(() => {
                  addToast?.("Copy Failed", "Unable to copy to clipboard.", "error", 2000);
                });
              }}
              disabled={filteredSelectedIssueKeys.length === 0}
              className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-350 hover:text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1 disabled:opacity-40"
              title="Copy formatted summaries list for agendas"
            >
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              <span>Copy Agenda</span>
            </button>
          </div>

          <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />

          {/* Action 4: Intelligent PMO Smart Automation */}
          <button
            type="button"
            onClick={handleSmartAutomationRequest}
            disabled={isBulkUpdating || filteredSelectedIssueKeys.length === 0 || isSmartLoading}
            className="bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 uppercase tracking-wider shrink-0 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-500/10"
            title="Let the intelligent rules engine suggest optimal status and label transitions based on issue descriptions"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
            <span>{isSmartLoading ? "Analyzing..." : "Smart Auto"}</span>
          </button>

          <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />

          {/* Action 5: Macro Presets Dropup */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsCreatingPreset(false);
                const el = document.getElementById("macro-panel");
                if (el) el.classList.toggle("hidden");
                const other = document.getElementById("log-panel");
                if (other) other.classList.add("hidden");
              }}
              className="bg-indigo-950/40 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-400 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1"
              title="Apply or create Macro Presets"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-450 animate-pulse" />
              <span>Macros</span>
              <ChevronDown className="w-3 h-3 text-indigo-400" />
            </button>
            
            {/* Macro Panel Dropup content */}
            <div 
              id="macro-panel" 
              className="hidden absolute bottom-12 right-0 z-[110] bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl p-4 w-[280px] space-y-3 backdrop-blur-md"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider">Macro Presets</span>
                <button 
                  onClick={() => setIsCreatingPreset(!isCreatingPreset)}
                  className="text-blue-400 hover:text-blue-300 font-bold text-[10px] flex items-center gap-0.5"
                >
                  {isCreatingPreset ? "View Presets" : "+ Create New"}
                </button>
              </div>

              {isCreatingPreset ? (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveMacroPreset(newPresetName, newPresetStatus, newPresetAddLabel, newPresetRemoveLabel);
                  }}
                  className="space-y-2.5 text-left"
                >
                  <div className="space-y-1">
                    <label className="text-[8px] font-extrabold uppercase text-slate-500">Preset Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Move to next sprint..." 
                      value={newPresetName}
                      onChange={e => setNewPresetName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-extrabold uppercase text-slate-500">Set Status</label>
                      <select 
                        value={newPresetStatus} 
                        onChange={e => setNewPresetStatus(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white select-none"
                      >
                        <option value="">None</option>
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="In Review">In Review</option>
                        <option value="Done">Done</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-extrabold uppercase text-slate-500">Add Label</label>
                      <input 
                        type="text" 
                        placeholder="Label name" 
                        value={newPresetAddLabel}
                        onChange={e => setNewPresetAddLabel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-extrabold uppercase text-slate-500">Remove Label (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="Label to delete" 
                      value={newPresetRemoveLabel}
                      onChange={e => setNewPresetRemoveLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-550 text-white font-extrabold text-[10px] py-1.5 rounded-lg uppercase tracking-wider cursor-pointer"
                  >
                    Save Preset
                  </button>
                </form>
              ) : (
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                  {macroPresets.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic text-center py-2">No presets configured.</p>
                  ) : (
                    macroPresets.map((preset) => (
                      <div 
                        key={preset.id} 
                        className="flex items-center justify-between p-2 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800 rounded-lg group transition-all"
                      >
                        <div className="text-left min-w-0 flex-1 font-sans">
                          <div className="font-bold text-[10.5px] text-slate-200 truncate">{preset.name}</div>
                          <div className="flex flex-wrap gap-1 mt-0.5 text-[8px] text-slate-400 font-semibold uppercase">
                            {preset.targetStatus && <span className="bg-slate-900 px-1 rounded text-blue-400">{preset.targetStatus}</span>}
                            {preset.addLabel && <span className="bg-slate-900 px-1 rounded text-emerald-400">+{preset.addLabel}</span>}
                            {preset.removeLabel && <span className="bg-slate-900 px-1 rounded text-rose-400">-{preset.removeLabel}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            onClick={() => {
                              handleApplyMacroPreset(preset);
                              const el = document.getElementById("macro-panel");
                              if (el) el.classList.add("hidden");
                            }}
                            disabled={filteredSelectedIssueKeys.length === 0}
                            className="bg-blue-600/90 hover:bg-blue-500 text-white font-extrabold text-[9px] px-2 py-1 rounded transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            Run
                          </button>
                          <button
                            onClick={() => handleDeleteMacroPreset(preset.id, preset.name)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-opacity duration-200 cursor-pointer"
                            title="Delete preset"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />

          {/* Action 6: Bulk Operation History popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("log-panel");
                if (el) el.classList.toggle("hidden");
                const other = document.getElementById("macro-panel");
                if (other) other.classList.add("hidden");
              }}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1"
              title="View history of bulk operations done in this session"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>History</span>
              {bulkLog.length > 0 && (
                <span className="bg-blue-600 text-white font-extrabold text-[8px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center shrink-0">
                  {bulkLog.length}
                </span>
              )}
            </button>
            
            {/* Bulk History Log content */}
            <div 
              id="log-panel" 
              className="hidden absolute bottom-12 right-0 z-[110] bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl p-4 w-[350px] space-y-2.5 backdrop-blur-md animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-350 tracking-wider block">Session Activity Log</span>
                  <span className="text-[8px] text-slate-500 font-semibold uppercase tracking-tight">Timeline Visualizer</span>
                </div>
                <div className="flex items-center gap-2">
                  {bulkLog.length > 0 && (
                    <button
                      onClick={exportBulkLogToCSV}
                      className="text-emerald-400 hover:text-emerald-350 hover:bg-white/5 p-1 rounded transition-colors cursor-pointer"
                      title="Export operation history as CSV"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      const el = document.getElementById("log-panel");
                      if (el) el.classList.add("hidden");
                    }}
                    className="text-slate-500 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {bulkLog.length === 0 ? (
                  <div className="text-center py-5 text-slate-500 text-[10px] italic space-y-1">
                    <p>No bulk actions completed yet.</p>
                    <p className="text-[8px] text-slate-600 font-semibold uppercase">History logs clear on page refresh.</p>
                  </div>
                ) : (
                  <div className="relative pl-3.5 border-l border-slate-800 space-y-4 ml-1.5 pt-1">
                    {bulkLog.map((entry, idx) => {
                      const isUndone = !!entry.undone;
                      return (
                        <div key={entry.id} className="relative group">
                          {/* Timeline Dot Node */}
                          <div className={`absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 flex items-center justify-center transition-all ${
                            isUndone 
                              ? "bg-slate-950 border-slate-600 text-slate-500" 
                              : "bg-blue-900 border-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]"
                          }`}>
                            <div className={`h-1 w-1 rounded-full ${isUndone ? "bg-slate-600" : "bg-blue-400"}`} />
                          </div>

                          {/* Activity card */}
                          <div className={`p-2.5 bg-slate-950/40 border rounded-xl text-left space-y-1.5 hover:bg-slate-950/80 transition-all font-sans ${
                            isUndone ? "border-slate-800/40 opacity-55" : "border-slate-850 hover:border-slate-800"
                          }`}>
                            <div className="flex items-center justify-between text-[9px]">
                              <span className={`font-extrabold uppercase tracking-wider truncate max-w-[170px] ${
                                isUndone ? "text-slate-500 line-through" : "text-blue-400"
                              }`}>
                                {entry.operationName}
                              </span>
                              <span className="text-slate-500 font-semibold font-mono whitespace-nowrap">
                                {entry.timestamp}
                              </span>
                            </div>

                            <div className="text-[9.5px] text-slate-450 font-medium">
                              Scope: <span className={`font-bold ${isUndone ? "text-slate-500" : "text-slate-200"}`}>{entry.affectedIssueKeys.length} issues</span>
                              <div className="font-mono text-[8px] text-slate-500 truncate mt-0.5" title={entry.affectedIssueKeys.join(", ")}>
                                {entry.affectedIssueKeys.join(", ")}
                              </div>
                            </div>

                            {/* Quick Action Toggle for Undo/Redo */}
                            {isUndone ? (
                              <button
                                onClick={() => {
                                  handleRedoOperation(entry);
                                  const el = document.getElementById("log-panel");
                                  if (el) el.classList.add("hidden");
                                }}
                                className="w-full bg-emerald-950/20 hover:bg-emerald-900/35 hover:border-emerald-500/40 text-emerald-400 font-extrabold text-[8.5px] py-1 rounded-lg border border-emerald-900/20 transition-all flex items-center justify-center gap-1 cursor-pointer font-sans uppercase tracking-wider"
                                title="Reapply this operation"
                              >
                                <RotateCw className="w-3 h-3 shrink-0 text-emerald-400" />
                                <span>Redo Update</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  handleUndoOperation(entry);
                                  const el = document.getElementById("log-panel");
                                  if (el) el.classList.add("hidden");
                                }}
                                className="w-full bg-slate-900/60 hover:bg-rose-950/30 hover:border-rose-500/40 hover:text-rose-450 text-slate-400 font-extrabold text-[8.5px] py-1 rounded-lg border border-slate-800 transition-all flex items-center justify-center gap-1 cursor-pointer font-sans uppercase tracking-wider"
                                title="Revert these updates"
                              >
                                <RotateCcw className="w-3 h-3 shrink-0 text-rose-400" />
                                <span>Undo Update</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />

          {/* Cancel button */}
          <button
            type="button"
            onClick={() => {
              setSelectedIssueKeys([]);
              setBulkSearchQuery("");
            }}
            className="text-slate-400 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-all uppercase text-[10px] font-bold shrink-0 cursor-pointer"
          >
            Clear Selected
          </button>
        </div>
      )}

      {/* NEW FEATURE: Confirmation Summary & Smart Automation Preview Modal */}
      <AnimatePresence>
        {pendingBulkAction && (() => {
          const issuesList = report?.issues ?? [];
          const selectedList = issuesList.filter((i) => filteredSelectedIssueKeys.includes(i.key));
          const projCounts: Record<string, number> = {};
          const typeCounts: Record<string, number> = {};
          selectedList.forEach((issue) => {
            const proj = issue.key.split("-")[0] || "Unknown";
            projCounts[proj] = (projCounts[proj] || 0) + 1;
            const type = issue.type || "Task";
            typeCounts[type] = (typeCounts[type] || 0) + 1;
          });
          const selectedIssuesByProject = Object.entries(projCounts);
          const selectedIssuesByType = Object.entries(typeCounts);

          const totalEstimatedEffort = selectedList.reduce((acc, issue) => acc + (issue.storyPoints || 0), 0);

          return (
            <React.Fragment key="confirmation-modal">
              {/* Backdrop Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: "spring", duration: 0.3 }}
                  className="bg-[#1E293B] border border-blue-500/35 p-6 rounded-2xl shadow-2xl max-w-2xl w-full space-y-5 text-left font-sans"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-600 text-white rounded-lg p-1.5 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-yellow-300" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                          {pendingBulkAction.type === "smart_automation" ? "AI Smart Automation Recommendation" : "Confirm Batch Action"}
                        </h3>
                        <p className="text-[10.5px] text-slate-400 font-bold">
                          Analyze affected scope before committing updates.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPendingBulkAction(null)}
                      className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scope Filtering & Effort Metrics Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 p-3.5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2.5">
                      <Tag className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                        Filter Scope by Label:
                      </span>
                      <select
                        value={bulkLabelFilter}
                        onChange={(e) => setBulkLabelFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 max-w-[160px] truncate cursor-pointer font-semibold"
                      >
                        <option value="">All Labels ({availableBulkLabels.length})</option>
                        {availableBulkLabels.map((lbl) => (
                          <option key={lbl} value={lbl}>
                            {lbl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 bg-blue-950/30 border border-blue-900/40 px-3.5 py-1.5 rounded-lg shrink-0">
                      <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-pulse" />
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                        Estimated Completion Effort:
                      </span>
                      <span className="text-xs font-mono font-black text-white">
                        {totalEstimatedEffort} {totalEstimatedEffort === 1 ? "Story Point" : "Story Points"}
                      </span>
                    </div>
                  </div>

                  {/* Operations To Apply details */}
                  <div className="bg-slate-950/45 p-3.5 rounded-xl border border-white/5 space-y-2">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black block">Action Specification</span>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 font-semibold">Action Type:</span>{" "}
                        <span className="font-extrabold text-blue-400 uppercase tracking-wider">{pendingBulkAction.type}</span>
                      </div>
                      {pendingBulkAction.type === "status" && (
                        <div>
                          <span className="text-slate-500 font-semibold">Target Status:</span>{" "}
                          <span className="font-bold text-white bg-blue-950 border border-blue-900/40 px-2 py-0.5 rounded font-mono text-[10.5px]">{pendingBulkAction.targetStatus}</span>
                        </div>
                      )}
                      {pendingBulkAction.type === "label" && (
                        <div>
                          <span className="text-slate-500 font-semibold">Apply Label:</span>{" "}
                          <span className="font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-2 py-0.5 rounded font-mono text-[10.5px]">+{pendingBulkAction.label}</span>
                        </div>
                      )}
                      {pendingBulkAction.type === "macro" && pendingBulkAction.macro && (
                        <div className="space-y-1 w-full">
                          <div className="font-bold text-white text-[12.5px]">{pendingBulkAction.macro.name}</div>
                          <div className="flex gap-2 text-[10.5px]">
                            {pendingBulkAction.macro.targetStatus && (
                              <span>Set Status: <strong className="text-blue-400">{pendingBulkAction.macro.targetStatus}</strong></span>
                            )}
                            {pendingBulkAction.macro.addLabel && (
                              <span>Add Label: <strong className="text-emerald-400">+{pendingBulkAction.macro.addLabel}</strong></span>
                            )}
                            {pendingBulkAction.macro.removeLabel && (
                              <span>Remove Label: <strong className="text-rose-400">-{pendingBulkAction.macro.removeLabel}</strong></span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Affected Items Breakdown (Summary View) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black">
                        Affected Scope Summary ({filteredSelectedIssueKeys.length} issues)
                      </span>
                      {/* Copy Summary to Clipboard Feature */}
                      <button
                        type="button"
                        onClick={() => {
                          const formattedList = selectedList
                            .map(issue => `- [${issue.key}] ${issue.summary} (Status: ${issue.status}${issue.assignee ? `, Assignee: ${issue.assignee}` : ""})`)
                            .join("\n");
                          navigator.clipboard.writeText(formattedList).then(() => {
                            addToast?.("Copied Agenda List", "Formatted summary of selected issues copied to clipboard.", "success", 3000);
                          }).catch(() => {
                            addToast?.("Copy Failed", "Unable to copy to clipboard.", "error", 2000);
                          });
                        }}
                        className="bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-800 hover:text-white px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm shrink-0"
                        title="Copy formatted summaries list for agendas"
                      >
                        <Copy className="w-3.5 h-3.5 text-blue-400" />
                        <span>Copy Summary to Clipboard</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Projects affected */}
                      <div className="bg-slate-900/30 p-3 rounded-xl border border-white/5 space-y-1.5">
                        <span className="text-[9px] font-extrabold uppercase text-slate-500">By Project</span>
                        {selectedIssuesByProject.length === 0 ? (
                          <p className="text-[10px] text-slate-500 italic">None</p>
                        ) : (
                          <div className="space-y-1 max-h-[80px] overflow-y-auto">
                            {selectedIssuesByProject.map(([proj, count]) => (
                              <div key={proj} className="flex items-center justify-between text-xs font-semibold">
                                <span className="text-slate-350 font-mono">{proj}</span>
                                <span className="bg-slate-950 border border-white/5 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  {count} {count === 1 ? "issue" : "issues"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Issue Types affected */}
                      <div className="bg-slate-900/30 p-3 rounded-xl border border-white/5 space-y-1.5">
                        <span className="text-[9px] font-extrabold uppercase text-slate-500">By Issue Type</span>
                        {selectedIssuesByType.length === 0 ? (
                          <p className="text-[10px] text-slate-500 italic">None</p>
                        ) : (
                          <div className="space-y-1 max-h-[80px] overflow-y-auto">
                            {selectedIssuesByType.map(([type, count]) => (
                              <div key={type} className="flex items-center justify-between text-xs font-semibold">
                                <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                  type === "Bug" ? "text-rose-400 bg-rose-950/10" :
                                  type === "Story" ? "text-emerald-400 bg-emerald-950/10" :
                                  "text-blue-400 bg-blue-950/10"
                                }`}>
                                  {type}
                                </span>
                                <span className="bg-slate-950 border border-white/5 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  {count} {count === 1 ? "issue" : "issues"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Project Impact Chart */}
                  <ProjectImpactChart
                    allIssues={issuesList}
                    filteredSelectedIssueKeys={filteredSelectedIssueKeys}
                    pendingBulkAction={pendingBulkAction}
                  />

                  {/* Smart Automation recommendations listing */}
                  {pendingBulkAction.type === "smart_automation" && (
                    <div className="space-y-3.5 pt-1">
                      {/* AI Executive Summary paragraph */}
                      <div className="bg-blue-950/20 border border-blue-500/20 p-3.5 rounded-xl text-slate-200 text-xs leading-relaxed space-y-1">
                        <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-blue-400">
                          <Sparkles className="w-3.5 h-3.5 animate-pulse text-blue-400 shrink-0" />
                          <span>AI Executive Summary</span>
                        </div>
                        <p className="font-medium text-[11px] leading-relaxed">
                          {pendingBulkAction.label}
                        </p>
                      </div>

                      {/* Recommendations per issue */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black">AI Proposed Changes Per Issue</span>
                        <div className="space-y-2 max-h-[180px] overflow-y-auto border border-white/5 p-2 rounded-xl bg-slate-950/20">
                          {pendingBulkAction.smartUpdates?.map((sug: any) => {
                            const originalIssue = selectedList.find(i => i.key === sug.key);
                            const hasStatusChange = sug.suggestedStatus && sug.suggestedStatus !== originalIssue?.status;
                            const hasLabels = sug.suggestedLabels && sug.suggestedLabels.length > 0;
                            
                            return (
                              <div key={sug.key} className="p-2.5 bg-[#1E293B] border border-slate-800 rounded-lg space-y-1 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-mono font-bold text-slate-300 text-[10.5px]">
                                    {sug.key} <span className="text-slate-500 font-sans font-medium">— {originalIssue?.summary || ""}</span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-x-4 text-[10px] text-slate-400 font-semibold uppercase">
                                  {hasStatusChange && (
                                    <div>
                                      Status: <span className="text-slate-500 font-bold strike-through">{originalIssue?.status}</span> ➡️{" "}
                                      <strong className="text-blue-400 font-black uppercase">{sug.suggestedStatus}</strong>
                                    </div>
                                  )}
                                  {hasLabels && (
                                    <div>
                                      Labels: <span className="text-slate-500 font-bold">[{originalIssue?.labels?.join(", ") || "none"}]</span> ➡️{" "}
                                      <strong className="text-emerald-400 font-black">{sug.suggestedLabels.map((l: string) => `+${l}`).join(", ")}</strong>
                                    </div>
                                  )}
                                </div>
                                {sug.reasoning && (
                                  <p className="text-[10px] text-slate-400 italic bg-slate-950/45 p-1 px-2 rounded mt-1">
                                    Reasoning: {sug.reasoning}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer Controls */}
                  <div className="flex justify-end gap-3.5 pt-3 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setPendingBulkAction(null)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10.5px] font-extrabold uppercase px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                      title="Press 'Esc' key to cancel"
                    >
                      Cancel Action (Esc)
                    </button>
                    <button
                      type="button"
                      onClick={executePendingBulkAction}
                      className="bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white text-[10.5px] font-black uppercase px-6 py-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-500/15"
                      title="Press 'Ctrl+S' key to execute"
                    >
                      <CheckSquare className="w-4 h-4 shrink-0" />
                      <span>Confirm & Execute (Ctrl+S)</span>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            </React.Fragment>
          );
        })()}
      </AnimatePresence>

      {/* Bulk Update Progress Modal */}
      <AnimatePresence>
        {isBulkUpdating && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
            >
              {/* Modal Card */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="bg-slate-900 border border-blue-500/35 p-6 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-5"
              >
                <div className="flex justify-center">
                  <div className="relative flex items-center justify-center animate-bounce">
                    <div className="w-14 h-14 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin"></div>
                    <RefreshCw className="w-6 h-6 text-blue-400 absolute animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {bulkOperationName || "Executing Batch Process"}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold">
                    Synthesizing bulk updates across selected Jira issue records.
                  </p>
                </div>

                {/* Progress Tracking Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-blue-400">
                      {bulkCurrentIssueKey ? `Processing ${bulkCurrentIssueKey}...` : "Initiating batch job..."}
                    </span>
                    <span className="text-slate-300">
                      {bulkProgress} / {bulkProgressTotal} Issues
                    </span>
                  </div>

                  {/* Visual Progress Bar track */}
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-white/5 relative">
                    <motion.div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${bulkProgressTotal > 0 ? (bulkProgress / bulkProgressTotal) * 100 : 0}%` }}
                      transition={{ ease: "easeInOut", duration: 0.15 }}
                    />
                  </div>

                  <div className="text-right text-[10px] font-mono text-slate-500 font-bold">
                    {Math.round(bulkProgressTotal > 0 ? (bulkProgress / bulkProgressTotal) * 100 : 0)}% Complete
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-medium leading-relaxed bg-slate-950/45 p-3 rounded-xl border border-white/5">
                  ⚠️ Please keep this tab active. Status changes and label synchronizations are being committed both locally and propagated to the target project scope database.
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 6. Premium Slide-Over Panel (Framer Motion) */}
      <AnimatePresence>
        {selectedIssueForModal && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedIssueForModal(null)}
              className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-[#1E293B] border-l border-white/10 shadow-2xl flex flex-col h-full overflow-hidden text-left"
            >
              {/* Slide-Over Header */}
              <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-black uppercase text-[8px] tracking-wider ${
                      selectedIssueForModal.type === "Bug" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                      selectedIssueForModal.type === "Story" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}>
                      {selectedIssueForModal.type}
                    </span>
                    <span className="font-mono text-slate-400 font-bold tracking-wide text-[10px]">
                      {selectedIssueForModal.key}
                    </span>
                    <a 
                      href={`${isSandbox ? "https://sandbox-jira.atlassian.net" : (jiraUrl ? jiraUrl.replace(/\/+$/, "") : "https://jira.atlassian.net")}/browse/${selectedIssueForModal.key}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline inline-flex items-center gap-0.5 text-[10px]"
                    >
                      Open in Jira <span className="text-[9px]">↗</span>
                    </a>
                  </div>
                  <h2 className="text-sm font-black text-white leading-normal tracking-tight">
                    {selectedIssueForModal.summary}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIssueForModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Close panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Slide-Over Body (Scrollable) */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-[#1E293B]">
                
                {/* Description */}
                <div className="space-y-1.5">
                  <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Description</h3>
                  <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedIssueForModal.description || "No description provided for this ticket."}
                  </div>
                </div>

                {/* Sub-tasks Progress Tracker */}
                {(() => {
                  const subtasks = getSubtasksForIssue(selectedIssueForModal);
                  const doneSubtasks = subtasks.filter(s => s.status === "Done").length;
                  const progressPct = subtasks.length > 0 ? Math.round((doneSubtasks / subtasks.length) * 100) : 0;
                  
                  return (
                    <div className="space-y-2.5 bg-slate-950/25 border border-white/5 p-3 rounded-xl">
                      <div className="flex items-center justify-between text-[10px]">
                        <h3 className="font-black uppercase text-slate-400 tracking-wider">
                          Sub-tasks ({subtasks.length})
                        </h3>
                        <span className="text-[9px] text-blue-400 font-mono font-bold">
                          {doneSubtasks} / {subtasks.length} Completed ({progressPct}%)
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      {subtasks.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic">No nested sub-tasks.</p>
                      ) : (
                        <div className="space-y-1.5 pt-1">
                          {subtasks.map((sub, i) => (
                            <div 
                              key={sub.key || i} 
                              className="flex items-center justify-between p-2 bg-slate-950/30 border border-white/5 rounded-lg text-[10px]"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono text-[9px] text-slate-500 font-bold shrink-0">{sub.key}</span>
                                <span className="text-slate-300 truncate font-semibold">{sub.summary}</span>
                              </div>
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                sub.status === "Done" ? "bg-emerald-500/10 text-emerald-400" :
                                sub.status === "In Progress" ? "bg-blue-500/10 text-blue-400" :
                                "bg-slate-800 text-slate-400"
                              }`}>
                                {sub.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Risk Assessment & Time Spent Widget */}
                {(() => {
                  const ts = selectedIssueForModal.timeSpent || 0;
                  const oe = selectedIssueForModal.originalEstimate || 0;
                  const hasOverrun = ts > oe && oe > 0;
                  const overrunAmount = ts - oe;
                  const overrunPercent = oe > 0 ? Math.round((overrunAmount / oe) * 100) : 0;
                  
                  return (
                    <div className="space-y-2 bg-slate-950/20 border border-white/5 p-3.5 rounded-xl">
                      <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Risk & Estimations</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900/40 p-2 rounded-lg border border-white/5">
                          <span className="text-[8px] text-slate-500 uppercase font-bold block">Original Estimate</span>
                          <span className="text-white font-mono font-bold text-xs">{oe > 0 ? `${oe} hours` : "Not Estimated"}</span>
                        </div>
                        <div className="bg-slate-900/40 p-2 rounded-lg border border-white/5">
                          <span className="text-[8px] text-slate-500 uppercase font-bold block">Actual Time Spent</span>
                          <span className={`font-mono font-bold text-xs ${hasOverrun ? "text-rose-400" : "text-white"}`}>{ts} hours</span>
                        </div>
                      </div>

                      {hasOverrun && (
                        <div className="bg-rose-950/20 border border-rose-500/20 p-2.5 rounded-lg flex items-start gap-2 text-[10.5px]">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-black text-rose-400 uppercase tracking-wide text-[9px] block">CRITICAL TIME OVERRUN</span>
                            <p className="text-slate-300 font-medium">
                              This ticket has exceeded its original estimate by <span className="text-rose-400 font-bold">{overrunAmount} hours</span> (+{overrunPercent}%). Prompt review of scope creep or resource blockers is recommended.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Metadata Fields Card */}
                <div className="space-y-3 bg-slate-950/20 p-3.5 border border-white/5 rounded-xl">
                  <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-wider border-b border-white/5 pb-1.5">Ticket Attributes</h3>
                  
                  <div className="space-y-2 text-[11px] leading-normal">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Workflow Status</span>
                      <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded ${
                        selectedIssueForModal.mappedStatus === "Done" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        selectedIssueForModal.mappedStatus === "Blocked" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        selectedIssueForModal.mappedStatus === "In Progress" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}>
                        {selectedIssueForModal.status}
                      </span>
                    </div>

                    {/* Priority */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Priority Level</span>
                      <span className="font-bold text-slate-200">{selectedIssueForModal.priority}</span>
                    </div>

                    {/* Assignee */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Assignee</span>
                      <span className="font-bold text-indigo-300 inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        {selectedIssueForModal.assignee === "Unassigned" ? "Unallocated" : selectedIssueForModal.assignee}
                      </span>
                    </div>

                    {/* Reporter */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Reporter</span>
                      <span className="font-bold text-slate-300">
                        {selectedIssueForModal.reporter || "Sarah Connor"}
                      </span>
                    </div>

                    {/* Story Points */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Story Points</span>
                      <span className="font-mono font-bold text-slate-200 bg-slate-900 px-1.5 py-0.2 rounded border border-white/5">
                        {selectedIssueForModal.storyPoints !== undefined ? `${selectedIssueForModal.storyPoints} pts` : "--"}
                      </span>
                    </div>

                    {/* Sprint */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Sprint Assignment</span>
                      <span className="font-bold text-slate-300 max-w-[150px] truncate" title={selectedIssueForModal.sprint}>
                        {selectedIssueForModal.sprint || "--"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comments Thread */}
                <div className="space-y-2.5">
                  <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    Collaborative Comments ({getCommentsForIssue(selectedIssueForModal).length})
                  </h3>
                  {getCommentsForIssue(selectedIssueForModal).length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No comments logged.</p>
                  ) : (
                    <div className="space-y-2">
                      {getCommentsForIssue(selectedIssueForModal).map((c) => (
                        <div key={c.id} className="p-3 bg-slate-950/20 border border-white/5 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-[9px]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-[8px] font-black text-white uppercase font-bold">
                                {c.author.substring(0, 2)}
                              </div>
                              <span className="font-bold text-slate-200">{c.author}</span>
                            </div>
                            <span className="text-slate-500 font-mono">{c.created}</span>
                          </div>
                          <p className="text-slate-300 text-[10.5px] leading-relaxed pl-5 font-medium">
                            {c.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Slide-Over Footer */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedIssueForModal(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 7. One-Click Instant Status Report FAB */}
      <button
        type="button"
        onClick={() => {
          const dateStr = new Date().toISOString().split("T")[0];
          const filename = `OneClick_Status_Report_${dateStr}.pdf`;
          exportToPDF(
            `One-Click Status Report (${filteredIssues.length} Current Scope Tickets)`,
            filteredIssues,
            safeConfig.columns,
            filename,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            report?.config?.metrics,
            metricsHistory,
            report?.metrics
          );
          if (onRecordExport) {
            onRecordExport("PDF", filename);
          }
          addToast?.(
            "Quick PDF Exported",
            `Successfully built a comprehensive status report for all ${filteredIssues.length} currently filtered issues.`,
            "success",
            4000
          );
        }}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-[10px] px-4.5 py-3 rounded-full shadow-2xl shadow-indigo-500/20 hover:scale-105 transition-all duration-200 flex items-center gap-2 border border-blue-500/30 group cursor-pointer"
        title="One-Click generate status report for current filtered view"
      >
        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
        <span className="uppercase tracking-widest font-black">QUICK REPORT ({filteredIssues.length})</span>
      </button>
    </motion.div>
  );
};
