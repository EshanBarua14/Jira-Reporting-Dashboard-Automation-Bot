import React, { useState } from "react";
import { GitCompare, Plus, Palette, ShieldCheck } from "lucide-react";
import { StatusMapping } from "../types";

interface StatusMappingPanelProps {
  detectedStatuses: string[];
  mapping: StatusMapping;
  onUpdateMapping: (newMapping: StatusMapping) => void;
  categoryColors: {
    "To Do": string;
    "In Progress": string;
    "Done": string;
    "Blocked": string;
  };
  onUpdateCategoryColors: (newColors: {
    "To Do": string;
    "In Progress": string;
    "Done": string;
    "Blocked": string;
  }) => void;
}

const PALETTE_PRESETS = [
  "#64748b", // Slate
  "#3b82f6", // Blue
  "#10b981", // Emerald Green
  "#ef4444", // Rose Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#6366f1", // Indigo
  "#a855f7", // Purple
];

export const StatusMappingPanel: React.FC<StatusMappingPanelProps> = ({
  detectedStatuses,
  mapping,
  onUpdateMapping,
  categoryColors,
  onUpdateCategoryColors,
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

  const handleColorChange = (bucket: "To Do" | "In Progress" | "Done" | "Blocked", color: string) => {
    onUpdateCategoryColors({
      ...categoryColors,
      [bucket]: color,
    });
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
      <div className="border border-white/5 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto bg-slate-950/20 p-2 space-y-1.5 custom-scrollbar">
        {activeStatuses.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-6 text-center font-medium">
            No statuses detected. Run a sandbox report or load a project to populate workflow states.
          </div>
        ) : (
          activeStatuses.map((statusName) => {
            const currentBucket = mapping[statusName] || "To Do";
            
            // Bucket dynamic color preview style
            const catColor = categoryColors[currentBucket];
            const selectStyle = {
              borderColor: `${catColor}30`,
              backgroundColor: `${catColor}12`,
              color: catColor,
            };

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
                  style={selectStyle}
                  className="text-xs rounded-lg px-2.5 py-1 border font-extrabold focus:outline-none cursor-pointer transition-all"
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
      <form onSubmit={handleAddCustomStatus} className="flex gap-2 pt-2 border-b border-white/5 pb-3">
        <input
          type="text"
          value={customStatusName}
          onChange={(e) => setCustomStatusName(e.target.value)}
          placeholder="Add unlisted custom status (e.g., In Review)..."
          className="w-full text-xs bg-slate-950/60 border border-white/5 text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/80 placeholder-slate-500 font-medium"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-3.5 py-2 rounded-lg transition-all flex items-center gap-1 shrink-0 shadow-lg shadow-blue-500/10 active:scale-95 uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      {/* --- WORKFLOW CATEGORY COLORS CONFIG --- */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Palette className="w-4 h-4 text-indigo-400" />
          <h3 className="text-[10px] font-extrabold uppercase tracking-wider">Category Style Themes</h3>
        </div>
        <p className="text-[10px] text-slate-500 font-medium">Assign distinct colors to mapped statuses to colorize dashboard cards and issue list table records.</p>
        
        <div className="grid grid-cols-2 gap-2.5">
          {(["To Do", "In Progress", "Done", "Blocked"] as const).map((bucket) => {
            const currentColor = categoryColors[bucket];
            
            return (
              <div 
                key={bucket} 
                className="p-2 rounded-xl bg-slate-950/40 border border-white/5 flex flex-col gap-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-slate-300 flex items-center gap-1.5">
                    <span 
                      className="w-2 h-2 rounded-full inline-block shadow-[0_0_6px_currentColor]" 
                      style={{ backgroundColor: currentColor, color: currentColor }}
                    />
                    {bucket}
                  </span>
                  
                  {/* Custom Color Input Colorpicker */}
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => handleColorChange(bucket, e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border border-white/10 p-0 bg-transparent shrink-0 outline-none"
                    title={`Custom color for ${bucket}`}
                  />
                </div>

                {/* Preset circles palette */}
                <div className="flex flex-wrap gap-1">
                  {PALETTE_PRESETS.map((col) => {
                    const isCurrent = currentColor === col;
                    return (
                      <button
                        type="button"
                        key={col}
                        onClick={() => handleColorChange(bucket, col)}
                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                          isCurrent 
                            ? "border-white ring-1 ring-indigo-500/50 scale-110" 
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: col }}
                        title={`Select ${col}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
