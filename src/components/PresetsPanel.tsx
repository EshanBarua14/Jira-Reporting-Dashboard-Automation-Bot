import React, { useState, useEffect } from "react";
import { Save, FolderHeart, Trash2, Check, RotateCcw, Play, Sparkles } from "lucide-react";
import { ColumnDefinition, MetricDefinition, StatusMapping } from "../types";

export interface SavedPreset {
  id: string;
  name: string;
  timestamp: string;
  selectedProjects: string[];
  selectedIssueTypes: string[];
  selectedStatuses: string[];
  createdDateStart: string;
  createdDateEnd: string;
  updatedDateStart: string;
  updatedDateEnd: string;
  selectedSprint: string;
  selectedAssignee: string;
  columns: ColumnDefinition[];
  // Extended fields for complete 1-click state restore
  statusMapping?: StatusMapping;
  metrics?: MetricDefinition[];
  visualizations?: {
    pieChart: boolean;
    barChart: boolean;
    lineChart: boolean;
    table: boolean;
  };
  exportFormat?: "CSV" | "PDF" | "Google Sheets";
  autoExport?: boolean;
  fileNamingRule?: string;
}

interface PresetsPanelProps {
  // Current values to save
  currentProjects: string[];
  currentIssueTypes: string[];
  currentStatuses: string[];
  currentCreatedStart: string;
  currentCreatedEnd: string;
  currentUpdatedStart: string;
  currentUpdatedEnd: string;
  currentSprint: string;
  currentAssignee: string;
  currentColumns: ColumnDefinition[];
  currentStatusMapping: StatusMapping;
  currentMetrics: MetricDefinition[];
  currentVisualizations: {
    pieChart: boolean;
    barChart: boolean;
    lineChart: boolean;
    table: boolean;
  };
  currentExportFormat: "CSV" | "PDF" | "Google Sheets";
  currentAutoExport: boolean;
  currentFileNamingRule: string;

  // Callbacks
  onLoadPreset: (preset: SavedPreset) => void;
  onInstantRunPreset: (preset: SavedPreset) => void;
  onResetToDefault: () => void;
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({
  currentProjects,
  currentIssueTypes,
  currentStatuses,
  currentCreatedStart,
  currentCreatedEnd,
  currentUpdatedStart,
  currentUpdatedEnd,
  currentSprint,
  currentAssignee,
  currentColumns,
  currentStatusMapping,
  currentMetrics,
  currentVisualizations,
  currentExportFormat,
  currentAutoExport,
  currentFileNamingRule,
  onLoadPreset,
  onInstantRunPreset,
  onResetToDefault,
}) => {
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Load presets on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("jira_reporting_presets");
      if (stored) {
        setPresets(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load presets from local storage:", err);
    }
  }, []);

  // Save presets helper
  const savePresetsToStorage = (updatedList: SavedPreset[]) => {
    try {
      localStorage.setItem("jira_reporting_presets", JSON.stringify(updatedList));
      setPresets(updatedList);
    } catch (err) {
      console.error("Failed to write presets to local storage:", err);
    }
  };

  // Global Shortcut for Saving Presets (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const nameToUse = newPresetName.trim() || `Quick Preset (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
        const newPreset: SavedPreset = {
          id: "preset-" + Date.now(),
          name: nameToUse,
          timestamp: new Date().toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          selectedProjects: [...currentProjects],
          selectedIssueTypes: [...currentIssueTypes],
          selectedStatuses: [...currentStatuses],
          createdDateStart: currentCreatedStart,
          createdDateEnd: currentCreatedEnd,
          updatedDateStart: currentUpdatedStart,
          updatedDateEnd: currentUpdatedEnd,
          selectedSprint: currentSprint,
          selectedAssignee: currentAssignee,
          columns: currentColumns.map(c => ({ ...c })),
          statusMapping: { ...currentStatusMapping },
          metrics: currentMetrics.map(m => ({ ...m })),
          visualizations: { ...currentVisualizations },
          exportFormat: currentExportFormat,
          autoExport: currentAutoExport,
          fileNamingRule: currentFileNamingRule,
        };

