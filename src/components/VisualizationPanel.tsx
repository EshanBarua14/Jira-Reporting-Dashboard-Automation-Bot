import React from "react";
import { BarChart3, Check, Camera } from "lucide-react";
import { toPng } from "html-to-image";

interface VisualizationPanelProps {
  visualizations: {
    pieChart: boolean;
    barChart: boolean;
    lineChart: boolean;
    table: boolean;
  };
  onChangeVisualizations: (visuals: {
    pieChart: boolean;
    barChart: boolean;
    lineChart: boolean;
    table: boolean;
  }) => void;
}

export const VisualizationPanel: React.FC<VisualizationPanelProps> = ({
  visualizations,
  onChangeVisualizations,
}) => {
  const toggleVisual = (key: keyof typeof visualizations) => {
    onChangeVisualizations({
      ...visualizations,
      [key]: !visualizations[key],
    });
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
        }
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
    { key: "pieChart", label: "Pie Chart (Status Distribution)", desc: "Visualizes the percentage distribution of Done, In Progress, Blocked, and To Do issues." },
    { key: "barChart", label: "Bar Chart (Workload per Assignee)", desc: "Compares workload distribution and ticket completion velocity across your active squad." },
    { key: "lineChart", label: "Trend Line Chart (Cumulative Resolution)", desc: "Tracks cumulative issue resolutions over time to audit sprint and project velocity." },
    { key: "table", label: "Detailed Issues List Grid", desc: "Displays fully filterable, searchable columns of matching issues with real-time status attributes." },
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

      <div className="space-y-2.5 border-b border-white/5 pb-4">
        {visualsList.map((item) => {
          const isEnabled = visualizations[item.key];
          return (
            <button
              type="button"
              key={item.key}
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
              <div>
                <div className="text-xs font-bold text-slate-200">{item.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-normal font-medium">{item.desc}</div>
              </div>
            </button>
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
          Snapshot KPIs & D3 Charts to PNG Image
        </span>
      </div>
    </div>
  );
};
