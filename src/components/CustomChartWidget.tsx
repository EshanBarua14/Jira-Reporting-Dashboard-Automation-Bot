import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Sparkles, BarChart3, GripVertical } from "lucide-react";
import { JiraIssue, CustomChartConfig } from "../types";

interface CustomChartWidgetProps {
  issues: JiraIssue[];
  config?: CustomChartConfig;
}

export const CustomChartWidget: React.FC<CustomChartWidgetProps> = ({
  issues = [],
  config = {
    enabled: true,
    chartType: "bar",
    xAxisField: "assignee",
    primaryMetric: "storyPoints",
    secondaryMetric: "issueCount",
    chartTitle: "Multi-Series Metric Analysis",
  },
}) => {
  const chartData = useMemo(() => {
    if (!issues || issues.length === 0) return [];

    const groups: Record<
      string,
      {
        key: string;
        primaryVal: number;
        secondaryVal: number;
        totalAgeDays: number;
        count: number;
        overdueCount: number;
        totalStoryPoints: number;
        totalTimeSpentHours: number;
      }
    > = {};

    const now = new Date();

    issues.forEach((issue) => {
      let groupKey = "Unassigned";
      if (config.xAxisField === "assignee") groupKey = issue.assignee || "Unassigned";
      else if (config.xAxisField === "status") groupKey = issue.mappedStatus || issue.status || "Unknown";
      else if (config.xAxisField === "type") groupKey = issue.type || "Other";
      else if (config.xAxisField === "priority") groupKey = issue.priority || "Medium";
      else if (config.xAxisField === "sprint") groupKey = issue.sprint || "Backlog / Unassigned";

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          primaryVal: 0,
          secondaryVal: 0,
          totalAgeDays: 0,
          count: 0,
          overdueCount: 0,
          totalStoryPoints: 0,
          totalTimeSpentHours: 0,
        };
      }

      const g = groups[groupKey];
      g.count += 1;

      // Story points
      g.totalStoryPoints += issue.storyPoints || 0;

      // Time spent (seconds -> hours)
      g.totalTimeSpentHours += (issue.timeSpent || 0) / 3600;

      // Ticket Age in Days
      if (issue.created) {
        const createdDate = new Date(issue.created);
        const diffTime = Math.abs(now.getTime() - createdDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        g.totalAgeDays += diffDays;
      }

      // Overdue
      if (issue.dueDate) {
        const due = new Date(issue.dueDate);
        if (due < now && issue.mappedStatus !== "Done") {
          g.overdueCount += 1;
        }
      }
    });

    // Compute metric values per group
    return Object.values(groups).map((g) => {
      // Primary
      let primaryVal = 0;
      if (config.primaryMetric === "storyPoints") primaryVal = g.totalStoryPoints;
      else if (config.primaryMetric === "issueCount") primaryVal = g.count;
      else if (config.primaryMetric === "timeSpent") primaryVal = Math.round(g.totalTimeSpentHours * 10) / 10;
      else if (config.primaryMetric === "avgAge") primaryVal = Math.round((g.totalAgeDays / (g.count || 1)) * 10) / 10;

      // Secondary
      let secondaryVal = 0;
      if (config.secondaryMetric === "issueCount") secondaryVal = g.count;
      else if (config.secondaryMetric === "storyPoints") secondaryVal = g.totalStoryPoints;
      else if (config.secondaryMetric === "overdueCount") secondaryVal = g.overdueCount;
      else if (config.secondaryMetric === "timeSpent") secondaryVal = Math.round(g.totalTimeSpentHours * 10) / 10;

      return {
        name: g.key.length > 18 ? g.key.slice(0, 16) + "..." : g.key,
        fullName: g.key,
        primary: primaryVal,
        secondary: secondaryVal,
        count: g.count,
        storyPoints: g.totalStoryPoints,
      };
    });
  }, [issues, config.xAxisField, config.primaryMetric, config.secondaryMetric]);

  const primaryLabel =
    config.primaryMetric === "storyPoints"
      ? "Story Points"
      : config.primaryMetric === "issueCount"
      ? "Issue Count"
      : config.primaryMetric === "timeSpent"
      ? "Time Spent (Hrs)"
      : "Avg Age (Days)";

  const secondaryLabel =
    config.secondaryMetric === "issueCount"
      ? "Issue Count"
      : config.secondaryMetric === "storyPoints"
      ? "Story Points"
      : config.secondaryMetric === "overdueCount"
      ? "Overdue Issues"
      : config.secondaryMetric === "timeSpent"
      ? "Time Spent (Hrs)"
      : "";

  const hasSecondary = config.secondaryMetric !== "none";

  return (
    <div
      id="custom-multi-series-chart-card"
      className="bg-[#1E293B] rounded-xl border border-slate-800 p-5 shadow-sm space-y-4 relative overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 cursor-grab flex items-center justify-center shrink-0">
            <GripVertical className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              {config.chartTitle || "Custom Multi-Series Metric Chart"}
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Mapped by <span className="text-blue-400 font-bold uppercase">{config.xAxisField}</span> • Primary:{" "}
              <span className="text-emerald-400 font-bold">{primaryLabel}</span>
              {hasSecondary && (
                <span>
                  {" "}
                  • Secondary: <span className="text-indigo-400 font-bold">{secondaryLabel}</span>
                </span>
              )}
            </p>
          </div>
        </div>
        <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
          Multi-Series {config.chartType.toUpperCase()}
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-slate-500 font-medium">
          No data available for the current chart metrics selection.
        </div>
      ) : (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {config.chartType === "line" ? (
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                <YAxis yAxisId="left" stroke="#34d399" fontSize={10} tickLine={false} />
                {hasSecondary && <YAxis yAxisId="right" orientation="right" stroke="#818cf8" fontSize={10} tickLine={false} />}
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                  labelStyle={{ fontWeight: "bold", color: "#60a5fa" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="primary"
                  name={primaryLabel}
                  stroke="#34d399"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#34d399" }}
                  activeDot={{ r: 6 }}
                />
                {hasSecondary && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="secondary"
                    name={secondaryLabel}
                    stroke="#818cf8"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#818cf8" }}
                    activeDot={{ r: 6 }}
                  />
                )}
              </LineChart>
            ) : config.chartType === "area" ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                <YAxis yAxisId="left" stroke="#34d399" fontSize={10} tickLine={false} />
                {hasSecondary && <YAxis yAxisId="right" orientation="right" stroke="#818cf8" fontSize={10} tickLine={false} />}
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                  labelStyle={{ fontWeight: "bold", color: "#60a5fa" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Area yAxisId="left" type="monotone" dataKey="primary" name={primaryLabel} fill="#34d399" fillOpacity={0.3} stroke="#34d399" strokeWidth={2} />
                {hasSecondary && (
                  <Area yAxisId="right" type="monotone" dataKey="secondary" name={secondaryLabel} fill="#818cf8" fillOpacity={0.3} stroke="#818cf8" strokeWidth={2} />
                )}
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                <YAxis yAxisId="left" stroke="#34d399" fontSize={10} tickLine={false} />
                {hasSecondary && <YAxis yAxisId="right" orientation="right" stroke="#818cf8" fontSize={10} tickLine={false} />}
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                  labelStyle={{ fontWeight: "bold", color: "#60a5fa" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar yAxisId="left" dataKey="primary" name={primaryLabel} fill="#34d399" radius={[6, 6, 0, 0]} />
                {hasSecondary && <Bar yAxisId="right" dataKey="secondary" name={secondaryLabel} fill="#818cf8" radius={[6, 6, 0, 0]} />}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
