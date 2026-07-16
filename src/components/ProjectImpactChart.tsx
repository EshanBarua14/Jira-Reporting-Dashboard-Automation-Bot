import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Issue {
  key: string;
  status: string;
  [key: string]: any;
}

interface ProjectImpactChartProps {
  allIssues: Issue[];
  filteredSelectedIssueKeys: string[];
  pendingBulkAction: {
    type: "status" | "label" | "macro" | "smart_automation";
    targetStatus?: string;
    label?: string;
    macro?: {
      targetStatus?: string | null;
      [key: string]: any;
    };
    smartUpdates?: any[];
  } | null;
}

export const ProjectImpactChart: React.FC<ProjectImpactChartProps> = ({
  allIssues,
  filteredSelectedIssueKeys,
  pendingBulkAction,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Grouped counts calculation
  const standardStatuses = ["To Do", "In Progress", "In Review", "Done", "Blocked"];
  const allStatuses = Array.from(
    new Set([...standardStatuses, ...allIssues.map((i) => i.status)])
  ).filter(Boolean);

  const beforeCounts: Record<string, number> = {};
  const afterCounts: Record<string, number> = {};

  allStatuses.forEach((s) => {
    beforeCounts[s] = 0;
    afterCounts[s] = 0;
  });

  allIssues.forEach((issue) => {
    const currentStatus = issue.status || "To Do";
    beforeCounts[currentStatus] = (beforeCounts[currentStatus] || 0) + 1;

    // Determine predicted next status
    let nextStatus = currentStatus;
    if (pendingBulkAction) {
      if (pendingBulkAction.type === "status" && pendingBulkAction.targetStatus) {
        if (filteredSelectedIssueKeys.includes(issue.key)) {
          nextStatus = pendingBulkAction.targetStatus;
        }
      } else if (pendingBulkAction.type === "macro" && pendingBulkAction.macro?.targetStatus) {
        if (filteredSelectedIssueKeys.includes(issue.key)) {
          nextStatus = pendingBulkAction.macro.targetStatus;
        }
      } else if (pendingBulkAction.type === "smart_automation" && pendingBulkAction.smartUpdates) {
        const recommendation = pendingBulkAction.smartUpdates.find((u: any) => u.key === issue.key);
        if (recommendation?.suggestedStatus) {
          nextStatus = recommendation.suggestedStatus;
        }
      }
    }
    afterCounts[nextStatus] = (afterCounts[nextStatus] || 0) + 1;
  });

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 560;
    const height = 180;
    const margin = { top: 25, right: 20, bottom: 30, left: 40 };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const data = allStatuses.map((status) => ({
      status,
      before: beforeCounts[status] || 0,
      after: afterCounts[status] || 0,
    }));

    const x0 = d3
      .scaleBand()
      .domain(allStatuses)
      .rangeRound([0, chartWidth])
      .paddingInner(0.25);

    const x1 = d3
      .scaleBand()
      .domain(["before", "after"])
      .rangeRound([0, x0.bandwidth()])
      .padding(0.05);

    const maxVal = d3.max(data, (d) => Math.max(d.before, d.after)) || 5;
    const y = d3
      .scaleLinear()
      .domain([0, maxVal + 1])
      .nice()
      .rangeRound([chartHeight, 0]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.05)
      .call(
        d3
          .axisLeft(y)
          .tickSize(-chartWidth)
          .tickFormat(() => "")
      );

    // X Axis
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x0))
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "10px")
      .attr("color", "#94a3b8")
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-weight", "500");

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(Math.min(maxVal + 1, 5)))
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "9px")
      .attr("color", "#94a3b8")
      .selectAll("text")
      .attr("fill", "#94a3b8");

    // Group elements
    const statusGroup = g
      .selectAll(".status-group")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "status-group")
      .attr("transform", (d) => `translate(${x0(d.status)},0)`);

    // Draw before bars
    statusGroup
      .append("rect")
      .attr("x", x1("before")!)
      .attr("y", chartHeight)
      .attr("width", x1.bandwidth())
      .attr("height", 0)
      .attr("fill", "#475569")
      .attr("rx", 3)
      .attr("ry", 3)
      .transition()
      .duration(400)
      .attr("y", (d) => y(d.before))
      .attr("height", (d) => chartHeight - y(d.before));

    // Draw after bars
    statusGroup
      .append("rect")
      .attr("x", x1("after")!)
      .attr("y", chartHeight)
      .attr("width", x1.bandwidth())
      .attr("height", 0)
      .attr("fill", (d) => (d.after !== d.before ? "#10b981" : "#3b82f6"))
      .attr("rx", 3)
      .attr("ry", 3)
      .transition()
      .duration(500)
      .attr("y", (d) => y(d.after))
      .attr("height", (d) => chartHeight - y(d.after));

    // Labels
    statusGroup
      .append("text")
      .attr("x", x1("before")! + x1.bandwidth() / 2)
      .attr("y", (d) => y(d.before) - 4)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("fill", "#64748b")
      .attr("font-weight", "600")
      .text((d) => (d.before > 0 ? d.before : ""));

    statusGroup
      .append("text")
      .attr("x", x1("after")! + x1.bandwidth() / 2)
      .attr("y", (d) => y(d.after) - 4)
      .attr("text-anchor", "middle")
      .attr("font-size", "8.5px")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("fill", (d) => (d.after !== d.before ? "#34d399" : "#60a5fa"))
      .attr("font-weight", "bold")
      .text((d) => (d.after > 0 ? d.after : ""));
  }, [allIssues, filteredSelectedIssueKeys, pendingBulkAction]);

  return (
    <div className="bg-slate-950/20 border border-white/5 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black">
          Project Impact: Distribution Projection
        </span>
        <div className="flex items-center gap-3 text-[10px] font-bold">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-[#475569]" />
            <span className="text-slate-400">Current</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-[#10b981]" />
            <span className="text-emerald-400">Proposed (Changed)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-[#3b82f6]" />
            <span className="text-blue-400">Proposed (Unchanged)</span>
          </div>
        </div>
      </div>
      <div className="flex justify-center overflow-x-auto">
        <svg ref={svgRef} width="560" height="180" className="max-w-full" />
      </div>
    </div>
  );
};
