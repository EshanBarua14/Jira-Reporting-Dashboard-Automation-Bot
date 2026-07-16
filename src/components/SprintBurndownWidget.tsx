import React, { useMemo } from "react";
import { JiraIssue } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingDown, Calendar, CheckCircle2, AlertCircle } from "lucide-react";

interface SprintBurndownWidgetProps {
  issues: JiraIssue[];
  selectedSprint: string;
}

export const SprintBurndownWidget: React.FC<SprintBurndownWidgetProps> = ({
  issues,
  selectedSprint,
}) => {
  // 1. Filter issues belonging to the selected sprint
  const sprintIssues = useMemo(() => {
    if (!selectedSprint) return [];
    return issues.filter((i) => i.sprint === selectedSprint);
  }, [issues, selectedSprint]);

  // 2. Compute burndown data points
  const burndownData = useMemo(() => {
    if (sprintIssues.length === 0) return [];

    // Calculate total story points for all issues in the sprint
    const totalPoints = sprintIssues.reduce(
      (sum, issue) => sum + (issue.storyPoints || 0),
      0
    );

    // Find the earliest created date as sprint start date, or default
    const earliestCreated = sprintIssues.reduce((min, issue) => {
      if (!issue.created) return min;
      return !min || issue.created < min ? issue.created : min;
    }, "");

    const startDate = earliestCreated ? new Date(earliestCreated) : new Date("2026-06-15");
    
    // Generate 15 days of data (Day 0 to Day 14)
    const points = [];
    const todayStr = new Date().toISOString().split("T")[0];

    for (let i = 0; i <= 14; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];

      // Ideal burndown decreases linearly to 0 on Day 14
      const ideal = Math.max(
        0,
        parseFloat((totalPoints - i * (totalPoints / 14)).toFixed(1))
      );

      // Actual burndown: subtract points of issues resolved on or before dateStr
      const resolvedPointsOnOrBefore = sprintIssues
        .filter(
          (issue) =>
            issue.mappedStatus === "Done" &&
            issue.updated &&
            issue.updated <= dateStr
        )
        .reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);

      const actual = Math.max(0, totalPoints - resolvedPointsOnOrBefore);

      // Plot actual line up to today, or if sprint is fully in the past, up to the end of the sprint
      const maxUpdated = sprintIssues.reduce((max, issue) => {
        if (!issue.updated) return max;
        return !max || issue.updated > max ? issue.updated : max;
      }, "");

      const isFutureDate = dateStr > todayStr && dateStr > maxUpdated;

      points.push({
        dayLabel: `Day ${i}`,
        date: currentDate.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        ideal,
        actual: isFutureDate ? null : actual,
      });
    }

    return points;
  }, [sprintIssues]);

  // 3. Overall sprint KPIs
  const sprintKPIs = useMemo(() => {
    const totalPoints = sprintIssues.reduce(
      (sum, issue) => sum + (issue.storyPoints || 0),
      0
    );
    const completedPoints = sprintIssues
      .filter((i) => i.mappedStatus === "Done")
      .reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);
    const remainingPoints = Math.max(0, totalPoints - completedPoints);

    const totalIssuesCount = sprintIssues.length;
    const completedIssuesCount = sprintIssues.filter(
      (i) => i.mappedStatus === "Done"
    ).length;

    return {
      totalPoints,
      completedPoints,
      remainingPoints,
      totalIssuesCount,
      completedIssuesCount,
    };
  }, [sprintIssues]);

  if (!selectedSprint) {
    return (
      <div className="bg-[#1E293B] rounded-xl border border-slate-800 p-6 shadow-sm flex flex-col justify-center items-center text-center min-h-[300px]">
        <AlertCircle className="w-8 h-8 text-slate-500 mb-2" />
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">No Active Sprint Selected</h3>
        <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
          Please select a sprint filter in the Scope Panel to visualize the daily burndown progress.
        </p>
      </div>
    );
  }

  if (sprintIssues.length === 0) {
    return (
      <div className="bg-[#1E293B] rounded-xl border border-slate-800 p-6 shadow-sm flex flex-col justify-center items-center text-center min-h-[300px]">
        <Calendar className="w-8 h-8 text-slate-500 mb-2 animate-pulse" />
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">No Sprint Issues Found</h3>
        <p className="text-[11px] text-slate-500 mt-1 max-w-sm leading-relaxed">
          We couldn't find any issues tagged with <span className="text-blue-400 font-bold">"{selectedSprint}"</span>. 
          Make sure your filters include issues for this sprint.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#1E293B] rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rose-400" />
            Sprint Burndown Tracker
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
            Daily remaining story points for <span className="text-blue-400 font-bold">{selectedSprint}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-950/40 px-2.5 py-1 rounded-lg border border-slate-800">
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[10px] font-mono text-slate-300 font-bold">14-Day Velocity Curve</span>
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-3 gap-2 text-center bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/60">
        <div>
          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Sprint Commitment</div>
          <div className="text-sm font-black text-white mt-0.5">{sprintKPIs.totalPoints} <span className="text-[9px] font-medium text-slate-400">SP</span></div>
          <div className="text-[8px] text-slate-500 font-semibold mt-0.5">{sprintKPIs.totalIssuesCount} Tickets</div>
        </div>
        <div className="border-x border-slate-800/80">
          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-emerald-400">Points Completed</div>
          <div className="text-sm font-black text-emerald-400 mt-0.5">{sprintKPIs.completedPoints} <span className="text-[9px] font-medium text-emerald-500">SP</span></div>
          <div className="text-[8px] text-emerald-500/80 font-semibold mt-0.5">{sprintKPIs.completedIssuesCount} Resolved</div>
        </div>
        <div>
          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-indigo-400">Points Remaining</div>
          <div className="text-sm font-black text-indigo-400 mt-0.5">{sprintKPIs.remainingPoints} <span className="text-[9px] font-medium text-indigo-500">SP</span></div>
          <div className="text-[8px] text-indigo-500/80 font-semibold mt-0.5">
            {sprintKPIs.totalPoints > 0
              ? Math.round((sprintKPIs.remainingPoints / sprintKPIs.totalPoints) * 100)
              : 0}
            % Left
          </div>
        </div>
      </div>

      {/* Burndown Chart */}
      <div className="w-full h-[220px] pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={burndownData}
            margin={{ top: 10, right: 15, left: -25, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis
              dataKey="dayLabel"
              stroke="#94a3b8"
              fontSize={9}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const idealVal = payload.find((p) => p.name === "Ideal Burndown")?.value;
                  const actualVal = payload.find((p) => p.name === "Actual Remaining")?.value;
                  const dataObj = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg shadow-xl text-[10px] space-y-1">
                      <div className="font-extrabold text-slate-200">
                        {dataObj.dayLabel} ({dataObj.date})
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                        Ideal Burndown: <span className="text-slate-200 font-bold">{idealVal} SP</span>
                      </div>
                      {actualVal !== undefined && actualVal !== null && (
                        <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          Actual Remaining: <span className="text-indigo-300 font-bold">{actualVal} SP</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 9, fontWeight: 700 }}
            />
            <Line
              name="Ideal Burndown"
              type="monotone"
              dataKey="ideal"
              stroke="#64748b"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
            />
            <Line
              name="Actual Remaining"
              type="monotone"
              dataKey="actual"
              stroke="#6366f1"
              strokeWidth={2.5}
              connectNulls={false}
              dot={{ r: 3, stroke: "#6366f1", strokeWidth: 1, fill: "#0f172a" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
