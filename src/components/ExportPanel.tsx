import React, { useState } from "react";
import { 
  Download, FileOutput, HelpCircle, FileSpreadsheet, FileText, Cloud, Clock, 
  Trash2, X, Search, Calendar, Sliders, AlertTriangle, Share2, Check,
  Database, Code, FileJson
} from "lucide-react";
import { RecentExport } from "../types";

interface ExportPanelProps {
  exportFormat: "CSV" | "PDF" | "Google Sheets";
  onChangeExportFormat: (format: "CSV" | "PDF" | "Google Sheets") => void;
  autoExport: boolean;
  onChangeAutoExport: (val: boolean) => void;
  fileNamingRule: string;
  onChangeFileNamingRule: (rule: string) => void;
  recentExports?: RecentExport[];
  onTriggerExport?: (format: "CSV" | "PDF" | "Google Sheets" | "JSON") => void;
  
  // Custom enhanced props
  summaryTone: "Optimistic" | "Conservative" | "Neutral";
  onChangeSummaryTone: (tone: "Optimistic" | "Conservative" | "Neutral") => void;
  autoRunOnLogin: boolean;
  onChangeAutoRunOnLogin: (val: boolean) => void;
  repeatHourly: boolean;
  onChangeRepeatHourly: (val: boolean) => void;
  onReDownloadExport?: (item: RecentExport) => void;
  onClearHistory?: () => void;
  onExportPng?: () => void;
  onExportJson?: () => void;

  customNote: string;
  onChangeCustomNote: (val: string) => void;
  watermark: "None" | "CONFIDENTIAL" | "INTERNAL ONLY" | "DRAFT";
  onChangeWatermark: (val: "None" | "CONFIDENTIAL" | "INTERNAL ONLY" | "DRAFT") => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  exportFormat,
  onChangeExportFormat,
  autoExport,
  onChangeAutoExport,
  fileNamingRule,
  onChangeFileNamingRule,
  recentExports = [],
  onTriggerExport,
  
  summaryTone,
  onChangeSummaryTone,
  autoRunOnLogin,
  onChangeAutoRunOnLogin,
  repeatHourly,
  onChangeRepeatHourly,
  onReDownloadExport,
  onClearHistory,
  onExportPng,
  onExportJson,

