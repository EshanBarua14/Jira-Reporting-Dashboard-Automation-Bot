import React, { useState, useMemo } from "react";
import { Clock, AlertTriangle, ChevronRight, BarChart3, Filter, ArrowUpDown, ShieldAlert, CheckCircle2 } from "lucide-react";
import { JiraIssue } from "../types";

interface IssueAgingWidgetProps {
  issues: JiraIssue[];
  categoryColors?: Record<string, string>;
  theme?: "dark" | "light";
  onSelectIssue?: (issue: JiraIssue) => void;
}

interface PriorityAgingSummary {
  priority: string;
  count: number;
  totalDays: number;
  avgAgeDays: number;
  maxAgeDays: number;
  oldestIssue: JiraIssue | null;
  color: string;
}

export const IssueAgingWidget: React.FC<IssueAgingWidgetProps> = ({
  issues,
  categoryColors,
  theme = "dark",
  onSelectIssue,
}) => {
  const isLight = theme === "light";
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"avgAge" | "count" | "priority">("avgAge");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Calculate issue aging metrics
  const { prioritySummaries, overallStats, filteredOpenIssues } = useMemo(() => {
    const now = Date.now();
    const openIssues = issues.filter((i) => i.mappedStatus !== "Done");

    // Group by priority
    const groups: Record<string, { count: number; totalDays: number; maxAgeDays: number; oldestIssue: JiraIssue | null; issues: JiraIssue[] }> = {};

    let grandTotalAgeDays = 0;
    let oldestOverall: JiraIssue | null = null;
    let oldestOverallAgeDays = 0;

    openIssues.forEach((issue) => {
      const prio = issue.priority || "Medium";
      const createdDate = new Date(issue.created).getTime();
      const ageDays = Math.max(0, Math.floor((now - (isNaN(createdDate) ? now : createdDate)) / (1000 * 60 * 60 * 24)));

      grandTotalAgeDays += ageDays;

      if (!oldestOverall || ageDays > oldestOverallAgeDays) {
        oldestOverall = issue;
        oldestOverallAgeDays = ageDays;
      }

      if (!groups[prio]) {
        groups[prio] = {
          count: 0,
          totalDays: 0,
          maxAgeDays: 0,
          oldestIssue: null,
          issues: [],
        };
      }

      groups[prio].count += 1;
      groups[prio].totalDays += ageDays;
      groups[prio].issues.push(issue);

      if (ageDays >= groups[prio].maxAgeDays) {
        groups[prio].maxAgeDays = ageDays;
        groups[prio].oldestIssue = issue;
      }
    });

    const getPriorityColor = (prio: string) => {
      const p = prio.toLowerCase();
      if (p.includes("highest") || p.includes("critical") || p.includes("p1")) return "#ef4444"; // red
      if (p.includes("high") || p.includes("p2")) return "#f97316"; // orange
      if (p.includes("medium") || p.includes("p3")) return "#eab308"; // yellow
      if (p.includes("low") || p.includes("p4")) return "#3b82f6"; // blue
      return "#64748b"; // slate
    };

    const summaries: PriorityAgingSummary[] = Object.entries(groups).map(([prio, data]) => ({
      priority: prio,
      count: data.count,
      totalDays: data.totalDays,
      avgAgeDays: data.count > 0 ? Math.round(data.totalDays / data.count) : 0,
      maxAgeDays: data.maxAgeDays,
      oldestIssue: data.oldestIssue,
      color: getPriorityColor(prio),
    }));

    // Sort summaries
    summaries.sort((a, b) => {
      let comp = 0;
      if (sortBy === "avgAge") comp = a.avgAgeDays - b.avgAgeDays;
      else if (sortBy === "count") comp = a.count - b.count;
      else comp = a.priority.localeCompare(b.priority);
      return sortDirection === "desc" ? -comp : comp;
    });

    const overallAvgAge = openIssues.length > 0 ? Math.round(grandTotalAgeDays / openIssues.length) : 0;

    const filtered = selectedPriorityFilter
      ? openIssues.filter((i) => i.priority === selectedPriorityFilter)
      : openIssues;

    return {
      prioritySummaries: summaries,
      overallStats: {
        openCount: openIssues.length,
        avgAgeDays: overallAvgAge,
        oldestIssue: oldestOverall,
        oldestAgeDays: oldestOverallAgeDays,
      },
      filteredOpenIssues: filtered,
    };
  }, [issues, sortBy, sortDirection, selectedPriorityFilter]);

  const toggleSort = (type: "avgAge" | "count" | "priority") => {
    if (sortBy === type) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(type);
      setSortDirection("desc");
    }
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm space-y-5 transition-all ${
        isLight
          ? "border-slate-200 bg-white text-slate-800"
          : "border-slate-800 bg-[#1E293B] text-slate-100"
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
              Issue Aging Analysis
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {overallStats.openCount} Open Tickets
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Average open ticket duration grouped by issue priority level
            </p>
          </div>
        </div>

        {/* Quick Filter Pill */}
        {selectedPriorityFilter && (
          <button
            onClick={() => setSelectedPriorityFilter(null)}
            className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            Filtered: {selectedPriorityFilter} <span className="font-bold">✕</span>
          </button>
        )}
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`p-3.5 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-white/5"}`}>
          <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center justify-between">
            <span>Overall Avg Age</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-amber-400">
            {overallStats.avgAgeDays} <span className="text-xs font-bold text-slate-400">days</span>
          </div>
          <p className="text-[9.5px] text-slate-400 mt-0.5 font-medium">Averaged across {overallStats.openCount} unresolved tickets</p>
        </div>

        <div className={`p-3.5 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-white/5"}`}>
          <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center justify-between">
            <span>Oldest Open Ticket</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-rose-400">
            {overallStats.oldestAgeDays} <span className="text-xs font-bold text-slate-400">days</span>
          </div>
          <p className="text-[9.5px] text-slate-400 mt-0.5 truncate font-bold" title={overallStats.oldestIssue?.summary}>
            {overallStats.oldestIssue ? `${overallStats.oldestIssue.key}: ${overallStats.oldestIssue.summary}` : "None"}
          </p>
        </div>

        <div className={`p-3.5 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-white/5"}`}>
          <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center justify-between">
            <span>Priority Groups</span>
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-black mt-1 font-mono text-blue-400">
            {prioritySummaries.length} <span className="text-xs font-bold text-slate-400">levels</span>
          </div>
          <p className="text-[9.5px] text-slate-400 mt-0.5 font-medium">Active priority distribution</p>
        </div>
      </div>

      {/* Priority Grouped Table & Visualization */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-2">
          <span>Priority Breakdown ({prioritySummaries.length} Categories)</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-500">Sort by:</span>
            <button
              onClick={() => toggleSort("avgAge")}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                sortBy === "avgAge" ? "bg-amber-500/20 text-amber-300 font-extrabold" : "hover:text-slate-200"
              }`}
            >
              Avg Age {sortBy === "avgAge" ? (sortDirection === "desc" ? "↓" : "↑") : ""}
            </button>
            <button
              onClick={() => toggleSort("count")}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                sortBy === "count" ? "bg-amber-500/20 text-amber-300 font-extrabold" : "hover:text-slate-200"
              }`}
            >
              Count {sortBy === "count" ? (sortDirection === "desc" ? "↓" : "↑") : ""}
            </button>
          </div>
        </div>

        {prioritySummaries.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">
            No open issues found in current scope. All tickets are resolved!
          </div>
        ) : (
          <div className="space-y-2.5">
            {prioritySummaries.map((summary) => {
              const maxAvg = Math.max(...prioritySummaries.map((s) => s.avgAgeDays)) || 1;
              const barPct = Math.min(100, Math.max(8, (summary.avgAgeDays / maxAvg) * 100));
              const isSelected = selectedPriorityFilter === summary.priority;

              return (
                <div
                  key={summary.priority}
                  onClick={() =>
                    setSelectedPriorityFilter(isSelected ? null : summary.priority)
                  }
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30"
                      : isLight
                      ? "bg-slate-50 hover:bg-slate-100 border-slate-200"
                      : "bg-slate-900/50 hover:bg-slate-900/80 border-white/5"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-[140px]">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: summary.color }}
                      />
                      <span className="text-xs font-black uppercase tracking-wide text-white">
                        {summary.priority}
                      </span>
                      <span className="text-[10px] font-mono font-extrabold text-slate-400 px-1.5 py-0.5 rounded bg-slate-950 border border-white/5">
                        {summary.count} open
                      </span>
                    </div>

                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      {/* Bar indicator */}
                      <div className="flex-1 bg-slate-950 rounded-full h-2.5 overflow-hidden border border-white/5">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barPct}%`,
                            backgroundColor: summary.color,
                          }}
                        />
                      </div>

                      {/* Numbers */}
                      <div className="text-right shrink-0 min-w-[110px]">
                        <span className="text-xs font-black font-mono text-amber-300">
                          {summary.avgAgeDays}d avg
                        </span>
                        <span className="text-[9.5px] text-slate-400 font-mono block">
                          max: {summary.maxAgeDays}d
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Oldest Ticket Preview */}
                  {summary.oldestIssue && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium truncate flex items-center gap-1">
                        <span className="text-amber-400 font-bold">Oldest ticket:</span>
                        <span
                          className="text-blue-400 font-mono font-bold hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectIssue && summary.oldestIssue) onSelectIssue(summary.oldestIssue);
                          }}
                        >
                          {summary.oldestIssue.key}
                        </span>
                        - {summary.oldestIssue.summary}
                      </span>
                      <span className="text-slate-400 font-mono shrink-0 font-bold">
                        {summary.maxAgeDays} days open
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
