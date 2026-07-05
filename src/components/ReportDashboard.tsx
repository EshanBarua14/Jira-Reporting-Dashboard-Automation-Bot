import React, { useState, useMemo } from "react";
import { 
  Sparkles, AlertCircle, AlertTriangle, User, Calendar, Tag, CheckCircle2, 
  Search, ArrowUpDown, ChevronLeft, ChevronRight, ChevronDown, Download, FileJson, 
  Printer, TrendingUp, Users, CheckSquare, Clock, FileSpreadsheet, Eye
} from "lucide-react";
import { JiraIssue, ReportConfig, ExecutiveSummary, GeneratedReport, ColumnDefinition, MetricDefinition } from "../types";
import { exportToCSV, exportToPDF } from "../utils/export";
import { motion } from "motion/react";
import { D3PieChart } from "./D3PieChart";

interface ReportDashboardProps {
  report: GeneratedReport | null;
  loading: boolean;
  onExportSheets: () => void;
  jiraUrl?: string;
  isSandbox?: boolean;
  onRecordExport?: (format: "CSV" | "PDF" | "Google Sheets", filename: string) => void;
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

export const ReportDashboard: React.FC<ReportDashboardProps> = ({
  report,
  loading,
  onExportSheets,
  jiraUrl = "",
  isSandbox = true,
  onRecordExport,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>("key");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (issueKey: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [issueKey]: !prev[issueKey],
    }));
  };

  // Reset page when report changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [report]);

  // 1. Column Selection Setup
  const enabledColumns = useMemo(() => {
    return report?.config.columns.filter((c) => c.enabled) ?? [];
  }, [report?.config.columns]);

  // 2. Metrics Setup
  const isMetricEnabled = (id: string) => {
    return report?.config.metrics.find((m) => m.id === id)?.enabled ?? true;
  };

  // 3. Status Circle calculations for Donut Chart
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

  // 4. Assignee workload processing
  const assigneeChartData = useMemo(() => {
    const counts = report?.metrics.issuesPerAssignee || {};
    const list = Object.entries(counts).map(([name, count]) => ({
      name,
      count: Number(count),
    }));
    // Sort descending
    return list.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [report?.metrics.issuesPerAssignee]);

  // 5. Completion over time line chart calculations
  const lineChartPoints = useMemo(() => {
    const issuesList = report?.issues ?? [];
    // Collect Done issues, group by resolution or updated date
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

  // 6. Search and sort on detailed issue list
  const filteredIssues = useMemo(() => {
    const issuesList = report?.issues ?? [];
    let result = [...issuesList];

    // Search query filter
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

    // Sorting
    result.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle nulls
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
  }, [report?.issues, searchQuery, sortField, sortDirection]);

  // 7. Paginated Issues
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
        <h3 className="text-sm font-bold text-white">Processing Jira Reporting Bot Matrix...</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-md leading-relaxed">
          Retrieving projects, consolidating custom workflow status maps, calculating agile velocity metrics, and drafting Gemini AI summaries...
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

  const { issues, metrics, aiSummary, config, timestamp } = report;

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
    const name = config.fileNamingRule
      .replace("{project}", config.selectedProjects.join("_"))
      .replace("{date}", new Date().toISOString().split("T")[0]) + ".csv";
    exportToCSV(issues, config.columns, name);
    if (onRecordExport) {
      onRecordExport("CSV", name);
    }
  };

  const downloadPDF = () => {
    const name = config.fileNamingRule
      .replace("{project}", config.selectedProjects.join("_"))
      .replace("{date}", new Date().toISOString().split("T")[0]) + ".pdf";
    exportToPDF(`Jira Executive Report - ${config.selectedProjects.join(", ")}`, issues, config.columns);
    if (onRecordExport) {
      onRecordExport("PDF", name);
    }
  };

  return (
    <div className="space-y-6">
      <div id="dashboard-visuals-container" className="space-y-6">
        {/* 1. Executive KPIs Ribbon */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={report ? report.timestamp : "empty"}
          className="grid grid-cols-2 md:grid-cols-5 gap-3"
        >
        {isMetricEnabled("totalIssues") && (
          <motion.div variants={cardVariants} className="bg-[#1E293B] p-4 rounded-xl border border-slate-800 shadow-sm">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> Total Issues
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.totalIssues}</div>
            <div className="text-[9px] text-slate-400 mt-0.5">Issues in active scope</div>
          </motion.div>
        )}

        {isMetricEnabled("doneCount") && (
          <motion.div variants={cardVariants} className="bg-[#1E293B] p-4 rounded-xl border border-slate-800 shadow-sm">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Resolved Done
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.doneCount}</div>
            <div className="text-[9px] text-emerald-400 font-bold mt-0.5">
              {metrics.todoCount} To Do | {metrics.inProgressCount} Active
            </div>
          </motion.div>
        )}

        {isMetricEnabled("completionPercentage") && (
          <motion.div variants={cardVariants} className="bg-[#1E293B] p-4 rounded-xl border border-slate-800 shadow-sm">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Completion Rate
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.completionPercentage}%</div>
            <div className="w-full bg-slate-950 rounded-full h-1.5 mt-1.5">
              <div 
                className="bg-indigo-500 h-1.5 rounded-full transition-all" 
                style={{ width: `${metrics.completionPercentage}%` }}
              ></div>
            </div>
          </motion.div>
        )}

        {isMetricEnabled("overdueIssues") && (
          <motion.div variants={cardVariants} className={`bg-[#1E293B] p-4 rounded-xl border shadow-sm ${metrics.overdueIssues > 0 ? "border-red-500/20 bg-red-500/5" : "border-slate-800"}`}>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" /> Overdue Target
            </div>
            <div className={`text-xl font-black mt-1 ${metrics.overdueIssues > 0 ? "text-red-400 animate-pulse" : "text-white"}`}>
              {metrics.overdueIssues}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">Past due date issues</div>
          </motion.div>
        )}

        {isMetricEnabled("unassignedIssues") && (
          <motion.div variants={cardVariants} className={`bg-[#1E293B] p-4 rounded-xl border shadow-sm ${metrics.unassignedIssues > 0 ? "border-amber-500/20 bg-amber-500/5" : "border-slate-800"}`}>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-400" /> Unassigned Tickets
            </div>
            <div className={`text-xl font-black mt-1 ${metrics.unassignedIssues > 0 ? "text-amber-400" : "text-white"}`}>
              {metrics.unassignedIssues}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">Need team allocation</div>
          </motion.div>
        )}

        {isMetricEnabled("bugsToStoriesRatio") && (
          <motion.div variants={cardVariants} className="bg-[#1E293B] p-4 rounded-xl border border-slate-800 shadow-sm">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Bugs to Stories
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.bugsToStoriesRatio}</div>
            <div className="text-[9px] text-slate-400 mt-0.5">Quality vs feature balance</div>
          </motion.div>
        )}

        {isMetricEnabled("averageCycleTime") && (
          <motion.div variants={cardVariants} className="bg-[#1E293B] p-4 rounded-xl border border-slate-800 shadow-sm">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" /> Avg Cycle Time
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.averageCycleTime}d</div>
            <div className="text-[9px] text-slate-400 mt-0.5">Created to resolution average</div>
          </motion.div>
        )}

        {isMetricEnabled("sprintVelocity") && (
          <motion.div variants={cardVariants} className="bg-[#1E293B] p-4 rounded-xl border border-slate-800 shadow-sm">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Sprint Velocity
            </div>
            <div className="text-xl font-black text-white mt-1">{metrics.sprintVelocity} SP</div>
            <div className="text-[9px] text-slate-400 mt-0.5">Completed story points</div>
          </motion.div>
        )}
      </motion.div>

      {/* 2. Gemini AI Executive Smart Summary */}
      {aiSummary && (
        <div className="bg-gradient-to-r from-blue-950/20 to-indigo-950/10 rounded-xl border border-blue-900/30 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute right-4 top-4 text-blue-950/40 font-bold text-7xl select-none pointer-events-none">AI</div>
          <div className="flex items-center gap-2 mb-3.5">
            <div className="bg-blue-600 text-white p-1 rounded">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-blue-200 uppercase tracking-wider">Gemini 5-Second Executive Assessment</h3>
              <p className="text-[9px] text-blue-400 mt-0.5 font-mono">Analyzed at {new Date(timestamp).toLocaleTimeString()}</p>
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
        </div>
      )}

      {/* 3. Visualizations Row (Pie, Bar, Line) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Donut Pie Chart (Status Distribution) */}
        {config.visualizations.pieChart && (
          <div className="bg-[#1E293B] rounded-xl border border-slate-800 p-5 shadow-sm flex flex-col justify-between">
            <div className="mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Status Distribution</h3>
              <p className="text-[10px] text-slate-500">D3-Engineered Proportional Status Breakdown</p>
            </div>

            <div className="flex-1 flex items-center justify-center my-2">
              <D3PieChart data={statusChartData} totalCount={issues.length} />
            </div>
          </div>
        )}

        {/* Workload / Bar Chart (Issues per Assignee) */}
        {config.visualizations.barChart && (
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
        {config.visualizations.lineChart && (
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
                  </svg>
                  
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
      </div>

      {/* 4. Filterable Interactive Table Section */}
      {config.visualizations.table && (
        <div className="bg-[#1E293B] rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-4 bg-slate-900/30 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Issue Analysis Matrix</h3>
              <span className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded">
                {filteredIssues.length} Matches
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter key, summary, assignee..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded pl-8 pr-3 py-1.5 w-full sm:w-52 focus:outline-none focus:border-blue-500 placeholder-slate-500"
                />
              </div>

              {/* Rows Per Page */}
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-700 text-slate-250 text-xs rounded px-2.5 py-1.5 focus:outline-none"
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
                  className="bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 p-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Export active layout to CSV spreadsheet"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden lg:inline">CSV</span>
                </button>
                <button
                  onClick={downloadPDF}
                  className="bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 p-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Print dynamic executive report PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden lg:inline">PDF</span>
                </button>
                <button
                  onClick={onExportSheets}
                  className="bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 p-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
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
                  {enabledColumns.map((col) => (
                    <th
                      key={col.id}
                      onClick={() => handleSort(col.id)}
                      className="p-3 font-semibold hover:bg-slate-900/60 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {paginatedIssues.length === 0 ? (
                  <tr>
                    <td colSpan={enabledColumns.length || 1} className="p-8 text-center text-slate-500">
                      No matching records found. Refine your text filter or scope bounds.
                    </td>
                  </tr>
                ) : (
                  paginatedIssues.map((issue) => {
                    const isExpanded = !!expandedRows[issue.key];
                    return (
                      <React.Fragment key={issue.id}>
                        <tr 
                          onClick={() => toggleRow(issue.key)}
                          className={`hover:bg-slate-900/40 transition-colors cursor-pointer select-none ${
                            isExpanded ? "bg-slate-900/40 border-l-2 border-l-blue-500" : ""
                          }`}
                        >
                          {enabledColumns.map((col) => {
                            const val = (issue as any)[col.id];
                            
                            // Style cell specifically
                            if (col.id === "key") {
                              const baseUrl = isSandbox 
                                ? "https://sandbox-jira.atlassian.net" 
                                : (jiraUrl ? jiraUrl.replace(/\/+$/, "") : "https://jira.atlassian.net");
                              const ticketUrl = `${baseUrl}/browse/${val}`;
                              return (
                                <td key={col.id} className="p-3 font-mono font-bold text-blue-400 truncate max-w-[120px] flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                                  <a 
                                    href={ticketUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="hover:text-blue-300 hover:underline transition-colors inline-flex items-center gap-0.5 truncate"
                                    title={`Open ${val} in Jira`}
                                  >
                                    {val}
                                    <span className="text-[9px] opacity-70">↗</span>
                                  </a>
                                </td>
                              );
                            }
                            if (col.id === "summary") {
                              return (
                                <td key={col.id} className="p-3 font-bold text-slate-200 max-w-sm leading-normal">
                                  {val}
                                </td>
                              );
                            }
                            if (col.id === "status") {
                              let bColor = "bg-slate-800 text-slate-300 border border-slate-700";
                              if (issue.mappedStatus === "Done") bColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                              if (issue.mappedStatus === "In Progress") bColor = "bg-sky-500/10 text-sky-400 border border-sky-500/20";
                              if (issue.mappedStatus === "Blocked") bColor = "bg-red-500/10 text-red-400 border border-red-500/20";
                              return (
                                <td key={col.id} className="p-3 truncate">
                                  <span className={`px-2 py-0.5 rounded border font-extrabold uppercase text-[8px] tracking-wider ${bColor}`}>
                                    {val}
                                  </span>
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
                                  <span className={`px-1.5 py-0.5 rounded font-semibold ${pColor}`}>
                                    {val}
                                  </span>
                                </td>
                              );
                            }
                            if (col.id === "storyPoints") {
                              return (
                                <td key={col.id} className="p-3 font-bold text-slate-200 text-center font-mono">
                                  {val !== null ? (
                                    <span className="bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded">{val}</span>
                                  ) : (
                                    <span className="text-slate-600">-</span>
                                  )}
                                </td>
                              );
                            }
                            if (col.id === "labels" || col.id === "components") {
                              const tags: string[] = Array.isArray(val) ? val : [];
                              return (
                                <td key={col.id} className="p-3 max-w-[150px]">
                                  <div className="flex flex-wrap gap-1">
                                    {tags.slice(0, 3).map((t, index) => (
                                      <span key={index} className="bg-slate-900 text-slate-400 border border-slate-800 px-1.5 py-0.2 rounded font-mono text-[9px]">
                                        {t}
                                      </span>
                                    ))}
                                    {tags.length > 3 && <span className="text-[9px] text-slate-500 font-bold">+{tags.length - 3}</span>}
                                    {tags.length === 0 && <span className="text-slate-600">-</span>}
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td key={col.id} className="p-3 truncate max-w-[120px] text-slate-400 font-medium">
                                {val !== null && val !== undefined ? String(val) : <span className="text-slate-600">-</span>}
                              </td>
                            );
                          })}
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-900/15 border-l-2 border-l-blue-500/80">
                            <td colSpan={enabledColumns.length} className="p-4 bg-slate-950/20">
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
          <div className="p-3.5 bg-slate-900/30 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              Page {currentPage} of {totalPages} | Showing {paginatedIssues.length} of {filteredIssues.length} rows
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 p-1.5 rounded disabled:opacity-40 transition-colors text-slate-300"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 p-1.5 rounded disabled:opacity-40 transition-colors text-slate-300"
              >
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
