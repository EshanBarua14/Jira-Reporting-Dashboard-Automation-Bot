import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";

interface DataPoint {
  label: string;
  value: number;
  color: string;
}

interface D3PieChartProps {
  data: {
    todo: number;
    progress: number;
    done: number;
    blocked: number;
  };
  totalCount: number;
  categoryColors?: Record<string, string>;
}

export const D3PieChart: React.FC<D3PieChartProps> = ({ data, totalCount, categoryColors }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const chartData = useMemo<DataPoint[]>(() => {
    return [
      { label: "Done", value: data.done, color: categoryColors?.["Done"] || "#10b981" },
      { label: "In Progress", value: data.progress, color: categoryColors?.["In Progress"] || "#0ea5e9" },
      { label: "Blocked", value: data.blocked, color: categoryColors?.["Blocked"] || "#ef4444" },
      { label: "To Do", value: data.todo, color: categoryColors?.["To Do"] || "#64748b" },
    ].filter((d) => d.value > 0);
  }, [data, categoryColors]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (chartData.length === 0) {
      // Draw placeholder if no issues
      const width = 160;
      const height = 160;
      const g = svg
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

      g.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 60)
        .attr("fill", "transparent")
        .attr("stroke", "#334155")
        .attr("stroke-width", "8")
        .style("stroke-dasharray", "4,4");

      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "4px")
        .attr("fill", "#64748b")
        .attr("class", "text-[10px] font-bold uppercase tracking-wider")
        .text("No Data");
      return;
    }

    const width = 160;
    const height = 160;
    const margin = 8;
    const radius = Math.min(width, height) / 2 - margin;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const pie = d3
      .pie<DataPoint>()
      .value((d) => d.value)
      .sort(null);

    const arc = d3
      .arc<d3.PieArcDatum<DataPoint>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius)
      .cornerRadius(5)
      .padAngle(0.04);

    const arcHover = d3
      .arc<d3.PieArcDatum<DataPoint>>()
      .innerRadius(radius * 0.55)
      .outerRadius(radius + 4)
      .cornerRadius(5)
      .padAngle(0.04);

    const pieData = pie(chartData);

    g.selectAll("path")
      .data(pieData)
      .enter()
      .append("path")
      .attr("d", arc as any)
      .attr("fill", (d) => d.data.color)
      .attr("class", "cursor-pointer transition-all duration-300")
      .style("opacity", 0.9)
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("d", arcHover as any)
          .style("opacity", 1);
        setHoveredSlice(d.data.label);
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("d", arc as any)
          .style("opacity", 0.9);
        setHoveredSlice(null);
      });

    // Donut Center Text
    const textGroup = g.append("g").attr("class", "pointer-events-none");

    textGroup
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-2px")
      .attr("fill", "currentColor")
      .style("font-size", "18px")
      .style("font-weight", "900")
      .attr("class", "font-sans")
      .text(totalCount);

    textGroup
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "12px")
      .attr("fill", "#64748b")
      .style("font-size", "8px")
      .style("font-weight", "800")
      .style("letter-spacing", "0.1em")
      .attr("class", "uppercase font-mono")
      .text(totalCount === 1 ? "Issue" : "Issues");
  }, [chartData, totalCount]);

  return (
    <div ref={containerRef} className="flex flex-col sm:flex-row items-center justify-around gap-4 w-full">
      <div className="relative flex items-center justify-center">
        <svg ref={svgRef} className="text-slate-200"></svg>
      </div>

      {/* Legend with interactive hover indicators */}
      <div className="space-y-1 text-[11px] font-bold text-slate-450 min-w-[130px]">
        {[
          { label: "Done", count: data.done, bg: "bg-emerald-500" },
          { label: "In Progress", count: data.progress, bg: "bg-sky-500" },
          { label: "Blocked", count: data.blocked, bg: "bg-red-500" },
          { label: "To Do", count: data.todo, bg: "bg-slate-500" },
        ].map((item) => {
          const isHovered = hoveredSlice === item.label;
          const pct = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
          return (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg transition-all duration-200 ${
                isHovered ? "bg-slate-800 text-white scale-[1.04]" : "hover:bg-slate-800/30 text-slate-400"
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.bg}`} />
              <div className="flex-1 flex justify-between gap-2">
                <span className="font-semibold">{item.label}</span>
                <span className="font-mono text-slate-300">
                  {item.count} <span className="text-[9px] text-slate-500">({pct}%)</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