        const updated = [newPreset, ...presets];
        savePresetsToStorage(updated);
        setActivePresetId(newPreset.id);
        setNewPresetName("");
        setShowSaveConfirm(true);
        setTimeout(() => setShowSaveConfirm(false), 2500);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentProjects,
    currentIssueTypes,
    currentStatuses,
    currentCreatedStart,
    currentCreatedEnd,
    currentUpdatedStart,
    currentUpdatedEnd,
    currentSprint,
    currentAssignee,
    currentColumns,
    currentStatusMapping,
    currentMetrics,
    currentVisualizations,
    currentExportFormat,
    currentAutoExport,
    currentFileNamingRule,
    presets,
    newPresetName
  ]);

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const newPreset: SavedPreset = {
      id: "preset-" + Date.now(),
      name: newPresetName.trim(),
      timestamp: new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      selectedProjects: [...currentProjects],
      selectedIssueTypes: [...currentIssueTypes],
      selectedStatuses: [...currentStatuses],
      createdDateStart: currentCreatedStart,
      createdDateEnd: currentCreatedEnd,
      updatedDateStart: currentUpdatedStart,
      updatedDateEnd: currentUpdatedEnd,
      selectedSprint: currentSprint,
      selectedAssignee: currentAssignee,
      columns: currentColumns.map(c => ({ ...c })),
      statusMapping: { ...currentStatusMapping },
      metrics: currentMetrics.map(m => ({ ...m })),
      visualizations: { ...currentVisualizations },
      exportFormat: currentExportFormat,
      autoExport: currentAutoExport,
      fileNamingRule: currentFileNamingRule,
    };

    const updated = [newPreset, ...presets];
    savePresetsToStorage(updated);
    setActivePresetId(newPreset.id);
    setNewPresetName("");
    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 2000);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent loading the preset when deleting
    const updated = presets.filter((p) => p.id !== id);
    savePresetsToStorage(updated);
    if (activePresetId === id) {
      setActivePresetId(null);
    }
  };

  const handleSelectPreset = (preset: SavedPreset) => {
    onLoadPreset(preset);
    setActivePresetId(preset.id);
  };

  return (
    <div 
      id="configuration-presets-card" 
      className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)] transition-all duration-300 relative overflow-hidden"
    >
      {/* Absolute Glow Background Spot */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
          <FolderHeart className="w-4 h-4 text-pink-400 drop-shadow-[0_0_6px_rgba(244,114,182,0.4)]" />
          Automation Profiles
        </h2>
        <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
          1-Click Run Active
        </span>
      </div>

      {/* Save New Preset Form */}
      <form onSubmit={handleSavePreset} className="space-y-2">
        <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
          Bookmark Current Filters & Settings
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Profile Name (e.g., Sprint Bug Triage)"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            className="flex-1 bg-slate-950/60 border border-white/5 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/20 placeholder-slate-500 transition-all font-medium"
          />
          <button
            type="submit"
            disabled={!newPresetName.trim()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-40 text-white font-black text-[10px] px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 uppercase tracking-wider shadow-lg shadow-blue-500/10 active:scale-[0.98]"
          >
            {showSaveConfirm ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {showSaveConfirm ? "Saved" : "Save"}
          </button>
        </div>
      </form>

      {/* Preset List Selection */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
            Saved Automated Profiles ({presets.length})
          </span>
          <button
            type="button"
            onClick={onResetToDefault}
            className="text-[9px] font-extrabold text-slate-400 hover:text-blue-400 transition-all flex items-center gap-1 uppercase tracking-wider"
          >
            <RotateCcw className="w-3 h-3" />
            Clear to Defaults
          </button>
        </div>

        {presets.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-6 text-center border border-dashed border-white/5 rounded-xl bg-slate-950/20 leading-relaxed font-medium">
            No custom profiles saved yet.<br />Setup your filters/columns and bookmark above for instantaneous generation!
          </div>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {presets.map((preset) => {
              const isActive = activePresetId === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`group relative flex items-center justify-between p-3 rounded-xl text-left text-xs border transition-all duration-300 cursor-pointer overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-r from-blue-950/30 to-indigo-950/20 border-blue-500/30 text-white shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                      : "bg-slate-950/20 border-white/5 hover:bg-slate-900/40 hover:border-white/10 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate pr-1">
                    {/* Visual Pulse Indicator for Active */}
                    <div className="relative shrink-0 flex items-center justify-center">
                      <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`}></span>
                      {isActive && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/50 animate-ping opacity-75"></span>
                      )}
                    </div>

                    <div className="truncate">
                      <p className="truncate font-bold text-slate-200 tracking-wide text-xs">{preset.name}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        {preset.timestamp} • {preset.selectedProjects.join(", ")}
                      </p>
                    </div>
                  </div>

                  {/* One-click Action Group */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {/* Instant Execution Play Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInstantRunPreset(preset);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:text-slate-950 font-black text-[9px] flex items-center gap-1 transition-all uppercase tracking-wider shadow-md shadow-emerald-500/10 active:scale-95"
                      title="Instant Load and Run Report"
                    >
                      <Play className="w-2.5 h-2.5 fill-current text-current stroke-none" />
                      Run
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeletePreset(preset.id, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900/60 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100"
                      title="Delete Profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
