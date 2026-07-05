import React, { useState } from "react";
import { GitCompare, Plus, ShieldCheck } from "lucide-react";
import { StatusMapping } from "../types";

interface StatusMappingPanelProps {
  detectedStatuses: string[];
  mapping: StatusMapping;
  onUpdateMapping: (newMapping: StatusMapping) => void;
}

export const StatusMappingPanel: React.FC<StatusMappingPanelProps> = ({
  detectedStatuses,
  mapping,
  onUpdateMapping,
}) => {
  const [customStatusName, setCustomStatusName] = useState("");

  const handleMapChange = (statusName: string, bucket: "To Do" | "In Progress" | "Done" | "Blocked") => {
    onUpdateMapping({
      ...mapping,
      [statusName]: bucket,
    });
  };

  const handleAddCustomStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = customStatusName.trim();
    if (!cleanName) return;

    // Add status to mapping as "To Do" by default
    onUpdateMapping({
      ...mapping,
      [cleanName]: mapping[cleanName] || "To Do",
    });
    setCustomStatusName("");
  };

  const activeStatuses = Array.from(new Set([...detectedStatuses, ...Object.keys(mapping)]));

  return (
    <div 
      id="status-mapping-card" 
      className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)] transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
          <GitCompare className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
          3. Dynamic Status Mapping
        </h2>
        <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Custom Workflows
        </span>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
        Jira workflows vary dynamically across organizations. To ensure metrics and summaries align perfectly, map each workflow state into our four standard executive categories:
      </p>

      {/* Grid of status mapping items */}
      <div className="border border-white/5 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto bg-slate-950/20 p-2 space-y-1.5 custom-scrollbar">
        {activeStatuses.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-6 text-center font-medium">
            No statuses detected. Run a sandbox report or load a project to populate workflow states.
          </div>
        ) : (
          activeStatuses.map((statusName) => {
            const currentBucket = mapping[statusName] || "To Do";
            
            // Bucket badge styling
            let selectColor = "bg-slate-900 border-white/5 text-slate-300 focus:border-blue-500/80";
            if (currentBucket === "Done") selectColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 focus:border-emerald-500/80";
            if (currentBucket === "In Progress") selectColor = "bg-blue-500/10 border-blue-500/20 text-blue-400 focus:border-blue-500/80";
            if (currentBucket === "Blocked") selectColor = "bg-rose-500/10 border-rose-500/20 text-rose-400 focus:border-rose-500/80";

            return (
              <div
                key={statusName}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-white/5 shadow-sm transition-all duration-300 hover:border-white/10"
              >
                <span className="text-xs font-bold text-slate-200 font-mono truncate max-w-[180px] sm:max-w-[280px]">
                  {statusName}
                </span>
                
                <select
                  value={currentBucket}
                  onChange={(e) => handleMapChange(statusName, e.target.value as any)}
                  className={`text-xs rounded-lg px-2.5 py-1 border font-bold focus:outline-none cursor-pointer transition-all ${selectColor}`}
                >
                  <option value="To Do" className="bg-slate-950 text-slate-200">📂 To Do</option>
                  <option value="In Progress" className="bg-slate-950 text-slate-200">⚡ In Progress</option>
                  <option value="Done" className="bg-slate-950 text-slate-200">✓ Done</option>
                  <option value="Blocked" className="bg-slate-950 text-slate-200">⚠️ Blocked</option>
                </select>
              </div>
            );
          })
        )}
      </div>

      {/* Add Custom Workflow Status */}
      <form onSubmit={handleAddCustomStatus} className="flex gap-2 pt-2 border-t border-white/5">
        <input
          type="text"
          value={customStatusName}
          onChange={(e) => setCustomStatusName(e.target.value)}
          placeholder="Add unlisted custom status (e.g., In Review)..."
          className="w-full text-xs bg-slate-950/60 border border-white/5 text-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/80 placeholder-slate-500 font-medium"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-4 py-2.5 rounded-lg transition-all flex items-center gap-1 shrink-0 shadow-lg shadow-blue-500/10 active:scale-95 uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>
    </div>
  );
};
