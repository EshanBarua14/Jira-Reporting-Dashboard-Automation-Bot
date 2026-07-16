import React from "react";
import { X, Printer, ShieldAlert } from "lucide-react";
import { JiraIssue, ColumnDefinition } from "../types";

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  issues: JiraIssue[];
  columns: ColumnDefinition[];
  customNote?: string;
  watermark?: string;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  reportTitle,
  issues,
  columns,
  customNote,
  watermark,
}) => {
  if (!isOpen) return null;

  const activeColumns = columns.filter((c) => c.enabled);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      {/* Inject print-only styles dynamically */}
      <style>{`
        @media print {
          /* Hide all UI containers */
          body * {
            visibility: hidden !important;
          }
          /* Show only the paper element and its descendants */
          #print-preview-paper, #print-preview-paper * {
            visibility: visible !important;
          }
          #print-preview-paper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200">
        {/* Header toolbar */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">High-Fidelity Print Preview</h3>
              <p className="text-[10px] text-slate-400">Review exactly how the executive report will render on physical paper</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] px-3.5 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Trigger Print Dialog
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Outer scrolling stage (simulating physical desk environment) */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-950/50 flex justify-center custom-scrollbar">
          {/* Inner Paper Sheet (A4 Proportion) */}
          <div
            id="print-preview-paper"
            className="bg-white text-slate-900 shadow-2xl p-10 w-full max-w-[210mm] min-h-[297mm] relative overflow-hidden font-sans border border-slate-200 flex flex-col text-left shrink-0"
          >
            {/* Watermark layer */}
            {watermark && watermark !== "None" && (
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] font-black pointer-events-none select-none uppercase z-0 text-center tracking-[0.4em] leading-none"
                style={{
                  color: "rgba(220, 38, 38, 0.06)",
                  fontSize: "72px",
                  whiteSpace: "nowrap",
                }}
              >
                {watermark}
              </div>
            )}

            {/* Content Container (z-10 to stay above watermark) */}
            <div className="relative z-10 flex-1 flex flex-col">
              {/* Report Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-4">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{reportTitle}</h1>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
                  <span>Generated on {new Date().toLocaleString()}</span>
                  <span className="font-bold">Total Scope: {issues.length} Issues</span>
                </div>
              </div>

              {/* Custom Caption/Briefing block */}
              {customNote && (
                <div className="bg-slate-50 border-l-4 border-blue-500 p-4 my-4 rounded-r-lg text-xs leading-relaxed border-t border-r border-b border-slate-200">
                  <strong className="text-slate-800 text-[9.5px] uppercase tracking-wider block mb-1">
                    Executive Briefing Caption & Notes
                  </strong>
                  <p className="italic text-slate-700 whitespace-pre-line font-medium">{customNote}</p>
                </div>
              )}

              {/* Issues dataset table */}
              <div className="mt-4 flex-1">
                <table className="w-full border-collapse text-[10.5px]">
                  <thead>
                    <tr className="border-b-2 border-slate-350 bg-slate-100">
                      {activeColumns.map((col) => (
                        <th
                          key={col.id}
                          className="border border-slate-300 p-2.5 text-left font-black text-slate-800 uppercase tracking-wider"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {issues.length === 0 ? (
                      <tr>
                        <td
                          colSpan={activeColumns.length}
                          className="border border-slate-200 p-8 text-center text-slate-400 font-bold"
                        >
                          No active issues listed in the report scope.
                        </td>
                      </tr>
                    ) : (
                      issues.map((issue, idx) => (
                        <tr key={issue.key || idx} className="border-b border-slate-200 hover:bg-slate-50/50">
                          {activeColumns.map((col) => {
                            let val = (issue as any)[col.id];
                            if (Array.isArray(val)) val = val.join(", ");
                            return (
                              <td key={col.id} className="border border-slate-200 p-2 text-slate-700 font-semibold">
                                {val !== undefined && val !== null ? String(val) : "-"}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Page footer */}
              <div className="border-t border-slate-200 pt-3 mt-8 text-center text-[9px] text-slate-400 font-bold flex items-center justify-between">
                <span>Eshan Barua's OmniSync Suite • High Fidelity Export</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Controls) */}
        <div className="p-3 border-t border-white/5 bg-slate-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Note: Printing uses standard browser CSS layout. Ensure "Background Graphics" is checked in your printer settings.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-[10px] px-4 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer"
          >
            Dismiss Preview
          </button>
        </div>
      </div>
    </div>
  );
};
