import React, { useState } from "react";
import { Columns, ArrowUp, ArrowDown, Settings, Bookmark, GripVertical } from "lucide-react";
import { ColumnDefinition } from "../types";

interface ColumnPanelProps {
  columns: ColumnDefinition[];
  onChangeColumns: (newCols: ColumnDefinition[]) => void;
}

export const ColumnPanel: React.FC<ColumnPanelProps> = ({
  columns,
  onChangeColumns,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const toggleColumn = (id: string) => {
    onChangeColumns(
      columns.map((col) =>
        col.id === id ? { ...col, enabled: !col.enabled } : col
      )
    );
  };

  const moveColumn = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const updated = [...columns];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onChangeColumns(updated);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...columns];
    const temp = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, temp);

    setDraggedIndex(index);
    onChangeColumns(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Presets
  const applyPreset = (presetName: string) => {
    let activeIds: string[] = [];
    if (presetName === "exec") {
      activeIds = ["key", "summary", "type", "status", "priority", "assignee", "storyPoints", "sprint"];
    } else if (presetName === "qa") {
      activeIds = ["key", "summary", "type", "status", "priority", "reporter", "resolution", "labels"];
    } else if (presetName === "planning") {
      activeIds = ["key", "summary", "storyPoints", "assignee", "sprint", "remainingEstimate"];
    } else {
      // Full
      activeIds = columns.map(c => c.id);
    }

    onChangeColumns(
      columns.map((col) => ({
        ...col,
        enabled: activeIds.includes(col.id),
      }))
    );
  };

  return (
    <div 
      id="column-selection-card" 
      className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)] transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
          <Columns className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
          4. Columns & Layout
        </h2>
        <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Layout Customization
        </span>
      </div>

      {/* Presets Button Group */}
      <div className="space-y-2">
        <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <Bookmark className="w-3.5 h-3.5 text-blue-450" /> Table Layout Presets
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset("exec")}
            className="text-[11px] font-bold text-slate-300 bg-slate-950/40 hover:bg-slate-900 border border-white/5 hover:border-white/10 py-2 px-2 rounded-xl transition-all"
          >
            Management
          </button>
          <button
            type="button"
            onClick={() => applyPreset("qa")}
            className="text-[11px] font-bold text-slate-300 bg-slate-950/40 hover:bg-slate-900 border border-white/5 hover:border-white/10 py-2 px-2 rounded-xl transition-all"
          >
            QA & Defects
          </button>
          <button
            type="button"
            onClick={() => applyPreset("planning")}
            className="text-[11px] font-bold text-slate-300 bg-slate-950/40 hover:bg-slate-900 border border-white/5 hover:border-white/10 py-2 px-2 rounded-xl transition-all"
          >
            Sprint Planning
          </button>
          <button
            type="button"
            onClick={() => applyPreset("full")}
            className="text-[11px] font-bold text-slate-300 bg-slate-950/40 hover:bg-slate-900 border border-white/5 hover:border-white/10 py-2 px-2 rounded-xl transition-all"
          >
            Full Matrix
          </button>
        </div>
      </div>

      {/* Column Checklist & Sort */}
      <div className="space-y-2">
        <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
          Active Columns & Sequence (Drag to Reorder)
        </label>
        <div className="border border-white/5 rounded-xl overflow-hidden bg-slate-950/20 max-h-[300px] overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
          {columns.map((col, idx) => {
            const isBeingDragged = draggedIndex === idx;
            return (
              <div
                key={col.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all duration-300 cursor-grab active:cursor-grabbing ${
                  isBeingDragged
                    ? "bg-blue-600/20 border-blue-500/50 text-white opacity-60 scale-95"
                    : col.enabled
                    ? "bg-slate-950/40 border-white/10 text-white hover:border-white/20"
                    : "bg-slate-950/10 border-white/5 text-slate-500"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-slate-500 hover:text-slate-300 transition-colors p-0.5">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="checkbox"
                    checked={col.enabled}
                    onChange={() => toggleColumn(col.id)}
                    className="rounded border-white/10 text-blue-600 focus:ring-blue-500/20 cursor-pointer h-4 w-4 bg-slate-950 accent-blue-500"
                  />
                  <span className={`font-bold ${col.enabled ? "text-slate-200" : "text-slate-500"} truncate`}>
                    {col.label}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveColumn(idx, "up")}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                    title="Move column up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === columns.length - 1}
                    onClick={() => moveColumn(idx, "down")}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                    title="Move column down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
