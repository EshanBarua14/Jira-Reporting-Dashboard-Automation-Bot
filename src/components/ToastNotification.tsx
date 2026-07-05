import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Info, Loader2, X, ExternalLink, ShieldAlert } from "lucide-react";

export interface Toast {
  id: string;
  type: "success" | "info" | "error" | "warning" | "syncing";
  title: string;
  message: string;
  link?: { url: string; label: string };
}

interface ToastNotificationProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onClose }) => {
  return (
    <div 
      id="non-blocking-toasts-container"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          // Determine colors & icons based on toast type
          let bgClass = "bg-slate-900/95 border-slate-800";
          let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;

          if (toast.type === "success") {
            bgClass = "bg-[#0B201B]/95 border-emerald-950/80 shadow-emerald-950/20";
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          } else if (toast.type === "error") {
            bgClass = "bg-[#251214]/95 border-red-950/80 shadow-red-950/20";
            icon = <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />;
          } else if (toast.type === "warning") {
            bgClass = "bg-[#241C0F]/95 border-amber-950/80 shadow-amber-950/20";
            icon = <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />;
          } else if (toast.type === "syncing") {
            bgClass = "bg-[#0E1A2B]/95 border-blue-950/80 shadow-blue-950/20";
            icon = <Loader2 className="w-5 h-5 text-blue-400 shrink-0 animate-spin" />;
          }

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.15 } }}
              className={`pointer-events-auto w-full p-4 rounded-xl border shadow-lg flex gap-3.5 items-start justify-between backdrop-blur-md ${bgClass}`}
            >
              <div className="flex gap-3.5 items-start w-full">
                <div className="mt-0.5">{icon}</div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                    {toast.title}
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-normal font-medium">
                    {toast.message}
                  </p>
                  
                  {toast.link && (
                    <div className="pt-2">
                      <a
                        href={toast.link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-wider transition-colors"
                      >
                        {toast.link.label}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onClose(toast.id)}
                className="text-slate-500 hover:text-slate-300 p-1 rounded transition-colors shrink-0"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
