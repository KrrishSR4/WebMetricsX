import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AnalyticsSummary } from '@/services/monitoringApi';
import { ShieldAlert } from 'lucide-react';

interface Props {
  summary: AnalyticsSummary;
}

export const D3PerformanceRadar: React.FC<Props> = ({ summary }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    const width = svgRef.current.clientWidth || 400;
    const height = 280;
    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;
    const cx = width / 2;
    const cy = height / 2;

    const pb = summary.phase_breakdown || {};
    
    // 6 Dimensions for Hexagonal Radar shape
    const data = [
      { axis: 'Availability', value: summary.uptime_percentage || 100, label: `${(summary.uptime_percentage || 100).toFixed(1)}%` },
      { axis: 'DNS Speed', value: Math.max(15, 100 - (pb.dns_ms || 0)), label: `${pb.dns_ms || 0} ms` },
      { axis: 'Connection', value: Math.max(15, 100 - (pb.tcp_ms || 0)), label: `${pb.tcp_ms || 0} ms` },
      { axis: 'Security', value: Math.max(15, 100 - (pb.tls_ms || 0)), label: `${pb.tls_ms || 0} ms` },
      { axis: 'Backend (TTFB)', value: Math.max(15, 100 - (pb.ttfb_ms || 0) / 6), label: `${pb.ttfb_ms || 0} ms` },
      { axis: 'Content Delivery', value: Math.max(15, 100 - (pb.download_ms || 0) / 6), label: `${pb.download_ms || 0} ms` },
    ];

    const totalAxes = data.length;
    const angleStep = (Math.PI * 2) / totalAxes;

    const g = svg.append('g');

    // Draw circular/hexagonal web grid levels
    const levels = 4;
    for (let level = 1; level <= levels; level++) {
      const levelRadius = (radius / levels) * level;
      const points: [number, number][] = [];
      
      for (let i = 0; i < totalAxes; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + levelRadius * Math.cos(angle);
        const y = cy + levelRadius * Math.sin(angle);
        points.push([x, y]);
      }

      // Draw web grid line connecting coordinates
      g.append('polygon')
        .attr('points', points.map(p => p.join(',')).join(' '))
        .attr('fill', 'none')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8);
    }

    // Draw axis lines from center to outer points
    for (let i = 0; i < totalAxes; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);

      // Line
      g.append('line')
        .attr('x1', cx)
        .attr('y1', cy)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 1)
        .attr('opacity', 0.6);

      // Axis label
      const labelDistance = 18;
      const labelX = cx + (radius + labelDistance) * Math.cos(angle);
      const labelY = cy + (radius + labelDistance) * Math.sin(angle);
      
      let textAnchor = 'middle';
      if (Math.cos(angle) > 0.1) textAnchor = 'start';
      else if (Math.cos(angle) < -0.1) textAnchor = 'end';

      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY + 4)
        .attr('text-anchor', textAnchor)
        .attr('font-size', '9px')
        .attr('font-family', 'var(--font-mono, monospace)')
        .attr('font-weight', 'bold')
        .attr('fill', 'currentColor')
        .attr('opacity', 0.75)
        .text(data[i].axis);
    }

    // Plot Performance Profile Filled Polygon Shape (purple/violet theme)
    const radarPoints: [number, number][] = [];
    data.forEach((d, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const valueRadius = (d.value / 100) * radius;
      const x = cx + valueRadius * Math.cos(angle);
      const y = cy + valueRadius * Math.sin(angle);
      radarPoints.push([x, y]);
    });

    // Draw filled radar shape
    g.append('polygon')
      .attr('points', radarPoints.map(p => p.join(',')).join(' '))
      .attr('fill', '#a78bfa') // Light violet/purple fill
      .attr('fill-opacity', 0.45)
      .attr('stroke', '#8b5cf6') // Strong violet outline
      .attr('stroke-width', 2);

    // Plot dots at vertices
    data.forEach((d, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const valueRadius = (d.value / 100) * radius;
      const x = cx + valueRadius * Math.cos(angle);
      const y = cy + valueRadius * Math.sin(angle);

      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 4.5)
        .attr('fill', '#8b5cf6')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .append('title')
        .text(`${d.axis}: ${d.label}`);
    });

  }, [summary]);

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-black/5 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-purple-500" />
          <h3 className="font-bold text-base text-foreground">Website Performance Radar</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
          Latency Profile Shape
        </span>
      </div>

      <div className="h-72 w-full flex items-center justify-center">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
};
