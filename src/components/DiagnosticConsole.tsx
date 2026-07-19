import React, { useState } from "react";
import { Terminal, X, Trash2, ShieldAlert, Key, Globe, RefreshCw, AlertCircle, CheckCircle, Download } from "lucide-react";
import { NetworkLog } from "../types";

interface DiagnosticConsoleProps {
  logs: NetworkLog[];
  sessionId: string | null;
  jiraUrl: string;
  isConnected: boolean;
  activeUser: { displayName: string; emailAddress: string; avatarUrl: string } | null;
  isSandbox: boolean;
  onClose: () => void;
  onClear: () => void;
}

export const DiagnosticConsole: React.FC<DiagnosticConsoleProps> = ({
  logs,
  sessionId,
  jiraUrl,
  isConnected,
  activeUser,
  isSandbox,
  onClose,
  onClear,
}) => {
  const [expandedLogIdx, setExpandedLogIdx] = useState<number | null>(null);

  const exportLogsText = () => {
    const header = `=========================================
JIRA CONNECTION DIAGNOSTICS REPORT
Exported on: ${new Date().toLocaleString()}
=========================================

--- ENVIRONMENT DETAILS ---
Environment Mode: ${isSandbox ? "Sandbox Playground" : "Production Jira Cloud"}
Connection State: ${isConnected ? "Connected" : "Disconnected"}
Session ID Token: ${sessionId || "None"}
Jira Instance Host: ${jiraUrl || "Not configured"}
Active User: ${activeUser ? `${activeUser.displayName} (${activeUser.emailAddress})` : "None"}

--- NETWORK & SYSTEM LOGS (${logs.length} captured) ---
`;

    const logsContent = logs.map((log, idx) => {
      return `[Log #${idx + 1}]
Timestamp: ${log.timestamp}
Method: ${log.method}
URL: ${log.url}
Status: ${log.status}
StatusText: ${log.statusText || "N/A"}
Details: ${log.details || "No details reported."}
--------------------------------------------------`;
    }).join("\n\n");

    const fullText = header + "\n" + logsContent;
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jira-connection-diagnostics-${new Date().toISOString().split("T")[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="diagnostic-console"
      className="bg-slate-950/95 border border-red-500/30 rounded-2xl p-5 shadow-[0_12px_40px_rgba(239,68,68,0.15)] relative overflow-hidden text-slate-200 mt-4 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      {/* Decorative pulse for alert status */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]" />
          <h3 className="text-xs font-black uppercase tracking-widest text-white">
            Connection Diagnostics Console
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <>
              <button
                type="button"
                onClick={exportLogsText}
                className="text-[10px] text-slate-400 hover:text-blue-400 font-bold px-2.5 py-1 rounded-lg hover:bg-white/5 border border-white/5 transition-all flex items-center gap-1 uppercase tracking-wider cursor-pointer"
                title="Export log history to text file"
              >
                <Download className="w-3 h-3" />
                Export Logs
              </button>
              <button
                type="button"
                onClick={onClear}
                className="text-[10px] text-slate-400 hover:text-red-400 font-bold px-2.5 py-1 rounded-lg hover:bg-white/5 border border-white/5 transition-all flex items-center gap-1 uppercase tracking-wider cursor-pointer"
                title="Clear log history"
              >
                <Trash2 className="w-3 h-3" />
                Clear Logs
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-4">
        {/* Token and Session state */}
        <div className="md:col-span-5 space-y-3.5 bg-slate-900/50 p-4 rounded-xl border border-white/5">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-blue-400" />
            Session Token & Authorization Status
          </h4>

          <div className="space-y-2.5 text-[11px] font-medium">
            <div className="flex items-center justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Environment Mode:</span>
              <span className={`font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full ${
                isSandbox ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}>
                {isSandbox ? "Sandbox Playground" : "Production Jira Cloud"}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Connection State:</span>
              <span className={`font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full ${
                isConnected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>

            <div className="py-1 border-b border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Session ID Token:</span>
                <span className="font-mono text-[10px] text-slate-300">
                  {sessionId ? `${sessionId.slice(0, 15)}...` : "None (Unauthorized)"}
                </span>
              </div>
              {sessionId && (
                <p className="text-[9px] text-slate-500 leading-relaxed font-medium">
                  Bearers are automatically attached to all API proxies.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Jira Instance Host:</span>
              <span className="font-mono text-[10px] text-slate-300 max-w-[200px] truncate" title={jiraUrl}>
                {jiraUrl ? jiraUrl.replace(/^https?:\/\//, "") : "Not configured"}
              </span>
            </div>

            {isConnected && activeUser && (
              <div className="flex items-center gap-2 pt-1.5">
                {activeUser.avatarUrl ? (
                  <img src={activeUser.avatarUrl} alt="Avatar" className="w-5 h-5 rounded-full border border-white/15" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[9px]">
                    {activeUser.displayName.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="text-[10px] font-bold text-white leading-none">{activeUser.displayName}</div>
                  <div className="text-[9px] text-slate-400 leading-none mt-0.5">{activeUser.emailAddress}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Network Requests log */}
        <div className="md:col-span-7 flex flex-col bg-slate-900/50 p-4 rounded-xl border border-white/5 h-full">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            Last 5 Network Request Codes
          </h4>

          {logs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center border border-dashed border-white/5 rounded-lg bg-slate-950/20">
              <ShieldAlert className="w-6 h-6 text-slate-600 mb-2" />
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                No outbound requests captured yet.<br />Initiate a test or compile a report to observe status.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[175px] overflow-y-auto pr-1 custom-scrollbar">
              {logs.map((log, idx) => {
                const isSuccess = Number(log.status) >= 200 && Number(log.status) < 300;
                const isError = Number(log.status) >= 400 || log.status === "Failed";
                const isExpanded = expandedLogIdx === idx;

                return (
                  <div
                    key={idx}
                    className="border border-white/5 rounded-lg bg-slate-950/40 hover:bg-slate-950/80 transition-all overflow-hidden"
                  >
                    <div
                      onClick={() => setExpandedLogIdx(isExpanded ? null : idx)}
                      className="p-2 flex items-center justify-between text-[11px] font-semibold cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded text-white tracking-wide ${
                            log.method === "POST" ? "bg-blue-600" : "bg-emerald-600"
                          }`}
                        >
                          {log.method}
                        </span>
                        <span className="font-mono text-slate-300 text-[10px] max-w-[150px] sm:max-w-[200px] truncate">
                          {log.url}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                        <span
                          className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                            isSuccess
                              ? "bg-emerald-500/10 text-emerald-400"
                              : isError
                              ? "bg-red-500/10 text-red-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                          )}
                          {log.status}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-2.5 bg-slate-950/90 border-t border-white/5 font-mono text-[10px] text-slate-300 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                        <div className="text-[9px] font-bold text-slate-500 mb-1">Response Details:</div>
                        {log.details || `No details reported. Code: ${log.statusText || "N/A"}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex gap-2.5 text-red-400 leading-relaxed font-semibold text-[11px]">
        <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold uppercase tracking-wide block mb-0.5">Common Connection Failure Culprits</span>
          <p className="text-slate-400 leading-normal font-medium">
            Jira APIs reject requests with <b className="text-slate-300">401 Unauthorized</b> if you've provided your Atlassian password instead of an active API Token, or if the email is slightly misspelled. <b className="text-slate-300">403 Forbidden</b> usually points to IP restriction whitelists or strict CORS policies in Atlassian Access. Verify settings using the "Test Connection" button.
          </p>
        </div>
      </div>
    </div>
  );
};
