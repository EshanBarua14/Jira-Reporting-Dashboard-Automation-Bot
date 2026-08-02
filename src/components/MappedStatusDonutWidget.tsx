import React, { useMemo, useState } from "react";
import { PieChart, Tag, CheckCircle2, AlertTriangle, Play, HelpCircle, Layers, BarChart3 } from "lucide-react";
import { JiraIssue } from "../types";
import { D3PieChart } from "./D3PieChart";

interface MappedStatusDonutWidgetProps {
  issues: JiraIssue[];
  categoryColors?: Record<string, string>;
  theme?: "dark" | "light";
  onSelectStatusFilter?: (status: string | null) => void;
  activeStatusFilter?: string | null;
  onDrillDownFilter?: (filterType: "status" | "assignee" | "priority" | "project", value: string) => void;
}

export const MappedStatusDonutWidget: React.FC<MappedStatusDonutWidgetProps> = ({
  issues,
  categoryColors = {
    "Done": "#10b981",
    "In Progress": "#0ea5e9",
    "Blocked": "#ef4444",
    "To Do": "#64748b",
  },
  theme = "dark",
  onSelectStatusFilter,
  activeStatusFilter,
  onDrillDownFilter,
}) => {
  const isLight = theme === "light";
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Group issues by mappedStatus
  const { statusCounts, totalCount, statusBreakdown } = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;

    issues.forEach((issue) => {
      const status = issue.mappedStatus || issue.status || "To Do";
      counts[status] = (counts[status] || 0) + 1;
      total += 1;
    });

    const breakdown = Object.entries(counts).map(([status, count]) => {
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const color = categoryColors[status] || "#64748b";
      return {
        status,
        count,
        pct,
        color,
      };
    });

    breakdown.sort((a, b) => b.count - a.count);

    return {
      statusCounts: {
        todo: counts["To Do"] || 0,
        progress: counts["In Progress"] || 0,
        done: counts["Done"] || 0,
        blocked: counts["Blocked"] || 0,
      },
      totalCount: total,
      statusBreakdown: breakdown,
    };
  }, [issues, categoryColors]);

  const handleStatusClick = (status: string) => {
    const next = selectedStatus === status ? null : status;
    setSelectedStatus(next);
    if (onSelectStatusFilter) onSelectStatusFilter(next);
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm space-y-4 transition-all ${
        isLight
          ? "border-slate-200 bg-white text-slate-800"
          : "border-slate-800 bg-[#1E293B] text-slate-100"
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
              Mapped Status Distribution
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {totalCount} Total Issues
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Proportional donut distribution visualization of issues by mapped workflow status
            </p>
          </div>
        </div>

        {(selectedStatus || activeStatusFilter) && (
          <button
            onClick={() => {
              setSelectedStatus(null);
              if (onSelectStatusFilter) onSelectStatusFilter(null);
            }}
            className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all cursor-pointer self-start sm:self-auto"
          >
            Clear Filter: {selectedStatus || activeStatusFilter} ✕
          </button>
        )}
      </div>

      {/* Main Content: Donut Chart + Legend Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Donut Chart Visualizer */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950/40 border border-white/5 relative">
          <D3PieChart
            data={statusCounts}
            totalCount={totalCount}
            categoryColors={categoryColors}
            onDrillDownFilter={onDrillDownFilter}
          />
          <div className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest mt-2 font-mono">
            Proportional Donut View
          </div>
        </div>

        {/* Legend Breakdown List */}
        <div className="md:col-span-7 space-y-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-1 flex justify-between">
            <span>Workflow Status Breakdown</span>
            <span>Share & Count</span>
          </div>

          {statusBreakdown.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">No issues in current scope.</div>
          ) : (
            statusBreakdown.map((item) => {
              const isSelected = selectedStatus === item.status || activeStatusFilter === item.status;
              return (
                <div
                  key={item.status}
                  onClick={() => handleStatusClick(item.status)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-indigo-500/15 border-indigo-500/50 shadow-sm ring-1 ring-indigo-500/30"
                      : isLight
                      ? "bg-slate-50 hover:bg-slate-100 border-slate-200"
                      : "bg-slate-900/50 hover:bg-slate-900/80 border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-bold text-white truncate">{item.status}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 font-mono">
                    <div className="w-20 bg-slate-950 rounded-full h-2 overflow-hidden border border-white/5 hidden sm:block">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <span className="text-xs font-black text-slate-200 min-w-[50px] text-right">
                      {item.count} <span className="text-[10px] text-slate-400">({item.pct}%)</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
