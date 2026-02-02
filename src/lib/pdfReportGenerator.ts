import jsPDF from 'jspdf';
import type { MonitoringResult } from '@/types/metrics';

interface PDFColors {
  primary: [number, number, number];
  success: [number, number, number];
  warning: [number, number, number];
  error: [number, number, number];
  muted: [number, number, number];
  background: [number, number, number];
  text: [number, number, number];
  border: [number, number, number];
  purple: [number, number, number];
  teal: [number, number, number];
  orange: [number, number, number];
}

const colors: PDFColors = {
  primary: [59, 130, 246],
  success: [34, 197, 94],
  warning: [245, 158, 11],
  error: [239, 68, 68],
  muted: [100, 116, 139],
  background: [248, 250, 252],
  text: [15, 23, 42],
  border: [226, 232, 240],
  purple: [139, 92, 246],
  teal: [20, 184, 166],
  orange: [249, 115, 22],
};

function getStatusColor(status: string): [number, number, number] {
  switch (status) {
    case 'up': return colors.success;
    case 'degraded': return colors.warning;
    case 'down': return colors.error;
    default: return colors.muted;
  }
}

function getSeverityColor(severity: 'high' | 'medium' | 'low'): [number, number, number] {
  switch (severity) {
    case 'high': return colors.error;
    case 'medium': return colors.warning;
    case 'low': return colors.primary;
  }
}

function drawBorderedBox(pdf: jsPDF, x: number, y: number, w: number, h: number, fillColor?: [number, number, number]): void {
  if (fillColor) {
    pdf.setFillColor(...fillColor);
    pdf.roundedRect(x, y, w, h, 2, 2, 'F');
  }
  pdf.setDrawColor(...colors.border);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x, y, w, h, 2, 2, 'S');
}

