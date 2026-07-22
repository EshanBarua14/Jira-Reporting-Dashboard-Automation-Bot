import { JiraIssue, ColumnDefinition, MetricDefinition } from "../types";

export function getFormattedFilename(template: string, projects: string[]): string {
  const dateStr = new Date().toISOString().split("T")[0];
  const projStr = projects.length > 0 ? projects.join("_") : "ALL";
  return template
    .replace("{project}", projStr)
    .replace("{date}", dateStr)
    .replace(".csv", "")
    .replace(".pdf", "") + ".csv";
}

export function exportToCSV(issues: JiraIssue[], columns: ColumnDefinition[], filename: string) {
  let activeColumns = columns.filter(c => c.enabled);
  
  // Ensure "mappedStatus" (Mapping Name) is always included
  if (!activeColumns.some(c => c.id === "mappedStatus")) {
    activeColumns = [
      ...activeColumns,
      { id: "mappedStatus", label: "Mapping Name", enabled: true }
    ];
  }
  
  // Header Row
  const headers = activeColumns.map(col => `"${col.label.replace(/"/g, '""')}"`).join(",");
  
  // Content Rows
  const rows = issues.map(issue => {
    return activeColumns.map(col => {
      let rawVal = (issue as any)[col.id];
      
      // Handle special types
      if (Array.isArray(rawVal)) {
        rawVal = rawVal.join("; ");
      } else if (rawVal === null || rawVal === undefined) {
        rawVal = "";
      }
      
      const stringified = String(rawVal).replace(/"/g, '""');
      return `"${stringified}"`;
    }).join(",");
  });
  
  const csvContent = "\ufeff" + [headers, ...rows].join("\r\n"); // Add BOM for Excel compatibility
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export interface AppliedFiltersSummary {
  projects?: string[];
  dateRange?: string;
  jqlFilter?: string;
  issueTypes?: string[];
  statuses?: string[];
  summarySearchQuery?: string;
  assignee?: string;
  sprint?: string;
}

// Simple dynamic HTML Print window trigger to support one-click PDF generation
export function exportToPDF(
  reportTitle: string, 
  issues: JiraIssue[], 
  columns: ColumnDefinition[],
  customNote?: string,
  watermark?: string,
  logoBase64?: string,
  headerTitle?: string,
  headerSubtitle?: string,
  companyName?: string,
  metrics?: MetricDefinition[],
  metricsHistory?: any[],
  reportMetrics?: any,
  appliedFilters?: AppliedFiltersSummary
) {
  const activeColumns = columns.filter(c => c.enabled);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to export reports to PDF/Print.");
    return;
  }

  const tableHeaders = activeColumns.map(col => `<th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">${col.label}</th>`).join("");
  const tableRows = issues.map(issue => {
    const cells = activeColumns.map(col => {
      let val = (issue as any)[col.id];
      if (Array.isArray(val)) val = val.join(", ");
      return `<td style="border: 1px solid #ddd; padding: 8px;">${val ?? ""}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  const showWatermark = watermark && watermark !== "None";

  // Dynamic deep-dive metrics HTML if provided
  let metricsDeepDiveHtml = "";
  if (metrics && reportMetrics) {
    const enabledMetrics = metrics.filter(m => m.enabled);
    
    // Helper to get metric formatted value
    const getMetricDisplayValue = (id: string, source: any) => {
      if (!source) return "--";
      let val = source[id];
      if (val === undefined || val === null) {
        if (id === "pendingCount") {
          const todo = source["todoCount"] || 0;
          const ip = source["inProgressCount"] || 0;
          return String(todo + ip);
        }
        return "--";
      }
      if (id === "completionPercentage") {
        return `${Number(val).toFixed(1)}%`;
      }
      if (id === "averageCycleTime") {
        return `${Number(val).toFixed(1)} days`;
      }
      return String(val);
    };

    const kpiCardsHtml = enabledMetrics.map(m => {
      const valStr = getMetricDisplayValue(m.id, reportMetrics);
      return `
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background-color: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 2px;">${m.label}</div>
          <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">${valStr}</div>
          <div style="font-size: 9px; color: #94a3b8; font-weight: 500; line-height: 1.2;">${m.description}</div>
        </div>
      `;
    }).join("");

    // Build History Trend Log Table (last 12 entries)
    let historyTableHtml = "";
    if (metricsHistory && metricsHistory.length > 0) {
      // Sort and take the last 12 entries
      const sortedHistory = [...metricsHistory]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-12);

      const historyRows = sortedHistory.map((h, i) => {
        const dateStr = new Date(h.timestamp).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        const mObj = h.metrics || {};
        const compl = mObj.completionPercentage !== undefined ? `${Number(mObj.completionPercentage).toFixed(1)}%` : "--";
        const velocity = mObj.sprintVelocity !== undefined ? String(mObj.sprintVelocity) : "--";
        const cycle = mObj.averageCycleTime !== undefined ? `${Number(mObj.averageCycleTime).toFixed(1)}d` : "--";
        
        return `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px; font-weight: 600; color: #475569;">Run ${i + 1} (${dateStr})</td>
            <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: #0f172a;">${mObj.totalIssues ?? "--"}</td>
            <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: #0f172a;">${compl}</td>
            <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: #0f172a;">${velocity}</td>
            <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: #0f172a;">${cycle}</td>
          </tr>
        `;
      }).join("");

      historyTableHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 0;">
          <thead>
            <tr style="border-bottom: 2px solid #cbd5e1; background-color: #f1f5f9; font-weight: 800; color: #475569; text-transform: uppercase;">
              <th style="padding: 6px 8px; text-align: left;">Run Info</th>
              <th style="padding: 6px 8px; text-align: center;">Issues</th>
              <th style="padding: 6px 8px; text-align: center;">Completion</th>
              <th style="padding: 6px 8px; text-align: center;">Velocity</th>
              <th style="padding: 6px 8px; text-align: center;">Cycle Time</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
      `;
    } else {
      historyTableHtml = `<div style="font-size: 11px; color: #94a3b8; font-style: italic; padding: 20px; text-align: center; font-weight: 500;">No history log entries available.</div>`;
    }

    metricsDeepDiveHtml = `
      <div style="margin-top: 20px; margin-bottom: 25px; page-break-inside: avoid;">
        <h2 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          📊 Executive Metric Deep-Dive & Target KPIs
        </h2>
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1.2; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background-color: #f8fafc;">
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              Active KPI Dashboard
            </h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
              ${kpiCardsHtml}
            </div>
          </div>
          <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background-color: #f8fafc;">
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              Historical Trend Log (Last 12 Runs)
            </h3>
            ${historyTableHtml}
          </div>
        </div>
      </div>
    `;
  }

  let filterSummaryHtml = "";
  if (appliedFilters) {
    const projStr = appliedFilters.projects && appliedFilters.projects.length > 0 ? appliedFilters.projects.join(", ") : "All Projects";
    const dateStr = appliedFilters.dateRange || "All Time Scope";
    const typesStr = appliedFilters.issueTypes && appliedFilters.issueTypes.length > 0 ? appliedFilters.issueTypes.join(", ") : "All Issue Types";
    const statusStr = appliedFilters.statuses && appliedFilters.statuses.length > 0 ? appliedFilters.statuses.join(", ") : "All Statuses";
    const jqlStr = appliedFilters.jqlFilter || "None (Default)";
    const searchStr = appliedFilters.summarySearchQuery ? `"${appliedFilters.summarySearchQuery}"` : "None";
    const sprintStr = appliedFilters.sprint || "All Sprints";
    const assigneeStr = appliedFilters.assignee || "All Assignees";

    filterSummaryHtml = `
      <div style="margin-top: 15px; margin-bottom: 20px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; background-color: #f8fafc; page-break-inside: avoid;">
        <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1e293b; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">
          ⚙️ Applied Filter & Scope Configuration
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; font-family: sans-serif; margin-top: 5px;">
          <tbody>
            <tr>
              <td style="padding: 4px 8px; font-weight: 700; color: #475569; width: 20%;">Target Projects:</td>
              <td style="padding: 4px 8px; font-weight: 800; color: #0f172a; width: 30%;">${projStr}</td>
              <td style="padding: 4px 8px; font-weight: 700; color: #475569; width: 20%;">Timeframe / Dates:</td>
              <td style="padding: 4px 8px; font-weight: 800; color: #0f172a; width: 30%;">${dateStr}</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; font-weight: 700; color: #475569;">Issue Types:</td>
              <td style="padding: 4px 8px; font-weight: 800; color: #0f172a;">${typesStr}</td>
              <td style="padding: 4px 8px; font-weight: 700; color: #475569;">Status Filter:</td>
              <td style="padding: 4px 8px; font-weight: 800; color: #0f172a;">${statusStr}</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; font-weight: 700; color: #475569;">Sprint / Assignee:</td>
              <td style="padding: 4px 8px; font-weight: 800; color: #0f172a;">${sprintStr} / ${assigneeStr}</td>
              <td style="padding: 4px 8px; font-weight: 700; color: #475569;">Summary Query:</td>
              <td style="padding: 4px 8px; font-weight: 800; color: #0f172a;">${searchStr}</td>
            </tr>
            <tr>
              <td style="padding: 4px 8px; font-weight: 700; color: #475569;">Applied JQL Rule:</td>
              <td style="padding: 4px 8px; font-weight: 800; color: #2563eb; font-family: monospace;" colspan="3">${jqlStr}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${headerTitle || reportTitle}</title>
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; color: #333; margin: 30px; position: relative; }
          .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; }
          .header-title-section { flex: 1; pr: 20px; }
          .header-title { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; }
          .header-subtitle { margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500; }
          .company-name { font-size: 11px; color: #94a3b8; font-weight: 600; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
          .logo-img { max-height: 55px; max-width: 180px; object-fit: contain; }
          .meta { font-size: 11px; color: #64748b; margin-top: 5px; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; position: relative; z-index: 10; }
          ${showWatermark ? `
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80px;
            color: rgba(220, 38, 38, 0.08);
            font-weight: 900;
            pointer-events: none;
            white-space: nowrap;
            z-index: 1;
            user-select: none;
            text-transform: uppercase;
            letter-spacing: 5px;
          }
          ` : ""}
        </style>
      </head>
      <body>
        ${showWatermark ? `<div class="watermark">${watermark}</div>` : ""}
        
        <div class="header-container">
          <div class="header-title-section">
            <h1 class="header-title">${headerTitle || reportTitle}</h1>
            <p class="header-subtitle">${headerSubtitle || "PMO Metrics & Target Scope Tickets"}</p>
            <div class="company-name">${companyName || "OmniSync Suite"}</div>
            <div class="meta">Generated on ${new Date().toLocaleString()} | Scope: ${issues.length} Issues</div>
          </div>
          ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" />` : ""}
        </div>
        
        ${customNote ? `
        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 20px 0; font-size: 12px; border-radius: 6px; line-height: 1.6; color: #1e293b; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02); border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
          <strong style="color: #0f172a; font-size: 11px; text-transform: uppercase; tracking: 1.5px; display: block; margin-bottom: 4px;">Executive Caption & Notes:</strong>
          <span style="font-style: italic;">${customNote.replace(/\n/g, '<br/>')}</span>
        </div>
        ` : ""}

        ${filterSummaryHtml}

        ${metricsDeepDiveHtml}

        <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-top: 25px; margin-bottom: 12px;">
          📋 Active Scope Issue Breakdown
        </h3>
        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
            window.close();
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
