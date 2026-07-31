import React, { useState, useEffect } from "react";
import { Save, FolderHeart, Trash2, Check, RotateCcw, Play, Sparkles, LayoutGrid, Layers, SlidersHorizontal } from "lucide-react";
import { ColumnDefinition, MetricDefinition, StatusMapping, DashboardLayoutPreset } from "../types";

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
    trendAnalysis?: boolean;
    customChart?: boolean;
  };
  exportFormat?: "CSV" | "PDF" | "Google Sheets";
  autoExport?: boolean;
  fileNamingRule?: string;
  panelOrder?: string[];
  collapsedPanels?: Record<string, boolean>;
}

export interface PresetsPanelProps {
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
    trendAnalysis?: boolean;
    customChart?: boolean;
  };
  currentExportFormat: "CSV" | "PDF" | "Google Sheets";
  currentAutoExport: boolean;
  currentFileNamingRule: string;

  // Layout state
  currentPanelOrder?: string[];
  currentCollapsedPanels?: Record<string, boolean>;

  // Callbacks
  onLoadPreset: (preset: SavedPreset) => void;
  onInstantRunPreset: (preset: SavedPreset) => void;
  onResetToDefault: () => void;
  onLoadLayoutPreset?: (preset: DashboardLayoutPreset) => void;
}

