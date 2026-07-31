import React, { useState } from "react";
import { BarChart3, Check, Camera, Sliders, LineChart as LineChartIcon, BarChart2, AreaChart, Sparkles } from "lucide-react";
import { toPng } from "html-to-image";
import { CustomChartConfig } from "../types";

interface VisualizationPanelProps {
  visualizations: {
    pieChart: boolean;
    barChart: boolean;
    lineChart: boolean;
    table: boolean;
    trendAnalysis?: boolean;
    customChart?: boolean;
  };
  onChangeVisualizations: (visuals: {
    pieChart: boolean;
    barChart: boolean;
    lineChart: boolean;
    table: boolean;
    trendAnalysis?: boolean;
    customChart?: boolean;
  }) => void;
  customChartConfig?: CustomChartConfig;
  onChangeCustomChartConfig?: (config: CustomChartConfig) => void;
}

export const VisualizationPanel: React.FC<VisualizationPanelProps> = ({
  visualizations,
  onChangeVisualizations,
  customChartConfig = {
    enabled: true,
    chartType: "bar",
    xAxisField: "assignee",
    primaryMetric: "storyPoints",
    secondaryMetric: "issueCount",
    chartTitle: "Multi-Metric Custom Distribution",
  },
  onChangeCustomChartConfig,
}) => {
  const [showBuilder, setShowBuilder] = useState(false);

  const toggleVisual = (key: keyof typeof visualizations) => {
    onChangeVisualizations({
      ...visualizations,
      [key]: !visualizations[key],
    });
  };

  const updateChartConfig = (updates: Partial<CustomChartConfig>) => {
    if (onChangeCustomChartConfig) {
      onChangeCustomChartConfig({
        ...customChartConfig,
        ...updates,
      });
    }
  };

  const downloadVisuals = async () => {
    const node = document.getElementById("dashboard-visuals-container");
    if (!node) {
      alert("Please generate a report first to render the visual charts!");
      return;
    }
    try {
      const isLightTheme = document.querySelector(".light-theme") !== null;
      const dataUrl = await toPng(node, {
        backgroundColor: isLightTheme ? "#ffffff" : "#0d1117",
        style: {
          borderRadius: "16px",
          padding: "24px",
        },
        filter: (domNode) => domNode.tagName !== "IFRAME",
      });
      const link = document.createElement("a");
      link.download = `jira-dashboard-snapshot-${new Date().toISOString().split("T")[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to export dashboard visuals as PNG image:", error);
    }
  };

  const visualsList = [
    { key: "pieChart", label: "Pie Chart (Status Distribution)", desc: "Visualizes percentage distribution of Done, In Progress, Blocked, and To Do issues." },
    { key: "barChart", label: "Bar Chart (Workload per Assignee)", desc: "Compares workload distribution and ticket completion velocity across your active squad." },
    { key: "lineChart", label: "Trend Line Chart (Cumulative Resolution)", desc: "Tracks cumulative issue resolutions over time to audit sprint velocity." },
    { key: "trendAnalysis", label: "30-Day Trend Analysis (Points & Issues)", desc: "Displays change in story points and issue counts over the last 30 days." },
    { key: "customChart", label: "Custom Multi-Series Metric Chart", desc: "Interactive customizable multi-series chart mapping custom Jira metrics." },
    { key: "table", label: "Detailed Issues List Grid", desc: "Displays filterable, searchable table of matching issues with real-time status attributes." },
  ] as const;

  return (
    <div 
      id="visualization-panel-card" 
      className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)] transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
          <BarChart3 className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
          6. Dashboard Visualizations
        </h2>
        <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Responsive Layout
        </span>
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        Toggle which interactive layout grids are rendered when you execute your report.
      </p>

      {/* Grid of chart toggles */}
      <div className="space-y-2.5 border-b border-white/5 pb-4">
        {visualsList.map((item) => {
          const isEnabled = !!visualizations[item.key];
          const isCustom = item.key === "customChart";

          return (
            <div key={item.key} className="space-y-2">
              <button
                type="button"
                onClick={() => toggleVisual(item.key)}
                className={`w-full flex items-start text-left p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                  isEnabled
                    ? "border-blue-500/30 bg-blue-500/10 text-white font-bold"
                    : "border-white/5 bg-slate-950/20 text-slate-300 hover:border-white/10 hover:bg-slate-950/30"
                }`}
              >
                <div className="flex items-center h-5 mr-3.5 shrink-0">
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                      isEnabled ? "bg-blue-600 border-blue-600 text-white" : "border-white/10 bg-slate-950"
                    }`}
                  >
                    {isEnabled && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-200">{item.label}</div>
                    {isCustom && isEnabled && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowBuilder(!showBuilder);
                        }}
                        className="text-[9px] font-extrabold text-blue-400 hover:text-blue-300 bg-blue-950/60 border border-blue-800/40 px-2 py-0.5 rounded-md flex items-center gap-1 uppercase cursor-pointer"
                      >
                        <Sliders className="w-2.5 h-2.5" />
                        {showBuilder ? "Hide Builder" : "Configure Builder"}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-normal font-medium">{item.desc}</div>
                </div>
              </button>

              {/* Custom Chart Builder Accordion */}
              {isCustom && isEnabled && (showBuilder || true) && (
                <div className="p-3.5 bg-slate-950/60 border border-blue-500/20 rounded-xl space-y-3 mt-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-blue-400" />
                      Custom Chart Builder Controls
                    </span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase">Multi-Series Mapping</span>
                  </div>

                  {/* Chart Title Input */}
                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                      Chart Title
                    </label>
                    <input
                      type="text"
                      value={customChartConfig.chartTitle}
                      onChange={(e) => updateChartConfig({ chartTitle: e.target.value })}
                      className="w-full bg-slate-900 border border-white/5 rounded-lg text-xs text-slate-200 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                      placeholder="Custom Chart Title..."
                    />
                  </div>

                  {/* Chart Type Selector */}
                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                      Visual Representation Type
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateChartConfig({ chartType: "bar" })}
                        className={`text-[10px] font-extrabold py-1.5 rounded-lg flex items-center justify-center gap-1 uppercase tracking-wider transition-all cursor-pointer ${
                          customChartConfig.chartType === "bar"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-slate-900 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <BarChart2 className="w-3 h-3" />
                        Bar
                      </button>
                      <button
                        type="button"
                        onClick={() => updateChartConfig({ chartType: "line" })}
                        className={`text-[10px] font-extrabold py-1.5 rounded-lg flex items-center justify-center gap-1 uppercase tracking-wider transition-all cursor-pointer ${
                          customChartConfig.chartType === "line"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-slate-900 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <LineChartIcon className="w-3 h-3" />
                        Line
                      </button>
                      <button
                        type="button"
                        onClick={() => updateChartConfig({ chartType: "area" })}
                        className={`text-[10px] font-extrabold py-1.5 rounded-lg flex items-center justify-center gap-1 uppercase tracking-wider transition-all cursor-pointer ${
                          customChartConfig.chartType === "area"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-slate-900 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <AreaChart className="w-3 h-3" />
                        Area
                      </button>
                    </div>
                  </div>

                  {/* X-Axis Category Grouping */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                        X-Axis Grouping
                      </label>
                      <select
                        value={customChartConfig.xAxisField}
                        onChange={(e) => updateChartConfig({ xAxisField: e.target.value as any })}
                        className="w-full bg-slate-900 border border-white/5 rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="assignee">Assignee</option>
                        <option value="status">Mapped Status</option>
                        <option value="type">Issue Type</option>
                        <option value="priority">Priority</option>
                        <option value="sprint">Sprint</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                        Primary Series Metric (Y1)
                      </label>
                      <select
                        value={customChartConfig.primaryMetric}
                        onChange={(e) => updateChartConfig({ primaryMetric: e.target.value as any })}
                        className="w-full bg-slate-900 border border-white/5 rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="storyPoints">Story Points Sum</option>
                        <option value="issueCount">Issue Count</option>
                        <option value="timeSpent">Time Spent (Hours)</option>
                        <option value="avgAge">Avg Ticket Age (Days)</option>
                      </select>
                    </div>
                  </div>

                  {/* Secondary Series Metric (Y2) */}
                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                      Secondary Series Metric (Y2 Multi-Series)
                    </label>
                    <select
                      value={customChartConfig.secondaryMetric}
                      onChange={(e) => updateChartConfig({ secondaryMetric: e.target.value as any })}
                      className="w-full bg-slate-900 border border-white/5 rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="none">None (Single Series)</option>
                      <option value="issueCount">Issue Count</option>
                      <option value="storyPoints">Story Points Sum</option>
                      <option value="overdueCount">Overdue Tickets Count</option>
                      <option value="timeSpent">Time Spent (Hours)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Download Visuals Action */}
      <div className="pt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={downloadVisuals}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-[10px] py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider shadow-lg shadow-blue-500/10 active:scale-[0.98] cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-white" />
          Download Visuals (PNG)
        </button>
        <span className="text-[9px] text-slate-500 text-center font-bold uppercase tracking-wider block">
          Snapshot KPIs & Multi-Series Charts to PNG Image
        </span>
      </div>
    </div>
  );
};
