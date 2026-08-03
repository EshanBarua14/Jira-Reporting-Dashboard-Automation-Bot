import React, { useState } from "react";
import { ShieldCheck, Download, Trash2, Search, Filter, Clock, FileJson, Check, AlertTriangle, Info, User } from "lucide-react";
import { AuditLogEntry } from "../types";

interface AuditLogPanelProps {
  auditLogs: AuditLogEntry[];
  onClearLogs?: () => void;
  addToast?: (title: string, message: string, type?: "info" | "success" | "warning" | "error", duration?: number) => void;
}

export const AuditLogPanel: React.FC<AuditLogPanelProps> = ({
  auditLogs,
  onClearLogs,
  addToast,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "ALL" || log.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleExportAuditJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `omnisync_audit_log_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast?.("Audit Log Exported", "Compliance audit trail exported to JSON file.", "success", 2500);
  };

  const getSeverityBadge = (severity: AuditLogEntry["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-rose-500/15 text-rose-300 border-rose-500/30";
      case "warning":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "success":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      default:
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    }
  };

  return (
    <div id="audit-log-panel" className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Compliance Action Audit Log
          </h3>
          <span className="text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-white/10 px-2 py-0.5 rounded-md">
            {auditLogs.length} Events
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportAuditJson}
            className="text-[9.5px] font-extrabold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3 h-3 text-indigo-400" />
            Export Audit
          </button>
          {onClearLogs && (
            <button
              type="button"
              onClick={onClearLogs}
              className="text-[9.5px] font-extrabold bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-900/40 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action logs, users, or details..."
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-medium"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-950/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-bold uppercase tracking-wider cursor-pointer"
        >
          <option value="ALL">All Categories</option>
          <option value="STATUS_MAPPING">Status Mapping</option>
          <option value="PRESET_LOAD">Preset Loads</option>
          <option value="SCOPE_FILTER">Scope & JQL</option>
          <option value="REPORT_GEN">Report Gen</option>
          <option value="EXPORT">Exports</option>
          <option value="AUTH">Authentication</option>
          <option value="CONFIG">Configuration</option>
        </select>
      </div>

      {/* Audit Log Table / List */}
      <div className="bg-slate-950/80 border border-white/5 rounded-xl overflow-hidden max-h-64 overflow-y-auto font-sans">
        {filteredLogs.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs italic font-medium">
            No compliance audit logs recorded matching search criteria.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-2.5 hover:bg-slate-900/50 transition-colors flex items-start justify-between gap-3 text-xs">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[8.5px] font-mono font-black uppercase px-1.5 py-0.5 rounded border ${getSeverityBadge(log.severity)}`}>
                      {log.category}
                    </span>
                    <span className="font-extrabold text-white text-[11px]">{log.action}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                      <User className="w-2.5 h-2.5 text-indigo-400" />
                      {log.user}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-300 truncate font-mono">{log.details}</p>
                </div>

                <div className="text-[9.5px] text-slate-500 font-mono flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  {log.timestamp}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
