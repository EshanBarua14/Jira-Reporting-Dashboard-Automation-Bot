import { JiraIssue, ColumnDefinition } from "../types";

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
  companyName?: string
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
