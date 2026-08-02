import React, { useState, useEffect } from "react";
import { Filter, Plus, Trash2, ArrowUp, ArrowDown, Sparkles, Check, Play, RefreshCw, Layers, Copy, HelpCircle, Code, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface VisualFilterBlock {
  id: string;
  field: "project" | "status" | "issuetype" | "priority" | "assignee" | "sprint" | "created";
  operator: "=" | "IN" | "!=" | ">=" | "<=";
  values: string[];
  logicalConnector: "AND" | "OR";
}

interface JqlVisualBuilderProps {
  initialJql?: string;
  onApplyJql: (jqlQuery: string) => void;
  availableProjects?: string[];
  theme?: "dark" | "light";
}

const FIELD_OPTIONS = [
  { value: "project", label: "Project Key", options: ["DEMO", "PROJ", "CORE", "FE", "BE", "MOBILE"] },
  { value: "status", label: "Workflow Status", options: ["To Do", "In Progress", "In Review", "Done", "Blocked"] },
  { value: "issuetype", label: "Issue Type", options: ["Story", "Bug", "Task", "Epic", "Sub-task"] },
  { value: "priority", label: "Priority", options: ["Highest", "High", "Medium", "Low", "Lowest"] },
  { value: "assignee", label: "Assignee", options: ["currentUser()", "unassigned", "Alice", "Bob", "Charlie"] },
  { value: "sprint", label: "Sprint Name", options: ["Sprint 42", "Sprint 43", "Sprint 44", "Active Sprint"] },
  { value: "created", label: "Created Date", options: ["-30d", "-14d", "-7d", "2026-01-01"] },
];

const QUICK_PRESETS = [
  {
    name: "Active Sprint Stories & Bugs",
    blocks: [
      { id: "b1", field: "sprint" as const, operator: "=" as const, values: ["Active Sprint"], logicalConnector: "AND" as const },
      { id: "b2", field: "issuetype" as const, operator: "IN" as const, values: ["Story", "Bug"], logicalConnector: "AND" as const },
      { id: "b3", field: "status" as const, operator: "!=" as const, values: ["Done"], logicalConnector: "AND" as const },
    ],
  },
  {
    name: "Critical Blocked Impediments",
    blocks: [
      { id: "b1", field: "priority" as const, operator: "IN" as const, values: ["Highest", "High"], logicalConnector: "AND" as const },
      { id: "b2", field: "status" as const, operator: "=" as const, values: ["Blocked"], logicalConnector: "AND" as const },
    ],
  },
  {
    name: "My Unresolved Tasks",
    blocks: [
      { id: "b1", field: "assignee" as const, operator: "=" as const, values: ["currentUser()"], logicalConnector: "AND" as const },
      { id: "b2", field: "status" as const, operator: "!=" as const, values: ["Done"], logicalConnector: "AND" as const },
    ],
  },
];

export const JqlVisualBuilder: React.FC<JqlVisualBuilderProps> = ({
  onApplyJql,
  availableProjects = ["DEMO", "PROJ"],
  theme = "dark",
}) => {
  const isLight = theme === "light";
  const [blocks, setBlocks] = useState<VisualFilterBlock[]>([
    { id: "init-1", field: "project", operator: "=", values: [availableProjects[0] || "DEMO"], logicalConnector: "AND" },
    { id: "init-2", field: "status", operator: "IN", values: ["To Do", "In Progress", "Blocked"], logicalConnector: "AND" },
  ]);

  const [orderBy, setOrderBy] = useState<string>("created DESC");
  const [copied, setCopied] = useState(false);

  // Compile visual blocks into standard valid JQL syntax
  const compiledJql = React.useMemo(() => {
    if (blocks.length === 0) return `ORDER BY ${orderBy}`;

    const parts = blocks.map((block) => {
      const fieldName = block.field;
      const op = block.operator;
      const vals = block.values;

      if (vals.length === 0) return "";

      if (op === "IN" || vals.length > 1) {
        const formattedVals = vals.map((v) => (v === "currentUser()" || v === "unassigned" ? v : `"${v}"`)).join(", ");
        return `${fieldName} IN (${formattedVals})`;
      } else {
        const singleVal = vals[0];
        const formattedVal = singleVal === "currentUser()" || singleVal === "unassigned" || singleVal.startsWith("-") ? singleVal : `"${singleVal}"`;
        return `${fieldName} ${op} ${formattedVal}`;
      }
    }).filter(Boolean);

    if (parts.length === 0) return `ORDER BY ${orderBy}`;

    let expression = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const connector = blocks[i].logicalConnector || "AND";
      expression += ` ${connector} ${parts[i]}`;
    }

    return `${expression} ORDER BY ${orderBy}`;
  }, [blocks, orderBy]);

  const addBlock = () => {
    const newBlock: VisualFilterBlock = {
      id: `block-${Date.now()}`,
      field: "issuetype",
      operator: "=",
      values: ["Bug"],
      logicalConnector: "AND",
    };
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const updateBlock = (id: string, updates: Partial<VisualFilterBlock>) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setBlocks(updated);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(compiledJql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="jql-visual-builder-card"
      className={`rounded-2xl p-5 border transition-all duration-300 shadow-xl ${
        isLight
          ? "bg-white border-slate-200 text-slate-800"
          : "bg-slate-900/40 backdrop-blur-xl border-white/10 text-slate-200"
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              Visual No-Code JQL Query Builder
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Visually stack filter criteria blocks with logical AND/OR connectors to auto-generate JQL
            </p>
          </div>
        </div>

        {/* Quick Preset Templates */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mr-1">
            Presets:
          </span>
          {QUICK_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setBlocks(p.blocks)}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 border border-white/10 transition-all cursor-pointer"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Filter Blocks Stack */}
      <div className="space-y-3 mb-4">
        <AnimatePresence>
          {blocks.map((block, index) => {
            const fieldOpt = FIELD_OPTIONS.find((f) => f.value === block.field) || FIELD_OPTIONS[0];

            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3.5 rounded-xl border relative flex flex-col md:flex-row items-stretch md:items-center gap-3 ${
                  isLight
                    ? "bg-slate-50 border-slate-200"
                    : "bg-slate-950/60 border-white/10 hover:border-blue-500/30"
                }`}
              >
                {/* Connector Badge for blocks after index 0 */}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateBlock(block.id, {
                        logicalConnector: block.logicalConnector === "AND" ? "OR" : "AND",
                      })
                    }
                    className="self-start md:self-center text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-all cursor-pointer shrink-0"
                    title="Click to toggle between AND / OR"
                  >
                    {block.logicalConnector}
                  </button>
                )}

                {/* Field Selector */}
                <div className="flex-1 min-w-[130px]">
                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                    Filter Criteria Field
                  </label>
                  <select
                    value={block.field}
                    onChange={(e) => {
                      const newField = e.target.value as any;
                      const newOpt = FIELD_OPTIONS.find((f) => f.value === newField);
                      updateBlock(block.id, {
                        field: newField,
                        values: newOpt ? [newOpt.options[0]] : ["DEMO"],
                      });
                    }}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg text-xs font-bold text-white px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
                  >
                    {FIELD_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operator Selector */}
                <div className="w-24">
                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                    Operator
                  </label>
                  <select
                    value={block.operator}
                    onChange={(e) => updateBlock(block.id, { operator: e.target.value as any })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg text-xs font-mono font-black text-blue-400 px-2 py-1.5 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="=">=</option>
                    <option value="IN">IN</option>
                    <option value="!=">!=</option>
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                  </select>
                </div>

                {/* Value Selection or Custom Value Input */}
                <div className="flex-2 min-w-[180px]">
                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                    Target Values
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {fieldOpt.options.map((optVal) => {
                      const isSelected = block.values.includes(optVal);
                      return (
                        <button
                          key={optVal}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (block.values.length > 1) {
                                updateBlock(block.id, {
                                  values: block.values.filter((v) => v !== optVal),
                                });
                              }
                            } else {
                              if (block.operator === "IN") {
                                updateBlock(block.id, { values: [...block.values, optVal] });
                              } else {
                                updateBlock(block.id, { values: [optVal] });
                              }
                            }
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-400 shadow-sm"
                              : "bg-slate-900 text-slate-400 border-white/10 hover:text-slate-200"
                          }`}
                        >
                          {optVal}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Block Ordering & Delete Controls */}
                <div className="flex items-center gap-1 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                  <button
                    type="button"
                    onClick={() => moveBlock(index, "up")}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 border border-white/10 cursor-pointer"
                    title="Move block up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(index, "down")}
                    disabled={index === blocks.length - 1}
                    className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 border border-white/10 cursor-pointer"
                    title="Move block down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer ml-1"
                    title="Remove filter block"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add Filter Block Button */}
        <button
          type="button"
          onClick={addBlock}
          className="w-full py-2.5 border-2 border-dashed border-white/15 hover:border-blue-500/40 rounded-xl text-xs font-bold text-slate-400 hover:text-blue-300 flex items-center justify-center gap-2 transition-all cursor-pointer bg-slate-950/20"
        >
          <Plus className="w-4 h-4 text-blue-400" />
          <span>Add Filter Criteria Block</span>
        </button>
      </div>

      {/* Generated Live JQL Preview & Execution Bar */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-blue-500/20 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5" /> Live Compiled JQL Syntax
          </span>
          <div className="flex items-center gap-2">
            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
              className="bg-slate-900 text-[10px] font-mono text-slate-300 border border-white/10 rounded px-2 py-0.5"
            >
              <option value="created DESC">ORDER BY created DESC</option>
              <option value="priority DESC">ORDER BY priority DESC</option>
              <option value="storyPoints DESC">ORDER BY storyPoints DESC</option>
              <option value="updated DESC">ORDER BY updated DESC</option>
            </select>
            <button
              type="button"
              onClick={copyToClipboard}
              className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-white/10 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="font-mono text-xs text-emerald-300 font-bold bg-slate-900/80 p-2.5 rounded-lg border border-white/10 break-all select-all">
          {compiledJql}
        </div>

        <button
          type="button"
          onClick={() => onApplyJql(compiledJql)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Play className="w-4 h-4 text-white fill-white" />
          <span>Apply JQL & Fetch Live Dashboard Report</span>
        </button>
      </div>
    </div>
  );
};
