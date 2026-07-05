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
  const activeColumns = columns.filter(c => c.enabled);
  
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
export function exportToPDF(reportTitle: string, issues: JiraIssue[], columns: ColumnDefinition[]) {
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

  printWindow.document.write(`
    <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; color: #333; margin: 30px; }
          h1 { margin-bottom: 5px; }
          .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <h1>${reportTitle}</h1>
        <div class="meta">Generated on ${new Date().toLocaleString()} | Scope: ${issues.length} Issues</div>
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
