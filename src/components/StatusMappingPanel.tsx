import React, { useState, useEffect, useRef } from "react";
import { GitCompare, Plus, Palette, CheckSquare, Layers, Download, AlertTriangle, ArrowUpDown, Sliders, History, Sparkles, Upload, Info, Search, Filter } from "lucide-react";
import { StatusMapping, JiraIssue } from "../types";

interface StatusMappingPanelProps {
  detectedStatuses: string[];
  mapping: StatusMapping;
  onUpdateMapping: (newMapping: StatusMapping) => void;
  categoryColors: {
    "To Do": string;
    "In Progress": string;
    "Done": string;
    "Blocked": string;
  };
  onUpdateCategoryColors: (newColors: {
    "To Do": string;
    "In Progress": string;
    "Done": string;
    "Blocked": string;
  }) => void;
  issues?: JiraIssue[];
  addToast?: (title: string, message: string, type: "success" | "info" | "warning" | "error", duration?: number) => void;
}

const PALETTE_PRESETS = [
  "#64748b", // Slate
  "#3b82f6", // Blue
  "#10b981", // Emerald Green
  "#ef4444", // Rose Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#6366f1", // Indigo
  "#a855f7", // Purple
];

const TEMPLATE_DEFINITIONS = {
  kanban: {
    name: "Kanban Standard",
    description: "Designed for continuous delivery. Maps 'In Review' and 'QA Testing' as 'In Progress'.",
    mapping: {
      "Backlog": "To Do",
      "To Do": "To Do",
      "In Progress": "In Progress",
      "In Review": "In Progress",
      "QA Testing": "In Progress",
      "Blocked": "Blocked",
      "Done": "Done",
      "Resolved": "Done",
    } as Record<string, "To Do" | "In Progress" | "Done" | "Blocked">
  },
  scrum: {
    name: "Scrum Classic",
    description: "Standard sprint iterations. Maps 'QA Testing' as 'Blocked' to reflect sprint hardening constraints, and 'Backlog' as 'To Do'.",
    mapping: {
      "Backlog": "To Do",
      "To Do": "To Do",
      "In Progress": "In Progress",
      "In Review": "In Progress",
      "QA Testing": "Blocked",
      "Blocked": "Blocked",
      "Done": "Done",
      "Resolved": "Done",
    } as Record<string, "To Do" | "In Progress" | "Done" | "Blocked">
  },
  minimalist: {
    name: "Minimalist",
    description: "Stripped-down workflow. Maps all intermediate states ('In Review', 'QA Testing') to 'To Do' to focus strictly on development.",
    mapping: {
      "Backlog": "To Do",
      "To Do": "To Do",
      "In Progress": "In Progress",
      "In Review": "To Do",
      "QA Testing": "To Do",
      "Blocked": "Blocked",
      "Done": "Done",
      "Resolved": "Done",
    } as Record<string, "To Do" | "In Progress" | "Done" | "Blocked">
  }
};

const getCategoryOnDate = (issue: JiraIssue, dateStr: string, mappedCat: "To Do" | "In Progress" | "Done" | "Blocked") => {
  if (issue.created > dateStr) {
    return null; // Not created yet
  }
  
  if (mappedCat === "Done") {
    const completedDate = issue.updated || issue.created;
    if (dateStr >= completedDate) {
      return "Done";
    } else {
      const createdTime = new Date(issue.created).getTime();
      const completedTime = new Date(completedDate).getTime();
      const midTime = createdTime + (completedTime - createdTime) / 2;
      const dateTime = new Date(dateStr).getTime();
      return dateTime >= midTime ? "In Progress" : "To Do";
    }
  }
  
  if (mappedCat === "Blocked") {
    const updatedDate = issue.updated || issue.created;
    if (dateStr >= updatedDate) {
      return "Blocked";
    } else {
      return "In Progress";
    }
  }
  
  if (mappedCat === "In Progress") {
    const createdTime = new Date(issue.created).getTime();
    const dateTime = new Date(dateStr).getTime();
    const duration = 2 * 24 * 60 * 60 * 1000; // 2 days
    return (dateTime >= createdTime + duration) ? "In Progress" : "To Do";
  }
  
  return "To Do";
};

interface DoughnutChartProps {
  data: {
    "To Do": number;
    "In Progress": number;
    "Done": number;
    "Blocked": number;
  };
  colors: {
    "To Do": string;
    "In Progress": string;
    "Done": string;
    "Blocked": string;
  };
}

