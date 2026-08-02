import React, { useState, useEffect } from "react";
import { Keyboard, ChevronRight, ChevronLeft, Sparkles, X, Command } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ShortcutHint {
  keyCombo: string;
  label: string;
  category: string;
}

const SHORTCUTS: ShortcutHint[] = [
  { keyCombo: "Ctrl + K", label: "Quick JQL Builder", category: "Navigation" },
  { keyCombo: "Ctrl + G", label: "Generate Live Report", category: "Actions" },
  { keyCombo: "Ctrl + Q", label: "Quick AI Summary", category: "AI Tools" },
  { keyCombo: "Ctrl + D", label: "Diagnostic Console", category: "Diagnostics" },
  { keyCombo: "Ctrl + E", label: "Export PDF/CSV", category: "Reporting" },
  { keyCombo: "Ctrl + P", label: "Print Friendly View", category: "Reporting" },
  { keyCombo: "Ctrl + Shift + S", label: "Saved Presets", category: "Presets" },
];

export const KeyboardHintWidget: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isPaused || isOpen) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SHORTCUTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, isOpen]);

  const currentShortcut = SHORTCUTS[currentIndex];

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end pointer-events-none select-none">
      {/* Expanded Shortcuts Popover Cheat Sheet */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto mb-3 w-80 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-xl p-4 text-slate-200 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Keyboard Shortcuts</h4>
                  <p className="text-[10px] text-slate-400">OmniSync Productivity Hints</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {SHORTCUTS.map((s, idx) => (
                <div
                  key={s.keyCombo}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-colors ${
                    idx === currentIndex
                      ? "bg-blue-600/20 border-blue-500/40 text-blue-200"
                      : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <span className="font-medium">{s.label}</span>
                  <kbd className="px-2 py-0.5 rounded-md bg-slate-950 border border-white/15 font-mono text-[10px] text-blue-300 shadow-inner">
                    {s.keyCombo}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Command className="w-3 h-3 text-blue-400" /> Mac uses ⌘ instead of Ctrl
              </span>
              <span className="text-slate-500 font-mono">7 Shortcuts</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Pill Widget */}
      <motion.div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 hover:bg-slate-900 border border-white/15 hover:border-blue-500/40 rounded-full px-3 py-1.5 shadow-2xl backdrop-blur-md text-xs text-slate-300 transition-all duration-200"
      >
        {/* Explicit 'Show Shortcuts' Floating Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Show Shortcuts Cheat Sheet"
          aria-expanded={isOpen}
          className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-full shadow-2xl flex items-center gap-2 border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Keyboard className="w-4 h-4 text-white animate-pulse" aria-hidden="true" />
          <span>Show Shortcuts</span>
          <span className="bg-black/30 text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/20">Ctrl+/</span>
        </button>

        {/* Next / Prev Controls */}
        <div className="flex items-center gap-0.5 border-l border-white/10 pl-1.5 ml-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev - 1 + SHORTCUTS.length) % SHORTCUTS.length);
            }}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
            title="Previous shortcut"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev + 1) % SHORTCUTS.length);
            }}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
            title="Next shortcut"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