  customNote,
  onChangeCustomNote,
  watermark,
  onChangeWatermark,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalFormatFilter, setModalFormatFilter] = useState<string>("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShare = async (item: RecentExport, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/?share=${item.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Jira Export Snapshot: ${item.filename}`,
          text: `View this generated report snapshot for ${item.projects.join(", ")}`,
          url: shareUrl
        });
        return;
      } catch (err) {
        // Fall back to clipboard if user cancels or shares fails
      }
    }
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy share link to clipboard", err);
    }
  };

  const filteredHistory = recentExports.filter((item) => {
    const dateObj = new Date(item.timestamp);
    const dateStr = dateObj.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).toLowerCase();
    const formattedTime = dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    }).toLowerCase();

    const matchesSearch = 
      item.filename.toLowerCase().includes(modalSearch.toLowerCase()) || 
      item.projects.some(p => p.toLowerCase().includes(modalSearch.toLowerCase())) ||
      item.format.toLowerCase().includes(modalSearch.toLowerCase()) ||
      dateStr.includes(modalSearch.toLowerCase()) ||
      formattedTime.includes(modalSearch.toLowerCase());

    const matchesFormat = modalFormatFilter === "All" || item.format === modalFormatFilter;
    return matchesSearch && matchesFormat;
  });

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

      {/* --- EXECUTIVE TONE SELECTOR --- */}
      <div className="space-y-2 p-3 bg-slate-950/20 border border-white/5 rounded-xl">
        <div className="flex items-center justify-between">
          <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Sliders className="w-3 h-3 text-indigo-400" /> Executive Summary Tone
          </label>
          <span className="text-[8px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
            Gemini Pref
          </span>
        </div>
        <p className="text-[10px] text-slate-500 font-medium">
          Customize the AI personality and emphasis when drafting report summaries.
        </p>
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {(["Neutral", "Optimistic", "Conservative"] as const).map((tone) => {
            const isSel = summaryTone === tone;
            return (
              <button
                type="button"
                key={tone}
                onClick={() => onChangeSummaryTone(tone)}
                className={`text-[10.5px] py-2 px-1 rounded-lg border font-bold transition-all duration-200 uppercase tracking-wide ${
                  isSel
                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200 shadow-[0_0_8px_rgba(99,102,241,0.1)]"
                    : "border-white/5 hover:border-white/10 text-slate-400 bg-slate-950/40 hover:bg-slate-950/60"
                }`}
              >
                {tone === "Neutral" && "⚖️ Neutral"}
                {tone === "Optimistic" && "🚀 Opti"}
                {tone === "Conservative" && "🛡️ Risk"}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- SCHEDULING SECTION --- */}
      <div className="space-y-2.5 p-3 bg-slate-950/20 border border-white/5 rounded-xl">
        <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <Clock className="w-3 h-3 text-blue-400" /> Automatic Scheduler Config
        </label>
        
        <div className="space-y-2">
          {/* Auto-run on login */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-200 block">Auto-Run on Login</span>
              <span className="text-[9px] text-slate-500 block leading-tight">Compile report instantly on system mount.</span>
            </div>
            <button
              type="button"
              onClick={() => onChangeAutoRunOnLogin(!autoRunOnLogin)}
              className={`relative inline-flex h-4.5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoRunOnLogin ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-slate-850"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  autoRunOnLogin ? "translate-x-4.5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Repeat hourly */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div>
              <span className="text-[11px] font-bold text-slate-200 block">Repeat Hourly</span>
              <span className="text-[9px] text-slate-500 block leading-tight">Run automated sweep query every 60 mins.</span>
            </div>
            <button
              type="button"
              onClick={() => onChangeRepeatHourly(!repeatHourly)}
              className={`relative inline-flex h-4.5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                repeatHourly ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-slate-850"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  repeatHourly ? "translate-x-4.5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* --- DASHBOARD SNAPSHOT PORTABLE EXPORT --- */}
      <div className="space-y-2 p-3 bg-slate-950/20 border border-white/5 rounded-xl">
        <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5 text-emerald-400" /> Portable Dashboard Image
        </label>
        <p className="text-[10px] text-slate-500 font-medium leading-normal">
          Export a high-quality PNG layout of your current KPIs, active metric sparks, and visual trend charts.
        </p>
        <button
          type="button"
          onClick={onExportPng}
          className="w-full text-[10.5px] py-2.5 px-3 rounded-lg border font-bold bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300 transition-all duration-300 flex items-center justify-center gap-1.5 uppercase cursor-pointer hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]"
        >
          <Download className="w-3.5 h-3.5" /> Download Dashboard PNG
        </button>
      </div>

      {/* --- DEVELOPER DATASET JSON EXPORT --- */}
      <div className="space-y-2 p-3 bg-slate-950/20 border border-white/5 rounded-xl">
        <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-amber-400" /> Developer Dataset JSON
        </label>
        <p className="text-[10px] text-slate-500 font-medium leading-normal">
          Export the complete report.issues and report.metrics structured datasets for advanced custom data analysis.
        </p>
        <button
          type="button"
          onClick={onExportJson}
          className="w-full text-[10.5px] py-2.5 px-3 rounded-lg border font-bold bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 transition-all duration-300 flex items-center justify-center gap-1.5 uppercase cursor-pointer hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]"
        >
          <Code className="w-3.5 h-3.5" /> Download raw JSON
        </button>
      </div>

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

      {/* PDF Specific Configs */}
      {exportFormat === "PDF" && (
        <div className="space-y-3 p-3.5 bg-slate-950/30 border border-white/5 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
              Custom Executive Caption / Notes
            </label>
            <textarea
              value={customNote}
              onChange={(e) => onChangeCustomNote(e.target.value)}
              placeholder="Add custom notes or an executive briefing caption to render at the top of the exported PDF..."
              rows={3}
              className="w-full text-[11px] bg-slate-950/60 border border-white/5 rounded-lg p-2.5 font-sans text-slate-200 focus:outline-none focus:border-blue-500/80 placeholder-slate-600 transition-all resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
              PDF Security Watermark
            </label>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {(["None", "CONFIDENTIAL", "INTERNAL ONLY", "DRAFT"] as const).map((opt) => {
                const isSel = watermark === opt;
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => onChangeWatermark(opt)}
                    className={`text-[9.5px] py-2 px-1 rounded-lg border font-bold transition-all duration-200 uppercase tracking-wide text-center ${
                      isSel
                        ? opt === "None"
                          ? "border-slate-500/30 bg-slate-500/10 text-slate-300"
                          : "border-red-500/30 bg-red-500/10 text-red-200 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                        : "border-white/5 hover:border-white/10 text-slate-400 bg-slate-950/40 hover:bg-slate-950/60"
                    }`}
                  >
                    {opt === "None" && "🚫 Off"}
                    {opt === "CONFIDENTIAL" && "⚠️ Conf"}
                    {opt === "INTERNAL ONLY" && "🔒 Int"}
                    {opt === "DRAFT" && "📝 Draft"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-[9px] text-blue-400 hover:text-blue-300 transition-colors font-bold underline bg-transparent border-none cursor-pointer"
          >
            Full Archive ({recentExports.length})
          </button>
        </div>

        {recentExports.length === 0 ? (
          <div className="text-center py-4 bg-slate-950/20 rounded-xl border border-dashed border-white/5">
            <p className="text-[10px] text-slate-500 font-bold">No recent exports in this session</p>
            <p className="text-[9px] text-slate-600 font-medium mt-0.5">Run a report with export options enabled</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {recentExports.slice(0, 5).map((item) => {
              const formattedTime = new Date(item.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              
              return (
                <div 
                  key={item.id} 
                  className="w-full flex items-center justify-between p-2 bg-slate-950/35 border border-white/5 rounded-lg hover:bg-slate-950/60 hover:border-blue-500/30 transition-all duration-300 text-left group"
                >
                  <button
                    type="button"
                    onClick={() => onReDownloadExport ? onReDownloadExport(item) : (onTriggerExport && onTriggerExport(item.format))}
                    className="flex items-center gap-2 min-w-0 flex-1 bg-transparent border-none outline-none text-left cursor-pointer"
                    title={`Click to re-download frozen snapshot copy`}
                  >
                    <div className="p-1 rounded bg-slate-900 border border-white/5 shrink-0 group-hover:border-blue-500/20 transition-colors">
                      {item.format === "CSV" && <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
                      {item.format === "PDF" && <FileText className="w-3.5 h-3.5 text-red-400" />}
                      {item.format === "JSON" && <FileJson className="w-3.5 h-3.5 text-amber-400" />}
                      {item.format === "Google Sheets" && <Cloud className="w-3.5 h-3.5 text-sky-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-slate-200 truncate leading-snug group-hover:text-blue-400 transition-colors" title={item.filename}>
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
                  </button>
                  <div className="pl-2 flex items-center gap-1.5 shrink-0">
                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${
                      item.format === "CSV" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      item.format === "PDF" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                      item.format === "JSON" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                    }`}>
                      {item.format === "CSV" ? "CSV" : item.format === "PDF" ? "PDF" : item.format === "JSON" ? "JSON" : "Sheets"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleShare(item, e)}
                      className={`p-1 rounded transition-colors ${
                        copiedId === item.id 
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800" 
                          : "text-slate-500 hover:text-white hover:bg-slate-900"
                      }`}
                      title={copiedId === item.id ? "Link Copied!" : "Copy Share Link"}
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onReDownloadExport ? onReDownloadExport(item) : (onTriggerExport && onTriggerExport(item.format))}
                      className="p-1 text-slate-500 hover:text-blue-400 transition-colors cursor-pointer"
                      title="Download"
                    >
                      <Download className="w-3 h-3 group-hover:scale-110 transition-all duration-300" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- STANDALONE FULL EXPORT HISTORY MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Export Snapshot Registry</h3>
                  <p className="text-[10px] text-slate-400">Frozen historical reports cached locally</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="p-3 border-b border-white/5 bg-slate-950/20 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search file name or project..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                />
              </div>

              <div className="flex gap-1.5 shrink-0">
                {(["All", "CSV", "PDF", "Google Sheets"] as const).map((fmt) => (
                  <button
                    type="button"
                    key={fmt}
                    onClick={() => setModalFormatFilter(fmt)}
                    className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border transition-all ${
                      modalFormatFilter === fmt
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar min-h-[200px]">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-xs font-bold text-slate-400">No Historical Records Found</div>
                  <p className="text-[10px] text-slate-500 max-w-xs mx-auto">Either no reports have been exported matching your filters, or the cache was reset.</p>
                </div>
              ) : (
                filteredHistory.map((item) => {
                  const dateObj = new Date(item.timestamp);
                  const formattedDate = dateObj.toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  });
                  const formattedTime = dateObj.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 bg-slate-950/40 border border-white/5 rounded-xl hover:border-white/10 hover:bg-slate-950/60 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-xl bg-slate-900 border border-white/5 shrink-0 group-hover:border-blue-500/25 transition-colors">
                          {item.format === "CSV" && <FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
                          {item.format === "PDF" && <FileText className="w-4 h-4 text-red-400" />}
                          {item.format === "JSON" && <FileJson className="w-4 h-4 text-amber-400" />}
                          {item.format === "Google Sheets" && <Cloud className="w-4 h-4 text-sky-400" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-blue-400 transition-colors" title={item.filename}>
                            {item.filename}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-500 font-semibold mt-0.5">
                            <span className="bg-slate-900 px-1.5 py-0.2 rounded text-slate-400 border border-white/5 font-mono">
                              {item.projects.join(", ")}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              {formattedDate} at {formattedTime}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pl-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleShare(item, e)}
                          className={`p-2 rounded-lg border transition-all ${
                            copiedId === item.id 
                              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-400" 
                              : "bg-slate-900 border-white/5 text-slate-400 hover:text-white hover:bg-slate-850"
                          }`}
                          title={copiedId === item.id ? "Link Copied!" : "Copy Share Link"}
                        >
                          {copiedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onReDownloadExport) {
                              onReDownloadExport(item);
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 uppercase tracking-wider"
                          title="Download Frozen Snapshot Copy"
                        >
                          <Download className="w-3 h-3" />
                          Grab
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/5 bg-slate-950/40 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (onClearHistory) {
                    onClearHistory();
                  }
                  setIsModalOpen(false);
                }}
                className="text-red-400 hover:text-red-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 bg-transparent border-none cursor-pointer"
                title="Wipe the cache snapshot database"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Full History
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] px-3 py-1.5 rounded-lg uppercase tracking-wider"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
