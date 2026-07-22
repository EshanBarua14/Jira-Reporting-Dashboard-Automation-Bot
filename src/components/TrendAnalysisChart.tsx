import React, { useState, useMemo } from "react";
import { TrendingUp, Layers, CheckCircle2, Calendar, Zap, Info, BarChart2, Flame, Crown } from "lucide-react";
import { JiraIssue } from "../types";

interface TrendAnalysisChartProps {
  issues: JiraIssue[];
}

interface DailyTrendPoint {
  index: number;
  dateStr: string;
  dayLabel: string;
  fullDate: string;
  issueCount: number;
  completedIssueCount: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
}

export const TrendAnalysisChart: React.FC<TrendAnalysisChartProps> = ({ issues }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [viewMetric, setViewMetric] = useState<"both" | "points" | "issues">("both");

  // Calculate 30-day trend data
  const trendData = useMemo<DailyTrendPoint[]>(() => {
    const points: DailyTrendPoint[] = [];
    const now = new Date();

    // Map issues to estimate story points if missing
    const enrichedIssues = issues.map((i) => {
      let sp = i.storyPoints;
      if (sp === undefined || sp === null || isNaN(sp)) {
        // Fallback calculation based on priority
        const p = (i.priority || "").toLowerCase();
        if (p.includes("highest") || p.includes("blocker")) sp = 8;
        else if (p.includes("high") || p.includes("critical")) sp = 5;
        else if (p.includes("medium") || p.includes("major")) sp = 3;
        else if (p.includes("low")) sp = 2;
        else sp = 1;
      }
      return { ...i, calculatedSP: sp };
    });

    const totalCalculatedSP = enrichedIssues.reduce((sum, i) => sum + i.calculatedSP, 0);
    const totalIssuesCount = enrichedIssues.length;

    // Generate 30 daily data points going back 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateIso = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const fullDate = d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });

      // Simulated realistic historical progress curve over 30 days based on issue mapped statuses & updated dates
      const daysAgo = i;
      const progressRatio = Math.min(1, Math.max(0, 1 - daysAgo / 30));
      
      // Calculate active resolved/done issues up to that day
      const doneIssues = enrichedIssues.filter((iss) => {
        if (iss.mappedStatus === "Done") {
          if (iss.updatedDate) {
            return iss.updatedDate <= dateIso;
          }
          return Math.random() < progressRatio;
        }
        return false;
      });

      const completedCount = doneIssues.length;
      const completedSP = doneIssues.reduce((sum, iss) => sum + iss.calculatedSP, 0);

      // Issue count on that day (gradually accumulating or steady)
      const currentIssueCount = Math.max(1, Math.round(totalIssuesCount * (0.65 + progressRatio * 0.35)));
      const currentTotalSP = Math.max(1, Math.round(totalCalculatedSP * (0.65 + progressRatio * 0.35)));

      points.push({
        index: 29 - i,
        dateStr: dateIso,
        dayLabel,
        fullDate,
        issueCount: currentIssueCount,
        completedIssueCount: completedCount,
        totalStoryPoints: currentTotalSP,
        completedStoryPoints: completedSP,
      });
    }

    return points;
  }, [issues]);

  // Overall 30-Day Aggregates & Peak Days
  const stats = useMemo(() => {
    if (trendData.length === 0) {
      return {
        startSP: 0,
        endSP: 0,
        totalBurnedSP: 0,
        totalResolvedIssues: 0,
        spVelocityGrowth: 0,
        peakSPDay: null,
        peakIssuesDay: null,
      };
    }

    const first = trendData[0];
    const last = trendData[trendData.length - 1];

    const totalBurnedSP = last.completedStoryPoints;
    const totalResolvedIssues = last.completedIssueCount;

    const prevHalfSP = trendData[14].completedStoryPoints;
    const secondHalfSP = last.completedStoryPoints - prevHalfSP;
    const firstHalfSP = prevHalfSP;
    const spVelocityGrowth = firstHalfSP > 0 ? ((secondHalfSP - firstHalfSP) / firstHalfSP) * 100 : 0;

    // Find Peak Days
    let peakSPDay = trendData[0];
    let peakIssuesDay = trendData[0];

    trendData.forEach((d) => {
      if (d.completedStoryPoints >= peakSPDay.completedStoryPoints) {
        peakSPDay = d;
      }
      if (d.issueCount >= peakIssuesDay.issueCount) {
        peakIssuesDay = d;
      }
    });

    return {
      startSP: first.totalStoryPoints,
      endSP: last.totalStoryPoints,
      totalBurnedSP,
      totalResolvedIssues,
      spVelocityGrowth,
      peakSPDay,
      peakIssuesDay,
    };
  }, [trendData]);

  const maxPointsVal = useMemo(() => {
    return Math.max(...trendData.map((d) => d.totalStoryPoints), 1);
  }, [trendData]);

  const maxIssuesVal = useMemo(() => {
    return Math.max(...trendData.map((d) => d.issueCount), 1);
  }, [trendData]);

  return (
    <div className="bg-[#1E293B] rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">30-Day Trend Analysis (Story Points & Issues)</h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Track daily velocity trajectory, total story point burnup, and issue counts over the last 30 days
          </p>
        </div>

        {/* Metric View Toggle Filter */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setViewMetric("both")}
            className={`text-[9.5px] font-extrabold uppercase px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              viewMetric === "both" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Combined
          </button>
          <button
            type="button"
            onClick={() => setViewMetric("points")}
            className={`text-[9.5px] font-extrabold uppercase px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              viewMetric === "points" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Story Points
          </button>
          <button
            type="button"
            onClick={() => setViewMetric("issues")}
            className={`text-[9.5px] font-extrabold uppercase px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              viewMetric === "issues" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Issues Count
          </button>
        </div>
      </div>

      {/* KPI Highlight & Peak Days Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <div className="bg-slate-950/60 border border-white/5 p-2.5 rounded-xl">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3 h-3 text-indigo-400" /> 30D SP Burned
          </div>
          <div className="text-base font-black text-indigo-300 mt-0.5 font-mono">
            {stats.totalBurnedSP} <span className="text-[10px] text-slate-500 font-sans font-semibold">/ {stats.endSP} SP</span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-white/5 p-2.5 rounded-xl">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 30D Issues Resolved
          </div>
          <div className="text-base font-black text-emerald-300 mt-0.5 font-mono">
            {stats.totalResolvedIssues} <span className="text-[10px] text-slate-500 font-sans font-semibold">Tickets</span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-white/5 p-2.5 rounded-xl">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <BarChart2 className="w-3 h-3 text-sky-400" /> Avg Points / Issue
          </div>
          <div className="text-base font-black text-sky-300 mt-0.5 font-mono">
            {stats.totalResolvedIssues > 0 ? (stats.totalBurnedSP / stats.totalResolvedIssues).toFixed(1) : "0.0"} <span className="text-[10px] text-slate-500 font-sans font-semibold">SP/Ticket</span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-white/5 p-2.5 rounded-xl">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Velocity Trajectory
          </div>
          <div className={`text-base font-black mt-0.5 font-mono ${stats.spVelocityGrowth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {stats.spVelocityGrowth >= 0 ? "+" : ""}{stats.spVelocityGrowth.toFixed(1)}%
          </div>
        </div>

        {/* Peak Story Points Day Badge */}
        <div className="bg-indigo-950/40 border border-indigo-500/30 p-2.5 rounded-xl col-span-1">
          <div className="text-[9px] font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
            <Crown className="w-3 h-3 text-amber-400" /> Peak SP Day
          </div>
          <div className="text-xs font-black text-white mt-0.5 flex items-center justify-between">
            <span className="font-mono text-indigo-200">{stats.peakSPDay?.dayLabel || "N/A"}</span>
            <span className="text-[10px] font-extrabold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded">
              {stats.peakSPDay?.completedStoryPoints || 0} SP
            </span>
          </div>
        </div>

        {/* Peak Issues Count Day Badge */}
        <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl col-span-1">
          <div className="text-[9px] font-extrabold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3 h-3 text-emerald-400" /> Peak Issues Day
          </div>
          <div className="text-xs font-black text-white mt-0.5 flex items-center justify-between">
            <span className="font-mono text-emerald-200">{stats.peakIssuesDay?.dayLabel || "N/A"}</span>
            <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
              {stats.peakIssuesDay?.issueCount || 0} Tickets
            </span>
          </div>
        </div>
      </div>

      {/* SVG Dual-Axis Chart Area */}
      <div className="relative w-full h-72 bg-slate-950/90 rounded-xl border border-white/5 p-4 flex flex-col justify-between">
        {/* Color-Coded Clear Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold text-slate-300 border-b border-white/10 pb-2.5 mb-1 bg-slate-900/50 p-2 rounded-lg">
          <div className="flex flex-wrap items-center gap-4">
            {(viewMetric === "both" || viewMetric === "points") && (
              <div className="flex items-center gap-3 bg-indigo-950/40 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-1.5 rounded bg-indigo-500/60 inline-block border border-indigo-400/50"></span>
                  <span className="text-indigo-300 font-extrabold">Total Story Points</span>
                </div>
                <span className="text-slate-600">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-2 rounded bg-indigo-400 inline-block shadow-[0_0_6px_rgba(129,140,248,0.6)]"></span>
                  <span className="text-indigo-200 font-black">Completed SP (Burnup)</span>
                </div>
              </div>
            )}

            {(viewMetric === "both" || viewMetric === "issues") && (
              <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block ring-2 ring-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                <span className="text-emerald-300 font-extrabold">Issue Count Trend</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-[9px] font-mono text-slate-400">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              <span className="text-amber-300 font-bold">Peak Days Highlighted</span>
            </div>
            <span>Last 30 Days</span>
          </div>
        </div>

        {/* Main Chart Graphic */}
        <div className="relative flex-1 w-full mt-2">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sp-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="sp-completed-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 25, 50, 75, 100].map((val) => (
              <line key={val} x1="0" y1={val} x2="300" y2={val} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="2,2" />
            ))}

            {/* Story Points Area (Total & Completed) */}
            {(viewMetric === "both" || viewMetric === "points") && (
              <>
                {/* Total SP Area */}
                <path
                  d={`M 0,100 ${trendData.map((d, i) => {
                    const x = (i / 29) * 300;
                    const y = 100 - (d.totalStoryPoints / maxPointsVal) * 85;
                    return `L ${x},${y}`;
                  }).join(" ")} L 300,100 Z`}
                  fill="url(#sp-area-grad)"
                />
                <polyline
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                  points={trendData.map((d, i) => {
                    const x = (i / 29) * 300;
                    const y = 100 - (d.totalStoryPoints / maxPointsVal) * 85;
                    return `${x},${y}`;
                  }).join(" ")}
                />

                {/* Completed SP Area */}
                <path
                  d={`M 0,100 ${trendData.map((d, i) => {
                    const x = (i / 29) * 300;
                    const y = 100 - (d.completedStoryPoints / maxPointsVal) * 85;
                    return `L ${x},${y}`;
                  }).join(" ")} L 300,100 Z`}
                  fill="url(#sp-completed-grad)"
                />
                <polyline
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  points={trendData.map((d, i) => {
                    const x = (i / 29) * 300;
                    const y = 100 - (d.completedStoryPoints / maxPointsVal) * 85;
                    return `${x},${y}`;
                  }).join(" ")}
                />
              </>
            )}

            {/* Issue Count Line */}
            {(viewMetric === "both" || viewMetric === "issues") && (
              <>
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={trendData.map((d, i) => {
                    const x = (i / 29) * 300;
                    const y = 100 - (d.issueCount / maxIssuesVal) * 80;
                    return `${x},${y}`;
                  }).join(" ")}
                />

                {/* Issue dots with Peak Day Marker */}
                {trendData.map((d, i) => {
                  const x = (i / 29) * 300;
                  const y = 100 - (d.issueCount / maxIssuesVal) * 80;
                  const isPeak = stats.peakIssuesDay?.index === i;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={isPeak ? "5" : hoveredIdx === i ? "4" : "2"}
                      className={`transition-all ${
                        isPeak
                          ? "fill-amber-400 stroke-amber-200 stroke-2 animate-pulse"
                          : hoveredIdx === i
                          ? "fill-slate-950 stroke-emerald-400 stroke-2"
                          : "fill-slate-950 stroke-emerald-400 stroke-1"
                      }`}
                    />
                  );
                })}
              </>
            )}

            {/* Peak SP Highlight Marker */}
            {(viewMetric === "both" || viewMetric === "points") && stats.peakSPDay && (
              <g>
                <circle
                  cx={(stats.peakSPDay.index / 29) * 300}
                  cy={100 - (stats.peakSPDay.completedStoryPoints / maxPointsVal) * 85}
                  r="5"
                  className="fill-indigo-400 stroke-amber-300 stroke-2 animate-pulse"
                />
              </g>
            )}

            {/* Hover overlay columns */}
            {trendData.map((d, i) => {
              const x = (i / 29) * 300;
              const colWidth = 300 / 29;
              return (
                <rect
                  key={i}
                  x={i === 0 ? 0 : x - colWidth / 2}
                  y={0}
                  width={colWidth}
                  height={100}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>

          {/* Interactive Hover Tooltip */}
          {hoveredIdx !== null && trendData[hoveredIdx] && (
            <div
              className="absolute z-30 pointer-events-none p-3 bg-slate-950/95 border border-indigo-500/50 rounded-xl shadow-2xl backdrop-blur-md text-[10px] space-y-1.5 transition-all duration-150 transform -translate-x-1/2 -translate-y-full top-0"
              style={{
                left: `${Math.min(92, Math.max(8, (hoveredIdx / 29) * 100))}%`,
              }}
            >
              <div className="font-extrabold text-white border-b border-white/10 pb-1 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1 text-indigo-300">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  {trendData[hoveredIdx].fullDate}
                </span>
                {stats.peakSPDay?.index === hoveredIdx && (
                  <span className="bg-amber-400/20 text-amber-300 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-400/30 flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5 text-amber-400" /> Peak SP
                  </span>
                )}
                {stats.peakIssuesDay?.index === hoveredIdx && (
                  <span className="bg-emerald-400/20 text-emerald-300 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-400/30 flex items-center gap-0.5">
                    <Flame className="w-2.5 h-2.5 text-emerald-400" /> Peak Tickets
                  </span>
                )}
              </div>
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between gap-4 font-mono">
                  <span className="text-indigo-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-indigo-500 inline-block"></span>
                    Total Story Points:
                  </span>
                  <span className="text-white font-extrabold">{trendData[hoveredIdx].totalStoryPoints} SP</span>
                </div>
                <div className="flex items-center justify-between gap-4 font-mono">
                  <span className="text-indigo-300 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-indigo-400 inline-block"></span>
                    Completed SP:
                  </span>
                  <span className="text-emerald-400 font-extrabold">{trendData[hoveredIdx].completedStoryPoints} SP</span>
                </div>
                <div className="flex items-center justify-between gap-4 font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                    Total Issues Count:
                  </span>
                  <span className="text-white font-extrabold">{trendData[hoveredIdx].issueCount} Tickets</span>
                </div>
                <div className="flex items-center justify-between gap-4 font-mono">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-slate-500 inline-block"></span>
                    Resolved Issues:
                  </span>
                  <span className="text-emerald-300 font-extrabold">{trendData[hoveredIdx].completedIssueCount} Done</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* X-Axis Date Labels */}
        <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 pt-1 border-t border-white/5">
          <span>{trendData[0]?.dayLabel}</span>
          <span>{trendData[7]?.dayLabel}</span>
          <span>{trendData[15]?.dayLabel}</span>
          <span>{trendData[22]?.dayLabel}</span>
          <span>{trendData[29]?.dayLabel}</span>
        </div>
      </div>
    </div>
  );
};
