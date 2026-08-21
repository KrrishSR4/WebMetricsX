import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AnalyticsSummary } from '@/services/monitoringApi';
import { Target } from 'lucide-react';

interface Props {
  summary: AnalyticsSummary;
}

export const D3LatencyScatterPlot: React.FC<Props> = ({ summary }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !summary.history || summary.history.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = svgRef.current.clientWidth || 500;
    const height = 280;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const data = summary.history.map((d) => ({
      date: new Date(d.checked_at),
      latency: d.response_time_ms,
      ttfb: d.ttfb_ms,
      status: d.status_code,
      available: d.available,
    }));

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const maxLat = (d3.max(data, (d) => d.latency) || 500) * 1.1;
    const yScale = d3.scaleLinear().domain([0, maxLat]).range([innerHeight, 0]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .attr('color', 'currentColor')
      .attr('opacity', 0.6)
      .selectAll('text')
      .style('font-size', '10px');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .attr('color', 'currentColor')
      .attr('opacity', 0.6)
      .selectAll('text')
      .style('font-size', '10px');

    // Scatter Dots
    g.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.latency))
      .attr('r', 5)
      .attr('fill', (d) => {
        if (!d.available || d.status >= 400 || d.latency > 500) return '#ef4444'; // Red
        if (d.latency > 300) return '#f59e0b'; // Amber
        return '#3b82f6'; // Blue
      })
      .attr('opacity', 0.8)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .append('title')
      .text(
        (d) =>
          `Time: ${d.date.toLocaleString()}\nLatency: ${d.latency} ms\nTTFB: ${d.ttfb} ms\nHTTP Status: ${d.status}`
      );
  }, [summary]);

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-black/5 pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-chart-1" />
          <h3 className="font-bold text-base text-foreground">Latency Scatter Plot (D3.js)</h3>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-chart-1 font-bold">● Normal (&lt;300ms)</span>
          <span className="flex items-center gap-1 text-chart-3 font-bold">● Slow (300-500ms)</span>
          <span className="flex items-center gap-1 text-status-down font-bold">● Spike/Error (&gt;500ms)</span>
        </div>
      </div>

      <div className="h-72 w-full flex items-center justify-center">
        {summary.history.length === 0 ? (
          <div className="text-xs text-muted-foreground font-mono">
            No scatter points available yet. Click "Run Go Check" to plot live points.
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
};
