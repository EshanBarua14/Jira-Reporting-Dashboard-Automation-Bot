import React, { useState } from "react";
import { JiraIssue, ColumnDefinition } from "../types";
import { X, Download, FileSpreadsheet, FileJson, CheckSquare, Square, Edit3, Search, Filter, RefreshCw, FileText } from "lucide-react";
import { motion } from "motion/react";
import { exportToCSV } from "../utils/export";

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: JiraIssue[];
  columns?: ColumnDefinition[];
  defaultFilename?: string;
  onRecordExport?: (format: "CSV" | "PDF" | "Google Sheets" | "JSON", filename: string, snapshot?: JiraIssue[]) => void;
  addToast?: (title: string, message: string, type?: "info" | "success" | "warning" | "error") => void;
  theme?: "dark" | "light";
}

export const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({
  isOpen,
  onClose,
  issues = [],
  columns,
  defaultFilename = "jira-export",
  onRecordExport,
  addToast,
  theme = "dark",
}) => {
  const isLight = theme === "light";

  // Editable issues copy
  const [editableIssues, setEditableIssues] = useState<JiraIssue[]>(() => [...(issues || [])]);
  // Selected issue IDs for export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set((issues || []).map((i) => i.id)));
  // Search query within modal
  const [modalSearch, setModalSearch] = useState("");
  // Custom Metadata Note
  const [customNote, setCustomNote] = useState("");

  // Sync state whenever modal opens or issues prop updates
  React.useEffect(() => {
    if (isOpen) {
      const currentIssues = issues || [];
      setEditableIssues([...currentIssues]);
      setSelectedIds(new Set(currentIssues.map((i) => i.id)));
      setModalSearch("");
      setCustomNote("");
    }
  }, [isOpen, issues]);

  if (!isOpen) return null;

  const handleToggleSelectAll = () => {
    if (selectedIds.size === editableIssues.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(editableIssues.map((i) => i.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCellChange = (id: string, field: keyof JiraIssue, value: any) => {
    setEditableIssues((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const filteredIssues = editableIssues.filter((i) => {
    if (!modalSearch.trim()) return true;
    const q = modalSearch.toLowerCase();
    return (
      i.key.toLowerCase().includes(q) ||
      i.summary.toLowerCase().includes(q) ||
      i.assignee.toLowerCase().includes(q) ||
      i.mappedStatus.toLowerCase().includes(q) ||
      i.priority.toLowerCase().includes(q)
    );
  });

  const selectedIssuesList = editableIssues.filter((i) => selectedIds.has(i.id));

  const handleConfirmCSVExport = () => {
    if (selectedIssuesList.length === 0) {
      addToast?.("Export Error", "Please select at least one row to export.", "warning");
      return;
    }
    const filename = `${defaultFilename}.csv`;
    exportToCSV(selectedIssuesList, columns, defaultFilename);
    onRecordExport?.("CSV", filename, selectedIssuesList);
    const noteSuffix = customNote.trim() ? ` [Note: "${customNote.trim()}"]` : "";
    addToast?.("CSV Export Complete", `Exported ${selectedIssuesList.length} customized records to ${filename}.${noteSuffix}`, "success");
    onClose();
  };

  const handleConfirmJSONExport = () => {
    if (selectedIssuesList.length === 0) {
      addToast?.("Export Error", "Please select at least one row to export.", "warning");
      return;
    }
    const filename = `${defaultFilename}.json`;
    const exportData = {
      metadataNote: customNote.trim() || undefined,
      exportedAt: new Date().toISOString(),
      count: selectedIssuesList.length,
      issues: selectedIssuesList,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const anchor = document.createElement("a");
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", filename);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    onRecordExport?.("JSON", filename, selectedIssuesList);
    const noteSuffix = customNote.trim() ? ` [Note: "${customNote.trim()}"]` : "";
    addToast?.("JSON Export Complete", `Exported ${selectedIssuesList.length} customized records to ${filename}.${noteSuffix}`, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 transition-all duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 24 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className={`w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isLight
            ? "bg-white border-slate-200 text-slate-800"
            : "bg-slate-900 border-white/10 text-slate-100"
        }`}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wide flex items-center gap-2">
                Editable Dataset Export Preview
              </h2>
              <p className="text-xs text-slate-400">
                Select rows and refine ticket values before generating CSV/JSON export files
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="px-6 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-950/20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-colors cursor-pointer"
            >
              {selectedIds.size === editableIssues.length ? (
                <>
                  <CheckSquare className="w-4 h-4" /> Deselect All
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" /> Select All ({editableIssues.length})
                </>
              )}
            </button>

            <span className="text-xs font-mono font-bold text-slate-400">
              Selected: <strong className="text-indigo-400">{selectedIds.size}</strong> / {editableIssues.length} rows
            </span>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search table rows..."
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Custom Metadata Note Attachment Bar */}
        <div className="px-6 py-2.5 bg-indigo-950/20 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-indigo-300 shrink-0 uppercase tracking-wider">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Custom Export Metadata Note:</span>
          </div>
          <div className="relative flex-1 w-full max-w-xl">
            <input
              type="text"
              placeholder="Attach custom note to metadata (e.g. Q3 PMO Executive Audit - Board Review Draft)..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-950/90 border border-indigo-500/30 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 transition-all"
            />
          </div>
        </div>

        {/* Editable Table Area */}
        <div className="flex-1 overflow-auto p-4 max-h-[55vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-950/60 sticky top-0 z-10">
                <th className="p-2.5 w-10 text-center">Export</th>
                <th className="p-2.5 w-28">Issue Key</th>
                <th className="p-2.5">Summary</th>
                <th className="p-2.5 w-32">Mapped Status</th>
                <th className="p-2.5 w-28">Priority</th>
                <th className="p-2.5 w-36">Assignee</th>
                <th className="p-2.5 w-20 text-center">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredIssues.map((issue) => {
                const isSelected = selectedIds.has(issue.id);
                return (
                  <tr
                    key={issue.id}
                    className={`transition-colors hover:bg-slate-800/40 ${
                      isSelected ? "bg-indigo-950/20" : "opacity-60"
                    }`}
                  >
                    <td className="p-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRow(issue.id)}
                        className="w-4 h-4 rounded cursor-pointer accent-indigo-600"
                      />
                    </td>
                    <td className="p-2.5 font-mono font-bold text-indigo-300">
                      <input
                        type="text"
                        value={issue.key}
                        onChange={(e) => handleCellChange(issue.id, "key", e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-slate-950 px-1 py-0.5 rounded focus:outline-none"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={issue.summary}
                        onChange={(e) => handleCellChange(issue.id, "summary", e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-slate-950 px-1 py-0.5 rounded focus:outline-none"
                      />
                    </td>
                    <td className="p-2.5">
                      <select
                        value={issue.mappedStatus}
                        onChange={(e) => handleCellChange(issue.id, "mappedStatus", e.target.value as any)}
                        className="w-full bg-slate-950 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </td>
                    <td className="p-2.5">
                      <select
                        value={issue.priority || "Medium"}
                        onChange={(e) => handleCellChange(issue.id, "priority", e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                      >
                        <option value="Highest">Highest</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                        <option value="Lowest">Lowest</option>
                      </select>
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={issue.assignee || "Unassigned"}
                        onChange={(e) => handleCellChange(issue.id, "assignee", e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-slate-950 px-1 py-0.5 rounded focus:outline-none"
                      />
                    </td>
                    <td className="p-2.5 text-center font-mono">
                      <input
                        type="number"
                        value={issue.storyPoints ?? 0}
                        onChange={(e) => handleCellChange(issue.id, "storyPoints", parseInt(e.target.value, 10) || 0)}
                        className="w-16 bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-slate-950 px-1 py-0.5 text-center rounded focus:outline-none"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
          <div className="text-xs font-semibold text-slate-400">
            Ready to export <strong className="text-white">{selectedIssuesList.length}</strong> customized records
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmJSONExport}
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <FileJson className="w-4 h-4" /> Export Selected JSON
            </button>
            <button
              type="button"
              onClick={handleConfirmCSVExport}
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Selected CSV
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
