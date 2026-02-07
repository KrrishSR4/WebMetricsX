import { MonitoringResult } from '@/types/metrics';
import jsPDF from 'jspdf';

export function generateProfessionalPDF({ data, url }: { data: MonitoringResult; url: string }) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Colors
  const colors = {
    primary: [59, 130, 246],    // blue
    success: [34, 197, 94],     // green
    warning: [251, 146, 60],    // orange
    danger: [239, 68, 68],      // red
    purple: [168, 85, 247],     // purple
    gray: [156, 163, 175]       // gray
  };

  // Helper functions
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false, color: number[] = [0, 0, 0]) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(text, margin, yPosition);
    yPosition += fontSize * 0.5 + 2;
  };

  const addColoredBox = (text: string, bgColor: number[], textColor: number[] = [255, 255, 255]) => {
    const textWidth = pdf.getTextWidth(text);
    const boxWidth = textWidth + 10;
    const boxHeight = 8;

    pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    pdf.rect(margin, yPosition - 6, boxWidth, boxHeight, 'F');

    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.setFontSize(10);
    pdf.text(text, margin + 5, yPosition);

    yPosition += 12;
  };

  const drawBar = (x: number, y: number, width: number, height: number, color: number[]) => {
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.rect(x, y, width, height, 'F');
  };

  const drawPieChart = (data: { label: string; value: number; color: number[] }[], centerX: number, centerY: number, radius: number) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -90;

    data.forEach((segment) => {
      if (segment.value > 0) {
        const angle = (segment.value / total) * 360;
        const endAngle = currentAngle + angle;

        pdf.setFillColor(segment.color[0], segment.color[1], segment.color[2]);

        // Simple pie slice using triangles
        const x1 = centerX + radius * Math.cos(currentAngle * Math.PI / 180);
        const y1 = centerY + radius * Math.sin(currentAngle * Math.PI / 180);
        const x2 = centerX + radius * Math.cos(endAngle * Math.PI / 180);
        const y2 = centerY + radius * Math.sin(endAngle * Math.PI / 180);

        pdf.triangle(centerX, centerY, x1, y1, x2, y2, 'F');

        // Add label
        const labelAngle = (currentAngle + endAngle) / 2;
        const labelX = centerX + Math.cos(labelAngle * Math.PI / 180) * (radius + 15);
        const labelY = centerY + Math.sin(labelAngle * Math.PI / 180) * (radius + 15);

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(9);
        pdf.text(`${segment.label}: ${segment.value}ms`, labelX, labelY);

        currentAngle = endAngle;
      }
    });
  };

  const drawLineChart = (dataPoints: { timestamp: string; value: number }[], startX: number, startY: number, width: number, height: number) => {
    if (dataPoints.length === 0) return;

    const maxValue = Math.max(...dataPoints.map(p => p.value));
    const minValue = Math.min(...dataPoints.map(p => p.value));
    const range = maxValue - minValue || 1;

    // Draw axes
    pdf.setDrawColor(200, 200, 200);
    pdf.line(startX, startY + height, startX + width, startY + height);
    pdf.line(startX, startY, startX, startY + height);

    // Draw line
    pdf.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.setLineWidth(1.5);

    dataPoints.forEach((point, index) => {
      const x = startX + (index / (dataPoints.length - 1)) * width;
      const y = startY + height - ((point.value - minValue) / range) * height;

      if (index === 0) {
        pdf.moveTo(x, y);
      } else {
        pdf.lineTo(x, y);
      }

      // Draw data point
      pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      pdf.circle(x, y, 2, 'F');
    });

    pdf.stroke();

    // Add labels
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(8);
    pdf.text(`Max: ${maxValue}ms`, startX, startY - 5);
    pdf.text(`Min: ${minValue}ms`, startX + width - 30, startY - 5);
  };

  // PAGE 1: Cover Page
  pdf.addPage();

  // Header background
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, 60, 'F');

  pdf.setTextColor(255, 255, 255);
  addText('Website Analytics Report', 28, true, [255, 255, 255]);
  addText(url, 18, false, [255, 255, 255]);
  addText(`Generated: ${new Date().toLocaleString()}`, 12, false, [255, 255, 255]);

  yPosition += 20;

  // Status Badge
  const statusColors = {
    up: colors.success,
    down: colors.danger,
    degraded: colors.warning,
    pending: colors.gray
  };

  addText('Current Status', 20, true);
  addColoredBox(data.website.status.toUpperCase(), statusColors[data.website.status] || colors.gray);

  // Key Metrics
  addText('Key Metrics at a Glance', 16, true);
  yPosition += 5;

  const metrics = [
    { label: 'Response Time', value: `${data.website.responseTime || 'N/A'}ms`, color: colors.primary },
    { label: 'HTTP Status', value: data.website.httpStatusCode || 'N/A', color: colors.success },
    { label: 'SEO Score', value: `${data.seo.score || 'N/A'}/100`, color: colors.purple },
    { label: 'Uptime', value: `${data.website.uptime24h || 'N/A'}%`, color: colors.success }
  ];

  metrics.forEach((metric, index) => {
    addText(`${metric.label}:`, 12, true);
    addColoredBox(metric.value, metric.color);
  });

  // PAGE 2: Performance Overview
  pdf.addPage();

  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, 40, 'F');

  pdf.setTextColor(255, 255, 255);
  yPosition = 25;
  addText('Performance Overview', 20, true, [255, 255, 255]);

  pdf.setTextColor(0, 0, 0);
  yPosition = 60;

  addText('Response Time Breakdown', 16, true);

  // Performance breakdown pie chart
  if (data.website.performanceBreakdown) {
    const breakdown = data.website.performanceBreakdown;
    const chartData = [
      { label: 'DNS', value: breakdown.dns || 0, color: colors.primary },
      { label: 'Connect', value: breakdown.connect || 0, color: colors.success },
      { label: 'TTFB', value: breakdown.ttfb || 0, color: colors.warning },
      { label: 'Download', value: breakdown.download || 0, color: colors.purple }
    ].filter(item => item.value > 0);

    if (chartData.length > 0) {
      drawPieChart(chartData, pageWidth / 2, yPosition + 40, 30);
      yPosition += 90;
    }
  }

  // Performance scores bar chart
  addText('Performance Scores', 16, true);
  yPosition += 10;

  const scores = [
    { label: 'Performance', value: data.website.performanceScore || 0, color: colors.primary },
    { label: 'Mobile', value: data.website.mobileScore || 0, color: colors.success },
    { label: 'Desktop', value: data.website.desktopScore || 0, color: colors.warning },
    { label: 'Accessibility', value: data.website.accessibilityScore || 0, color: colors.purple },
    { label: 'Best Practices', value: data.website.bestPracticesScore || 0, color: colors.danger }
  ];

  scores.forEach((score) => {
    addText(`${score.label}:`, 11, true);
    const barWidth = (score.value / 100) * 100;
    drawBar(margin + 40, yPosition - 5, barWidth, 8, score.color);
    addText(`${score.value}/100`, 11);
    yPosition += 12;
  });

  // PAGE 3: Core Web Vitals & Timing
  pdf.addPage();

  pdf.setFillColor(...colors.warning);
  pdf.rect(0, 0, pageWidth, 40, 'F');

  pdf.setTextColor(255, 255, 255);
  yPosition = 25;
  addText('Core Web Vitals & Timing', 20, true, [255, 255, 255]);

  pdf.setTextColor(0, 0, 0);
  yPosition = 60;

  if (data.website.coreWebVitals) {
    addText('Core Web Vitals', 16, true);

    const vitals = [
      { label: 'Largest Contentful Paint (LCP)', value: data.website.coreWebVitals.lcp, unit: 'ms', good: '< 2.5s' },
      { label: 'First Input Delay (FID)', value: data.website.coreWebVitals.fid, unit: 'ms', good: '< 100ms' },
      { label: 'Cumulative Layout Shift (CLS)', value: data.website.coreWebVitals.cls, unit: '', good: '< 0.1' }
    ];

    vitals.forEach((vital) => {
      addText(`${vital.label}:`, 12, true);
      addText(`Value: ${vital.value || 'N/A'}${vital.unit} (Good: ${vital.good})`, 11);
      yPosition += 5;
    });
  }

  yPosition += 10;
  addText('Detailed Timing Metrics', 16, true);

  const timingMetrics = [
    { label: 'DNS Lookup Time', value: data.website.dnsLookupTime, unit: 'ms' },
    { label: 'TCP Connect Time', value: data.website.tcpConnectTime, unit: 'ms' },
    { label: 'TLS Handshake Time', value: data.website.tlsHandshakeTime, unit: 'ms' },
    { label: 'Time to First Byte (TTFB)', value: data.website.ttfb, unit: 'ms' }
  ];

  timingMetrics.forEach((metric) => {
    addText(`${metric.label}:`, 11);
    addText(`${metric.value || 'N/A'}${metric.unit}`, 11);
  });

  // PAGE 4: Response Time History
  pdf.addPage();

  pdf.setFillColor(...colors.success);
  pdf.rect(0, 0, pageWidth, 40, 'F');

  pdf.setTextColor(255, 255, 255);
  yPosition = 25;
  addText('Response Time History', 20, true, [255, 255, 255]);

  pdf.setTextColor(0, 0, 0);
  yPosition = 60;

  addText('Response Time Trend (Last 20 Checks)', 14, true);

  if (data.website.responseTimeHistory && data.website.responseTimeHistory.length > 0) {
    const history = data.website.responseTimeHistory.slice(-20);
    drawLineChart(history, margin, yPosition + 10, pageWidth - margin * 2, 80);
    yPosition += 110;

    // Statistics
    addText('Response Time Statistics', 14, true);
    const responseTimes = history.map(h => h.value);
    const avg = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
    const max = Math.max(...responseTimes);
    const min = Math.min(...responseTimes);

    addText(`Average: ${avg}ms`, 11);
    addText(`Maximum: ${max}ms`, 11);
    addText(`Minimum: ${min}ms`, 11);
  }

  // PAGE 5: SEO Analysis
  pdf.addPage();

  pdf.setFillColor(...colors.purple);
  pdf.rect(0, 0, pageWidth, 40, 'F');

  pdf.setTextColor(255, 255, 255);
  yPosition = 25;
  addText('SEO Analysis', 20, true, [255, 255, 255]);

  pdf.setTextColor(0, 0, 0);
  yPosition = 60;

  // SEO Score
  addText('SEO Score', 16, true);
  const seoScoreValue = data.seo.score || 0;
  const seoBarWidth = (seoScoreValue / 100) * 100;
  drawBar(margin, yPosition - 5, seoBarWidth, 10, colors.purple);
  addText(`${seoScoreValue}/100`, 14, true);
  yPosition += 15;

  // SEO Elements
  addText('SEO Elements Analysis', 14, true);

  const seoElements = [
    { label: 'Title Tag', present: data.seo.titleTag.present, content: data.seo.titleTag.content },
    { label: 'Meta Description', present: data.seo.metaDescription.present, content: data.seo.metaDescription.content },
    { label: 'H1 Tags', present: data.seo.headings.h1Count === 1, content: `${data.seo.headings.h1Count} found` },
    { label: 'Canonical Tag', present: data.seo.canonicalTag, content: data.seo.canonicalTag ? 'Present' : 'Missing' },
    { label: 'Viewport Meta', present: data.seo.mobileFriendly, content: data.seo.mobileFriendly ? 'Mobile Friendly' : 'Not Mobile Friendly' },
    { label: 'Robots.txt', present: data.seo.robotsTxt, content: data.seo.robotsTxt ? 'Found' : 'Not Found' },
    { label: 'Sitemap.xml', present: data.seo.sitemap, content: data.seo.sitemap ? 'Found' : 'Not Found' }
  ];

  seoElements.forEach((element) => {
    addText(`${element.label}:`, 11, true);
    const statusColor = element.present ? colors.success : colors.danger;
    addColoredBox(element.content, statusColor, [255, 255, 255]);
  });

  yPosition += 10;

  // Images Analysis
  addText('Images Analysis', 14, true);
  addText(`Total Images: ${data.seo.images.total}`, 11);
  addText(`With ALT Text: ${data.seo.images.withAlt}`, 11);
  addText(`Missing ALT: ${data.seo.images.missingAlt}`, 11);

  // Issues and Recommendations
  if (data.seo.issues.length > 0) {
    yPosition += 10;
    addText('SEO Issues', 14, true);
    data.seo.issues.forEach(issue => {
      addText(`• ${issue}`, 10);
    });
  }

  if (data.seo.recommendations.length > 0) {
    yPosition += 10;
    addText('Recommendations', 14, true);
    data.seo.recommendations.slice(0, 10).forEach(rec => {
      addText(`• ${rec}`, 10);
    });
  }

  // Footer on all pages
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(8);
    pdf.text(`Generated by WebMetrics - Real-Time Website Monitoring & SEO Analytics`, margin, pageHeight - 10);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
  }

  // Save the PDF
  const filename = `webmetrics-report-${new URL(url).hostname}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);

  console.log('Professional PDF report generated successfully:', filename);
}
