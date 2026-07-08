import React from "react";
import { FolderGit2, Check, Sparkles, Calendar, User, Compass, BookOpen, MessageSquare, Hash, Sliders } from "lucide-react";

interface ScopePanelProps {
  activePlatform: "Jira" | "Confluence" | "Discord";

  // Jira Props
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

  // Confluence Props
  selectedConfluenceSpaces: string[];
  onChangeConfluenceSpaces: (spaces: string[]) => void;
  confluencePageStatus: string;
  onChangeConfluencePageStatus: (status: string) => void;
  confluenceCreator: string;
  onChangeConfluenceCreator: (creator: string) => void;

  // Discord Props
  selectedDiscordChannels: string[];
  onChangeDiscordChannels: (channels: string[]) => void;
  discordAuthor: string;
  onChangeDiscordAuthor: (author: string) => void;
  discordMinReactions: number;
  onChangeDiscordMinReactions: (reactions: number) => void;

  // Smart Filter Props
  report?: any;
  onApplySmartFilter?: (suggestion: any) => void;
}

export const ScopePanel: React.FC<ScopePanelProps> = ({
  activePlatform,

  // Jira
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

  // Confluence
  selectedConfluenceSpaces,
  onChangeConfluenceSpaces,
  confluencePageStatus,
  onChangeConfluencePageStatus,
  confluenceCreator,
  onChangeConfluenceCreator,

  // Discord
  selectedDiscordChannels,
  onChangeDiscordChannels,
  discordAuthor,
  onChangeDiscordAuthor,
  discordMinReactions,
  onChangeDiscordMinReactions,

  // Smart Filter
  report,
  onApplySmartFilter,
}) => {
  const [loadingSuggestion, setLoadingSuggestion] = React.useState(false);
  const [aiSuggestion, setAiSuggestion] = React.useState<any | null>(null);
  const [showAiBox, setShowAiBox] = React.useState(false);

  const fetchSmartFilter = async () => {
    if (!report) return;
    setLoadingSuggestion(true);
    setShowAiBox(true);
    setAiSuggestion(null);
    try {
      const response = await fetch("/api/gemini/suggest-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics: report.metrics,
          config: report.config
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAiSuggestion(data.suggestion);
      } else {
        console.error("Failed to fetch suggestions");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSuggestion(false);
    }
  };

  // --- JIRA HELPERS ---
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

  // --- CONFLUENCE HELPERS ---
  const CONFLUENCE_SPACES = [
    { key: "ENG", name: "Engineering Wiki" },
    { key: "PMO", name: "Product Management Office" },
    { key: "SEC", name: "Security Compliance" },
    { key: "MKT", name: "Marketing Strategy" }
  ];

  const toggleConfluenceSpace = (key: string) => {
    if (selectedConfluenceSpaces.includes(key)) {
      onChangeConfluenceSpaces(selectedConfluenceSpaces.filter((s) => s !== key));
    } else {
      onChangeConfluenceSpaces([...selectedConfluenceSpaces, key]);
    }
  };

  // --- DISCORD HELPERS ---
  const DISCORD_CHANNELS = ["general", "engineering", "announcements", "prod-deployments"];

  const toggleDiscordChannel = (ch: string) => {
    if (selectedDiscordChannels.includes(ch)) {
      onChangeDiscordChannels(selectedDiscordChannels.filter((c) => c !== ch));
    } else {
      onChangeDiscordChannels([...selectedDiscordChannels, ch]);
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
          {activePlatform === "Jira" && (
            <>
              <FolderGit2 className="w-4 h-4 text-indigo-400 drop-shadow-[0_0_6px_rgba(129,140,248,0.4)]" />
              2. Jira Scope & Filters
            </>
          )}
          {activePlatform === "Confluence" && (
            <>
              <BookOpen className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
              2. Confluence Wiki Filters
            </>
          )}
          {activePlatform === "Discord" && (
            <>
              <MessageSquare className="w-4 h-4 text-purple-400 drop-shadow-[0_0_6px_rgba(192,132,252,0.4)]" />
              2. Discord Channel Filters
            </>
          )}
        </h2>
        <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
          {activePlatform} Filtration
        </span>
      </div>

      {/* --- JIRA FILTERS VIEW --- */}
      {activePlatform === "Jira" && (
        <div className="space-y-5">
          {/* Smart AI Filter Button & Result */}
          {report && (
            <div className="bg-gradient-to-r from-indigo-950/40 via-blue-950/30 to-indigo-950/20 border border-indigo-900/40 rounded-xl p-3.5 space-y-2 relative overflow-hidden">
              <div className="absolute right-3 top-3 text-indigo-900/10 pointer-events-none select-none">
                <Sparkles className="w-12 h-12" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-indigo-200 tracking-wider">
                    Gemini AI Smart Filter
                  </span>
                </div>
                <button
                  type="button"
                  onClick={fetchSmartFilter}
                  disabled={loadingSuggestion}
                  className="text-[9px] font-black uppercase bg-indigo-600 hover:bg-indigo-500 text-white border-none rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {loadingSuggestion ? "Analyzing..." : "Ask Gemini"}
                </button>
              </div>

              {showAiBox && (
                <div className="mt-2 text-[11px] leading-relaxed text-slate-300 font-medium border-t border-indigo-950 pt-2.5">
                  {loadingSuggestion ? (
                    <div className="flex items-center gap-2 py-1.5 text-blue-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                      <span>Gemini is analyzing project bottlenecks & drafting queries...</span>
                    </div>
                  ) : aiSuggestion ? (
                    <div className="space-y-2.5">
                      <p className="text-slate-300 text-[10.5px] italic bg-slate-950/50 p-2.5 rounded-lg border border-white/5 leading-normal font-medium">
                        "{aiSuggestion.reasoning}"
                      </p>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-white/5 font-mono text-[9px] text-yellow-400 select-all whitespace-pre-wrap leading-normal">
                        Suggested JQL: {aiSuggestion.suggestedJql}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onApplySmartFilter) {
                            onApplySmartFilter(aiSuggestion);
                          }
                        }}
                        className="w-full text-center py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-lg transition-colors uppercase tracking-widest cursor-pointer shadow-md"
                      >
                        ✓ Automatically Tune Scope Filters
                      </button>
                    </div>
                  ) : (
                    <div className="text-rose-400 py-1 font-semibold text-[10px]">
                      Failed to generate filter recommendations. Please try again.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
                    className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1 ${
                      isSel
                        ? "bg-blue-600/10 border-blue-500/30 text-blue-400 font-bold"
                        : "bg-slate-950/20 border-white/5 hover:border-white/10 text-slate-400"
                    }`}
                  >
                    {isSel && <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Filtration Multi-Select */}
          <div className="space-y-2">
            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
              Filter by Status (Optional)
            </label>
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
                    className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                      isSel
                        ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400 font-bold"
                        : "bg-slate-950/20 border-white/5 hover:border-white/10 text-slate-400"
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
              {selectedStatuses.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChangeStatuses([])}
                  className="text-xs text-slate-500 hover:text-slate-300 font-black px-2.5 py-1 rounded"
                >
                  Reset Statuses
                </button>
              )}
            </div>
          </div>

          {/* Date Created/Updated Ranges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Created Range
                </label>
                <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider">
                  <button type="button" onClick={() => setDateShortcut("created", 7)} className="text-blue-500 hover:underline">
                    7d
                  </button>
                  <span className="text-slate-800">|</span>
                  <button type="button" onClick={() => setDateShortcut("created", 30)} className="text-blue-500 hover:underline">
                    30d
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Updated Range
                </label>
                <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider">
                  <button type="button" onClick={() => setDateShortcut("updated", 7)} className="text-blue-500 hover:underline">
                    7d
                  </button>
                  <span className="text-slate-800">|</span>
                  <button type="button" onClick={() => setDateShortcut("updated", 30)} className="text-blue-500 hover:underline">
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
                <Compass className="w-3.5 h-3.5 text-slate-500" /> Target Sprint
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
                <User className="w-3.5 h-3.5 text-slate-500" /> Target Assignee
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
      )}

      {/* --- CONFLUENCE FILTERS VIEW --- */}
      {activePlatform === "Confluence" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
              Target Wiki Spaces
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CONFLUENCE_SPACES.map((sp) => {
                const isSel = selectedConfluenceSpaces.includes(sp.key);
                return (
                  <button
                    type="button"
                    key={sp.key}
                    onClick={() => toggleConfluenceSpace(sp.key)}
                    className={`flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl border transition-all duration-300 font-semibold text-xs ${
                      isSel
                        ? "border-emerald-500/30 bg-emerald-500/10 text-white"
                        : "border-white/5 hover:border-white/10 text-slate-300 bg-slate-950/20 hover:bg-slate-950/40"
                    }`}
                  >
                    <div className="truncate flex items-center gap-2">
                      <span className="font-mono text-[9px] font-bold bg-slate-950/80 px-1.5 py-0.5 rounded border border-white/5 text-emerald-400">
                        {sp.key}
                      </span>
                      <span className="truncate text-slate-200">{sp.name}</span>
                    </div>
                    {isSel && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                Page Status Filter
              </label>
              <select
                value={confluencePageStatus}
                onChange={(e) => onChangeConfluencePageStatus(e.target.value)}
                className="w-full text-xs bg-slate-950/60 border border-white/5 text-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-emerald-500/80 transition-all font-semibold"
              >
                <option value="All">All Pages (Drafts + Live)</option>
                <option value="Published">Published Only</option>
                <option value="Draft">Drafts Only</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                Author / Creator
              </label>
              <input
                type="text"
                value={confluenceCreator}
                onChange={(e) => onChangeConfluenceCreator(e.target.value)}
                placeholder="e.g. Sarah Connor"
                className="w-full text-xs bg-slate-950/60 border border-white/5 text-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-emerald-500/80 transition-all font-semibold"
              />
            </div>
          </div>
        </div>
      )}

      {/* --- DISCORD FILTERS VIEW --- */}
      {activePlatform === "Discord" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
              Active Server Channels
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DISCORD_CHANNELS.map((ch) => {
                const isSel = selectedDiscordChannels.includes(ch);
                return (
                  <button
                    type="button"
                    key={ch}
                    onClick={() => toggleDiscordChannel(ch)}
                    className={`flex items-center justify-between text-left px-3 py-2 rounded-xl border transition-all duration-300 font-semibold text-xs ${
                      isSel
                        ? "border-purple-500/30 bg-purple-500/10 text-white"
                        : "border-white/5 hover:border-white/10 text-slate-300 bg-slate-950/20"
                    }`}
                  >
                    <div className="truncate flex items-center gap-1.5 font-semibold">
                      <Hash className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">{ch}</span>
                    </div>
                    {isSel && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                Sender Username
              </label>
              <input
                type="text"
                value={discordAuthor}
                onChange={(e) => onChangeDiscordAuthor(e.target.value)}
                placeholder="e.g. System Bot"
                className="w-full text-xs bg-slate-950/60 border border-white/5 text-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-purple-500/80 transition-all font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                Min Reactions Trigger
              </label>
              <input
                type="number"
                min="0"
                value={discordMinReactions}
                onChange={(e) => onChangeDiscordMinReactions(parseInt(e.target.value) || 0)}
                className="w-full text-xs bg-slate-950/60 border border-white/5 text-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-purple-500/80 transition-all font-semibold font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
