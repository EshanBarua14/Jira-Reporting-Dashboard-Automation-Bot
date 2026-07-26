import React, { useState, useEffect, useRef } from "react";
import { 
  Code, Sparkles, Check, AlertCircle, Play, RotateCcw, Copy, HelpCircle, ChevronDown, Terminal
} from "lucide-react";

interface JqlBuilderProps {
  initialJql?: string;
  onApplyJql?: (jql: string) => void;
  availableProjects?: { key: string; name: string }[];
  availableIssueTypes?: string[];
  availableStatuses?: string[];
  selectedProjects?: string[];
  selectedIssueTypes?: string[];
  selectedStatuses?: string[];
  selectedSprint?: string;
  createdDateStart?: string;
  createdDateEnd?: string;
  addToast?: (title: string, message: string, type?: "info" | "success" | "warning" | "error", duration?: number) => void;
}

const JQL_KEYWORDS = [
  "project", "status", "issuetype", "assignee", "reporter", "sprint", 
  "priority", "created", "updated", "duedate", "resolution", "labels", 
  "components", "AND", "OR", "NOT", "IN", "NOT IN", "ORDER BY", "ASC", 
  "DESC", "WAS", "CHANGED", "is", "EMPTY", "now()"
];

const JQL_OPERATORS = ["=", "!=", ">", "<", ">=", "<=", "~", "!~"];

