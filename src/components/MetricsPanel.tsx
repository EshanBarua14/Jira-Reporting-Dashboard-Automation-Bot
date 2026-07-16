import React from "react";
import { AreaChart, Check, TrendingUp, AlertTriangle, Download, RefreshCw, ZoomIn, Eye, Sparkles } from "lucide-react";
import { MetricDefinition, GeneratedReport } from "../types";
import * as d3 from "d3";

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

interface MetricsPanelProps {
  metrics: MetricDefinition[];
  onChangeMetrics: (newMetrics: MetricDefinition[]) => void;
  report?: GeneratedReport | null;
  metricsHistory?: any[];
  addToast?: (title: string, message: string, type?: "info" | "success" | "warning" | "error", duration?: number) => void;
}

interface HistoryItem {
  name: string;
  date: string;
  metrics: {
    totalIssues: number;
    doneCount: number;
    completionPercentage: number;
    overdueIssues: number;
    unassignedIssues: number;
    bugsToStoriesRatio: number;
    averageCycleTime: number;
    sprintVelocity: number;
    [key: string]: number;
  };
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  onChangeMetrics,
  report,
  metricsHistory = [],
  addToast,
}) => {
  // Active Tab view ("monitors" or "correlation")
  const [activeTab, setActiveTab] = React.useState<"monitors" | "correlation">("monitors");

  // Smoothing moving average toggle
  const [isSmoothingActive, setIsSmoothingActive] = React.useState<boolean>(false);

  // Annotation persistent states
  const [annotations, setAnnotations] = React.useState<Record<string, Record<number, string>>>(() => {
    try {
      const saved = localStorage.getItem("omnisync_metric_annotations");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Automatically persist annotations to localStorage
  React.useEffect(() => {
    localStorage.setItem("omnisync_metric_annotations", JSON.stringify(annotations));
  }, [annotations]);

  // Selected Sprint/Data Point index for annotation card forms
  const [selectedSprintIdx, setSelectedSprintIdx] = React.useState<Record<string, number>>({});
  // Unsaved input notes typing state for annotations card forms
  const [cardInputs, setCardInputs] = React.useState<Record<string, string>>({});

  // Card delta compare modes ("previous" or "average")
  const [cardCompareModes, setCardCompareModes] = React.useState<Record<string, "previous" | "average">>({});

  // States for Advanced Trend Analyzer
  const [primaryMetric, setPrimaryMetric] = React.useState<string>("sprintVelocity");
  const [secondaryMetric, setSecondaryMetric] = React.useState<string>("averageCycleTime");
  const [isComparisonActive, setIsComparisonActive] = React.useState<boolean>(true);
  const [showTrendline, setShowTrendline] = React.useState<boolean>(true);
  const [showStdDevShading, setShowStdDevShading] = React.useState<boolean>(true);
  const [zoomRange, setZoomRange] = React.useState<[number, number] | null>(null);
  
  // Hovered tooltip state
  const [hoveredPoint, setHoveredPoint] = React.useState<{
    index: number;
    name: string;
    date: string;
    value: number;
    secondaryValue?: number;
    x: number;
    y: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  // Click & drag zoom state
  const [dragStart, setDragStart] = React.useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);

  // Helper to compute 3-period simple moving average
  const getSmoothedSeries = React.useCallback((series: number[]): number[] => {
    if (!isSmoothingActive) return series;
    return series.map((val, idx) => {
      if (idx === 0) return val;
      if (idx === 1) return Number(((series[0] + series[1]) / 2).toFixed(2));
      const sum = series[idx - 2] + series[idx - 1] + series[idx];
      return Number((sum / 3).toFixed(2));
    });
  }, [isSmoothingActive]);

  // Generate 12-entry historical dataset using props history or realistic growth padding
  const historyData = React.useMemo<HistoryItem[]>(() => {
    const baseHistory = metricsHistory || [];
    
    const dates = Array.from({ length: 12 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (11 - i) * 14);
      return d.toISOString().split("T")[0];
    });

    const names = Array.from({ length: 12 }).map((_, i) => `Sprint ${i + 1}`);

    const baselineTrends: Record<string, number[]> = {
      totalIssues: [20, 22, 24, 25, 28, 30, 31, 33, 35, 36, 38, 40],
      doneCount: [10, 12, 14, 16, 18, 21, 23, 24, 27, 29, 31, 34],
      completionPercentage: [50, 55, 58, 64, 64, 70, 74, 73, 77, 81, 82, 85],
      overdueIssues: [8, 7, 7, 5, 5, 4, 3, 4, 2, 2, 1, 1],
      unassignedIssues: [7, 6, 5, 5, 4, 3, 2, 2, 2, 1, 0, 0],
      bugsToStoriesRatio: [0.42, 0.39, 0.35, 0.32, 0.29, 0.27, 0.25, 0.23, 0.20, 0.18, 0.15, 0.12],
      averageCycleTime: [11.8, 11.0, 10.2, 9.5, 9.0, 8.4, 7.9, 7.6, 7.1, 6.5, 6.0, 5.5],
      sprintVelocity: [22, 26, 32, 36, 40, 44, 46, 50, 54, 58, 62, 66]
    };

    const getReportMetricValue = (metricId: string): number => {
      if (!report || !report.metrics) {
        return baselineTrends[metricId][11];
      }
      const rm = report.metrics;
      if (metricId === "bugsToStoriesRatio") {
        const val = rm.bugsToStoriesRatio;
        if (typeof val === "string") {
          if (val.includes(":")) {
            const parts = val.split(":");
            const bugs = parseFloat(parts[0]) || 0;
            const stories = parseFloat(parts[1]) || 1;
            return Number((bugs / stories).toFixed(2));
          }
          return parseFloat(val) || 0.25;
        }
        return Number(val) || 0.25;
      }
      return Number((rm as any)[metricId]) || 0;
    };

    const scaleTrend = (metricId: string, currentVal: number): number[] => {
      const rawTrend = baselineTrends[metricId];
      const rawLast = rawTrend[rawTrend.length - 1];
      if (rawLast === 0) return rawTrend;
      const ratio = currentVal / rawLast;
      return rawTrend.map((v, i) => {
        if (i === rawTrend.length - 1) return currentVal;
        const scaledValue = v * ratio;
        if (["totalIssues", "doneCount", "overdueIssues", "unassignedIssues", "sprintVelocity"].includes(metricId)) {
          return Math.max(0, Math.round(scaledValue));
        }
        if (metricId === "completionPercentage") {
          return Math.min(100, Math.max(0, Math.round(scaledValue)));
        }
        return Number(Math.max(0, scaledValue).toFixed(2));
      });
    };

    const items: HistoryItem[] = Array.from({ length: 12 }).map((_, i) => ({
      name: names[i],
      date: dates[i],
      metrics: {
        totalIssues: 0,
        doneCount: 0,
        completionPercentage: 0,
        overdueIssues: 0,
        unassignedIssues: 0,
        bugsToStoriesRatio: 0,
        averageCycleTime: 0,
        sprintVelocity: 0
      }
    }));

    Object.keys(baselineTrends).forEach((metricId) => {
      const currentVal = getReportMetricValue(metricId);
      const scaledSeries = scaleTrend(metricId, currentVal);
      scaledSeries.forEach((val, idx) => {
        (items[idx].metrics as any)[metricId] = val;
      });
    });

    if (baseHistory.length > 0) {
      const len = baseHistory.length;
      for (let i = 0; i < 12; i++) {
        const histIdx = len - 1 - i;
        if (histIdx >= 0) {
          const entry = baseHistory[histIdx];
          const targetIdx = 11 - i;
          if (entry.timestamp) {
            items[targetIdx].date = entry.timestamp.split("T")[0];
          }
          Object.keys(baselineTrends).forEach((metricId) => {
            if (entry.metrics) {
              let val = 0;
              if (metricId === "bugsToStoriesRatio") {
                val = entry.metrics.bugsCount || 0;
              } else {
                val = entry.metrics[metricId] || 0;
              }
              if (val > 0) {
                (items[targetIdx].metrics as any)[metricId] = val;
              }
            }
          });
        }
      }
    }

    return items;
  }, [metricsHistory, report]);

  // Download the 12-entry historical dataset as JSON
  const handleExportHistory = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(historyData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "omnisync_pmo_metrics_history.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      addToast?.("History Exported", "The 12-entry historical JSON dataset has been downloaded.", "success", 3000);
    } catch (err) {
      addToast?.("Export Failed", "Could not download metrics history.", "error", 3000);
    }
  };

  const getMetricDelta = (metricId: string, mode: "previous" | "average") => {
    const currentVal = historyData[11].metrics[metricId] || 0;

    if (mode === "average") {
      const vals = historyData.map((h) => h.metrics[metricId] || 0);
      const historicalAvg = vals.reduce((sum, v) => sum + v, 0) / (vals.length || 1);
      return renderDeltaSpan(metricId, currentVal, historicalAvg, "avg");
    }

    if (!report || !metricsHistory || metricsHistory.length < 2) {
      const prevVal = historyData[10].metrics[metricId] || 0;
      return renderDeltaSpan(metricId, currentVal, prevVal, "prev");
    }

    const currentEntry = metricsHistory[metricsHistory.length - 1];
    const prevEntry = metricsHistory[metricsHistory.length - 2];
    if (!currentEntry || !prevEntry) {
      const prevVal = historyData[10].metrics[metricId] || 0;
      return renderDeltaSpan(metricId, currentVal, prevVal, "prev");
    }

    let currentMetricVal = 0;
    let prevMetricVal = 0;

    if (metricId === "bugsToStoriesRatio") {
      currentMetricVal = currentEntry.metrics.bugsCount || 0;
      prevMetricVal = prevEntry.metrics.bugsCount || 0;
    } else {
      currentMetricVal = (currentEntry.metrics as any)[metricId] || 0;
      prevMetricVal = (prevEntry.metrics as any)[metricId] || 0;
    }

    return renderDeltaSpan(metricId, currentMetricVal, prevMetricVal, "prev");
  };

  const renderDeltaSpan = (metricId: string, currentVal: number, compareVal: number, type: "prev" | "avg") => {
    const diff = Number((currentVal - compareVal).toFixed(1));
    const label = type === "avg" ? "vs Avg" : "vs Prev";
    const modeToToggle = type === "avg" ? "previous" : "average";

    const handleToggleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCardCompareModes((prev) => ({
        ...prev,
        [metricId]: modeToToggle,
      }));
      addToast?.("Delta Mode Changed", `Comparing ${metricId} to ${modeToToggle === "average" ? "12-Sprint Avg" : "Previous Sprint"}`, "info", 1500);
    };

    if (diff === 0) {
      return (
        <span
          onClick={handleToggleClick}
          title="Click to toggle comparison mode"
          className="text-[8px] text-slate-500 font-bold ml-2 inline-flex items-center gap-0.5 bg-slate-950/40 px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-wide shrink-0 cursor-pointer hover:bg-slate-900/60"
        >
          Stable ({label})
        </span>
      );
    }

    const isUp = diff > 0;
    const isBadMetric = ["overdueIssues", "unassignedIssues"].includes(metricId);
    const isGood = isBadMetric ? !isUp : isUp;

    let pct = 0;
    if (compareVal !== 0) {
      pct = Math.round((diff / compareVal) * 100);
    }

    return (
      <span
        onClick={handleToggleClick}
        title="Click to toggle comparison mode"
        className={`text-[8.5px] font-black ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 cursor-pointer transition-all hover:scale-105 select-none ${
          isGood
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
            : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
        }`}
      >
        {isUp ? "▲" : "▼"} {diff > 0 ? "+" : ""}{diff} {compareVal !== 0 ? `(${Math.abs(pct)}%)` : ""}{" "}
        <span className="text-[7.5px] opacity-75 ml-1">({label})</span>
      </span>
    );
  };

  const toggleMetric = (id: string) => {
    onChangeMetrics(
      metrics.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const selectAll = () => {
    onChangeMetrics(metrics.map((m) => ({ ...m, enabled: true })));
  };

  const clearAll = () => {
    onChangeMetrics(metrics.map((m) => ({ ...m, enabled: false })));
  };

  // Helper to render mini D3-based sparklines in cards with stdDev, callouts, and trendline
  const renderMiniD3Sparkline = (metricId: string) => {
    const rawVals = historyData.map((h) => h.metrics[metricId] || 0);
    const vals = isSmoothingActive ? getSmoothedSeries(rawVals) : rawVals;
    const max = Math.max(...vals) || 1;
    const min = Math.min(...vals) || 0;
    const range = max - min || 1;

    // Scale to a 110x32 viewbox
    const points = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * 110;
      const y = 32 - ((v - min) / range) * 26 - 3;
      return `${x},${y}`;
    }).join(" ");

    // Standard deviation and mean calculation
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / vals.length;
    const stdDev = Math.sqrt(variance);

    const peakIdx = vals.indexOf(Math.max(...vals));
    const troughIdx = vals.indexOf(Math.min(...vals));

    // Simple regression for trendline slope
    const xVals = Array.from({ length: 12 }).map((_, i) => i);
    const n = 12;
    const sumX = xVals.reduce((a, b) => a + b, 0);
    const sumY = vals.reduce((a, b) => a + b, 0);
    const sumXY = xVals.reduce((a, b, idx) => a + b * vals[idx], 0);
    const sumXX = xVals.reduce((a, b) => a + b * b, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    const trendLinePoints = [
      { x: 0, y: 32 - ((intercept - min) / range) * 26 - 3 },
      { x: 110, y: 32 - (((slope * 11 + intercept) - min) / range) * 26 - 3 }
    ];

    const outPoints = vals.map((v, i) => {
      const isOut = v < mean - stdDev || v > mean + stdDev;
      return { x: (i / (vals.length - 1)) * 110, y: 32 - ((v - min) / range) * 26 - 3, isOut };
    });

    let isGood = true;
    if (vals.length >= 2) {
      const lastDiff = vals[vals.length - 1] - vals[vals.length - 2];
      if (["overdueIssues", "unassignedIssues"].includes(metricId)) {
        isGood = lastDiff <= 0;
      } else {
        isGood = lastDiff >= 0;
      }
    }
    const strokeCol = isGood ? "#10b981" : "#ef4444";

    return (
      <div className="mt-2.5 flex items-center justify-between gap-3 bg-slate-950/45 p-2 rounded-lg border border-white/5">
        <div className="relative w-28 h-8 shrink-0">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 110 32">
            {/* Standard Dev shading */}
            {outPoints.map((pt, i) => {
              if (pt.isOut) {
                const colWidth = 110 / 11;
                return (
                  <rect
                    key={i}
                    x={pt.x - colWidth / 2}
                    y={0}
                    width={colWidth}
                    height={32}
                    fill="rgba(239, 68, 68, 0.08)"
                    stroke="rgba(239, 68, 68, 0.12)"
                    strokeWidth={0.5}
                    strokeDasharray="1 1"
                    pointerEvents="none"
                  />
                );
              }
              return null;
            })}

            {/* D3 linear trendline overlay */}
            <line
              x1={trendLinePoints[0].x}
              y1={trendLinePoints[0].y}
              x2={trendLinePoints[1].x}
              y2={trendLinePoints[1].y}
              stroke="#818cf8"
              strokeWidth={0.7}
              strokeDasharray="2 2"
              opacity={0.65}
            />

            {/* Sparkline polyline */}
            <polyline
              fill="none"
              stroke={strokeCol}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />

            {/* Callouts */}
            <circle cx={(peakIdx / 11) * 110} cy={32 - ((vals[peakIdx] - min) / range) * 26 - 3} r={2} fill="#10b981" />
            <circle cx={(troughIdx / 11) * 110} cy={32 - ((vals[troughIdx] - min) / range) * 26 - 3} r={2} fill="#ef4444" />
          </svg>
        </div>
        <div className="text-[7.5px] font-mono font-bold text-slate-500 space-y-0.5 text-right shrink-0">
          <div className="text-emerald-400">▲ MAX: {vals[peakIdx]}</div>
          <div className="text-rose-400">▼ MIN: {vals[troughIdx]}</div>
        </div>
      </div>
    );
  };

  // Pearson Correlation calculations
  const correlationAnalysis = React.useMemo(() => {
    if (!isComparisonActive) return null;
    const pVals = historyData.map((h) => h.metrics[primaryMetric] || 0);
    const sVals = historyData.map((h) => h.metrics[secondaryMetric] || 0);

    const n = pVals.length;
    const sumP = pVals.reduce((a, b) => a + b, 0);
    const sumS = sVals.reduce((a, b) => a + b, 0);
    const avgP = sumP / n;
    const avgS = sumS / n;

    let numerator = 0;
    let varianceP = 0;
    let varianceS = 0;

    for (let i = 0; i < n; i++) {
      const dP = pVals[i] - avgP;
      const dS = sVals[i] - avgS;
      numerator += dP * dS;
      varianceP += dP * dP;
      varianceS += dS * dS;
    }

    if (varianceP === 0 || varianceS === 0) {
      return { r: 0, text: "Insufficient variance to calculate" };
    }

    const r = numerator / Math.sqrt(varianceP * varianceS);
    const absR = Math.abs(r);

    let text = "";
    if (absR >= 0.7) {
      text = r > 0 ? "Strong Positive Correlation" : "Strong Negative Correlation";
    } else if (absR >= 0.4) {
      text = r > 0 ? "Moderate Positive Correlation" : "Moderate Negative Correlation";
    } else if (absR >= 0.1) {
      text = r > 0 ? "Weak Positive Correlation" : "Weak Negative Correlation";
    } else {
      text = "Negligible / No Correlation";
    }

    return {
      r: Number(r.toFixed(2)),
      text,
      avgP,
      avgS,
    };
  }, [historyData, primaryMetric, secondaryMetric, isComparisonActive]);

  // Main interactive D3-based dual-axis trend chart calculations and SVG rendering
  const renderInteractiveD3Chart = () => {
    const width = 600;
    const height = 220;
    const padding = { top: 25, right: 45, left: 45, bottom: 30 };

    const minIdx = zoomRange ? zoomRange[0] : 0;
    const maxIdx = zoomRange ? zoomRange[1] : 11;

    // Filtered data in zoom window
    const visibleData = historyData.slice(minIdx, maxIdx + 1);
    
    // Primary Metric Values
    const rawPrimaryVals = historyData.map((h) => h.metrics[primaryMetric] || 0);
    const primaryVals = isSmoothingActive ? getSmoothedSeries(rawPrimaryVals) : rawPrimaryVals;
    const visiblePrimaryVals = primaryVals.slice(minIdx, maxIdx + 1);
    const maxPrimary = Math.max(...visiblePrimaryVals) || 1;
    const minPrimary = Math.min(...visiblePrimaryVals) || 0;
    const rangePrimary = maxPrimary - minPrimary || 1;

    // Secondary Metric Values
    const rawSecondaryVals = historyData.map((h) => h.metrics[secondaryMetric] || 0);
    const secondaryVals = isSmoothingActive ? getSmoothedSeries(rawSecondaryVals) : rawSecondaryVals;
    const visibleSecondaryVals = secondaryVals.slice(minIdx, maxIdx + 1);
    const maxSecondary = Math.max(...visibleSecondaryVals) || 1;
    const minSecondary = Math.min(...visibleSecondaryVals) || 0;
    const rangeSecondary = maxSecondary - minSecondary || 1;

    // D3 Scale Functions
    const xScale = d3.scaleLinear()
      .domain([minIdx, maxIdx])
      .range([padding.left, width - padding.right]);

    const yScalePrimary = d3.scaleLinear()
      .domain([minPrimary - rangePrimary * 0.05, maxPrimary + rangePrimary * 0.05])
      .range([height - padding.bottom, padding.top]);

    const yScaleSecondary = d3.scaleLinear()
      .domain([minSecondary - rangeSecondary * 0.05, maxSecondary + rangeSecondary * 0.05])
      .range([height - padding.bottom, padding.top]);

    // Build line paths
    const primaryPoints = visibleData.map((h, i) => {
      const idx = minIdx + i;
      return `${xScale(idx)},${yScalePrimary(primaryVals[idx])}`;
    }).join(" ");

    const secondaryPoints = visibleData.map((h, i) => {
      const idx = minIdx + i;
      return `${xScale(idx)},${yScaleSecondary(secondaryVals[idx])}`;
    }).join(" ");

    // Standard deviation shaded background regions for the primary metric
    // Window of size 3 for rolling metrics
    const getRollingStats = (vals: number[], windowSize = 3) => {
      return vals.map((val, idx) => {
        const start = Math.max(0, idx - windowSize + 1);
        const sub = vals.slice(start, idx + 1);
        const mean = sub.reduce((a, b) => a + b, 0) / sub.length;
        const variance = sub.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / sub.length;
        const stdDev = Math.sqrt(variance);
        return { mean, stdDev };
      });
    };

    const rollingStats = getRollingStats(primaryVals);
    
    // Outlier columns rendering
    const outlierBars: React.ReactNode[] = [];
    if (showStdDevShading) {
      for (let i = minIdx; i <= maxIdx; i++) {
        const val = primaryVals[i];
        const stats = rollingStats[i];
        // Outlier if outside rolling average +/- 1.0 standard deviation
        const isOutlier = val < stats.mean - stats.stdDev || val > stats.mean + stats.stdDev;
        if (isOutlier) {
          const xPos = xScale(i);
          const colWidth = (width - padding.left - padding.right) / (maxIdx - minIdx || 1);
          outlierBars.push(
            <g key={`outlier-${i}`}>
              <rect
                x={xPos - colWidth / 2}
                y={padding.top}
                width={colWidth}
                height={height - padding.top - padding.bottom}
                fill="rgba(239, 68, 68, 0.08)"
                stroke="rgba(239, 68, 68, 0.15)"
                strokeWidth={0.8}
                strokeDasharray="2 2"
              />
            </g>
          );
        }
      }
    }

    // Peak & Trough indexes in current zoom window for Callouts
    const peakIdxInVisible = visiblePrimaryVals.indexOf(Math.max(...visiblePrimaryVals));
    const peakOriginalIdx = minIdx + peakIdxInVisible;
    const troughIdxInVisible = visiblePrimaryVals.indexOf(Math.min(...visiblePrimaryVals));
    const troughOriginalIdx = minIdx + troughIdxInVisible;

    // Callout positions
    const peakX = xScale(peakOriginalIdx);
    const peakY = yScalePrimary(primaryVals[peakOriginalIdx]);

    const troughX = xScale(troughOriginalIdx);
    const troughY = yScalePrimary(primaryVals[troughOriginalIdx]);

    // D3 Linear Regression Trendline
    const xCoords = Array.from({ length: maxIdx - minIdx + 1 }).map((_, i) => minIdx + i);
    const n = xCoords.length;
    const sumX = xCoords.reduce((a, b) => a + b, 0);
    const sumY = visiblePrimaryVals.reduce((a, b) => a + b, 0);
    const sumXY = xCoords.reduce((a, b, idx) => a + b * visiblePrimaryVals[idx], 0);
    const sumXX = xCoords.reduce((a, b) => a + b * b, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    const trendlinePoints = [
      { x: xScale(minIdx), y: yScalePrimary(slope * minIdx + intercept) },
      { x: xScale(maxIdx), y: yScalePrimary(slope * maxIdx + intercept) }
    ];

    // Tick lists
    const primaryTicks = yScalePrimary.ticks(5);
    const secondaryTicks = yScaleSecondary.ticks(5);
    const visibleTicksIndices = Array.from({ length: maxIdx - minIdx + 1 }).map((_, i) => minIdx + i);

    // Interactive coordinate invert helper
    const invertXCoordToIndex = (clientX: number): number => {
      const plotWidth = width - padding.left - padding.right;
      const ratio = (clientX - padding.left) / plotWidth;
      const indexRange = maxIdx - minIdx;
      const calculatedIdx = ratio * indexRange + minIdx;
      return Math.round(Math.max(minIdx, Math.min(maxIdx, calculatedIdx)));
    };

    // Zoom dragging handlers
    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const relativeX = ((e.clientX - rect.left) / rect.width) * width;
      setDragStart(relativeX);
      setDragCurrent(relativeX);
      setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const relativeX = ((e.clientX - rect.left) / rect.width) * width;
      const relativeY = ((e.clientY - rect.top) / rect.height) * height;

      if (isDragging) {
        setDragCurrent(relativeX);
      }

      // Calculate nearest index for Tooltip
      const plotX = Math.max(padding.left, Math.min(width - padding.right, relativeX));
      const idx = invertXCoordToIndex(plotX);

      if (idx >= 0 && idx < historyData.length) {
        const item = historyData[idx];
        setHoveredPoint({
          index: idx,
          name: item.name,
          date: item.date,
          value: primaryVals[idx],
          secondaryValue: isComparisonActive ? secondaryVals[idx] : undefined,
          x: xScale(idx),
          y: yScalePrimary(primaryVals[idx]),
          clientX: e.clientX - rect.left,
          clientY: e.clientY - rect.top,
        });
      }
    };

    const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDragging || dragStart === null || dragCurrent === null) return;
      setIsDragging(false);

      const xA = Math.max(padding.left, Math.min(width - padding.right, dragStart));
      const xB = Math.max(padding.left, Math.min(width - padding.right, dragCurrent));

      const idxA = invertXCoordToIndex(xA);
      const idxB = invertXCoordToIndex(xB);

      const minZoomIdx = Math.min(idxA, idxB);
      const maxZoomIdx = Math.max(idxA, idxB);

      if (maxZoomIdx - minZoomIdx >= 2) {
        setZoomRange([minZoomIdx, maxZoomIdx]);
        addToast?.("Workspace Zoomed", `Focusing timeline slice: ${historyData[minZoomIdx].name} to ${historyData[maxZoomIdx].name}`, "info", 2500);
      }

      setDragStart(null);
      setDragCurrent(null);
    };

    const handleMouseLeave = () => {
      setHoveredPoint(null);
      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);
    };

    return (
      <div className="relative bg-slate-950/60 rounded-xl border border-white/5 p-4 overflow-visible select-none">
        {/* Header analytics summary and stats */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[9.5px] font-black uppercase text-slate-400 bg-slate-900 border border-white/5 px-2.5 py-1 rounded-lg">
              Primary: <span className="text-blue-400">{metrics.find((m) => m.id === primaryMetric)?.label}</span>
            </span>
            {isComparisonActive && (
              <span className="text-[9.5px] font-black uppercase text-slate-400 bg-slate-900 border border-white/5 px-2.5 py-1 rounded-lg">
                Secondary: <span className="text-emerald-400">{metrics.find((m) => m.id === secondaryMetric)?.label}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {zoomRange && (
              <button
                type="button"
                onClick={() => {
                  setZoomRange(null);
                  addToast?.("Zoom Reset", "Restored full 12-entry historical scope view.", "info", 2000);
                }}
                className="bg-indigo-600/25 border border-indigo-500/40 hover:bg-indigo-600/45 text-indigo-300 font-extrabold text-[8.5px] py-1 px-2.5 rounded-lg uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Zoom ({historyData[zoomRange[0]].name} - {historyData[zoomRange[1]].name})</span>
              </button>
            )}
          </div>
        </div>

        {/* SVG Drawing Area */}
        <svg
          className="w-full h-auto overflow-visible cursor-crosshair"
          viewBox={`0 0 ${width} ${height}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Vertical Gridlines & X ticks */}
          {visibleTicksIndices.map((idx) => {
            const xPos = xScale(idx);
            return (
              <g key={`grid-${idx}`}>
                <line
                  x1={xPos}
                  y1={padding.top}
                  x2={xPos}
                  y2={height - padding.bottom}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth={1}
                />
                <text
                  x={xPos}
                  y={height - padding.bottom + 14}
                  fill="#64748b"
                  fontSize={8}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {historyData[idx].name}
                </text>
                <text
                  x={xPos}
                  y={height - padding.bottom + 23}
                  fill="#475569"
                  fontSize={6.5}
                  fontWeight="semibold"
                  textAnchor="middle"
                >
                  {historyData[idx].date}
                </text>
              </g>
            );
          })}

          {/* Rolling Standard Deviation outliers shading highlights */}
          {outlierBars}

          {/* D3 Linear regression Trendline if enabled */}
          {showTrendline && (
            <g>
              <line
                x1={trendlinePoints[0].x}
                y1={trendlinePoints[0].y}
                x2={trendlinePoints[1].x}
                y2={trendlinePoints[1].y}
                stroke="#6366f1"
                strokeWidth={1.8}
                strokeDasharray="4 4"
                opacity={0.8}
              />
              <text
                x={trendlinePoints[1].x - 10}
                y={trendlinePoints[1].y - 8}
                fill="#818cf8"
                fontSize={7.5}
                fontWeight="black"
                textAnchor="end"
                className="uppercase tracking-wider"
              >
                Primary Trend Slope ({slope > 0 ? "+" : ""}{slope.toFixed(2)})
              </text>
            </g>
          )}

          {/* Left Y Axis gridlines & labels */}
          {primaryTicks.map((tick) => {
            const yPos = yScalePrimary(tick);
            return (
              <g key={`primary-tick-${tick}`}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke="rgba(255,255,255,0.03)"
                  strokeWidth={1}
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 3}
                  fill="#3b82f6"
                  fontSize={8}
                  fontWeight="bold"
                  textAnchor="end"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Right Y Axis labels (Secondary Metric) if active */}
          {isComparisonActive && secondaryTicks.map((tick) => {
            const yPos = yScaleSecondary(tick);
            return (
              <g key={`secondary-tick-${tick}`}>
                <text
                  x={width - padding.right + 8}
                  y={yPos + 3}
                  fill="#10b981"
                  fontSize={8}
                  fontWeight="bold"
                  textAnchor="start"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Drag zoom highlight overlay */}
          {isDragging && dragStart !== null && dragCurrent !== null && (
            <rect
              x={Math.min(dragStart, dragCurrent)}
              y={padding.top}
              width={Math.abs(dragStart - dragCurrent)}
              height={height - padding.top - padding.bottom}
              fill="rgba(99, 102, 241, 0.15)"
              stroke="#6366f1"
              strokeWidth={1.2}
              pointerEvents="none"
            />
          )}
          {/* Sparkline Lines */}
          {/* Secondary Metric Line */}
          {isComparisonActive && (
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="3 3"
              opacity={0.8}
              points={secondaryPoints}
            />
          )}

          {/* Primary Metric Line */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={primaryPoints}
          />

          {/* Custom user annotations indicators on chart points */}
          {visibleData.map((h, i) => {
            const idx = minIdx + i;
            const hasPNote = annotations[primaryMetric]?.[idx];
            if (!hasPNote) return null;
            return (
              <g key={`primary-ann-dot-${idx}`} className="pointer-events-none">
                <circle
                  cx={xScale(idx)}
                  cy={yScalePrimary(primaryVals[idx])}
                  r={7}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                  className="animate-pulse"
                />
                <circle
                  cx={xScale(idx)}
                  cy={yScalePrimary(primaryVals[idx])}
                  r={3.5}
                  fill="#fbbf24"
                />
              </g>
            );
          })}

          {isComparisonActive && visibleData.map((h, i) => {
            const idx = minIdx + i;
            const hasSNote = annotations[secondaryMetric]?.[idx];
            if (!hasSNote) return null;
            return (
              <g key={`secondary-ann-dot-${idx}`} className="pointer-events-none">
                <circle
                  cx={xScale(idx)}
                  cy={yScaleSecondary(secondaryVals[idx])}
                  r={7}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  className="animate-pulse"
                />
                <circle
                  cx={xScale(idx)}
                  cy={yScaleSecondary(secondaryVals[idx])}
                  r={3.5}
                  fill="#f59e0b"
                />
              </g>
            );
          })}

          {/* Callout Pins for peak and trough values */}
          {/* Peak Callout */}
          <g className="pointer-events-none">
            <circle cx={peakX} cy={peakY} r={3.5} fill="#10b981" className="animate-ping" />
            <circle cx={peakX} cy={peakY} r={3} fill="#0f172a" stroke="#10b981" strokeWidth={1.5} />
            <rect
              x={peakX - 32}
              y={peakY - 26}
              width={64}
              height={15}
              rx={4}
              fill="#090d16"
              stroke="#10b981"
              strokeWidth={0.8}
            />
            <text x={peakX} y={peakY - 16} textAnchor="middle" fill="#10b981" fontSize={8} fontWeight="black">
              ▲ PEAK: {primaryVals[peakOriginalIdx]}
            </text>
            <line x1={peakX} y1={peakY - 11} x2={peakX} y2={peakY - 3} stroke="#10b981" strokeWidth={0.8} strokeDasharray="1 1" />
          </g>

          {/* Trough Callout */}
          <g className="pointer-events-none">
            <circle cx={troughX} cy={troughY} r={3} fill="#0f172a" stroke="#ef4444" strokeWidth={1.5} />
            <rect
              x={troughX - 32}
              y={troughY + 11}
              width={64}
              height={15}
              rx={4}
              fill="#090d16"
              stroke="#ef4444"
              strokeWidth={0.8}
            />
            <text x={troughX} y={troughY + 21} textAnchor="middle" fill="#ef4444" fontSize={8} fontWeight="black">
              ▼ TROUGH: {primaryVals[troughOriginalIdx]}
            </text>
            <line x1={troughX} y1={troughY + 3} x2={troughX} y2={troughY + 11} stroke="#ef4444" strokeWidth={0.8} strokeDasharray="1 1" />
          </g>

          {/* Interactive snap line overlay on hover */}
          {hoveredPoint && (
            <g className="pointer-events-none">
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={height - padding.bottom}
                stroke="#6366f1"
                strokeWidth={1}
                strokeDasharray="2 2"
                opacity={0.7}
              />
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r={5} fill="#3b82f6" />
              {hoveredPoint.secondaryValue !== undefined && (
                <circle cx={hoveredPoint.x} cy={yScaleSecondary(hoveredPoint.secondaryValue)} r={5} fill="#10b981" />
              )}
            </g>
          )}
        </svg>

        {/* HTML Floating Tooltip Box */}
        {hoveredPoint && (
          <div
            className="absolute z-50 pointer-events-none bg-slate-950/95 border border-indigo-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md text-left font-sans transition-all duration-100 ease-out"
            style={{
              left: `${hoveredPoint.clientX + 15}px`,
              top: `${Math.max(10, hoveredPoint.clientY - 60)}px`,
              minWidth: "160px"
            }}
          >
            <div className="border-b border-white/5 pb-1 mb-1.5 flex justify-between items-center">
              <span className="text-[9.5px] font-black text-indigo-400 uppercase tracking-widest">{hoveredPoint.name}</span>
              <span className="text-[7.5px] font-mono text-slate-500 font-bold">{hoveredPoint.date}</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center gap-3">
                <span className="text-slate-400 font-semibold text-[10px]">Primary KPI:</span>
                <span className="font-mono text-blue-400 font-black">
                  {hoveredPoint.value} {isSmoothingActive && <span className="text-[8px] opacity-65">(Smoothed)</span>}
                </span>
              </div>
              {hoveredPoint.secondaryValue !== undefined && (
                <div className="flex justify-between items-center gap-3">
                  <span className="text-slate-400 font-semibold text-[10px]">Secondary KPI:</span>
                  <span className="font-mono text-emerald-400 font-black">
                    {hoveredPoint.secondaryValue} {isSmoothingActive && <span className="text-[8px] opacity-65">(Smoothed)</span>}
                  </span>
                </div>
              )}
              {/* Show annotations if any exist */}
              {annotations[primaryMetric]?.[hoveredPoint.index] && (
                <div className="border-t border-white/5 pt-1 mt-1 text-[9px] text-amber-400 font-medium leading-snug">
                  <span className="font-black uppercase text-[7px] tracking-wide block text-slate-500">Primary Note:</span> "{annotations[primaryMetric][hoveredPoint.index]}"
                </div>
              )}
              {isComparisonActive && annotations[secondaryMetric]?.[hoveredPoint.index] && (
                <div className="border-t border-white/5 pt-1 mt-1 text-[9px] text-emerald-400 font-medium leading-snug">
                  <span className="font-black uppercase text-[7px] tracking-wide block text-slate-500">Secondary Note:</span> "{annotations[secondaryMetric][hoveredPoint.index]}"
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-2.5 text-[8.5px] text-slate-500 font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
          <ZoomIn className="w-3 h-3 text-indigo-400 shrink-0" />
          <span>Click & drag horizontally to zoom. Double-click or reset zoom above to clear.</span>
        </div>
      </div>
    );
  };

  return (
    <div 
      id="metrics-panel-card" 
      className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)] transition-all duration-300 relative overflow-hidden"
    >
      <style>{`
        @keyframes alert-pulsing-glow {
          0%, 100% {
            border-color: rgba(239, 68, 68, 0.15);
            box-shadow: 0 0 6px rgba(239, 68, 68, 0.05);
            background-color: rgba(15, 23, 42, 0.2);
          }
          50% {
            border-color: rgba(239, 68, 68, 0.7);
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.35), inset 0 0 10px rgba(239, 68, 68, 0.2);
            background-color: rgba(239, 68, 68, 0.08);
          }
        }
        .animate-red-flash-card {
          animation: alert-pulsing-glow 2.5s infinite ease-in-out;
        }
      `}</style>

      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row with Title, Tab Switching, and Noise Smoothing Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <AreaChart className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
          <h2 className="text-xs font-black text-white uppercase tracking-wider">
            5. Agile Analytics & Metrics Studio
          </h2>
        </div>
        
        {/* Navigation Tabs and Smoothing Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Selection Tabs */}
          <div className="bg-slate-950/60 p-1 rounded-xl border border-white/5 flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab("monitors")}
              className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === "monitors"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              KPI Monitors
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("correlation")}
              className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === "correlation"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Correlate Metrics</span>
              <span className="text-[7.5px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 px-1 py-0.2 rounded font-mono font-black uppercase">
                Dual Axis
              </span>
            </button>
          </div>

          <span className="text-slate-800 hidden sm:inline">|</span>

          {/* Moving Average Noise Reduction Smoothing Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsSmoothingActive(!isSmoothingActive);
              addToast?.("Smoothing Toggle", isSmoothingActive ? "Raw data restored." : "3-period Simple Moving Average filter applied to trendlines.", "info", 2000);
            }}
            className={`text-[9.5px] font-black uppercase px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              isSmoothingActive
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35 shadow-lg shadow-emerald-500/5"
                : "bg-slate-950/30 text-slate-400 border-white/5 hover:border-white/10 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smoothing: {isSmoothingActive ? "On" : "Off"}</span>
          </button>
        </div>
      </div>

      {/* RENDER VIEW 1: KPI Cards Grid with custom annotations & delta compare modes */}
      {activeTab === "monitors" ? (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <p className="text-[11px] text-slate-400 font-medium">
              Select and toggle active PMO metrics to track on your main executive dashboard bar. Individual cards are monitored in real-time, compute live deviations, and support custom annotations on specific data points.
            </p>
            <div className="flex gap-3 items-center text-[10px] font-black uppercase tracking-wider shrink-0 ml-auto sm:ml-4">
              <button type="button" onClick={selectAll} className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">
                All
              </button>
              <span className="text-slate-800">|</span>
              <button type="button" onClick={clearAll} className="text-slate-500 hover:text-slate-400 transition-colors cursor-pointer">
                None
              </button>
            </div>
          </div>

          {/* KPI Selection Card Grid with Automated Deviation Alert System */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metrics.map((m) => {
              const formulas = METRIC_FORMULAS[m.id] || { formula: "Default count metrics", source: "Normalized issues" };
              
              // Compute historical average and current deviation for red flashing alerts
              const vals = historyData.map((h) => h.metrics[m.id] || 0);
              const historicalAvg = vals.reduce((sum, v) => sum + v, 0) / (vals.length || 1);
              
              let currentVal = 0;
              if (report && report.metrics) {
                const rm = report.metrics;
                if (m.id === "bugsToStoriesRatio") {
                  const val = rm.bugsToStoriesRatio;
                  if (typeof val === "string") {
                    if (val.includes(":")) {
                      const parts = val.split(":");
                      const b = parseFloat(parts[0]) || 0;
                      const s = parseFloat(parts[1]) || 1;
                      currentVal = Number((b / s).toFixed(2));
                    } else {
                      currentVal = parseFloat(val) || 0.25;
                    }
                  } else {
                    currentVal = Number(val) || 0.25;
                  }
                } else {
                  currentVal = Number((rm as any)[m.id]) || 0;
                }
              } else {
                currentVal = vals[vals.length - 1]; // Use last item in history if no report
              }

              const deviationPct = historicalAvg !== 0 ? ((currentVal - historicalAvg) / historicalAvg) * 100 : 0;
              const isDeviationAlert = Math.abs(deviationPct) > 20;
              const mode = cardCompareModes[m.id] || "previous";

              return (
                <div 
                  key={m.id} 
                  className={`relative group rounded-xl border transition-all duration-300 p-3 flex flex-col justify-between ${
                    isDeviationAlert 
                      ? "animate-red-flash-card border-rose-500/40 text-white"
                      : m.enabled
                        ? "border-blue-500/30 bg-blue-500/10 text-white shadow-[0_0_8px_rgba(59,130,246,0.05)]"
                        : "border-white/5 bg-slate-950/20 text-slate-300 hover:border-white/10 hover:bg-slate-950/30"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleMetric(m.id)}
                    className="w-full flex items-start text-left cursor-pointer"
                  >
                    <div className="flex items-center h-5 mr-3 shrink-0">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          m.enabled ? "bg-blue-600 border-blue-600 text-white" : "border-white/10 bg-slate-950"
                        }`}
                      >
                        {m.enabled && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-200 truncate">{m.label}</span>
                        {getMetricDelta(m.id, mode)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug font-medium truncate">{m.description}</div>
                    </div>
                  </button>

                  {/* D3-based Mini Sparkline Widget inside Card (supports Smoothing toggle!) */}
                  {renderMiniD3Sparkline(m.id)}

                  {/* Out-of-bounds Deviation Indicator */}
                  {isDeviationAlert && (
                    <div className="mt-2 flex items-center gap-1.5 text-[8px] font-black text-rose-400 bg-rose-950/40 border border-rose-500/20 px-2 py-1 rounded-lg uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>ALERT: {deviationPct > 0 ? "+" : ""}{deviationPct.toFixed(0)}% from baseline avg</span>
                    </div>
                  )}

                  {/* Custom Delta Baseline Comparison Mode Toggle Switch */}
                  <div className="mt-2.5 flex items-center justify-between text-[8px] font-bold text-slate-500 border-t border-white/5 pt-2">
                    <span className="uppercase tracking-wider">Delta Baseline:</span>
                    <div className="flex gap-1 bg-slate-950/60 p-0.5 rounded-md border border-white/5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCardCompareModes(prev => ({ ...prev, [m.id]: "previous" }));
                        }}
                        className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase transition-all ${
                          mode === "previous"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        vs Prev
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCardCompareModes(prev => ({ ...prev, [m.id]: "average" }));
                        }}
                        className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase transition-all ${
                          mode === "average"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        vs 12-Spr Avg
                      </button>
                    </div>
                  </div>

                  {/* Custom Sprints Annotation Note Input Form */}
                  <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-wider">📝 Sprints Documentation Notes</span>
                      <span className="text-[7px] text-slate-500 font-semibold uppercase">Specific Points</span>
                    </div>
                    
                    {/* Select Sprint dropdown and typing Input */}
                    <div className="flex gap-1">
                      <select
                        value={selectedSprintIdx[m.id] ?? 11}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setSelectedSprintIdx(prev => ({ ...prev, [m.id]: val }));
                          setCardInputs(prev => ({ ...prev, [m.id]: annotations[m.id]?.[val] ?? "" }));
                        }}
                        className="bg-slate-900 border border-white/10 rounded-md py-0.5 px-1 text-[8.5px] text-slate-200 focus:outline-none focus:border-indigo-500 font-bold shrink-0"
                      >
                        {historyData.map((h, idx) => (
                          <option key={idx} value={idx}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                      
                      <input
                        type="text"
                        placeholder="Add documentation note..."
                        value={cardInputs[m.id] !== undefined ? cardInputs[m.id] : (annotations[m.id]?.[selectedSprintIdx[m.id] ?? 11] ?? "")}
                        onChange={(e) => {
                          const text = e.target.value;
                          setCardInputs(prev => ({ ...prev, [m.id]: text }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.stopPropagation();
                            const sprint = selectedSprintIdx[m.id] ?? 11;
                            const text = cardInputs[m.id] !== undefined ? cardInputs[m.id] : (annotations[m.id]?.[sprint] ?? "");
                            setAnnotations(prev => {
                              const metricAnn = prev[m.id] || {};
                              if (text.trim() === "") {
                                const updated = { ...metricAnn };
                                delete updated[sprint];
                                return { ...prev, [m.id]: updated };
                              }
                              return { ...prev, [m.id]: { ...metricAnn, [sprint]: text.trim() } };
                            });
                            addToast?.("Note Saved", `Annotation updated for ${historyData[sprint].name}`, "success", 2000);
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-white/10 rounded-md py-0.5 px-1.5 text-[8.5px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
                      />
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const sprint = selectedSprintIdx[m.id] ?? 11;
                          const text = cardInputs[m.id] !== undefined ? cardInputs[m.id] : (annotations[m.id]?.[sprint] ?? "");
                          setAnnotations(prev => {
                            const metricAnn = prev[m.id] || {};
                            if (text.trim() === "") {
                              const updated = { ...metricAnn };
                              delete updated[sprint];
                              return { ...prev, [m.id]: updated };
                            }
                            return { ...prev, [m.id]: { ...metricAnn, [sprint]: text.trim() } };
                          });
                          addToast?.("Note Saved", `Annotation updated for ${historyData[sprint].name}`, "success", 2000);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white border-none rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase cursor-pointer shrink-0 transition-colors"
                      >
                        Save
                      </button>
                    </div>

                    {/* Saved Sprints List Box */}
                    {Object.entries(annotations[m.id] || {}).length > 0 && (
                      <div className="bg-slate-950/60 rounded-md p-1 border border-white/5 space-y-1 max-h-[50px] overflow-y-auto custom-scrollbar">
                        {Object.entries(annotations[m.id] || {}).map(([sprintIdxStr, noteText]) => {
                          const sprintIdx = parseInt(sprintIdxStr);
                          return (
                            <div key={sprintIdx} className="flex justify-between items-center gap-1 text-[8px] leading-tight text-slate-400 group/item">
                              <span className="shrink-0 font-bold text-indigo-400">{historyData[sprintIdx]?.name}:</span>
                              <span className="flex-1 italic truncate">"{noteText}"</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAnnotations(prev => {
                                    const updated = { ...(prev[m.id] || {}) };
                                    delete updated[sprintIdx];
                                    return { ...prev, [m.id]: updated };
                                  });
                                  addToast?.("Note Removed", "Annotation deleted.", "info", 1500);
                                }}
                                className="text-rose-500 hover:text-rose-400 font-bold ml-1 opacity-40 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Info Tooltip */}
                  <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-950 border border-white/10 rounded-xl shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 leading-normal">
                    <div className="text-blue-400 font-black uppercase text-[8px] tracking-widest mb-1.5 flex items-center gap-1">
                      💡 PMO KPI Metric Formula
                    </div>
                    <div className="space-y-1.5 text-[10px]">
                      <div>
                        <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Formula Expression:</span>
                        <span className="font-mono font-bold text-slate-200 block mt-0.5 leading-snug">{formulas.formula}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold uppercase text-[7.5px] block">Source Field / JQL Scope:</span>
                        <span className="text-slate-300 font-medium block mt-0.5">{formulas.source}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* RENDER VIEW 2: Advanced Trend & Correlation Analyzer (Correlate Metrics View) */
        <div className="pt-2 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                6. Agile Analytics Studio & Correlation Analyzer
              </h3>
              <p className="text-[9.5px] text-slate-500 font-semibold uppercase tracking-tight mt-0.5">
                D3-Powered Deep Historical Assessment & Regression Engine {isSmoothingActive && <span className="text-emerald-400 font-bold">(Smoothed Mode)</span>}
              </p>
            </div>

            {/* Export History button */}
            <button
              type="button"
              onClick={handleExportHistory}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-750 text-slate-300 font-extrabold text-[9.5px] py-1.5 px-3 rounded-lg border border-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export History (.JSON)</span>
            </button>
          </div>

          {/* Configuration Toolbar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/30 p-3 rounded-xl border border-white/5 text-[10.5px]">
            {/* Primary Metric dropdown selection */}
            <div className="space-y-1">
              <label className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block">Primary Metric</label>
              <select
                value={primaryMetric}
                onChange={(e) => setPrimaryMetric(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg py-1.5 px-2 text-slate-200 focus:outline-none focus:border-indigo-500/80 font-semibold"
              >
                {metrics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Secondary Metric dropdown selection & active toggle */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-slate-400 font-bold uppercase text-[8px] tracking-wider block">Compare Metric</label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isComparisonActive}
                    onChange={(e) => setIsComparisonActive(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 focus:ring-offset-0 w-3 h-3"
                  />
                  <span className="text-indigo-400 font-black text-[7.5px] uppercase tracking-wider">Enable</span>
                </label>
              </div>
              <select
                value={secondaryMetric}
                onChange={(e) => setSecondaryMetric(e.target.value)}
                disabled={!isComparisonActive}
                className="w-full bg-slate-900 border border-white/10 rounded-lg py-1.5 px-2 text-slate-200 focus:outline-none focus:border-indigo-500/80 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {metrics.map((m) => (
                  <option key={m.id} value={m.id} disabled={m.id === primaryMetric}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Plotting Options (Trendline) */}
            <div className="flex items-center gap-2 pt-2 md:pt-0">
              <label className="flex items-center gap-2 cursor-pointer w-full bg-slate-900/55 p-2 rounded-lg border border-white/5 hover:bg-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={showTrendline}
                  onChange={(e) => setShowTrendline(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                <div>
                  <span className="text-slate-300 font-bold uppercase text-[8px] tracking-wider block">D3 Linear Trendline</span>
                  <span className="text-[7px] text-slate-500 font-semibold uppercase">Overlay growth slope</span>
                </div>
              </label>
            </div>

            {/* Plotting Options (Volatility / SD) */}
            <div className="flex items-center gap-2 pt-2 md:pt-0">
              <label className="flex items-center gap-2 cursor-pointer w-full bg-slate-900/55 p-2 rounded-lg border border-white/5 hover:bg-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={showStdDevShading}
                  onChange={(e) => setShowStdDevShading(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                <div>
                  <span className="text-slate-300 font-bold uppercase text-[8px] tracking-wider block">Highlight Volatility</span>
                  <span className="text-[7px] text-slate-500 font-semibold uppercase">Shade outside standard deviation</span>
                </div>
              </label>
            </div>
          </div>

          {/* Dynamic D3 Plot Canvas */}
          {renderInteractiveD3Chart()}

          {/* New Timeline Annotations Overlay if any exist for the currently selected metrics */}
          {(() => {
            const annotatedSprints = historyData.filter((h, idx) => 
              annotations[primaryMetric]?.[idx] || (isComparisonActive && annotations[secondaryMetric]?.[idx])
            );
            if (annotatedSprints.length === 0) return null;
            return (
              <div className="bg-indigo-950/10 border border-indigo-500/10 p-3 rounded-xl text-[10.5px] space-y-2 animate-fade-in">
                <div className="font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  <span>📝 Historical Timeline Event Annotations ({primaryMetric} {isComparisonActive && `& ${secondaryMetric}`}):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {annotatedSprints.map((h) => {
                    const idx = historyData.indexOf(h);
                    const pNote = annotations[primaryMetric]?.[idx];
                    const sNote = isComparisonActive ? annotations[secondaryMetric]?.[idx] : null;
                    return (
                      <div key={idx} className="bg-slate-950/45 p-2 rounded-lg border border-white/5 text-[10px]">
                        <div className="font-black text-indigo-300 text-[9px] mb-1">{h.name} ({h.date})</div>
                        {pNote && (
                          <div className="text-slate-300 font-medium leading-snug">
                            <span className="text-blue-400 font-bold uppercase text-[7.5px] tracking-wide bg-blue-500/10 px-1 py-0.2 rounded border border-blue-500/10 mr-1">Primary:</span> "{pNote}"
                          </div>
                        )}
                        {sNote && (
                          <div className="text-slate-300 font-medium leading-snug mt-1.5">
                            <span className="text-emerald-400 font-bold uppercase text-[7.5px] tracking-wide bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/10 mr-1">Secondary:</span> "{sNote}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Correlation & Pearson Stats Insights Box */}
          {isComparisonActive && correlationAnalysis && (
            <div className="bg-indigo-950/20 border border-indigo-500/25 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs leading-relaxed animate-fade-in">
              <div className="flex items-start gap-2.5 min-w-0">
                <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <div className="font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Pearson Correlation Assessment:</span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                      Math.abs(correlationAnalysis.r) >= 0.7 
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20" 
                        : Math.abs(correlationAnalysis.r) >= 0.4
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                          : "bg-slate-850 text-slate-400 border border-slate-800"
                    }`}>
                      r = {correlationAnalysis.r}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-slate-400 font-medium mt-1">
                    The computed relationship is classified as a <span className="font-bold text-indigo-300">"{correlationAnalysis.text}"</span> over the 12-entry history.
                    {correlationAnalysis.r < -0.4 && (
                      <span> This indicates a strong inverse relationship: as primary KPI performance accelerates, secondary metric volume scales downwards, optimizing resource throughput.</span>
                    )}
                    {correlationAnalysis.r > 0.4 && (
                      <span> This indicates a direct positive relationship: both PMO performance baselines are moving in alignment, verifying parallel productivity growth.</span>
                    )}
                    {Math.abs(correlationAnalysis.r) < 0.4 && (
                      <span> The variables behave relatively independently over this period, indicating stable team scaling and minimal conflict between operations.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
