import React from "react";
import { History, Search, ArrowRight, Trash2, Database, Clock } from "lucide-react";

export interface RecentSearch {
  id: string;
  timestamp: string;
  jql: string;
  platform: "jira" | "confluence" | "discord";
  config: {
    selectedProjects: string[];
    selectedIssueTypes: string[];
    selectedStatuses: string[];
    createdDateStart: string;
    createdDateEnd: string;
    updatedDateStart: string;
    updatedDateEnd: string;
    selectedSprint: string;
    selectedAssignee: string;
  };
}

interface RecentSearchesPanelProps {
  recentSearches: RecentSearch[];
  onSelectSearch: (search: RecentSearch) => void;
  onClearSearches: () => void;
}

export const RecentSearchesPanel: React.FC<RecentSearchesPanelProps> = ({
  recentSearches,
  onSelectSearch,
  onClearSearches,
}) => {
  return (
    <div
      id="recent-searches-card"
      className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)] transition-all duration-300 relative overflow-hidden text-left"
    >
      <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
          <History className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
          Recent JQL Searches
        </h2>
        {recentSearches.length > 0 && (
          <button
            type="button"
            onClick={onClearSearches}
            className="text-[9px] font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-transparent border-none"
            title="Clear saved search queries"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        Stores the last 5 successful JQL search queries. Click on any record to automatically re-populate parameters and execute.
      </p>

      {recentSearches.length === 0 ? (
        <div className="text-center py-5 bg-slate-950/20 rounded-xl border border-dashed border-white/5">
          <Database className="w-6 h-6 text-slate-650 mx-auto opacity-40 mb-1" />
          <p className="text-[10px] text-slate-500 font-bold">No searches cached yet</p>
          <p className="text-[9px] text-slate-650 font-medium mt-0.5">Successful queries will appear here</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
          {recentSearches.slice(0, 5).map((search) => {
            const dateObj = new Date(search.timestamp);
            const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            const dateStr = dateObj.toLocaleDateString([], { month: "short", day: "numeric" });

            return (
              <button
                type="button"
                key={search.id}
                onClick={() => onSelectSearch(search)}
                className="w-full flex flex-col p-3 bg-slate-950/35 border border-white/5 rounded-xl hover:bg-slate-950/60 hover:border-blue-500/40 transition-all duration-300 text-left group relative"
              >
                <div className="flex items-center justify-between w-full text-[8.5px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-400" />
                    {dateStr} at {timeStr}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-white/5 text-blue-400 font-extrabold text-[7.5px]">
                    {search.platform}
                  </span>
                </div>

                {/* Styled monospaced JQL Query */}
                <div className="text-[10.5px] font-mono bg-slate-950/80 p-2 rounded-lg border border-white/5 text-slate-300 group-hover:text-blue-400 group-hover:border-blue-500/20 transition-colors w-full break-all font-semibold leading-relaxed">
                  {search.jql}
                </div>

                {/* Configuration tags summary */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {search.config.selectedProjects.length > 0 && (
                    <span className="text-[8px] bg-slate-900 px-1.5 py-0.2 rounded border border-white/5 text-slate-400 font-bold">
                      Proj: {search.config.selectedProjects.join(", ")}
                    </span>
                  )}
                  {search.config.selectedIssueTypes.length > 0 && (
                    <span className="text-[8px] bg-slate-900 px-1.5 py-0.2 rounded border border-white/5 text-slate-400 font-bold">
                      Types: {search.config.selectedIssueTypes.join(", ")}
                    </span>
                  )}
                  {search.config.selectedSprint && (
                    <span className="text-[8px] bg-slate-900 px-1.5 py-0.2 rounded border border-white/5 text-slate-400 font-bold">
                      Sprint: {search.config.selectedSprint}
                    </span>
                  )}
                </div>

                {/* Quick Action Overlay Indicator */}
                <div className="absolute right-3.5 bottom-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-blue-600 p-1.5 rounded-lg shadow-lg">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
