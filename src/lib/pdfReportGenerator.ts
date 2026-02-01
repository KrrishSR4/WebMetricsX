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
}

const colors: PDFColors = {
  primary: [59, 130, 246],
  success: [34, 197, 94],
  warning: [245, 158, 11],
  error: [239, 68, 68],
  muted: [148, 163, 184],
  background: [248, 250, 252],
  text: [15, 23, 42],
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

function drawPieChart(
  pdf: jsPDF,
  x: number,
  y: number,
  radius: number,
  data: Array<{ value: number; color: [number, number, number]; label: string }>
): void {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return;

  let startAngle = -Math.PI / 2; // Start at top

  data.forEach((item) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    // Draw pie slice
    pdf.setFillColor(...item.color);
    
    // Draw arc using lines
    const segments = 30;
    const points: [number, number][] = [[x, y]];
    
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (sliceAngle * i) / segments;
      points.push([
        x + radius * Math.cos(angle),
        y + radius * Math.sin(angle),
      ]);
    }
    points.push([x, y]);

    // Draw filled polygon
    pdf.setDrawColor(...item.color);
    let path = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i][0]} ${points[i][1]}`;
    }
    path += ' Z';

    // Use triangle approach for each segment
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

    startAngle = endAngle;
  });
}

function drawScoreGauge(pdf: jsPDF, x: number, y: number, score: number, label: string): void {
  const radius = 25;
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
  pdf.circle(x, y, radius - 8, 'F');
  
  // Score text
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(score.toString(), x, y + 2, { align: 'center' });
  
  // Label
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...colors.muted);
  pdf.text(label, x, y + radius + 8, { align: 'center' });
}

export function generatePDFReport(data: MonitoringResult): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = margin;

  const { website, seo } = data;

  // ============ HEADER ============
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, 35, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('WEBSITE ANALYTICS REPORT', margin, 18);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  // Clickable URL
  const hostname = new URL(website.url).hostname;
  pdf.textWithLink(hostname, margin, 26, { url: website.url });
  
  // Timestamp
  pdf.text(`Generated: ${new Date(data.lastChecked).toLocaleString()}`, pageWidth - margin, 26, { align: 'right' });
  
  yPos = 45;

  // ============ QUICK STATS ============
  pdf.setFillColor(...colors.background);
  pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 3, 3, 'F');
  
  const statsWidth = (pageWidth - 2 * margin) / 4;
  const statsY = yPos + 10;
  
  // Status
  pdf.setTextColor(...getStatusColor(website.status));
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(website.status.toUpperCase(), margin + statsWidth * 0.5, statsY, { align: 'center' });
  pdf.setTextColor(...colors.muted);
  pdf.setFontSize(8);
  pdf.text('Status', margin + statsWidth * 0.5, statsY + 6, { align: 'center' });
  
  // Response Time
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${website.responseTime ?? '—'}ms`, margin + statsWidth * 1.5, statsY, { align: 'center' });
  pdf.setTextColor(...colors.muted);
  pdf.setFontSize(8);
  pdf.text('Response Time', margin + statsWidth * 1.5, statsY + 6, { align: 'center' });
  
  // HTTP Status
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${website.httpStatusCode ?? '—'}`, margin + statsWidth * 2.5, statsY, { align: 'center' });
  pdf.setTextColor(...colors.muted);
  pdf.setFontSize(8);
  pdf.text('HTTP Status', margin + statsWidth * 2.5, statsY + 6, { align: 'center' });
  
  // Performance Score
  const perfColor = (website.performanceScore ?? 0) >= 90 ? colors.success : (website.performanceScore ?? 0) >= 50 ? colors.warning : colors.error;
  pdf.setTextColor(...perfColor);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${website.performanceScore ?? '—'}`, margin + statsWidth * 3.5, statsY, { align: 'center' });
  pdf.setTextColor(...colors.muted);
  pdf.setFontSize(8);
  pdf.text('Performance', margin + statsWidth * 3.5, statsY + 6, { align: 'center' });
  
  yPos += 35;

  // ============ CORE WEB VITALS ============
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Core Web Vitals', margin, yPos);
  yPos += 8;
  
  const cwvWidth = (pageWidth - 2 * margin) / 3;
  
  if (website.coreWebVitals) {
    const vitals = [
      { label: 'LCP', value: website.coreWebVitals.lcp, unit: 'ms', good: 2500 },
      { label: 'FID', value: website.coreWebVitals.fid, unit: 'ms', good: 100 },
      { label: 'CLS', value: website.coreWebVitals.cls, unit: '', good: 0.1 },
    ];
    
    vitals.forEach((vital, i) => {
      const x = margin + cwvWidth * (i + 0.5);
      const isGood = vital.value !== null && vital.value <= vital.good;
      
      pdf.setFillColor(...(isGood ? colors.success : colors.warning));
      pdf.roundedRect(margin + cwvWidth * i + 2, yPos, cwvWidth - 4, 20, 2, 2, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(vital.label, x, yPos + 8, { align: 'center' });
      
      pdf.setFontSize(12);
      const displayValue = vital.value !== null 
        ? (vital.label === 'CLS' ? vital.value.toFixed(3) : `${Math.round(vital.value)}${vital.unit}`)
        : '—';
      pdf.text(displayValue, x, yPos + 16, { align: 'center' });
    });
  }
  
  yPos += 30;

  // ============ TIMING BREAKDOWN ============
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Timing Breakdown', margin, yPos);
  yPos += 5;
  
  if (website.performanceBreakdown) {
    const pieData = [
      { value: website.performanceBreakdown.dns || 0, color: [59, 130, 246] as [number, number, number], label: 'DNS' },
      { value: website.performanceBreakdown.connect || 0, color: [34, 197, 94] as [number, number, number], label: 'TCP' },
      { value: website.tlsHandshakeTime || 0, color: [168, 85, 247] as [number, number, number], label: 'TLS' },
      { value: website.performanceBreakdown.ttfb || 0, color: [249, 115, 22] as [number, number, number], label: 'TTFB' },
      { value: website.performanceBreakdown.download || 0, color: [20, 184, 166] as [number, number, number], label: 'Download' },
    ].filter(d => d.value > 0);
    
    const chartX = margin + 30;
    const chartY = yPos + 25;
    drawPieChart(pdf, chartX, chartY, 20, pieData);
    
    // Legend
    let legendX = margin + 65;
    pieData.forEach((item) => {
      pdf.setFillColor(...item.color);
      pdf.rect(legendX, yPos + 10, 8, 4, 'F');
      
      pdf.setTextColor(...colors.text);
      pdf.setFontSize(8);
      pdf.text(`${item.label}: ${item.value}ms`, legendX + 10, yPos + 13);
      
      yPos += 8;
    });
    
    yPos += 15;
  }

  // ============ SEO ANALYSIS ============
  yPos += 10;
  pdf.setTextColor(...colors.text);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SEO Analysis', margin, yPos);
  yPos += 8;
  
  // SEO Score gauge
  if (seo.score !== null) {
    drawScoreGauge(pdf, margin + 30, yPos + 20, seo.score, 'SEO Score');
  }
  
  // SEO Checks
  const checksX = margin + 70;
  const checks = [
    { label: 'Title Tag', passed: seo.titleTag.present },
    { label: 'Meta Description', passed: seo.metaDescription.present },
    { label: 'H1 Heading', passed: seo.headings.h1Count === 1 },
    { label: 'Canonical Tag', passed: seo.canonicalTag },
    { label: 'Robots.txt', passed: seo.robotsTxt },
    { label: 'Sitemap', passed: seo.sitemap },
    { label: 'Mobile Friendly', passed: seo.mobileFriendly },
  ];
  
  checks.forEach((check, i) => {
    const checkY = yPos + 5 + i * 6;
    pdf.setFillColor(...(check.passed ? colors.success : colors.error));
    pdf.circle(checksX, checkY, 1.5, 'F');
    
    pdf.setTextColor(...colors.text);
    pdf.setFontSize(8);
    pdf.text(check.label, checksX + 5, checkY + 1);
    
    pdf.setTextColor(...(check.passed ? colors.success : colors.error));
    pdf.text(check.passed ? '✓' : '✗', checksX + 45, checkY + 1);
  });
  
  yPos += 55;

  // ============ ISSUES & RECOMMENDATIONS ============
  if (seo.enhancedIssues && seo.enhancedIssues.length > 0) {
    pdf.setTextColor(...colors.text);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Issues & Recommendations', margin, yPos);
    yPos += 8;
    
    seo.enhancedIssues.slice(0, 5).forEach((issue) => {
      // Severity badge
      pdf.setFillColor(...getSeverityColor(issue.severity));
      pdf.roundedRect(margin, yPos, 15, 5, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6);
      pdf.text(issue.severity.toUpperCase(), margin + 7.5, yPos + 3.5, { align: 'center' });
      
      // Issue text
      pdf.setTextColor(...colors.text);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(issue.issue, margin + 18, yPos + 3.5);
      
      yPos += 7;
      
      // Solution
      pdf.setTextColor(...colors.muted);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      const solution = pdf.splitTextToSize(`→ ${issue.solution}`, pageWidth - 2 * margin - 18);
      pdf.text(solution, margin + 18, yPos);
      yPos += solution.length * 4 + 3;
    });
  }

  // ============ FOOTER ============
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(...colors.muted);
  pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  
  pdf.setTextColor(...colors.muted);
  pdf.setFontSize(8);
  pdf.text('Generated by WebMetrics', margin, pageHeight - 10);
  pdf.text(`Page 1 of 1`, pageWidth - margin, pageHeight - 10, { align: 'right' });

  // Save
  const filename = `webmetrics-report-${new URL(website.url).hostname}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}
