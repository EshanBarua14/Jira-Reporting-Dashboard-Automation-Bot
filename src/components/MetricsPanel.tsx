import React from "react";
import { AreaChart, Check } from "lucide-react";
import { MetricDefinition } from "../types";

interface MetricsPanelProps {
  metrics: MetricDefinition[];
  onChangeMetrics: (newMetrics: MetricDefinition[]) => void;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  onChangeMetrics,
}) => {
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

  return (
    <div 
      id="metrics-panel-card" 
      className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)] transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
          <AreaChart className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
          5. Dashboard KPIs Selection
        </h2>
        <div className="flex gap-2 items-center text-[10px] font-black uppercase tracking-wider">
          <button type="button" onClick={selectAll} className="text-blue-400 hover:text-blue-300 transition-colors">
            All
          </button>
          <span className="text-slate-800">|</span>
          <button type="button" onClick={clearAll} className="text-slate-500 hover:text-slate-400 transition-colors">
            None
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        Select the metrics to analyze and pin to the primary executive dashboard metrics bar.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {metrics.map((m) => {
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => toggleMetric(m.id)}
              className={`flex items-start text-left p-3 rounded-xl border transition-all duration-300 ${
                m.enabled
                  ? "border-blue-500/30 bg-blue-500/10 text-white shadow-[0_0_8px_rgba(59,130,246,0.05)]"
                  : "border-white/5 bg-slate-950/20 text-slate-300 hover:border-white/10 hover:bg-slate-950/30"
              }`}
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
              <div>
                <div className="text-xs font-bold text-slate-200">{m.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug font-medium">{m.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
