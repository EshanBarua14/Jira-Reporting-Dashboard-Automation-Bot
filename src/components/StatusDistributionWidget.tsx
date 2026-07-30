import React, { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { JiraIssue } from "../types";
import { BarChart3, Layers, Filter, Info } from "lucide-react";

interface StatusDistributionWidgetProps {
  issues: JiraIssue[];
  theme?: "dark" | "light";
}

const PRIORITY_COLORS: Record<string, string> = {
  Highest: "#ef4444", // Red
  High: "#f97316",    // Orange
  Medium: "#f59e0b",  // Amber
  Low: "#3b82f6",     // Blue
  Lowest: "#10b981",  // Emerald
};

const DEFAULT_PRIORITIES = ["Highest", "High", "Medium", "Low", "Lowest"];
const STATUSES = ["To Do", "In Progress", "Done", "Blocked"];

export const StatusDistributionWidget: React.FC<StatusDistributionWidgetProps> = ({
  issues,
  theme = "dark"
}) => {
  const isLight = theme === "light";
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string | null>(null);
  const [isStacked, setIsStacked] = useState<boolean>(true);

  // Calculate issue counts by mappedStatus and priority
  const chartData = useMemo(() => {
    const statusMap: Record<string, Record<string, number>> = {
      "To Do": { Highest: 0, High: 0, Medium: 0, Low: 0, Lowest: 0 },
      "In Progress": { Highest: 0, High: 0, Medium: 0, Low: 0, Lowest: 0 },
      "Done": { Highest: 0, High: 0, Medium: 0, Low: 0, Lowest: 0 },
      "Blocked": { Highest: 0, High: 0, Medium: 0, Low: 0, Lowest: 0 },
    };

    issues.forEach((issue) => {
      const status = issue.mappedStatus || "To Do";
      const priority = issue.priority || "Medium";

      if (!statusMap[status]) {
        statusMap[status] = { Highest: 0, High: 0, Medium: 0, Low: 0, Lowest: 0 };
      }

      if (statusMap[status][priority] !== undefined) {
        statusMap[status][priority]++;
      } else {
        // Fallback for unknown priority
        statusMap[status]["Medium"] = (statusMap[status]["Medium"] || 0) + 1;
      }
    });

    return STATUSES.map((status) => {
      const row: Record<string, any> = { status };
      let total = 0;
      DEFAULT_PRIORITIES.forEach((p) => {
        const count = statusMap[status][p] || 0;
        row[p] = count;
        total += count;
      });
      row.total = total;
      return row;
    });
  }, [issues]);

  const filteredPriorities = useMemo(() => {
    if (selectedPriorityFilter) {
      return [selectedPriorityFilter];
    }
    return DEFAULT_PRIORITIES;
  }, [selectedPriorityFilter]);

  const totalIssueCount = issues.length;

  return (
    <div
      className={`rounded-2xl p-5 border transition-all duration-200 ${
        isLight
          ? "bg-white border-slate-200 text-slate-800 shadow-sm hover:shadow-md"
          : "bg-slate-900/40 border-white/5 text-slate-200 shadow-xl"
      }`}
    >
      {/* Widget Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
              Status Distribution by Priority
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Grouped ticket volume per workflow status broken down by urgency level
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Stacked vs Grouped Toggle */}
          <button
            type="button"
            onClick={() => setIsStacked((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border transition-all flex items-center gap-1 cursor-pointer ${
              isStacked
                ? "bg-indigo-600 text-white border-indigo-400 shadow-sm"
                : isLight
                ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                : "bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700"
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>{isStacked ? "Stacked" : "Grouped"}</span>
          </button>

          {/* Priority Quick Filter */}
          {selectedPriorityFilter && (
            <button
              type="button"
              onClick={() => setSelectedPriorityFilter(null)}
              className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 border border-white/10 cursor-pointer"
            >
              Clear Filter ({selectedPriorityFilter})
            </button>
          )}
        </div>
      </div>

      {/* Priority Pills Legend / Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
          <Filter className="w-2.5 h-2.5" /> Priority Filter:
        </span>
        {DEFAULT_PRIORITIES.map((p) => {
          const isSelected = selectedPriorityFilter === p;
          const col = PRIORITY_COLORS[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPriorityFilter(isSelected ? null : p)}
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? "ring-2 ring-white text-white font-extrabold scale-105"
                  : "opacity-80 hover:opacity-100 hover:scale-105"
              }`}
              style={{
                backgroundColor: `${col}20`,
                borderColor: `${col}60`,
                color: isLight ? "#1e293b" : "#f8fafc",
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col }} />
              {p}
            </button>
          );
        })}
      </div>

      {/* Chart Canvas */}
      {totalIssueCount === 0 ? (
        <div className="h-56 flex flex-col items-center justify-center text-slate-500 text-xs font-semibold">
          <Info className="w-6 h-6 mb-2 text-slate-600" />
          No ticket data available in current filter scope.
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#1e293b"} />
              <XAxis
                dataKey="status"
                stroke={isLight ? "#64748b" : "#94a3b8"}
                fontSize={11}
                fontWeight="bold"
              />
              <YAxis
                stroke={isLight ? "#64748b" : "#94a3b8"}
                fontSize={11}
                allowDecimals={false}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: isLight ? "#ffffff" : "#0f172a",
                  borderColor: isLight ? "#cbd5e1" : "#334155",
                  borderRadius: "12px",
                  color: isLight ? "#0f172a" : "#f8fafc",
                  fontSize: "12px",
                  fontWeight: "bold",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", fontWeight: "bold", paddingTop: "8px" }}
              />
              {filteredPriorities.map((priority) => (
                <Bar
                  key={priority}
                  dataKey={priority}
                  name={priority}
                  fill={PRIORITY_COLORS[priority]}
                  stackId={isStacked ? "statusStack" : undefined}
                  radius={isStacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary Footer */}
      <div className="mt-4 pt-3 border-t border-slate-700/30 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        {chartData.map((item) => (
          <div
            key={item.status}
            className={`p-2 rounded-xl border ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/40 border-white/5"
            }`}
          >
            <div className="text-[10px] font-extrabold uppercase text-slate-400">{item.status}</div>
            <div className="text-base font-black text-indigo-400 font-mono">{item.total}</div>
            <div className="text-[9px] text-slate-500 font-semibold">tickets</div>
          </div>
        ))}
      </div>
    </div>
  );
};
