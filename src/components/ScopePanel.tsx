import React from "react";
import { FolderGit2, Check, Sparkles, Calendar, User, Compass } from "lucide-react";

interface ScopePanelProps {
  availableProjects: { key: string; name: string }[];
  selectedProjects: string[];
  onChangeProjects: (keys: string[]) => void;

  availableIssueTypes: string[];
  selectedIssueTypes: string[];
  onChangeIssueTypes: (types: string[]) => void;

  availableStatuses: string[];
  selectedStatuses: string[];
  onChangeStatuses: (statuses: string[]) => void;

  createdDateStart: string;
  createdDateEnd: string;
  onChangeCreatedDates: (start: string, end: string) => void;

  updatedDateStart: string;
  updatedDateEnd: string;
  onChangeUpdatedDates: (start: string, end: string) => void;

  availableSprints: string[];
  selectedSprint: string;
  onChangeSprint: (sprint: string) => void;

  availableAssignees: { id: string; name: string }[];
  selectedAssignee: string;
  onChangeAssignee: (assignee: string) => void;
}

export const ScopePanel: React.FC<ScopePanelProps> = ({
  availableProjects,
  selectedProjects,
  onChangeProjects,
  availableIssueTypes,
  selectedIssueTypes,
  onChangeIssueTypes,
  availableStatuses,
  selectedStatuses,
  onChangeStatuses,
  createdDateStart,
  createdDateEnd,
  onChangeCreatedDates,
  updatedDateStart,
  updatedDateEnd,
  onChangeUpdatedDates,
  availableSprints,
  selectedSprint,
  onChangeSprint,
  availableAssignees,
  selectedAssignee,
  onChangeAssignee,
}) => {
  
  const toggleProject = (key: string) => {
    if (selectedProjects.includes(key)) {
      onChangeProjects(selectedProjects.filter((p) => p !== key));
    } else {
      onChangeProjects([...selectedProjects, key]);
    }
  };

  const selectAllProjects = () => {
    onChangeProjects(availableProjects.map((p) => p.key));
  };

  const clearProjects = () => {
    onChangeProjects([]);
  };

  const toggleIssueType = (type: string) => {
    if (selectedIssueTypes.includes(type)) {
      onChangeIssueTypes(selectedIssueTypes.filter((t) => t !== type));
    } else {
      onChangeIssueTypes([...selectedIssueTypes, type]);
    }
  };

  const selectAllIssueTypes = () => {
    onChangeIssueTypes([...availableIssueTypes]);
  };

  const clearIssueTypes = () => {
    onChangeIssueTypes([]);
  };

  const setDateShortcut = (type: "created" | "updated", days: number) => {
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    if (type === "created") {
      onChangeCreatedDates(start, end);
    } else {
      onChangeUpdatedDates(start, end);
    }
  };

  return (
    <div 
      id="project-scope-card" 
      className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)] transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
          <FolderGit2 className="w-4 h-4 text-indigo-400 drop-shadow-[0_0_6px_rgba(129,140,248,0.4)]" />
          2. Scope & Target Filters
        </h2>
        <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Auto JQL Generator
        </span>
      </div>

      {/* Projects Multi-Select */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
            Target Jira Projects ({selectedProjects.length} selected)
          </label>
          <div className="flex gap-2 items-center text-[10px] font-black uppercase tracking-wider">
            <button
              type="button"
              onClick={selectAllProjects}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Select All
            </button>
            <span className="text-slate-800">|</span>
            <button
              type="button"
              onClick={clearProjects}
              className="text-slate-500 hover:text-slate-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {availableProjects.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-6 text-center border border-dashed border-white/5 rounded-xl bg-slate-950/20 font-medium">
            No projects available. Connect your Jira instance or use Sandbox.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableProjects.map((p) => {
              const isSel = selectedProjects.includes(p.key);
              return (
                <button
                  type="button"
                  key={p.key}
                  onClick={() => toggleProject(p.key)}
                  className={`flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl border transition-all duration-300 font-semibold text-xs ${
                    isSel
                      ? "border-blue-500/30 bg-blue-500/10 text-white shadow-[0_0_8px_rgba(59,130,246,0.05)]"
                      : "border-white/5 hover:border-white/10 text-slate-300 bg-slate-950/20 hover:bg-slate-950/40"
                  }`}
                >
                  <div className="truncate pr-2 flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold bg-slate-950/80 px-1.5 py-0.5 rounded border border-white/5 text-slate-300">
                      {p.key}
                    </span>
                    <span className="truncate">{p.name}</span>
                  </div>
                  {isSel && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Issue Types Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
            Issue Types Included
          </label>
          <div className="flex gap-2 items-center text-[10px] font-black uppercase tracking-wider">
            <button
              type="button"
              onClick={selectAllIssueTypes}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Select All
            </button>
            <span className="text-slate-800">|</span>
            <button
              type="button"
              onClick={clearIssueTypes}
              className="text-slate-500 hover:text-slate-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {availableIssueTypes.map((type) => {
            const isSel = selectedIssueTypes.includes(type);
            return (
              <button
                type="button"
                key={type}
                onClick={() => toggleIssueType(type)}
                className={`text-xs px-3.5 py-2 rounded-xl border transition-all duration-300 flex items-center gap-2 font-bold ${
                  isSel
                    ? "border-indigo-500/30 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/10"
                    : "border-white/5 hover:border-white/10 text-slate-300 bg-slate-950/20 hover:bg-slate-950/40"
                }`}
              >
                <span>{type}</span>
                {isSel && (
                  <span className="text-[9px] bg-white/20 text-white rounded-full w-4 h-4 flex items-center justify-center font-black">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Filter Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
            Target Jira Statuses ({selectedStatuses.length} selected)
          </label>
          <div className="flex gap-2 items-center text-[10px] font-black uppercase tracking-wider">
            <button
              type="button"
              onClick={() => onChangeStatuses([...availableStatuses])}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Select All
            </button>
            <span className="text-slate-800">|</span>
            <button
              type="button"
              onClick={() => onChangeStatuses([])}
              className="text-slate-500 hover:text-slate-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {availableStatuses.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-6 text-center border border-dashed border-white/5 rounded-xl bg-slate-950/20 font-medium">
            No statuses found. Connect to Jira or use default Sandbox.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {availableStatuses.map((status) => {
              const isSel = selectedStatuses.includes(status);
              return (
                <button
                  type="button"
                  key={status}
                  onClick={() => {
                    if (isSel) {
                      onChangeStatuses(selectedStatuses.filter((s) => s !== status));
                    } else {
                      onChangeStatuses([...selectedStatuses, status]);
                    }
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all duration-300 flex items-center gap-2 font-bold ${
                    isSel
                      ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                      : "border-white/5 hover:border-white/10 text-slate-300 bg-slate-950/20 hover:bg-slate-950/40"
                  }`}
                >
                  <span>{status}</span>
                  {isSel && (
                    <span className="text-[9px] bg-emerald-800 text-emerald-100 rounded-full w-3.5 h-3.5 flex items-center justify-center font-black">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Date Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Created Date */}
        <div className="p-3.5 bg-slate-950/20 rounded-xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-400" /> Created Date
            </span>
            <div className="flex gap-1.5 text-[9px] font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setDateShortcut("created", 30)}
                className="text-slate-300 hover:text-white hover:bg-slate-800 px-2 py-0.5 rounded-md border border-white/5 bg-slate-950/40 transition-colors"
              >
                30d
              </button>
              <button
                type="button"
                onClick={() => setDateShortcut("created", 90)}
                className="text-slate-300 hover:text-white hover:bg-slate-800 px-2 py-0.5 rounded-md border border-white/5 bg-slate-950/40 transition-colors"
              >
                90d
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={createdDateStart}
              onChange={(e) => onChangeCreatedDates(e.target.value, createdDateEnd)}
              className="w-full text-xs bg-slate-950/60 border border-white/5 text-slate-300 rounded-lg p-2 focus:outline-none focus:border-blue-500/80 transition-all font-medium font-mono"
            />
            <span className="text-slate-600 text-xs font-semibold">to</span>
            <input
              type="date"
              value={createdDateEnd}
              onChange={(e) => onChangeCreatedDates(createdDateStart, e.target.value)}
              className="w-full text-xs bg-slate-950/60 border border-white/5 text-slate-300 rounded-lg p-2 focus:outline-none focus:border-blue-500/80 transition-all font-medium font-mono"
            />
          </div>
        </div>

        {/* Updated Date */}
        <div className="p-3.5 bg-slate-950/20 rounded-xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-400" /> Updated Date
            </span>
            <div className="flex gap-1.5 text-[9px] font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setDateShortcut("updated", 14)}
                className="text-slate-300 hover:text-white hover:bg-slate-800 px-2 py-0.5 rounded-md border border-white/5 bg-slate-950/40 transition-colors"
              >
                14d
              </button>
              <button
                type="button"
                onClick={() => setDateShortcut("updated", 30)}
                className="text-slate-300 hover:text-white hover:bg-slate-800 px-2 py-0.5 rounded-md border border-white/5 bg-slate-950/40 transition-colors"
              >
                30d
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={updatedDateStart}
              onChange={(e) => onChangeUpdatedDates(e.target.value, updatedDateEnd)}
              className="w-full text-xs bg-slate-950/60 border border-white/5 text-slate-300 rounded-lg p-2 focus:outline-none focus:border-blue-500/80 transition-all font-medium font-mono"
            />
            <span className="text-slate-600 text-xs font-semibold">to</span>
            <input
              type="date"
              value={updatedDateEnd}
              onChange={(e) => onChangeUpdatedDates(updatedDateStart, e.target.value)}
              className="w-full text-xs bg-slate-950/60 border border-white/5 text-slate-300 rounded-lg p-2 focus:outline-none focus:border-blue-500/80 transition-all font-medium font-mono"
            />
          </div>
        </div>
      </div>

      {/* Sprints & Assignee Optional Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-slate-500" /> Target Sprint (Optional)
          </label>
          <select
            value={selectedSprint}
            onChange={(e) => onChangeSprint(e.target.value)}
            className="w-full text-xs bg-slate-950/60 border border-white/5 text-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-blue-500/80 transition-all font-semibold"
          >
            <option value="">-- All Active & Historical Sprints --</option>
            {availableSprints.map((sprint) => (
              <option key={sprint} value={sprint}>
                {sprint}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-500" /> Target Assignee (Optional)
          </label>
          <select
            value={selectedAssignee}
            onChange={(e) => onChangeAssignee(e.target.value)}
            className="w-full text-xs bg-slate-950/60 border border-white/5 text-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-blue-500/80 transition-all font-semibold"
          >
            <option value="">-- All Active Assignees --</option>
            {availableAssignees.map((assignee) => (
              <option key={assignee.id} value={assignee.name}>
                {assignee.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