export const JqlBuilder: React.FC<JqlBuilderProps> = ({
  initialJql = "",
  onApplyJql,
  availableProjects = [],
  availableIssueTypes = [],
  availableStatuses = [],
  selectedProjects = [],
  selectedIssueTypes = [],
  selectedStatuses = [],
  selectedSprint = "",
  createdDateStart = "",
  createdDateEnd = "",
  addToast,
}) => {
  const [jqlQuery, setJqlQuery] = useState(initialJql);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState("");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initial JQL when prop changes
  useEffect(() => {
    if (initialJql) {
      setJqlQuery(initialJql);
    }
  }, [initialJql]);

  // Generate JQL string from form parameters
  const generateJqlFromForm = () => {
    const parts: string[] = [];

    if (selectedProjects && selectedProjects.length > 0) {
      if (selectedProjects.length === 1) {
        parts.push(`project = "${selectedProjects[0]}"`);
      } else {
        parts.push(`project IN (${selectedProjects.map((p) => `"${p}"`).join(", ")})`);
      }
    }

    if (selectedIssueTypes && selectedIssueTypes.length > 0 && selectedIssueTypes.length < availableIssueTypes.length) {
      if (selectedIssueTypes.length === 1) {
        parts.push(`issuetype = "${selectedIssueTypes[0]}"`);
      } else {
        parts.push(`issuetype IN (${selectedIssueTypes.map((t) => `"${t}"`).join(", ")})`);
      }
    }

    if (selectedStatuses && selectedStatuses.length > 0 && selectedStatuses.length < availableStatuses.length) {
      if (selectedStatuses.length === 1) {
        parts.push(`status = "${selectedStatuses[0]}"`);
      } else {
        parts.push(`status IN (${selectedStatuses.map((s) => `"${s}"`).join(", ")})`);
      }
    }

    if (selectedSprint) {
      parts.push(`sprint = "${selectedSprint}"`);
    }

    if (createdDateStart) {
      parts.push(`created >= "${createdDateStart}"`);
    }

    if (createdDateEnd) {
      parts.push(`created <= "${createdDateEnd}"`);
    }

    const generated = parts.length > 0 ? parts.join(" AND ") + " ORDER BY created DESC" : "ORDER BY created DESC";
    setJqlQuery(generated);
    addToast?.("JQL Generated", "Constructed manual JQL string from current scope form inputs.", "info", 2500);
  };

  // Syntax validation checker
  const validateJql = (query: string) => {
    if (!query.trim()) return { isValid: true, warning: "Empty JQL query." };

    // Check for unmatched quotes
    const quoteCount = (query.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      return { isValid: false, warning: "Syntax Error: Unmatched string quote (\")." };
    }

    // Check for unmatched parentheses
    const openParen = (query.match(/\(/g) || []).length;
    const closeParen = (query.match(/\)/g) || []).length;
    if (openParen !== closeParen) {
      return { isValid: false, warning: "Syntax Error: Unmatched parentheses." };
    }

    return { isValid: true, warning: null };
  };

  const validation = validateJql(jqlQuery);

  // Insert token at cursor
  const insertToken = (token: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const textBefore = jqlQuery.substring(0, start);
    const textAfter = jqlQuery.substring(end);

    const needsSpace = textBefore.length > 0 && !textBefore.endsWith(" ");
    const inserted = `${needsSpace ? " " : ""}${token} `;
    
    const newQuery = textBefore + inserted + textAfter;
    setJqlQuery(newQuery);
    setShowSuggestions(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + inserted.length, start + inserted.length);
      }
    }, 50);
  };

  // Copy query
  const handleCopyJql = () => {
    navigator.clipboard.writeText(jqlQuery);
    setCopied(true);
    addToast?.("JQL Copied", "JQL statement copied to clipboard.", "success", 2000);
    setTimeout(() => setCopied(false), 2000);
  };

  // Apply query
  const handleApply = () => {
    if (onApplyJql) {
      onApplyJql(jqlQuery);
      addToast?.("JQL Query Applied", "Updated report query execution statement.", "success", 3000);
    }
  };

  // Format JQL display with syntax color coding
  const renderHighlightedJql = () => {
    if (!jqlQuery) return <span className="text-slate-600 italic">Enter manual JQL statement or auto-generate...</span>;

    const words = jqlQuery.split(/(\s+|[=!<>~(),])/);
    return words.map((word, idx) => {
      const trimmed = word.trim();
      const upper = trimmed.toUpperCase();

      if (JQL_KEYWORDS.map(k => k.toUpperCase()).includes(upper)) {
        return <span key={idx} className="text-blue-400 font-black">{word}</span>;
      }
      if (JQL_OPERATORS.includes(trimmed)) {
        return <span key={idx} className="text-amber-400 font-extrabold">{word}</span>;
      }
      if (word.startsWith('"') || word.endsWith('"')) {
        return <span key={idx} className="text-emerald-300 font-semibold">{word}</span>;
      }
      if (["(", ")", ","].includes(trimmed)) {
        return <span key={idx} className="text-purple-400 font-bold">{word}</span>;
      }
      return <span key={idx} className="text-slate-200">{word}</span>;
    });
  };

  // Autocomplete suggestion list candidates
  const suggestionList = [
    ...JQL_KEYWORDS.map(k => ({ type: "keyword", label: k })),
    ...availableProjects.map(p => ({ type: "project", label: `project = "${p.key}"` })),
    ...availableIssueTypes.map(t => ({ type: "type", label: `issuetype = "${t}"` })),
    ...availableStatuses.map(s => ({ type: "status", label: `status = "${s}"` })),
  ].filter(item => !suggestionFilter || item.label.toLowerCase().includes(suggestionFilter.toLowerCase()));

  return (
    <div className="bg-slate-950/80 border border-indigo-500/20 rounded-xl p-4 space-y-3 font-sans relative">
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Advanced JQL Builder & Syntax Highlighter
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {validation.isValid ? (
            <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Check className="w-3 h-3" /> Valid JQL
            </span>
          ) : (
            <span className="text-[9px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Syntax Issue
            </span>
          )}
        </div>
      </div>

      {/* Code Highlighted Display View */}
      <div className="bg-slate-900 border border-white/10 rounded-lg p-3 font-mono text-xs leading-relaxed min-h-[50px] whitespace-pre-wrap break-all shadow-inner">
        {renderHighlightedJql()}
      </div>

      {/* Editor Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={jqlQuery}
          onChange={(e) => {
            setJqlQuery(e.target.value);
            setSuggestionFilter(e.target.value.split(" ").pop() || "");
          }}
          placeholder='e.g., project = "DEMO" AND status IN ("In Progress", "Blocked") ORDER BY created DESC'
          rows={3}
          className="w-full bg-slate-900/90 border border-white/10 rounded-lg p-3 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-y"
        />

        {/* Suggestion Popover Toggle */}
        <div className="absolute right-2.5 bottom-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-[10px] font-bold bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-300 border border-indigo-500/30 rounded-md px-2 py-1 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Autocomplete
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Validation warning if invalid */}
      {!validation.isValid && (
        <p className="text-[10px] font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {validation.warning}
        </p>
      )}

      {/* Autocomplete Tokens Menu */}
      {showSuggestions && (
        <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3 space-y-2 shadow-xl animate-fade-in max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider pb-1 border-b border-white/5">
            <span>Quick Insert Autocomplete Tokens</span>
            <button
              type="button"
              onClick={() => setShowSuggestions(false)}
              className="text-slate-500 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestionList.slice(0, 24).map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => insertToken(s.label)}
                className={`text-[10px] font-mono px-2 py-1 rounded-md border transition-all cursor-pointer ${
                  s.type === "keyword"
                    ? "bg-blue-500/10 text-blue-300 border-blue-500/20 hover:bg-blue-500/20"
                    : s.type === "project"
                    ? "bg-purple-500/10 text-purple-300 border-purple-500/20 hover:bg-purple-500/20"
                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={generateJqlFromForm}
          className="text-[10px] font-extrabold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
          Sync JQL from Scope Form
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyJql}
            className="text-[10px] font-extrabold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            Copy JQL
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="text-[10px] font-black bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 rounded-lg px-3.5 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Play className="w-3.5 h-3.5" />
            Apply Custom JQL Query
          </button>
        </div>
      </div>
    </div>
  );
};
