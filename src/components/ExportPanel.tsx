import React from "react";
import { Download, FileOutput, HelpCircle, FileSpreadsheet, FileText, Cloud, Clock } from "lucide-react";
import { RecentExport } from "../types";

interface ExportPanelProps {
  exportFormat: "CSV" | "PDF" | "Google Sheets";
  onChangeExportFormat: (format: "CSV" | "PDF" | "Google Sheets") => void;
  autoExport: boolean;
  onChangeAutoExport: (val: boolean) => void;
  fileNamingRule: string;
  onChangeFileNamingRule: (rule: string) => void;
  recentExports?: RecentExport[];
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  exportFormat,
  onChangeExportFormat,
  autoExport,
  onChangeAutoExport,
  fileNamingRule,
  onChangeFileNamingRule,
  recentExports = [],
}) => {
  return (
    <div 
      id="export-panel-card" 
      className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)] transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
          <FileOutput className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
          7. Export & Output Automation
        </h2>
        <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
          One-Click Export
        </span>
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        Establish output structures. Running reports dynamically compiles target data arrays into your preferred file format.
      </p>

      {/* Select export formats */}
      <div className="space-y-2">
        <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
          Primary Report Format
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["CSV", "PDF", "Google Sheets"] as const).map((format) => {
            const isSel = exportFormat === format;
            return (
              <button
                type="button"
                key={format}
                onClick={() => onChangeExportFormat(format)}
                className={`text-xs py-2.5 px-3 rounded-xl border font-bold transition-all duration-300 ${
                  isSel
                    ? "border-blue-500/30 bg-blue-500/10 text-white shadow-[0_0_8px_rgba(59,130,246,0.05)]"
                    : "border-white/5 hover:border-white/10 text-slate-300 bg-slate-950/20 hover:bg-slate-950/40"
                }`}
              >
                {format === "CSV" && "📊 CSV Format"}
                {format === "PDF" && "📄 Print / PDF"}
                {format === "Google Sheets" && "☁️ Sheets"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Auto export toggle */}
      <div className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-xl border border-white/5">
        <div className="pr-2">
          <div className="text-xs font-bold text-slate-200">Auto-Download Trigger</div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Directly prompt browser file downloads instantly upon compiling reports.</p>
        </div>
        <button
          type="button"
          onClick={() => onChangeAutoExport(!autoExport)}
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            autoExport ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-slate-800"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              autoExport ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* File naming rule */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
            File Naming Convention
          </label>
          <div className="group relative">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help hover:text-slate-300" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-slate-950 text-slate-200 text-[10px] rounded-xl shadow-xl border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 z-10 leading-relaxed font-semibold">
              Use tags <span className="text-blue-400 font-bold">{"{project}"}</span> to insert project keys and <span className="text-blue-400 font-bold">{"{date}"}</span> for the current ISO date stamp.
            </div>
          </div>
        </div>
        
        <input
          type="text"
          value={fileNamingRule}
          onChange={(e) => onChangeFileNamingRule(e.target.value)}
          placeholder="jira-report-{project}-{date}"
          className="w-full text-xs bg-slate-950/60 border border-white/5 rounded-lg px-3 py-2.5 font-mono text-slate-200 focus:outline-none focus:border-blue-500/80 placeholder-slate-500 transition-all"
        />
        <div className="text-[10px] text-slate-500 font-medium border-b border-white/5 pb-3.5">
          Example: <span className="text-slate-400">jira-report-ALPHA_MOBI-2026-07-04.csv</span>
        </div>
      </div>

      {/* Recent Exports Log */}
      <div className="pt-2 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Recent Exports Log (Last 5)
          </label>
          <span className="text-[8px] font-mono text-slate-500 font-bold uppercase">
            Autosaved
          </span>
        </div>

        {recentExports.length === 0 ? (
          <div className="text-center py-4 bg-slate-950/20 rounded-xl border border-dashed border-white/5">
            <p className="text-[10px] text-slate-500 font-bold">No recent exports in this session</p>
            <p className="text-[9px] text-slate-600 font-medium mt-0.5">Run a report with export options enabled</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {recentExports.map((item) => {
              const formattedTime = new Date(item.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              
              return (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-2 bg-slate-950/35 border border-white/5 rounded-lg hover:bg-slate-950/60 hover:border-blue-500/15 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="p-1 rounded bg-slate-900 border border-white/5 shrink-0">
                      {item.format === "CSV" && <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
                      {item.format === "PDF" && <FileText className="w-3.5 h-3.5 text-red-400" />}
                      {item.format === "Google Sheets" && <Cloud className="w-3.5 h-3.5 text-sky-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-200 truncate leading-snug" title={item.filename}>
                        {item.filename}
                      </div>
                      <div className="flex items-center gap-1.5 text-[8px] text-slate-500 font-semibold mt-0.5">
                        <span className="bg-slate-900 px-1 py-0.2 rounded text-[7px] text-slate-400 border border-white/5">
                          {item.projects.join(", ")}
                        </span>
                        <span>•</span>
                        <span>{formattedTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pl-2">
                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${
                      item.format === "CSV" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      item.format === "PDF" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                      "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                    }`}>
                      {item.format === "CSV" ? "CSV" : item.format === "PDF" ? "PDF" : "Sheets"}
                    </span>
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