function drawResponseTimeChart(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  data: Array<{ timestamp: string; value: number }>
): void {
  if (!data || data.length === 0) {
    pdf.setTextColor(...colors.muted);
    pdf.setFontSize(10);
    pdf.text('No response time data available', x + width / 2, y + height / 2, { align: 'center' });
    return;
  }

  const chartX = x + 15;
  const chartY = y + 5;
  const chartWidth = width - 25;
  const chartHeight = height - 25;

  // Calculate min/max values
  const values = data.map(d => d.value);
  const maxValue = Math.max(...values) * 1.2;
  const minValue = 0;

  // Draw background grid
  pdf.setDrawColor(230, 230, 230);
  pdf.setLineWidth(0.2);

  // Horizontal grid lines (5 lines)
  for (let i = 0; i <= 4; i++) {
    const lineY = chartY + (chartHeight * i) / 4;
    pdf.line(chartX, lineY, chartX + chartWidth, lineY);
    
    // Y-axis labels
    const labelValue = Math.round(maxValue - (maxValue * i) / 4);
    pdf.setTextColor(...colors.muted);
    pdf.setFontSize(7);
    pdf.text(`${labelValue}ms`, chartX - 2, lineY + 1, { align: 'right' });
  }

  // Vertical grid lines
  const xStep = chartWidth / Math.max(data.length - 1, 1);
  for (let i = 0; i < data.length; i++) {
    const lineX = chartX + (i * xStep);
    pdf.setDrawColor(240, 240, 240);
    pdf.line(lineX, chartY, lineX, chartY + chartHeight);
  }

  // Draw gradient fill area
  const points: [number, number][] = [];
  data.forEach((point, i) => {
    const px = chartX + (i * xStep);
    const py = chartY + chartHeight - ((point.value - minValue) / (maxValue - minValue)) * chartHeight;
    points.push([px, py]);
  });

  // Fill area under the line
  if (points.length > 1) {
    pdf.setFillColor(59, 130, 246, 0.2);
    for (let i = 0; i < points.length - 1; i++) {
      pdf.triangle(
        points[i][0], points[i][1],
        points[i + 1][0], points[i + 1][1],
        points[i][0], chartY + chartHeight,
        'F'
      );
      pdf.triangle(
        points[i + 1][0], points[i + 1][1],
        points[i][0], chartY + chartHeight,
        points[i + 1][0], chartY + chartHeight,
        'F'
      );
    }
  }

  // Draw the line
  pdf.setDrawColor(...colors.primary);
  pdf.setLineWidth(0.8);
  for (let i = 0; i < points.length - 1; i++) {
    pdf.line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
  }

  // Draw data points
  pdf.setFillColor(...colors.primary);
  points.forEach(([px, py]) => {
    pdf.circle(px, py, 1, 'F');
  });

  // X-axis labels (show first, middle, last)
  pdf.setTextColor(...colors.muted);
  pdf.setFontSize(6);
  const labelIndices = [0, Math.floor(data.length / 2), data.length - 1];
  labelIndices.forEach(i => {
    if (data[i]) {
      const time = new Date(data[i].timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const labelX = chartX + (i * xStep);
      pdf.text(time, labelX, chartY + chartHeight + 5, { align: 'center' });
    }
  });

  // Chart title
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Response Time (ms)', x + width / 2, y - 2, { align: 'center' });
}

function drawBarChart(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  data: Array<{ label: string; value: number; color: [number, number, number] }>
): void {
  if (!data || data.length === 0) return;

  const barHeight = 12;
  const gap = 4;
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const labelWidth = 50;
  const barWidth = width - labelWidth - 30;

  data.forEach((item, i) => {
    const barY = y + i * (barHeight + gap);
    
    // Label
    pdf.setTextColor(...colors.text);
    pdf.setFontSize(8);
    pdf.text(item.label, x, barY + barHeight / 2 + 1);
    
    // Background bar
    pdf.setFillColor(240, 240, 240);
    pdf.roundedRect(x + labelWidth, barY, barWidth, barHeight, 2, 2, 'F');
    
    // Value bar
    const valueWidth = (item.value / maxValue) * barWidth;
    pdf.setFillColor(...item.color);
    pdf.roundedRect(x + labelWidth, barY, valueWidth, barHeight, 2, 2, 'F');
    
    // Value label
    pdf.setTextColor(...colors.text);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${item.value}ms`, x + labelWidth + barWidth + 3, barY + barHeight / 2 + 1);
  });
}

function drawPieChart(
  pdf: jsPDF,
  x: number,
  y: number,
  radius: number,
  data: Array<{ value: number; color: [number, number, number]; label: string }>
): void {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return;

  let startAngle = -Math.PI / 2;

  data.forEach((item) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    
    pdf.setFillColor(...item.color);
    
    const segments = 30;
    for (let i = 0; i <= segments; i++) {
      const angle1 = startAngle + (sliceAngle * i) / segments;
      const angle2 = startAngle + (sliceAngle * (i + 1)) / segments;
      
      pdf.triangle(
        x, y,
        x + radius * Math.cos(angle1), y + radius * Math.sin(angle1),
        x + radius * Math.cos(angle2), y + radius * Math.sin(angle2),
        'F'
      );
    }

    startAngle += sliceAngle;
  });

  // Inner circle for donut effect
  pdf.setFillColor(255, 255, 255);
  pdf.circle(x, y, radius * 0.55, 'F');
}

function drawScoreGauge(pdf: jsPDF, x: number, y: number, score: number, label: string): void {
  const radius = 18;
  const scoreColor = score >= 90 ? colors.success : score >= 50 ? colors.warning : colors.error;
  
  // Background circle
  pdf.setFillColor(230, 230, 230);
  pdf.circle(x, y, radius, 'F');
  
  // Score arc
  const scoreAngle = (score / 100) * 2 * Math.PI;
  const startAngle = -Math.PI / 2;
  
  pdf.setFillColor(...scoreColor);
  for (let i = 0; i < 30; i++) {
    const angle1 = startAngle + (scoreAngle * i) / 30;
    const angle2 = startAngle + (scoreAngle * (i + 1)) / 30;
    pdf.triangle(
      x, y,
      x + radius * Math.cos(angle1), y + radius * Math.sin(angle1),
      x + radius * Math.cos(angle2), y + radius * Math.sin(angle2),
      'F'
    );
  }
  
  // Inner white circle
  pdf.setFillColor(255, 255, 255);
  pdf.circle(x, y, radius - 5, 'F');
  
  // Score text
  pdf.setTextColor(...scoreColor);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(score.toString(), x, y + 2, { align: 'center' });
  
  // Label
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...colors.text);
  pdf.text(label, x, y + radius + 6, { align: 'center' });
}

export function generatePDFReport(data: MonitoringResult): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  let yPos = margin;

  const { website, seo } = data;

  // ============ PAGE 1: PERFORMANCE METRICS ============
  
  // Header
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, 32, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('WEBSITE ANALYTICS REPORT', margin, 15);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const hostname = new URL(website.url).hostname;
  pdf.textWithLink(hostname, margin, 23, { url: website.url });
  
  pdf.text(`Generated: ${new Date(data.lastChecked).toLocaleString()}`, pageWidth - margin, 23, { align: 'right' });
  
  yPos = 40;

  // Quick Stats Row
  const statsBoxWidth = (pageWidth - 2 * margin - 9) / 4;
  const statsData = [
    { label: 'Status', value: website.status.toUpperCase(), color: getStatusColor(website.status) },
    { label: 'Response Time', value: `${website.responseTime ?? '—'}ms`, color: colors.primary },
    { label: 'HTTP Status', value: `${website.httpStatusCode ?? '—'}`, color: colors.text },
    { label: 'Performance', value: `${website.performanceScore ?? '—'}`, color: (website.performanceScore ?? 0) >= 90 ? colors.success : (website.performanceScore ?? 0) >= 50 ? colors.warning : colors.error },
  ];

  statsData.forEach((stat, i) => {
    const boxX = margin + i * (statsBoxWidth + 3);
    drawBorderedBox(pdf, boxX, yPos, statsBoxWidth, 22, colors.background);
    
    pdf.setTextColor(...stat.color);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(stat.value, boxX + statsBoxWidth / 2, yPos + 10, { align: 'center' });
    
    pdf.setTextColor(...colors.muted);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(stat.label, boxX + statsBoxWidth / 2, yPos + 17, { align: 'center' });
  });

  yPos += 30;

  // Core Web Vitals Section
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Core Web Vitals', margin, yPos);
  yPos += 5;

  drawBorderedBox(pdf, margin, yPos, pageWidth - 2 * margin, 28);
  
  if (website.coreWebVitals) {
    const vitals = [
      { label: 'LCP', value: website.coreWebVitals.lcp, unit: 'ms', good: 2500, desc: 'Largest Contentful Paint' },
      { label: 'FID', value: website.coreWebVitals.fid, unit: 'ms', good: 100, desc: 'First Input Delay' },
      { label: 'CLS', value: website.coreWebVitals.cls, unit: '', good: 0.1, desc: 'Cumulative Layout Shift' },
    ];
    
    const vitalWidth = (pageWidth - 2 * margin) / 3;
    vitals.forEach((vital, i) => {
      const vx = margin + vitalWidth * i + vitalWidth / 2;
      const isGood = vital.value !== null && vital.value <= vital.good;
      const vColor = isGood ? colors.success : colors.warning;
      
      pdf.setTextColor(...vColor);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      const displayValue = vital.value !== null 
        ? (vital.label === 'CLS' ? vital.value.toFixed(3) : `${Math.round(vital.value)}${vital.unit}`)
        : '—';
      pdf.text(displayValue, vx, yPos + 12, { align: 'center' });
      
      pdf.setTextColor(...colors.text);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(vital.label, vx, yPos + 19, { align: 'center' });
      
      pdf.setTextColor(...colors.muted);
      pdf.setFontSize(6);
      pdf.text(vital.desc, vx, yPos + 24, { align: 'center' });
    });
  }

  yPos += 35;

  // Response Time History Chart
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Response Time History', margin, yPos);
  yPos += 3;

  drawBorderedBox(pdf, margin, yPos, pageWidth - 2 * margin, 50);
  drawResponseTimeChart(pdf, margin + 5, yPos + 8, pageWidth - 2 * margin - 10, 40, website.responseTimeHistory || []);

  yPos += 58;

  // Two columns: Performance Breakdown (Bar) + Timing Distribution (Pie)
  const colWidth = (pageWidth - 2 * margin - 5) / 2;

  // Performance Breakdown - Bar Chart
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Performance Breakdown', margin, yPos);
  yPos += 3;

  drawBorderedBox(pdf, margin, yPos, colWidth, 55);

  if (website.performanceBreakdown) {
    const barData = [
      { label: 'DNS Lookup', value: website.performanceBreakdown.dns || 0, color: colors.primary },
      { label: 'TCP Connect', value: website.performanceBreakdown.connect || 0, color: colors.success },
      { label: 'TTFB', value: website.performanceBreakdown.ttfb || 0, color: colors.orange },
      { label: 'Download', value: website.performanceBreakdown.download || 0, color: colors.teal },
    ];
    drawBarChart(pdf, margin + 5, yPos + 5, colWidth - 10, 45, barData);
  }

  // Timing Distribution - Pie Chart
  const pieX = margin + colWidth + 5;
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Timing Distribution', pieX, yPos - 3);

  drawBorderedBox(pdf, pieX, yPos, colWidth, 55);

  if (website.performanceBreakdown) {
    const pieData = [
      { value: website.performanceBreakdown.dns || 0, color: colors.primary, label: 'DNS' },
      { value: website.performanceBreakdown.connect || 0, color: colors.success, label: 'TCP' },
      { value: website.tlsHandshakeTime || 0, color: colors.purple, label: 'TLS' },
      { value: website.performanceBreakdown.ttfb || 0, color: colors.orange, label: 'TTFB' },
      { value: website.performanceBreakdown.download || 0, color: colors.teal, label: 'Download' },
    ].filter(d => d.value > 0);

    const chartCenterX = pieX + 30;
    const chartCenterY = yPos + 28;
    drawPieChart(pdf, chartCenterX, chartCenterY, 18, pieData);

    // Legend
    let legendY = yPos + 8;
    pieData.forEach((item) => {
      pdf.setFillColor(...item.color);
      pdf.rect(pieX + 55, legendY, 6, 4, 'F');
      
      pdf.setTextColor(...colors.text);
      pdf.setFontSize(7);
      pdf.text(`${item.label}: ${item.value}ms`, pieX + 63, legendY + 3);
      legendY += 7;
    });
  }

  // Page 1 Footer
  pdf.setDrawColor(...colors.border);
  pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  pdf.setTextColor(...colors.muted);
  pdf.setFontSize(8);
  pdf.text('WebMetrics Report', margin, pageHeight - 7);
  pdf.text('Page 1 of 2', pageWidth - margin, pageHeight - 7, { align: 'right' });

  // ============ PAGE 2: SEO ANALYSIS ============
  pdf.addPage();
  yPos = margin;

  // Header
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, 25, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SEO ANALYSIS & RECOMMENDATIONS', margin, 15);
  
  pdf.setFontSize(9);
  pdf.text(hostname, pageWidth - margin, 15, { align: 'right' });

  yPos = 32;

  // SEO Score Section
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SEO Overview', margin, yPos);
  yPos += 3;

  drawBorderedBox(pdf, margin, yPos, pageWidth - 2 * margin, 45);

  // Score gauge
  if (seo.score !== null) {
    drawScoreGauge(pdf, margin + 25, yPos + 22, seo.score, 'SEO Score');
  }

  // SEO Checks grid
  const checksStartX = margin + 55;
  const checkColWidth = (pageWidth - checksStartX - margin) / 2;
  
  const checks = [
    { label: 'Title Tag', passed: seo.titleTag.present, detail: seo.titleTag.length ? `${seo.titleTag.length} chars` : '' },
    { label: 'Meta Description', passed: seo.metaDescription.present, detail: seo.metaDescription.length ? `${seo.metaDescription.length} chars` : '' },
    { label: 'H1 Heading', passed: seo.headings.h1Count === 1, detail: `${seo.headings.h1Count} found` },
    { label: 'Canonical Tag', passed: seo.canonicalTag, detail: '' },
    { label: 'Robots.txt', passed: seo.robotsTxt, detail: '' },
    { label: 'Sitemap', passed: seo.sitemap, detail: '' },
    { label: 'Mobile Friendly', passed: seo.mobileFriendly, detail: '' },
    { label: 'Indexable', passed: seo.indexable, detail: '' },
  ];

  checks.forEach((check, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const checkX = checksStartX + col * checkColWidth;
    const checkY = yPos + 8 + row * 9;
    
    // Icon
    pdf.setFillColor(...(check.passed ? colors.success : colors.error));
    pdf.circle(checkX + 2, checkY, 2, 'F');
    
    // Label
    pdf.setTextColor(...colors.text);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(check.label, checkX + 6, checkY + 1);
    
    // Status
    pdf.setTextColor(...(check.passed ? colors.success : colors.error));
    pdf.setFont('helvetica', 'bold');
    pdf.text(check.passed ? '✓' : '✗', checkX + checkColWidth - 10, checkY + 1);
  });

  yPos += 52;

  // Advanced SEO Checks
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Advanced SEO Checks', margin, yPos);
  yPos += 3;

  drawBorderedBox(pdf, margin, yPos, pageWidth - 2 * margin, 28);

  const advancedChecks = [
    { label: 'Open Graph', passed: seo.openGraph?.hasTitle && seo.openGraph?.hasDescription },
    { label: 'Twitter Card', passed: seo.twitterCard?.present },
    { label: 'Structured Data', passed: seo.structuredData },
    { label: 'Favicon', passed: seo.favicon },
    { label: 'Compression', passed: seo.compression },
    { label: 'Language Tag', passed: !!seo.language },
  ];

  const advColWidth = (pageWidth - 2 * margin) / 3;
  advancedChecks.forEach((check, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const checkX = margin + col * advColWidth + 5;
    const checkY = yPos + 8 + row * 11;
    
    pdf.setFillColor(...(check.passed ? colors.success : colors.error));
    pdf.circle(checkX + 2, checkY, 2, 'F');
    
    pdf.setTextColor(...colors.text);
    pdf.setFontSize(8);
    pdf.text(check.label, checkX + 6, checkY + 1);
    
    pdf.setTextColor(...(check.passed ? colors.success : colors.error));
    pdf.setFont('helvetica', 'bold');
    pdf.text(check.passed ? 'Yes' : 'No', checkX + advColWidth - 20, checkY + 1);
  });

  yPos += 35;

  // Issues & Recommendations
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Issues & Recommendations', margin, yPos);
  yPos += 3;

  if (seo.enhancedIssues && seo.enhancedIssues.length > 0) {
    const issueBoxHeight = Math.min(seo.enhancedIssues.length * 22 + 5, 110);
    drawBorderedBox(pdf, margin, yPos, pageWidth - 2 * margin, issueBoxHeight);
    
    let issueY = yPos + 6;
    seo.enhancedIssues.slice(0, 5).forEach((issue) => {
      // Severity badge
      const badgeColor = getSeverityColor(issue.severity);
      pdf.setFillColor(...badgeColor);
      pdf.roundedRect(margin + 3, issueY - 2, 16, 6, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      pdf.text(issue.severity.toUpperCase(), margin + 11, issueY + 2, { align: 'center' });
      
      // Category badge
      pdf.setFillColor(...colors.muted);
      pdf.roundedRect(margin + 21, issueY - 2, 20, 6, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(5);
      pdf.text(issue.category.toUpperCase(), margin + 31, issueY + 2, { align: 'center' });
      
      // Issue title
      pdf.setTextColor(...colors.text);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(issue.issue, margin + 44, issueY + 2);
      
      issueY += 8;
      
      // Impact
      pdf.setTextColor(...colors.muted);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'italic');
      const impactText = pdf.splitTextToSize(`Impact: ${issue.impact}`, pageWidth - 2 * margin - 10);
      pdf.text(impactText[0], margin + 5, issueY);
      
      issueY += 5;
      
      // Solution
      pdf.setTextColor(...colors.success);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      const solutionText = pdf.splitTextToSize(`→ ${issue.solution}`, pageWidth - 2 * margin - 10);
      pdf.text(solutionText[0], margin + 5, issueY);
      
      issueY += 9;
    });

    yPos += issueBoxHeight + 5;
  } else {
    drawBorderedBox(pdf, margin, yPos, pageWidth - 2 * margin, 20);
    pdf.setTextColor(...colors.success);
    pdf.setFontSize(10);
    pdf.text('✓ No major issues found', margin + 5, yPos + 12);
    yPos += 25;
  }

  // Images Analysis
  if (seo.images) {
    pdf.setTextColor(...colors.text);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Images Analysis', margin, yPos);
    yPos += 3;

    drawBorderedBox(pdf, margin, yPos, pageWidth - 2 * margin, 18);
    
    const imgStatWidth = (pageWidth - 2 * margin) / 3;
    const imgStats = [
      { label: 'Total Images', value: seo.images.total, color: colors.primary },
      { label: 'With Alt Text', value: seo.images.withAlt, color: colors.success },
      { label: 'Missing Alt', value: seo.images.missingAlt, color: seo.images.missingAlt > 0 ? colors.error : colors.success },
    ];

    imgStats.forEach((stat, i) => {
      const statX = margin + imgStatWidth * i + imgStatWidth / 2;
      pdf.setTextColor(...stat.color);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(stat.value.toString(), statX, yPos + 9, { align: 'center' });
      
      pdf.setTextColor(...colors.muted);
      pdf.setFontSize(7);
      pdf.text(stat.label, statX, yPos + 14, { align: 'center' });
    });
  }

  // Page 2 Footer
  pdf.setDrawColor(...colors.border);
  pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  pdf.setTextColor(...colors.muted);
  pdf.setFontSize(8);
  pdf.text('WebMetrics Report', margin, pageHeight - 7);
  pdf.text('Page 2 of 2', pageWidth - margin, pageHeight - 7, { align: 'right' });

  // Save
  const filename = `webmetrics-report-${hostname}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}