const DEFAULT_LAYOUT_PRESETS: DashboardLayoutPreset[] = [
  {
    id: "layout-executive",
    name: "Executive Overview",
    description: "Prioritizes high-level metrics cards and visualization charts",
    timestamp: "System Default",
    panelOrder: ["metrics", "visual", "scope", "presets", "auth", "column", "status", "recent", "export"],
    collapsedPanels: { auth: true, recent: true, export: true },
    visualizations: { pieChart: true, barChart: true, lineChart: true, table: true, trendAnalysis: true, customChart: true },
  },
  {
    id: "layout-developer",
    name: "Developer Velocity",
    description: "Focuses on issue table, burndown trends, and sprint scope",
    timestamp: "System Default",
    panelOrder: ["scope", "visual", "metrics", "column", "status", "auth", "presets", "recent", "export"],
    collapsedPanels: { auth: true, presets: true, status: true },
    visualizations: { pieChart: false, barChart: true, lineChart: true, table: true, trendAnalysis: true, customChart: true },
  },
  {
    id: "layout-compact",
    name: "Compact Review Mode",
    description: "Collapses config panels to maximize report dashboard real-estate",
    timestamp: "System Default",
    panelOrder: ["presets", "scope", "metrics", "visual", "auth", "column", "status", "recent", "export"],
    collapsedPanels: { auth: true, recent: true, column: true, status: true, export: true },
    visualizations: { pieChart: true, barChart: false, lineChart: true, table: true, trendAnalysis: false, customChart: false },
  },
];

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
  currentPanelOrder = ["auth", "presets", "recent", "scope", "column", "status", "metrics", "visual", "export"],
  currentCollapsedPanels = {},
  onLoadPreset,
  onInstantRunPreset,
  onResetToDefault,
  onLoadLayoutPreset,
}) => {
  const [activeTab, setActiveTab] = useState<"query" | "layout">("query");
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [layoutPresets, setLayoutPresets] = useState<DashboardLayoutPreset[]>(DEFAULT_LAYOUT_PRESETS);
  const [newPresetName, setNewPresetName] = useState("");
  const [newLayoutName, setNewLayoutName] = useState("");
  const [presetSearch, setPresetSearch] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showLayoutSaveConfirm, setShowLayoutSaveConfirm] = useState(false);

  // Load presets on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("jira_reporting_presets");
      if (stored) {
        setPresets(JSON.parse(stored));
      }

      const storedLayouts = localStorage.getItem("jira_dashboard_layout_presets");
      if (storedLayouts) {
        const parsed: DashboardLayoutPreset[] = JSON.parse(storedLayouts);
        setLayoutPresets([...DEFAULT_LAYOUT_PRESETS, ...parsed.filter(p => !DEFAULT_LAYOUT_PRESETS.some(d => d.id === p.id))]);
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

  const saveLayoutPresetsToStorage = (customLayouts: DashboardLayoutPreset[]) => {
    try {
      localStorage.setItem("jira_dashboard_layout_presets", JSON.stringify(customLayouts));
      setLayoutPresets([...DEFAULT_LAYOUT_PRESETS, ...customLayouts]);
    } catch (err) {
      console.error("Failed to write layout presets to local storage:", err);
    }
  };

  const handleSaveLayoutPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLayoutName.trim()) return;

    const newLayout: DashboardLayoutPreset = {
      id: "layout-" + Date.now(),
      name: newLayoutName.trim(),
      description: "Custom user saved layout preset",
      timestamp: new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      panelOrder: [...currentPanelOrder],
      collapsedPanels: { ...currentCollapsedPanels },
      visualizations: { ...currentVisualizations },
    };

    const customOnly = layoutPresets.filter(p => !DEFAULT_LAYOUT_PRESETS.some(d => d.id === p.id));
    const updatedCustom = [newLayout, ...customOnly];
    saveLayoutPresetsToStorage(updatedCustom);
    setActiveLayoutId(newLayout.id);
    setNewLayoutName("");
    setShowLayoutSaveConfirm(true);
    setTimeout(() => setShowLayoutSaveConfirm(false), 2000);

    if (onLoadLayoutPreset) {
      onLoadLayoutPreset(newLayout);
    }
  };

  const handleApplyLayoutPreset = (preset: DashboardLayoutPreset) => {
    setActiveLayoutId(preset.id);
    if (onLoadLayoutPreset) {
      onLoadLayoutPreset(preset);
    }
  };

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
      panelOrder: [...currentPanelOrder],
      collapsedPanels: { ...currentCollapsedPanels },
    };

    const updated = [newPreset, ...presets];
    savePresetsToStorage(updated);
    setActivePresetId(newPreset.id);
    setNewPresetName("");
    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 2000);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = presets.filter((p) => p.id !== id);
    savePresetsToStorage(updated);
    if (activePresetId === id) {
      setActivePresetId(null);
    }
  };

  const handleDeleteLayoutPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (DEFAULT_LAYOUT_PRESETS.some(d => d.id === id)) return;
    const customOnly = layoutPresets.filter(p => !DEFAULT_LAYOUT_PRESETS.some(d => d.id === p.id) && p.id !== id);
    saveLayoutPresetsToStorage(customOnly);
    if (activeLayoutId === id) {
      setActiveLayoutId(null);
    }
  };

  const handleSelectPreset = (preset: SavedPreset) => {
    onLoadPreset(preset);
    setActivePresetId(preset.id);
    if (preset.panelOrder && onLoadLayoutPreset) {
      onLoadLayoutPreset({
        id: preset.id + "-layout",
        name: preset.name + " Layout",
        timestamp: preset.timestamp,
        panelOrder: preset.panelOrder,
        collapsedPanels: preset.collapsedPanels || {},
        visualizations: preset.visualizations || currentVisualizations,
      });
    }
  };

  return (
    <div 
      id="configuration-presets-card" 
      className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)] transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
          <FolderHeart className="w-4 h-4 text-pink-400 drop-shadow-[0_0_6px_rgba(244,114,182,0.4)]" />
          Automation Profiles & Layout Presets
        </h2>
        <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
          1-Click Preset
        </span>
      </div>

      {/* Preset Sub-Tab Selectors */}
      <div className="flex items-center p-1 bg-slate-950/60 rounded-xl border border-white/5 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("query")}
          className={`flex-1 text-[10px] font-black uppercase tracking-wider py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "query"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          Query Profiles ({presets.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("layout")}
          className={`flex-1 text-[10px] font-black uppercase tracking-wider py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "layout"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <LayoutGrid className="w-3 h-3" />
          Dashboard Layouts ({layoutPresets.length})
        </button>
      </div>

      {/* Tab 1: Query Profiles */}
      {activeTab === "query" && (
        <>
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
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-40 text-white font-black text-[10px] px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 uppercase tracking-wider shadow-lg shadow-blue-500/10 active:scale-[0.98] cursor-pointer"
              >
                {showSaveConfirm ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {showSaveConfirm ? "Saved" : "Save"}
              </button>
            </div>
          </form>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                Saved Automated Profiles ({presets.length})
              </span>
              <button
                type="button"
                onClick={onResetToDefault}
                className="text-[9px] font-extrabold text-slate-400 hover:text-blue-400 transition-all flex items-center gap-1 uppercase tracking-wider cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Clear to Defaults
              </button>
            </div>

            {presets.length > 0 && (
              <div className="relative mb-2">
                <input
                  type="text"
                  placeholder="Search profile by name..."
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  id="preset-search-input"
                  className="w-full bg-slate-950/40 border border-white/5 text-slate-200 text-[11px] rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-blue-500/80 placeholder-slate-500 transition-all font-medium"
                />
                {presetSearch && (
                  <button
                    type="button"
                    onClick={() => setPresetSearch("")}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {presets.length === 0 ? (
              <div className="text-[11px] text-slate-400 py-6 text-center border border-dashed border-white/5 rounded-xl bg-slate-950/20 leading-relaxed font-medium">
                No custom profiles saved yet.<br />Setup your filters/columns and bookmark above for instantaneous generation!
              </div>
            ) : presets.filter(p => p.name.toLowerCase().includes(presetSearch.toLowerCase())).length === 0 ? (
              <div className="text-[11px] text-slate-500 py-6 text-center border border-dashed border-white/5 rounded-xl bg-slate-950/10 leading-relaxed font-medium">
                No profiles match "{presetSearch}".
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {presets
                  .filter((p) => p.name.toLowerCase().includes(presetSearch.toLowerCase()))
                  .map((preset) => {
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

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInstantRunPreset(preset);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:text-slate-950 font-black text-[9px] flex items-center gap-1 transition-all uppercase tracking-wider shadow-md shadow-emerald-500/10 active:scale-95 cursor-pointer"
                          title="Instant Load and Run Report"
                        >
                          <Play className="w-2.5 h-2.5 fill-current text-current stroke-none" />
                          Run
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeletePreset(preset.id, e)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900/60 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
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
        </>
      )}

      {/* Tab 2: Dashboard Layout Presets */}
      {activeTab === "layout" && (
        <div className="space-y-3">
          <form onSubmit={handleSaveLayoutPreset} className="space-y-2">
            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
              Save Current Panel Order & Visibility
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Layout Preset Name (e.g., Executive Focus)"
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                className="flex-1 bg-slate-950/60 border border-white/5 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/20 placeholder-slate-500 transition-all font-medium"
              />
              <button
                type="submit"
                disabled={!newLayoutName.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-40 text-white font-black text-[10px] px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 uppercase tracking-wider shadow-lg shadow-blue-500/10 active:scale-[0.98] cursor-pointer"
              >
                {showLayoutSaveConfirm ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {showLayoutSaveConfirm ? "Saved" : "Save Layout"}
              </button>
            </div>
          </form>

          <div className="space-y-2 pt-1">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Available Dashboard Layout Presets ({layoutPresets.length})
            </span>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {layoutPresets.map((preset) => {
                const isActive = activeLayoutId === preset.id;
                const isDefault = DEFAULT_LAYOUT_PRESETS.some(d => d.id === preset.id);

                return (
                  <div
                    key={preset.id}
                    onClick={() => handleApplyLayoutPreset(preset)}
                    className={`group relative flex items-center justify-between p-3 rounded-xl text-left text-xs border transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-blue-950/40 to-indigo-950/30 border-blue-500/40 text-white shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                        : "bg-slate-950/20 border-white/5 hover:bg-slate-900/40 hover:border-white/10 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate pr-2">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-200 tracking-wide text-xs truncate">{preset.name}</p>
                          {isDefault && (
                            <span className="text-[8px] font-extrabold bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded uppercase">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{preset.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyLayoutPreset(preset);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-900 text-slate-300 hover:bg-blue-600 hover:text-white"
                        }`}
                      >
                        {isActive ? "Active" : "Apply"}
                      </button>

                      {!isDefault && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteLayoutPreset(preset.id, e)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900/60 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Delete Custom Layout"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