export const DoughnutChart: React.FC<DoughnutChartProps> = ({ data, colors }) => {
  const total = data["To Do"] + data["In Progress"] + data["Done"] + data["Blocked"];
  
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-slate-950/20 border border-white/5 rounded-xl h-[120px]">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">No issue data mapped</span>
      </div>
    );
  }

  let cumulativePercent = 0;

  const segments = (["To Do", "In Progress", "Done", "Blocked"] as const).map((category) => {
    const value = data[category];
    const percent = total > 0 ? value / total : 0;
    const strokeDasharray = `${percent * 100} ${100 - (percent * 100)}`;
    const strokeDashoffset = 100 - cumulativePercent + 25; // start at top (12 o'clock)
    cumulativePercent += percent * 100;

    return {
      category,
      value,
      percent,
      color: colors[category],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-center gap-6 shadow-sm">
      <div className="relative w-28 h-28 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="3.5"
          />
          {segments.map((seg) => {
            if (seg.value === 0) return null;
            return (
              <circle
                key={seg.category}
                cx="18"
                cy="18"
                r="15.915"
                fill="transparent"
                stroke={seg.color}
                strokeWidth="3.5"
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 hover:stroke-[4.5]"
                style={{
                  transformOrigin: "center",
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
          <span className="text-base font-black text-white font-mono leading-none">{total}</span>
        </div>
      </div>

      <div className="flex-1 w-full grid grid-cols-2 gap-2">
        {segments.map((seg) => (
          <div key={seg.category} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/30 border border-white/[0.02]">
            <span 
              className="w-2.5 h-2.5 rounded-full shrink-0" 
              style={{ backgroundColor: seg.color, boxShadow: `0 0 6px ${seg.color}50` }} 
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black text-slate-400 truncate uppercase tracking-wider">{seg.category}</span>
              <span className="text-[11px] font-black text-slate-200 font-mono">
                {seg.value} <span className="text-[9px] text-slate-500 font-bold">({Math.round(seg.percent * 100)}%)</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const StatusMappingPanel: React.FC<StatusMappingPanelProps> = ({
  detectedStatuses,
  mapping,
  onUpdateMapping,
  categoryColors,
  onUpdateCategoryColors,
  issues = [],
  addToast,
}) => {
  const [customStatusName, setCustomStatusName] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("");
  const [history, setHistory] = useState<StatusMapping[]>([]);
  
  const [sortBy, setSortBy] = useState<"statusName" | "categoryName" | "issueCount">("statusName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [alertThreshold, setAlertThreshold] = useState<number>(1.5);

  // Advanced Interactive & Audit Logging State definitions
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProgressBlocked, setFilterProgressBlocked] = useState(false);
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [swapSourceCat, setSwapSourceCat] = useState<"To Do" | "In Progress" | "Done" | "Blocked">("To Do");
  const [swapTargetCat, setSwapTargetCat] = useState<"To Do" | "In Progress" | "Done" | "Blocked">("In Progress");
  const [hoveredPoint, setHoveredPoint] = useState<{
    bucket: string;
    idx: number;
    val: number;
    date: string;
    x: number;
    y: number;
  } | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  interface AuditLogEntry {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    details: string;
  }

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem("jira_status_map_audit_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved audit logs:", e);
      }
    }
    return [
      {
        id: "initial",
        timestamp: new Date("2026-07-17T12:00:00").toLocaleString(),
        user: "System Admin",
        action: "Initialized",
        details: "Initial baseline status mappings configured."
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("jira_status_map_audit_history", JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addAuditLog = (action: string, details: string) => {
    const newEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleString(),
      user: "Current User",
      action,
      details
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const toggleSort = (field: "statusName" | "categoryName" | "issueCount") => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const pushToHistory = (currentMapping: StatusMapping) => {
    setHistory((prev) => [...prev, { ...currentMapping }]);
  };

  const handleRevert = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    onUpdateMapping(previous);
    addToast?.("Changes Reverted", "Successfully restored the previous status mapping state.", "info", 2000);
    addAuditLog("Revert Change", "Reverted last status mapping update to restore previous configuration.");
  };

  const handleExportMappingJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mapping, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Jira_Status_Mapping_Config_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast?.("Configuration Exported", "Successfully downloaded status mappings as JSON.", "success", 2500);
    addAuditLog("Export Configuration", "Exported current status mappings as JSON backup file.");
  };

  const handleExportMappingCSV = () => {
    let csvContent = "Status,Category\n";
    Object.entries(mapping).forEach(([status, category]) => {
      const safeStatus = status.replace(/"/g, '""');
      const safeCategory = String(category).replace(/"/g, '""');
      csvContent += `"${safeStatus}","${safeCategory}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `Jira_Status_Mapping_Template_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast?.("Configuration Exported", "Successfully downloaded status mapping CSV template.", "success", 2500);
    addAuditLog("Export Configuration", "Exported current status mappings as standard CSV template.");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        let importedMapping: Record<string, "To Do" | "In Progress" | "Done" | "Blocked"> = {};
        const isCSV = file.name.endsWith(".csv");

        if (isCSV) {
          const lines = text.split(/\r?\n/);
          if (lines.length <= 1) {
            addToast?.("Import Error", "CSV file appears to be empty.", "error", 3000);
            return;
          }

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const row: string[] = [];
            let inQuotes = false;
            let currentVal = "";

            for (let c = 0; c < line.length; c++) {
              const char = line[c];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                row.push(currentVal.trim());
                currentVal = "";
              } else {
                currentVal += char;
              }
            }
            row.push(currentVal.trim());

            if (row.length >= 2) {
              const statusName = row[0].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
              const categoryName = row[1].replace(/^"|"$/g, '').replace(/""/g, '"').trim();

              if (["To Do", "In Progress", "Done", "Blocked"].includes(categoryName)) {
                importedMapping[statusName] = categoryName as any;
              }
            }
          }
        } else {
          const parsed = JSON.parse(text);
          Object.entries(parsed).forEach(([key, value]) => {
            if (typeof key === "string" && ["To Do", "In Progress", "Done", "Blocked"].includes(value as string)) {
              importedMapping[key] = value as any;
            }
          });
        }

        const keysCount = Object.keys(importedMapping).length;
        if (keysCount === 0) {
          addToast?.("Import Failed", "No valid status mapping configuration found in the uploaded file.", "error", 4000);
          return;
        }

        pushToHistory(mapping);
        onUpdateMapping({
          ...mapping,
          ...importedMapping,
        });

        addToast?.(
          "Mapping Configuration Imported",
          `Successfully loaded ${keysCount} status mappings from ${file.name}.`,
          "success",
          4000
        );

        addAuditLog(
          "Import Configuration",
          `Imported status mapping configuration from file "${file.name}" containing ${keysCount} mapped statuses.`
        );
      } catch (err: any) {
        console.error("Import file error:", err);
        addToast?.("Import Failed", `Failed to parse file: ${err.message}`, "error", 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleMapChange = (statusName: string, bucket: "To Do" | "In Progress" | "Done" | "Blocked") => {
    const prevCategory = mapping[statusName] || "To Do";
    pushToHistory(mapping);
    onUpdateMapping({
      ...mapping,
      [statusName]: bucket,
    });
    setSelectedTemplateKey(""); // Reset template key since they customized
    addAuditLog(
      "Single Mapping Update",
      `Status "${statusName}" changed from "${prevCategory}" to "${bucket}".`
    );
  };

  const handleAddCustomStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = customStatusName.trim();
    if (!cleanName) return;

    pushToHistory(mapping);
    onUpdateMapping({
      ...mapping,
      [cleanName]: mapping[cleanName] || "To Do",
    });
    setCustomStatusName("");
    addToast?.("Status Registered", `Successfully added custom status '${cleanName}'.`, "success", 2000);
    addAuditLog(
      "Add Custom Status",
      `Added custom status "${cleanName}" mapped to "To Do" default.`
    );
  };

  const handleColorChange = (bucket: "To Do" | "In Progress" | "Done" | "Blocked", color: string) => {
    onUpdateCategoryColors({
      ...categoryColors,
      [bucket]: color,
    });
  };

  const activeStatuses = Array.from(new Set([...detectedStatuses, ...Object.keys(mapping)]));

  const handleLoadTemplate = (templateKey: keyof typeof TEMPLATE_DEFINITIONS) => {
    setSelectedTemplateKey(templateKey);
    const template = TEMPLATE_DEFINITIONS[templateKey];
    if (!template) return;

    pushToHistory(mapping);

    const newMapping: StatusMapping = {};
    activeStatuses.forEach((status) => {
      if (template.mapping[status]) {
        newMapping[status] = template.mapping[status];
        return;
      }

      const lower = status.toLowerCase();
      if (lower.includes("done") || lower.includes("resolved") || lower.includes("closed") || lower.includes("complete") || lower.includes("released")) {
        newMapping[status] = "Done";
      } else if (lower.includes("block") || lower.includes("hold") || lower.includes("impediment")) {
        newMapping[status] = "Blocked";
      } else if (lower.includes("progress") || lower.includes("dev") || lower.includes("review") || lower.includes("testing") || lower.includes("qa") || lower.includes("verify")) {
        if (templateKey === "scrum" && (lower.includes("qa") || lower.includes("testing"))) {
          newMapping[status] = "Blocked";
        } else {
          newMapping[status] = "In Progress";
        }
      } else {
        newMapping[status] = "To Do";
      }
    });

    onUpdateMapping(newMapping);
    setSelectedStatuses([]); // clear bulk selection
    addToast?.("Template Loaded", `Loaded '${template.name}' status mapping template.`, "success", 2500);
    addAuditLog(
      "Load Template",
      `Loaded template "${template.name}" mapping configuration for active statuses.`
    );
  };

  const handleBulkApply = (category: "To Do" | "In Progress" | "Done" | "Blocked") => {
    if (selectedStatuses.length === 0) return;
    pushToHistory(mapping);
    const newMapping = { ...mapping };
    selectedStatuses.forEach((status) => {
      newMapping[status] = category;
    });
    onUpdateMapping(newMapping);
    addToast?.(
      "Bulk Applied Successfully",
      `Assigned ${selectedStatuses.length} workflow statuses to '${category}'.`,
      "success",
      2500
    );
    addAuditLog(
      "Bulk Assignment",
      `Assigned ${selectedStatuses.length} statuses (${selectedStatuses.join(", ")}) to "${category}".`
    );
    setSelectedStatuses([]);
    setSelectedTemplateKey("");
  };

  const detectedSwapCategories = React.useMemo(() => {
    if (selectedStatuses.length === 0) return [];
    const cats = new Set<"To Do" | "In Progress" | "Done" | "Blocked">();
    selectedStatuses.forEach((status) => {
      cats.add((mapping[status] || "To Do") as "To Do" | "In Progress" | "Done" | "Blocked");
    });
    return Array.from(cats);
  }, [selectedStatuses, mapping]);

  const handleQuickSwap = (
    catA: "To Do" | "In Progress" | "Done" | "Blocked",
    catB: "To Do" | "In Progress" | "Done" | "Blocked"
  ) => {
    if (selectedStatuses.length === 0) return;
    if (catA === catB) {
      addToast?.("Invalid Swap", "Please select two different categories to swap.", "warning", 2500);
      return;
    }
    pushToHistory(mapping);
    const newMapping = { ...mapping };
    let swapCountA = 0;
    let swapCountB = 0;
    const swappedStatuses: string[] = [];

    selectedStatuses.forEach((status) => {
      const currentCat = (mapping[status] || "To Do") as "To Do" | "In Progress" | "Done" | "Blocked";
      if (currentCat === catA) {
        newMapping[status] = catB;
        swapCountA++;
        swappedStatuses.push(`${status} (${catA} → ${catB})`);
      } else if (currentCat === catB) {
        newMapping[status] = catA;
        swapCountB++;
        swappedStatuses.push(`${status} (${catB} → ${catA})`);
      }
    });

    if (swapCountA === 0 && swapCountB === 0) {
      addToast?.("No Statuses Swapped", `None of the selected statuses belong to '${catA}' or '${catB}'.`, "info", 3000);
      return;
    }

    onUpdateMapping(newMapping);
    addToast?.(
      "Quick Swap Successful",
      `Swapped categories for ${swapCountA + swapCountB} statuses between '${catA}' and '${catB}'.`,
      "success",
      3000
    );
    addAuditLog(
      "Quick Swap",
      `Swapped category assignments between "${catA}" and "${catB}" for selected statuses: ${swappedStatuses.join(", ")}.`
    );
    setSelectedStatuses([]);
    setSelectedTemplateKey("");
  };

  const handleAIAutoMap = async () => {
    if (activeStatuses.length === 0) {
      addToast?.("No Statuses", "There are no active statuses to map.", "warning", 2000);
      return;
    }

    setIsAutoMapping(true);
    addToast?.("AI Auto-Mapping...", "Consulting Gemini AI to intelligently classify Jira status workflows...", "info", 3000);

    try {
      const response = await fetch("/api/gemini/auto-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statuses: activeStatuses.map(s => ({
            name: s,
            description: s === "Backlog" ? "Initial queue for unrefined items" : 
                         s === "In Progress" ? "Active software construction" :
                         s === "Done" ? "Shipped, verified and completed" :
                         s === "Blocked" ? "Impeded by external factors" : ""
          }))
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || "Failed to contact Gemini Auto-Map service.");
      }

      const data = await response.json();
      if (data.suggestions && Array.isArray(data.suggestions)) {
        pushToHistory(mapping);
        const newMapping = { ...mapping };
        
        data.suggestions.forEach((item: any) => {
          if (item.statusName && ["To Do", "In Progress", "Done", "Blocked"].includes(item.category)) {
            newMapping[item.statusName] = item.category;
          }
        });

        onUpdateMapping(newMapping);
        addToast?.(
          "AI Auto-Map Complete",
          `Gemini successfully mapped ${data.suggestions.length} statuses with agile reasoning.`,
          "success",
          5000
        );

        addAuditLog(
          "AI Auto-Map",
          `Agile AI mapping completed. Category assignments auto-configured for ${data.suggestions.length} statuses.`
        );
      } else {
        throw new Error("Invalid suggestions structure received from AI Auto-Map service.");
      }
    } catch (err: any) {
      console.error("AI Auto-Map client error:", err);
      addToast?.(
        "AI Mapping Failed",
        err.message || "An error occurred while running Gemini workflow analysis.",
        "error",
        5000
      );
    } finally {
      setIsAutoMapping(false);
    }
  };

  const issuesDistribution = React.useMemo(() => {
    let targetIssues = issues;
    if (!targetIssues || targetIssues.length === 0) {
      targetIssues = [
        { id: "1", key: "A-1", summary: "Task 1", type: "Task", status: "To Do", mappedStatus: "To Do", priority: "High", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-06-18", updated: "2026-06-25", dueDate: null, storyPoints: 3, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "2", key: "A-2", summary: "Task 2", type: "Story", status: "In Progress", mappedStatus: "In Progress", priority: "Medium", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-06-20", updated: "2026-07-10", dueDate: null, storyPoints: 5, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "3", key: "A-3", summary: "Task 3", type: "Bug", status: "Done", mappedStatus: "Done", priority: "Low", assignee: "Miles Dyson", assigneeId: "2", reporter: "R", created: "2026-06-15", updated: "2026-06-28", dueDate: null, storyPoints: 1, sprint: null, resolution: "Done", timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "4", key: "A-4", summary: "Task 4", type: "Story", status: "In Review", mappedStatus: "In Progress", priority: "High", assignee: "John Connor", assigneeId: "3", reporter: "R", created: "2026-06-25", updated: "2026-07-02", dueDate: null, storyPoints: 8, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "5", key: "A-5", summary: "Task 5", type: "Task", status: "QA Testing", mappedStatus: "In Progress", priority: "Medium", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-06-28", updated: "2026-07-05", dueDate: null, storyPoints: 2, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "6", key: "A-6", summary: "Task 6", type: "Bug", status: "Blocked", mappedStatus: "Blocked", priority: "High", assignee: "Kate Brewster", assigneeId: "5", reporter: "R", created: "2026-06-22", updated: "2026-07-01", dueDate: null, storyPoints: 5, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "7", key: "A-7", summary: "Task 7", type: "Story", status: "Backlog", mappedStatus: "To Do", priority: "Medium", assignee: "Marcus Wright", assigneeId: "4", reporter: "R", created: "2026-06-19", updated: "2026-06-20", dueDate: null, storyPoints: 3, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "8", key: "A-8", summary: "Task 8", type: "Story", status: "Resolved", mappedStatus: "Done", priority: "Low", assignee: "John Connor", assigneeId: "3", reporter: "R", created: "2026-06-24", updated: "2026-07-02", dueDate: null, storyPoints: 5, sprint: null, resolution: "Done", timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "9", key: "A-9", summary: "Task 9", type: "Task", status: "In Progress", mappedStatus: "In Progress", priority: "Medium", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-07-02", updated: "2026-07-08", dueDate: null, storyPoints: 3, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "10", key: "A-10", summary: "Task 10", type: "Story", status: "To Do", mappedStatus: "To Do", priority: "Low", assignee: "Marcus Wright", assigneeId: "4", reporter: "R", created: "2026-07-05", updated: "2026-07-06", dueDate: null, storyPoints: 2, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
      ];
    }

    const counts = {
      "To Do": 0,
      "In Progress": 0,
      "Done": 0,
      "Blocked": 0,
    };

    targetIssues.forEach((issue) => {
      const originalStatus = issue.status;
      const cat = mapping[originalStatus] || "To Do";
      counts[cat]++;
    });

    return counts;
  }, [issues, mapping]);

  // 30 Days Sparkline calculation
  const last30DaysDates = React.useMemo(() => {
    const dates: string[] = [];
    const today = new Date("2026-07-17"); // System mock current date
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }, []);

  const statusCounts = React.useMemo(() => {
    let targetIssues = issues;
    if (!targetIssues || targetIssues.length === 0) {
      targetIssues = [
        { id: "1", key: "A-1", summary: "Task 1", type: "Task", status: "To Do", mappedStatus: "To Do", priority: "High", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-06-18", updated: "2026-06-25", dueDate: null, storyPoints: 3, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "2", key: "A-2", summary: "Task 2", type: "Story", status: "In Progress", mappedStatus: "In Progress", priority: "Medium", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-06-20", updated: "2026-07-10", dueDate: null, storyPoints: 5, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "3", key: "A-3", summary: "Task 3", type: "Bug", status: "Done", mappedStatus: "Done", priority: "Low", assignee: "Miles Dyson", assigneeId: "2", reporter: "R", created: "2026-06-15", updated: "2026-06-28", dueDate: null, storyPoints: 1, sprint: null, resolution: "Done", timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "4", key: "A-4", summary: "Task 4", type: "Story", status: "In Review", mappedStatus: "In Progress", priority: "High", assignee: "John Connor", assigneeId: "3", reporter: "R", created: "2026-06-25", updated: "2026-07-02", dueDate: null, storyPoints: 8, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "5", key: "A-5", summary: "Task 5", type: "Task", status: "QA Testing", mappedStatus: "In Progress", priority: "Medium", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-06-28", updated: "2026-07-05", dueDate: null, storyPoints: 2, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "6", key: "A-6", summary: "Task 6", type: "Bug", status: "Blocked", mappedStatus: "Blocked", priority: "High", assignee: "Kate Brewster", assigneeId: "5", reporter: "R", created: "2026-06-22", updated: "2026-07-01", dueDate: null, storyPoints: 5, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "7", key: "A-7", summary: "Task 7", type: "Story", status: "Backlog", mappedStatus: "To Do", priority: "Medium", assignee: "Marcus Wright", assigneeId: "4", reporter: "R", created: "2026-06-19", updated: "2026-06-20", dueDate: null, storyPoints: 3, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "8", key: "A-8", summary: "Task 8", type: "Story", status: "Resolved", mappedStatus: "Done", priority: "Low", assignee: "John Connor", assigneeId: "3", reporter: "R", created: "2026-06-24", updated: "2026-07-02", dueDate: null, storyPoints: 5, sprint: null, resolution: "Done", timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "9", key: "A-9", summary: "Task 9", type: "Task", status: "In Progress", mappedStatus: "In Progress", priority: "Medium", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-07-02", updated: "2026-07-08", dueDate: null, storyPoints: 3, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "10", key: "A-10", summary: "Task 10", type: "Story", status: "To Do", mappedStatus: "To Do", priority: "Low", assignee: "Marcus Wright", assigneeId: "4", reporter: "R", created: "2026-07-05", updated: "2026-07-06", dueDate: null, storyPoints: 2, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
      ];
    }

    const counts: Record<string, number> = {};
    targetIssues.forEach(issue => {
      counts[issue.status] = (counts[issue.status] || 0) + 1;
    });
    return counts;
  }, [issues]);

  const statusHistory = React.useMemo(() => {
    let targetIssues = issues;
    if (!targetIssues || targetIssues.length === 0) {
      targetIssues = [
        { id: "1", key: "A-1", summary: "Task 1", type: "Task", status: "To Do", mappedStatus: "To Do", priority: "High", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-06-18", updated: "2026-06-25", dueDate: null, storyPoints: 3, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "2", key: "A-2", summary: "Task 2", type: "Story", status: "In Progress", mappedStatus: "In Progress", priority: "Medium", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-06-20", updated: "2026-07-10", dueDate: null, storyPoints: 5, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "3", key: "A-3", summary: "Task 3", type: "Bug", status: "Done", mappedStatus: "Done", priority: "Low", assignee: "Miles Dyson", assigneeId: "2", reporter: "R", created: "2026-06-15", updated: "2026-06-28", dueDate: null, storyPoints: 1, sprint: null, resolution: "Done", timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "4", key: "A-4", summary: "Task 4", type: "Story", status: "In Review", mappedStatus: "In Progress", priority: "High", assignee: "John Connor", assigneeId: "3", reporter: "R", created: "2026-06-25", updated: "2026-07-02", dueDate: null, storyPoints: 8, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "5", key: "A-5", summary: "Task 5", type: "Task", status: "QA Testing", mappedStatus: "In Progress", priority: "Medium", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-06-28", updated: "2026-07-05", dueDate: null, storyPoints: 2, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "6", key: "A-6", summary: "Task 6", type: "Bug", status: "Blocked", mappedStatus: "Blocked", priority: "High", assignee: "Kate Brewster", assigneeId: "5", reporter: "R", created: "2026-06-22", updated: "2026-07-01", dueDate: null, storyPoints: 5, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "7", key: "A-7", summary: "Task 7", type: "Story", status: "Backlog", mappedStatus: "To Do", priority: "Medium", assignee: "Marcus Wright", assigneeId: "4", reporter: "R", created: "2026-06-19", updated: "2026-06-20", dueDate: null, storyPoints: 3, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "8", key: "A-8", summary: "Task 8", type: "Story", status: "Resolved", mappedStatus: "Done", priority: "Low", assignee: "John Connor", assigneeId: "3", reporter: "R", created: "2026-06-24", updated: "2026-07-02", dueDate: null, storyPoints: 5, sprint: null, resolution: "Done", timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "9", key: "A-9", summary: "Task 9", type: "Task", status: "In Progress", mappedStatus: "In Progress", priority: "Medium", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-07-02", updated: "2026-07-08", dueDate: null, storyPoints: 3, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "10", key: "A-10", summary: "Task 10", type: "Story", status: "To Do", mappedStatus: "To Do", priority: "Low", assignee: "Marcus Wright", assigneeId: "4", reporter: "R", created: "2026-07-05", updated: "2026-07-06", dueDate: null, storyPoints: 2, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
      ];
    }

    const historyMap: Record<string, number[]> = {};
    activeStatuses.forEach((status) => {
      historyMap[status] = [];
    });

    last30DaysDates.forEach((dateStr) => {
      const dayCounts: Record<string, number> = {};
      activeStatuses.forEach((status) => {
        dayCounts[status] = 0;
      });

      targetIssues.forEach((issue) => {
        if (issue.created > dateStr) return;

        const currentMappedCat = mapping[issue.status] || "To Do";
        const dayCat = getCategoryOnDate(issue, dateStr, currentMappedCat);

        if (dayCat === currentMappedCat) {
          dayCounts[issue.status] = (dayCounts[issue.status] || 0) + 1;
        } else if (dayCat) {
          const matchedStatuses = activeStatuses.filter(s => (mapping[s] || "To Do") === dayCat);
          if (matchedStatuses.length > 0) {
            const selectedStatus = matchedStatuses[0];
            dayCounts[selectedStatus] = (dayCounts[selectedStatus] || 0) + 1;
          }
        }
      });

      activeStatuses.forEach((status) => {
        historyMap[status].push(dayCounts[status] || 0);
      });
    });

    return historyMap;
  }, [issues, activeStatuses, mapping, last30DaysDates]);

  const statusAlerts = React.useMemo(() => {
    const alerts: Array<{
      statusName: string;
      currentCount: number;
      rollingAverage: number;
      percentageAbove: number;
      severity: "warning" | "critical";
    }> = [];

    activeStatuses.forEach((status) => {
      const history = statusHistory[status] || [];
      if (history.length === 0) return;

      const sum = history.reduce((a, b) => a + b, 0);
      const avg = sum / history.length;

      const current = statusCounts[status] || 0;
      
      if (current > 0 && avg > 0 && current > avg * alertThreshold) {
        const percentageAbove = Math.round(((current - avg) / avg) * 100);
        alerts.push({
          statusName: status,
          currentCount: current,
          rollingAverage: Math.round(avg * 10) / 10,
          percentageAbove,
          severity: percentageAbove > 80 ? "critical" : "warning",
        });
      }
    });

    return alerts;
  }, [activeStatuses, statusHistory, statusCounts, alertThreshold]);

  const sortedActiveStatuses = React.useMemo(() => {
    let statuses = [...activeStatuses];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      statuses = statuses.filter(s => s.toLowerCase().includes(q));
    }

    // Filter by Blocked or In Progress
    if (filterProgressBlocked) {
      statuses = statuses.filter(s => {
        const cat = mapping[s] || "To Do";
        return cat === "In Progress" || cat === "Blocked";
      });
    }

    statuses.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      if (sortBy === "statusName") {
        valA = a;
        valB = b;
      } else if (sortBy === "categoryName") {
        valA = mapping[a] || "To Do";
        valB = mapping[b] || "To Do";
      } else if (sortBy === "issueCount") {
        valA = statusCounts[a] || 0;
        valB = statusCounts[b] || 0;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return statuses;
  }, [activeStatuses, sortBy, sortOrder, mapping, statusCounts, searchQuery, filterProgressBlocked]);

  const mappingStats = React.useMemo(() => {
    const counts = { "To Do": 0, "In Progress": 0, "Done": 0, "Blocked": 0 };
    activeStatuses.forEach((s) => {
      const cat = mapping[s] || "To Do";
      if (cat in counts) {
        counts[cat as keyof typeof counts]++;
      }
    });

    let mostFrequentCategory = "To Do";
    let maxCount = -1;
    Object.entries(counts).forEach(([cat, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentCategory = cat;
      }
    });

    const unknownsCount = activeStatuses.filter(s => !mapping[s]).length;
    const totalMapped = activeStatuses.length - unknownsCount;

    return {
      totalMapped,
      totalStatuses: activeStatuses.length,
      unknownsCount,
      mostFrequentCategory,
      counts
    };
  }, [activeStatuses, mapping]);

  const historicalTrends = React.useMemo(() => {
    let targetIssues = issues;
    // Fallback Mock Data if issues aren't fully loaded
    if (!targetIssues || targetIssues.length === 0) {
      targetIssues = [
        { id: "1", key: "A-1", summary: "Task 1", type: "Task", status: "To Do", mappedStatus: "To Do", priority: "High", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-06-18", updated: "2026-06-25", dueDate: null, storyPoints: 3, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "2", key: "A-2", summary: "Task 2", type: "Story", status: "In Progress", mappedStatus: "In Progress", priority: "Medium", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-06-20", updated: "2026-07-10", dueDate: null, storyPoints: 5, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "3", key: "A-3", summary: "Task 3", type: "Bug", status: "Done", mappedStatus: "Done", priority: "Low", assignee: "Miles Dyson", assigneeId: "2", reporter: "R", created: "2026-06-15", updated: "2026-06-28", dueDate: null, storyPoints: 1, sprint: null, resolution: "Done", timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "4", key: "A-4", summary: "Task 4", type: "Story", status: "In Review", mappedStatus: "In Progress", priority: "High", assignee: "John Connor", assigneeId: "3", reporter: "R", created: "2026-06-25", updated: "2026-07-02", dueDate: null, storyPoints: 8, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "5", key: "A-5", summary: "Task 5", type: "Task", status: "QA Testing", mappedStatus: "In Progress", priority: "Medium", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-06-28", updated: "2026-07-05", dueDate: null, storyPoints: 2, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "6", key: "A-6", summary: "Task 6", type: "Bug", status: "Blocked", mappedStatus: "Blocked", priority: "High", assignee: "Kate Brewster", assigneeId: "5", reporter: "R", created: "2026-06-22", updated: "2026-07-01", dueDate: null, storyPoints: 5, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "7", key: "A-7", summary: "Task 7", type: "Story", status: "Backlog", mappedStatus: "To Do", priority: "Medium", assignee: "Marcus Wright", assigneeId: "4", reporter: "R", created: "2026-06-19", updated: "2026-06-20", dueDate: null, storyPoints: 3, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "8", key: "A-8", summary: "Task 8", type: "Story", status: "Resolved", mappedStatus: "Done", priority: "Low", assignee: "John Connor", assigneeId: "3", reporter: "R", created: "2026-06-24", updated: "2026-07-02", dueDate: null, storyPoints: 5, sprint: null, resolution: "Done", timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "9", key: "A-9", summary: "Task 9", type: "Task", status: "In Progress", mappedStatus: "In Progress", priority: "Medium", assignee: "Sarah Connor", assigneeId: "1", reporter: "R", created: "2026-07-02", updated: "2026-07-08", dueDate: null, storyPoints: 3, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
        { id: "10", key: "A-10", summary: "Task 10", type: "Story", status: "To Do", mappedStatus: "To Do", priority: "Low", assignee: "Marcus Wright", assigneeId: "4", reporter: "R", created: "2026-07-05", updated: "2026-07-06", dueDate: null, storyPoints: 2, sprint: null, resolution: null, timeSpent: null, remainingEstimate: null, labels: [], components: [] },
      ];
    }

    const trends: Record<"To Do" | "In Progress" | "Done" | "Blocked", number[]> = {
      "To Do": [],
      "In Progress": [],
      "Done": [],
      "Blocked": [],
    };

    last30DaysDates.forEach((dateStr) => {
      const counts = {
        "To Do": 0,
        "In Progress": 0,
        "Done": 0,
        "Blocked": 0,
      };

      targetIssues.forEach((issue) => {
        const originalStatus = issue.status;
        const currentMappedCat = mapping[originalStatus] || "To Do";
        const cat = getCategoryOnDate(issue, dateStr, currentMappedCat);
        if (cat) {
          counts[cat]++;
        }
      });

      trends["To Do"].push(counts["To Do"]);
      trends["In Progress"].push(counts["In Progress"]);
      trends["Done"].push(counts["Done"]);
      trends["Blocked"].push(counts["Blocked"]);
    });

    return trends;
  }, [issues, mapping, last30DaysDates]);

  const renderSparkline = (data: number[], color: string, bucket: string) => {
    if (!data || data.length === 0) return null;
    const width = 120;
    const height = 30;
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;
    
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - minVal) / range) * height;
      return `${x},${y}`;
    }).join(" ");

    const areaPoints = [
      `0,${height}`,
      ...data.map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - minVal) / range) * height;
        return `${x},${y}`;
      }),
      `${width},${height}`
    ].join(" ");

    const maxValReal = Math.max(...data);
    const peakIdx = data.indexOf(maxValReal);

    let maxDelta = 0;
    let shiftIdx = -1;
    for (let i = 1; i < data.length; i++) {
      const delta = Math.abs(data[i] - data[i - 1]);
      if (delta > maxDelta) {
        maxDelta = delta;
        shiftIdx = i;
      }
    }

    const keyPoints: Array<{
      idx: number;
      val: number;
      type: "peak" | "shift";
      label: string;
    }> = [];

    if (peakIdx !== -1 && maxValReal > 0) {
      keyPoints.push({
        idx: peakIdx,
        val: maxValReal,
        type: "peak",
        label: `Record Peak: ${maxValReal} Issues`,
      });
    }

    if (shiftIdx !== -1 && maxDelta > 0 && shiftIdx !== peakIdx) {
      keyPoints.push({
        idx: shiftIdx,
        val: data[shiftIdx],
        type: "shift",
        label: `Major Shift: ${data[shiftIdx - 1]} → ${data[shiftIdx]} Issues`,
      });
    }

    return (
      <div className="relative group">
        <svg width={width} height={height} className="overflow-visible select-none">
          <polygon
            points={areaPoints}
            fill={`${color}12`}
          />
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-0 group-hover:opacity-20 transition-opacity duration-200"
            points={points}
          />
          
          {/* Active Hover Highlight Point */}
          {hoveredPoint && hoveredPoint.bucket === bucket && hoveredPoint.idx !== -1 && (
            <g>
              <circle
                cx={(hoveredPoint.idx / (data.length - 1)) * width}
                cy={height - ((data[hoveredPoint.idx] - minVal) / range) * height}
                r="4"
                fill={color}
                stroke="#ffffff"
                strokeWidth="1.5"
                className="drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]"
              />
            </g>
          )}

          {keyPoints.map((pt, kIdx) => {
            const x = (pt.idx / (data.length - 1)) * width;
            const y = height - ((pt.val - minVal) / range) * height;
            const markerColor = pt.type === "peak" ? "#fbbf24" : "#a78bfa";
            
            return (
              <g key={kIdx} className="cursor-help group/marker">
                <circle
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill={markerColor}
                  stroke="#020617"
                  strokeWidth="1.2"
                  className="transition-all duration-200 hover:scale-150"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="6.5"
                  fill="none"
                  stroke={markerColor}
                  strokeWidth="1"
                  className="opacity-45 animate-ping"
                  style={{ animationDuration: pt.type === "peak" ? "2s" : "3.5s" }}
                />
                <title>{pt.label}</title>
              </g>
            );
          })}
          
          <circle
            cx={width}
            cy={height - ((data[data.length - 1] - minVal) / range) * height}
            r="2"
            fill={color}
            className="animate-pulse"
          />

          {/* Invisible interactive vertical columns for hover detection */}
          {data.map((val, idx) => {
            const colWidth = width / data.length;
            const x = (idx / (data.length - 1)) * width;
            const dateStr = last30DaysDates[idx] || "";
            return (
              <rect
                key={idx}
                x={Math.max(0, x - colWidth / 2)}
                y={0}
                width={colWidth}
                height={height}
                fill="transparent"
                className="cursor-crosshair pointer-events-auto opacity-0"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredPoint({
                    bucket,
                    idx,
                    val,
                    date: dateStr,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  });
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div 
      id="status-mapping-card" 
      className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.1)] transition-all duration-300 relative overflow-hidden animate-fade-in"
    >
      <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* High-density horizontal stacked progress bar */}
      <div className="space-y-1.5 border-b border-white/5 pb-3">
        <div className="w-full bg-slate-950/40 rounded-full h-2 overflow-hidden flex border border-white/5 shadow-inner">
          {(["To Do", "In Progress", "Done", "Blocked"] as const).map((category) => {
            const count = mappingStats.counts[category];
            const pct = mappingStats.totalStatuses > 0 ? (count / mappingStats.totalStatuses) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={category}
                style={{
                  width: `${pct}%`,
                  backgroundColor: categoryColors[category],
                }}
                className="h-full transition-all duration-500 hover:brightness-110 relative"
                title={`${category}: ${count} status(es) (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap justify-between items-center text-[8px] font-bold text-slate-500 uppercase tracking-widest px-0.5">
          {(["To Do", "In Progress", "Done", "Blocked"] as const).map((category) => {
            const count = mappingStats.counts[category];
            const pct = mappingStats.totalStatuses > 0 ? Math.round((count / mappingStats.totalStatuses) * 100) : 0;
            return (
              <div key={category} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoryColors[category] }} />
                <span>{category} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
          <h2 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider relative">
            3. Jira Status Map Auditor
            {/* Informational 'i' icon with Popover */}
            <div className="relative inline-block ml-1">
              <button
                type="button"
                className="text-slate-500 hover:text-blue-400 transition-colors p-1"
                onMouseEnter={() => setShowInfoPopover(true)}
                onMouseLeave={() => setShowInfoPopover(false)}
                onClick={() => setShowInfoPopover(!showInfoPopover)}
                aria-label="Status Mapping Statistics Info"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              {showInfoPopover && (
                <div className="absolute left-0 top-6 z-[120] w-52 bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-xl text-[10px] space-y-1.5 animate-in fade-in duration-100 text-left normal-case tracking-normal">
                  <div className="font-bold text-slate-200 border-b border-white/5 pb-1 mb-1.5 uppercase tracking-wider text-[9px]">
                    📊 Mapping Statistics
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Statuses:</span>
                    <span className="font-mono font-bold text-slate-200">{mappingStats.totalStatuses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Mapped:</span>
                    <span className="font-mono font-bold text-slate-200">{mappingStats.totalMapped}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Unknowns Detected:</span>
                    <span className="font-mono font-bold text-amber-400">{mappingStats.unknownsCount}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1.5 mt-1">
                    <span className="text-slate-400">Most Frequent Category:</span>
                    <span className="font-bold text-blue-400">{mappingStats.mostFrequentCategory}</span>
                  </div>
                </div>
              )}
            </div>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input field */}
          <div className="relative min-w-[120px]">
            <input
              type="text"
              placeholder="Search status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-white/10 text-slate-200 text-[10px] rounded-lg pl-7 pr-5 py-1 w-full focus:outline-none focus:border-blue-500/80 transition-all font-bold placeholder-slate-500"
            />
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-slate-500 hover:text-white text-[10px] absolute right-2 top-1.5 font-mono font-bold"
              >
                ×
              </button>
            )}
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={handleRevert}
              className="text-[10px] font-black bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 hover:border-rose-500/35 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 uppercase tracking-wider shadow-md shadow-rose-500/5 shrink-0"
              title="Revert last status mapping change"
            >
              ↩ Revert Changes
            </button>
          )}
          <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-full uppercase tracking-wider shrink-0">
            Custom Workflows
          </span>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
        Jira workflows vary dynamically across organizations. To ensure agile metrics and summaries align perfectly, map each workflow state into our four standard executive categories:
      </p>

      {/* Dynamic Workflow Configuration Actions Toolbar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-950/30 border border-white/5 rounded-xl p-2.5">
        <button
          type="button"
          onClick={handleAIAutoMap}
          disabled={isAutoMapping}
          className="text-[9.5px] font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/10 px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          title="Autonomously map statuses using Gemini AI intelligence"
        >
          {isAutoMapping ? (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Mapping...
            </span>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              AI Auto-Map
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleImportClick}
          className="text-[9.5px] font-black bg-slate-950 hover:bg-slate-900 text-slate-300 border border-white/10 hover:border-white/20 px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 uppercase tracking-wider"
          title="Import workflow configurations from JSON or CSV template backup files"
        >
          <Upload className="w-3.5 h-3.5 text-slate-400" />
          Import File
        </button>

        <button
          type="button"
          onClick={handleExportMappingCSV}
          className="text-[9.5px] font-black bg-slate-950 hover:bg-slate-900 text-slate-300 border border-white/10 hover:border-white/20 px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 uppercase tracking-wider"
          title="Download current workflow mapping configuration as standard CSV template sharing format"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          Export CSV
        </button>

        <button
          type="button"
          onClick={handleExportMappingJSON}
          className="text-[9.5px] font-black bg-slate-950 hover:bg-slate-900 text-slate-300 border border-white/10 hover:border-white/20 px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 uppercase tracking-wider"
          title="Download current workflow mapping configuration as JSON backup config"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          Export JSON
        </button>

        {/* Quick-toggle Button */}
        <button
          type="button"
          onClick={() => setFilterProgressBlocked(!filterProgressBlocked)}
          className={`text-[9.5px] font-black px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 uppercase tracking-wider border ${
            filterProgressBlocked
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/5"
              : "bg-slate-950 hover:bg-slate-900 text-slate-300 border-white/10 hover:border-white/20"
          }`}
          title="Filter mapping table to show only Blocked or In Progress categories"
        >
          <Filter className="w-3.5 h-3.5 shrink-0" />
          {filterProgressBlocked ? "All Categories" : "Blocked/Progress"}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportFile}
          accept=".json,.csv"
          className="hidden"
        />
      </div>

      {/* PROACTIVE ALERTS BLOCK */}
      <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-1.5 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">Proactive Mapping Alerts</span>
          </div>
          
          {/* Configurable Threshold */}
          <div className="flex items-center gap-2 bg-slate-900 border border-white/5 px-2 py-1 rounded-lg">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[9px] font-bold text-slate-400 uppercase">Alert Threshold:</span>
            <input
              type="range"
              min="1.1"
              max="3.0"
              step="0.1"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-[10px] font-black text-slate-200 font-mono">{alertThreshold}x</span>
          </div>
        </div>

        {statusAlerts.length === 0 ? (
          <div className="text-[9.5px] text-slate-500 italic flex items-center gap-1.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            No unusual status accumulations detected. All workflows are balanced.
          </div>
        ) : (
          <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar">
            {statusAlerts.map((alert) => (
              <div
                key={alert.statusName}
                className={`p-2.5 rounded-xl border flex flex-col gap-1 text-[11px] leading-relaxed transition-all ${
                  alert.severity === "critical"
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-200"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-200"
                }`}
              >
                <div className="flex items-center justify-between font-black uppercase tracking-wider text-[9px]">
                  <span className="flex items-center gap-1 font-mono">
                    ⚠️ {alert.severity === "critical" ? "Critical Bottleneck" : "Warning: Accumulation"}
                  </span>
                  <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-white font-black">
                    {alert.currentCount} Issues
                  </span>
                </div>
                <p className="font-medium text-[10.5px]">
                  Status <strong className="font-bold underline">{alert.statusName}</strong> has accumulated {alert.currentCount} tickets, which is <span className="font-bold">{alert.percentageAbove}%</span> above its 30-day rolling average of {alert.rollingAverage}.
                </p>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                  💡 Suggest review: Consider re-allocating staff to {alert.statusName} or clear downstream blocker queues.
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PREDEFINED TEMPLATES SECTION */}
      <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[9.5px] font-black uppercase tracking-wider">Workflow Mapping Templates</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-1">
            <select
              value={selectedTemplateKey}
              onChange={(e) => handleLoadTemplate(e.target.value as any)}
              className="w-full text-[10.5px] bg-slate-950 border border-white/10 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500/80 cursor-pointer font-bold transition-all"
            >
              <option value="" disabled>-- Select Template --</option>
              <option value="kanban">📋 Kanban Standard</option>
              <option value="scrum">⚡ Scrum Classic</option>
              <option value="minimalist">🌱 Minimalist</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex items-center">
            <p className="text-[9px] text-slate-400 leading-normal italic">
              {selectedTemplateKey 
                ? TEMPLATE_DEFINITIONS[selectedTemplateKey as keyof typeof TEMPLATE_DEFINITIONS].description
                : "Select a standard preset to instantly auto-map all active Jira workflow status keys."}
            </p>
          </div>
        </div>
      </div>

      {/* BULK APPLY CONTROLS */}
      {activeStatuses.length > 0 && (
        <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedStatuses.length === activeStatuses.length && activeStatuses.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedStatuses([...activeStatuses]);
                } else {
                  setSelectedStatuses([]);
                }
              }}
              className="rounded border-white/10 bg-slate-950 text-blue-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer shrink-0"
              id="select-all-statuses"
            />
            <label htmlFor="select-all-statuses" className="text-slate-300 font-bold cursor-pointer select-none text-[10.5px]">
              {selectedStatuses.length > 0 ? `${selectedStatuses.length} Selected` : "Select All Statuses"}
            </label>
          </div>

          {selectedStatuses.length > 0 ? (
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5" /> Assign To:
                </span>
                <div className="flex gap-1 flex-wrap">
                  {(["To Do", "In Progress", "Done", "Blocked"] as const).map((category) => {
                    return (
                      <button
                        type="button"
                        key={category}
                        onClick={() => handleBulkApply(category)}
                        className="bg-slate-950 hover:bg-slate-900 border border-white/10 hover:border-white/20 text-slate-200 font-black text-[9.5px] px-2.5 py-1 rounded-lg cursor-pointer transition-all active:scale-95 uppercase tracking-wide"
                      >
                        {category === "To Do" && "📂 To Do"}
                        {category === "In Progress" && "⚡ Progress"}
                        {category === "Done" && "✓ Done"}
                        {category === "Blocked" && "⚠️ Blocked"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Swap Features */}
              <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-2.5">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1 shrink-0">
                  ⇅ Quick Swap:
                </span>
                
                {detectedSwapCategories.length === 2 && (
                  <button
                    type="button"
                    onClick={() => handleQuickSwap(detectedSwapCategories[0], detectedSwapCategories[1])}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 hover:border-amber-500/35 font-black text-[9.5px] px-2.5 py-1 rounded-lg cursor-pointer transition-all active:scale-95 uppercase tracking-wide flex items-center gap-1 shrink-0"
                    title={`Swap selected statuses between '${detectedSwapCategories[0]}' and '${detectedSwapCategories[1]}'`}
                  >
                    Swap {detectedSwapCategories[0]} ↔ {detectedSwapCategories[1]}
                  </button>
                )}

                <div className="flex items-center gap-1.5 text-[10px]">
                  <select
                    value={swapSourceCat}
                    onChange={(e) => setSwapSourceCat(e.target.value as any)}
                    className="bg-slate-950 border border-white/10 text-slate-300 text-[9px] rounded px-2 py-1 focus:outline-none font-bold cursor-pointer"
                  >
                    <option value="To Do">📂 To Do</option>
                    <option value="In Progress">⚡ Progress</option>
                    <option value="Done">✓ Done</option>
                    <option value="Blocked">⚠️ Blocked</option>
                  </select>
                  <span className="text-slate-500">↔</span>
                  <select
                    value={swapTargetCat}
                    onChange={(e) => setSwapTargetCat(e.target.value as any)}
                    className="bg-slate-950 border border-white/10 text-slate-300 text-[9px] rounded px-2 py-1 focus:outline-none font-bold cursor-pointer"
                  >
                    <option value="To Do">📂 To Do</option>
                    <option value="In Progress">⚡ Progress</option>
                    <option value="Done">✓ Done</option>
                    <option value="Blocked">⚠️ Blocked</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleQuickSwap(swapSourceCat, swapTargetCat)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-black text-[9px] px-2.5 py-1 rounded-lg cursor-pointer transition-all active:scale-95 uppercase tracking-wider"
                  >
                    Swap
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              Check multiple statuses below for Bulk Mapping
            </span>
          )}
        </div>
      )}

      {/* Table Headers for Sorting */}
      {activeStatuses.length > 0 && (
        <div className="grid grid-cols-12 gap-2 px-3 py-1 text-[9.5px] font-black text-slate-400 uppercase tracking-wider select-none border-b border-white/5 pb-1">
          <button
            type="button"
            onClick={() => toggleSort("statusName")}
            className="col-span-6 flex items-center gap-1 hover:text-white transition-all text-left cursor-pointer outline-none bg-transparent border-none"
          >
            <span>Status Name</span>
            <ArrowUpDown className="w-3 h-3 text-slate-500" />
            {sortBy === "statusName" && <span className="text-blue-400 font-mono text-[9px]">{sortOrder === "asc" ? "▲" : "▼"}</span>}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("issueCount")}
            className="col-span-2 flex items-center justify-center gap-1 hover:text-white transition-all text-center cursor-pointer outline-none bg-transparent border-none"
          >
            <span>Issues</span>
            <ArrowUpDown className="w-3 h-3 text-slate-500" />
            {sortBy === "issueCount" && <span className="text-blue-400 font-mono text-[9px]">{sortOrder === "asc" ? "▲" : "▼"}</span>}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("categoryName")}
            className="col-span-4 flex items-center justify-end gap-1 hover:text-white transition-all text-right cursor-pointer outline-none bg-transparent border-none"
          >
            <span>Category</span>
            <ArrowUpDown className="w-3 h-3 text-slate-500" />
            {sortBy === "categoryName" && <span className="text-blue-400 font-mono text-[9px]">{sortOrder === "asc" ? "▲" : "▼"}</span>}
          </button>
        </div>
      )}

      {/* Grid of status mapping items */}
      <div className="border border-white/5 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto bg-slate-950/20 p-2 space-y-1.5 custom-scrollbar">
        {sortedActiveStatuses.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-6 text-center font-medium">
            No statuses detected. Run a sandbox report or load a project to populate workflow states.
          </div>
        ) : (
          sortedActiveStatuses.map((statusName) => {
            const currentBucket = mapping[statusName] || "To Do";
            const catColor = categoryColors[currentBucket];
            const selectStyle = {
              borderColor: `${catColor}30`,
              backgroundColor: `${catColor}12`,
              color: catColor,
            };
            const issueCount = statusCounts[statusName] || 0;

            return (
              <div
                key={statusName}
                className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-slate-950/40 border border-white/5 shadow-sm transition-all duration-300 hover:border-white/10"
              >
                <div className="col-span-6 flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(statusName)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStatuses([...selectedStatuses, statusName]);
                      } else {
                        setSelectedStatuses(selectedStatuses.filter(s => s !== statusName));
                      }
                    }}
                    className="rounded border-white/10 bg-slate-950 text-blue-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-bold text-slate-200 font-mono truncate" title={statusName}>
                    {statusName}
                  </span>
                </div>

                <div className="col-span-2 text-center">
                  <span className="text-[11px] font-black text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded-md">
                    {issueCount}
                  </span>
                </div>
                
                <div className="col-span-4 flex justify-end">
                  <select
                    value={currentBucket}
                    onChange={(e) => handleMapChange(statusName, e.target.value as any)}
                    style={selectStyle}
                    className="text-xs rounded-lg px-2 py-1 border font-extrabold focus:outline-none cursor-pointer transition-all w-full text-center"
                  >
                    <option value="To Do" className="bg-slate-950 text-slate-200">📂 To Do</option>
                    <option value="In Progress" className="bg-slate-950 text-slate-200">⚡ In Progress</option>
                    <option value="Done" className="bg-slate-950 text-slate-200">✓ Done</option>
                    <option value="Blocked" className="bg-slate-950 text-slate-200">⚠️ Blocked</option>
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Custom Workflow Status */}
      <form onSubmit={handleAddCustomStatus} className="flex gap-2 pt-2 border-b border-white/5 pb-3">
        <input
          type="text"
          value={customStatusName}
          onChange={(e) => setCustomStatusName(e.target.value)}
          placeholder="Add unlisted custom status (e.g., In Review)..."
          className="w-full text-xs bg-slate-950/60 border border-white/5 text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/80 placeholder-slate-500 font-medium"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-3.5 py-2 rounded-lg transition-all flex items-center gap-1 shrink-0 shadow-lg shadow-blue-500/10 active:scale-95 uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      {/* --- MAPPED ISSUES DISTRIBUTION DOUGHNUT CHART --- */}
      <div className="space-y-3 pt-1 border-b border-white/5 pb-4">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="text-[10px] font-extrabold uppercase tracking-wider">Mapped Category Distribution</h3>
        </div>
        <p className="text-[10px] text-slate-500 font-medium">Real-time breakdown of current ticket allocation across standard PMO executive buckets.</p>
        <DoughnutChart data={issuesDistribution} colors={categoryColors} />
      </div>

      {/* --- WORKFLOW CATEGORY COLORS & HISTORICAL SPARKLINE TRENDS --- */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Palette className="w-4 h-4 text-indigo-400" />
          <h3 className="text-[10px] font-extrabold uppercase tracking-wider">Style Themes & 30-Day Volume Sparklines</h3>
        </div>
        <p className="text-[10px] text-slate-500 font-medium">Assign colors to map categories and monitor historical issue velocity trends (last 30 days) across each bucket.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {(["To Do", "In Progress", "Done", "Blocked"] as const).map((bucket) => {
            const currentColor = categoryColors[bucket];
            
            return (
              <div 
                key={bucket} 
                className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm"
              >
                {/* Left side: color and presets picker */}
                <div className="space-y-2.5 w-full sm:w-auto flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-black text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <span 
                        className="w-2.5 h-2.5 rounded-full inline-block shadow-[0_0_6px_currentColor]" 
                        style={{ backgroundColor: currentColor, color: currentColor }}
                      />
                      {bucket}
                    </span>
                    
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => handleColorChange(bucket, e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border border-white/10 p-0 bg-transparent shrink-0 outline-none"
                      title={`Custom color for ${bucket}`}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {PALETTE_PRESETS.map((col) => {
                      const isCurrent = currentColor === col;
                      return (
                        <button
                          type="button"
                          key={col}
                          onClick={() => handleColorChange(bucket, col)}
                          className={`w-3.5 h-3.5 rounded-full border transition-all ${
                            isCurrent 
                              ? "border-white ring-1 ring-indigo-500/50 scale-110" 
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: col }}
                          title={`Select ${col}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Right side: 30-day historical sparkline trend graph */}
                <div className="bg-slate-950/60 border border-white/5 rounded-xl p-2.5 flex flex-col items-center justify-center shrink-0 w-full sm:w-auto">
                  <div className="flex items-center justify-between w-full text-[8.5px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 gap-2">
                    <span>30d Volume</span>
                    <span className="font-mono text-[9px] text-slate-200 bg-white/5 px-1.5 py-0.5 rounded font-black">
                      {historicalTrends[bucket][29]} Issues
                    </span>
                  </div>
                  {renderSparkline(historicalTrends[bucket], currentColor, bucket)}
                  <div className="text-[7.5px] text-slate-500 font-bold mt-1.5 uppercase tracking-tight flex items-center justify-between w-full">
                    <span>Range: {Math.min(...historicalTrends[bucket])} - {Math.max(...historicalTrends[bucket])}</span>
                    <span className={`font-mono flex items-center gap-0.5 ${historicalTrends[bucket][29] >= historicalTrends[bucket][0] ? "text-emerald-400" : "text-rose-400"}`}>
                      {historicalTrends[bucket][29] >= historicalTrends[bucket][0] ? "↗" : "↘"} {Math.abs(historicalTrends[bucket][29] - historicalTrends[bucket][0])}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsible PMO Audit History Log Section */}
      <div className="border border-white/5 bg-slate-950/20 rounded-xl overflow-hidden mt-4">
        <button
          type="button"
          onClick={() => setShowAuditLogs(!showAuditLogs)}
          className="w-full flex items-center justify-between p-3 text-[10px] font-black text-slate-300 uppercase tracking-wider hover:bg-white/[0.02] transition-all cursor-pointer select-none"
        >
          <span className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            Compliance & Status Audit History Log
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black px-1.5 py-0.5 rounded-full font-mono">
              {auditLogs.length}
            </span>
          </span>
          <span className="font-mono text-slate-500 text-[10px]">
            {showAuditLogs ? "▼ [Hide]" : "▲ [Show]"}
          </span>
        </button>

        {showAuditLogs && (
          <div className="p-3 border-t border-white/5 space-y-3 bg-slate-950/40">
            <div className="flex items-center justify-between text-[8.5px] text-slate-500 font-bold uppercase tracking-wider">
              <span>Chronological Log (Newest First)</span>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to clear all status mapping audit history logs?")) {
                    setAuditLogs([]);
                    addToast?.("Logs Cleared", "Successfully reset mapping audit trail logs.", "info", 2000);
                  }
                }}
                className="text-[8.5px] font-black text-rose-400/80 hover:text-rose-300 transition-all uppercase tracking-wider hover:underline cursor-pointer"
              >
                Clear Logs
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-[10px] text-slate-500 italic py-4 text-center">
                No history actions logged in the system.
              </div>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-slate-900 border border-white/[0.03] text-[10px] leading-relaxed relative hover:border-white/10 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/[0.03] pb-1.5 mb-1.5">
                      <span className="font-black text-[9px] text-blue-400 uppercase tracking-wide bg-blue-500/5 border border-blue-500/10 px-1.5 py-0.5 rounded">
                        ⚡ {log.action}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 font-bold">
                        🕒 {log.timestamp}
                      </span>
                    </div>
                    <p className="font-medium text-slate-300 text-[10px]">
                      {log.details}
                    </p>
                    <div className="text-[8px] text-slate-500 font-bold uppercase mt-1 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-slate-500" />
                      Audited by: <strong className="text-slate-400 font-black">{log.user}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Sparkline Tooltip */}
      {hoveredPoint && (
        <div
          className="fixed z-[100] bg-slate-950/95 border border-white/10 text-white rounded-xl p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] pointer-events-none text-[10px] font-mono flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: hoveredPoint.x + 12,
            top: hoveredPoint.y - 45,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">
            {hoveredPoint.bucket} Category
          </div>
          <div className="font-extrabold text-slate-100">
            📅 {new Date(hoveredPoint.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
          <div className="font-bold text-blue-400 flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block animate-pulse" />
            {hoveredPoint.val} {hoveredPoint.val === 1 ? "Issue" : "Issues"}
          </div>
        </div>
      )}
    </div>
  );
};
