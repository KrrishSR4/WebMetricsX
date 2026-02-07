import { MonitoringResult } from '@/types/metrics';
import jsPDF from 'jspdf';

export function generateWorkingPDF({ data, url }: { data: MonitoringResult; url: string }) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;
  let currentPage = 1;

  // Helper functions
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.text(text, margin, yPosition);
    yPosition += fontSize * 0.5 + 2;
  };

  const addColoredBox = (text: string, bgColor: string, textColor: string = '#FFFFFF') => {
    const textWidth = pdf.getTextWidth(text);
    const boxWidth = textWidth + 10;
    const boxHeight = 8;
    
    pdf.setFillColor(bgColor);
    pdf.rect(margin, yPosition - 6, boxWidth, boxHeight, 'F');
    
    pdf.setTextColor(textColor);
    pdf.setFontSize(10);
    pdf.text(text, margin + 5, yPosition);
    
    yPosition += 12;
  };

  const addNewPage = (title: string, color: string) => {
    pdf.addPage();
    currentPage++;
    yPosition = margin;
    
    // Header
    pdf.setFillColor(color);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setTextColor('#FFFFFF');
    yPosition = 25;
    addText(title, 20, true);
    
    pdf.setTextColor('#000000');
    yPosition = 60;
  };

  const drawBar = (x: number, y: number, width: number, height: number, color: string) => {
    pdf.setFillColor(color);
    pdf.rect(x, y, width, height, 'F');
  };

  const drawSimplePieChart = (data: { label: string; value: number; color: string }[], centerX: number, centerY: number, radius: number) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -90;

    data.forEach((segment) => {
      if (segment.value > 0) {
        const angle = (segment.value / total) * 360;
        const endAngle = currentAngle + angle;

        pdf.setFillColor(segment.color);
        
        // Simple pie slice using triangles
        const x1 = centerX + radius * Math.cos(currentAngle * Math.PI / 180);
        const y1 = centerY + radius * Math.sin(currentAngle * Math.PI / 180);
        const x2 = centerX + radius * Math.cos(endAngle * Math.PI / 180);
        const y2 = centerY + radius * Math.sin(endAngle * Math.PI / 180);
        
        pdf.triangle(centerX, centerY, x1, y1, x2, y2, 'F');

        // Add label
        const labelAngle = (currentAngle + endAngle) / 2;
        const labelX = centerX + Math.cos(labelAngle * Math.PI / 180) * (radius + 20);
        const labelY = centerY + Math.sin(labelAngle * Math.PI / 180) * (radius + 20);

        pdf.setTextColor('#000000');
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
    pdf.setDrawColor('#CCCCCC');
    pdf.line(startX, startY + height, startX + width, startY + height);
    pdf.line(startX, startY, startX, startY + height);

    // Draw line
    pdf.setDrawColor('#3B82F6');
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
      pdf.setFillColor('#3B82F6');
      pdf.circle(x, y, 2, 'F');
    });

    pdf.stroke();

    // Add labels
    pdf.setTextColor('#666666');
    pdf.setFontSize(8);
    pdf.text(`Max: ${maxValue}ms`, startX, startY - 5);
    pdf.text(`Min: ${minValue}ms`, startX + width - 30, startY - 5);
  };

  // PAGE 1: Cover Page
  pdf.setFillColor('#3B82F6');
  pdf.rect(0, 0, pageWidth, 60, 'F');
  
  pdf.setTextColor('#FFFFFF');
  addText('Website Analytics Report', 28, true);
  addText(url, 18, false);
  addText(`Generated: ${new Date().toLocaleString()}`, 12, false);
  
  pdf.setTextColor('#000000');
  yPosition += 20;
  
  // Status Badge
  const statusColors = {
    up: '#22C55E',
    down: '#EF4444',
    degraded: '#FB923C',
    pending: '#9CA3AF'
  };
  
  addText('Current Status', 20, true);
  addColoredBox(data.website.status.toUpperCase(), statusColors[data.website.status] || '#9CA3AF');
  
  // Key Metrics
  addText('Key Metrics at a Glance', 16, true);
  yPosition += 5;
  
  const metrics = [
    { label: 'Response Time', value: `${data.website.responseTime || 'N/A'}ms`, color: '#3B82F6' },
    { label: 'HTTP Status', value: String(data.website.httpStatusCode || 'N/A'), color: '#22C55E' },
    { label: 'SEO Score', value: `${data.seo.score || 'N/A'}/100`, color: '#A855F7' },
    { label: 'Uptime', value: `${data.website.uptime24h || 'N/A'}%`, color: '#22C55E' }
  ];

  metrics.forEach((metric) => {
    addText(`${metric.label}:`, 12, true);
    addColoredBox(metric.value, metric.color);
  });

  // PAGE 2: Performance Overview
  addNewPage('Performance Overview', '#3B82F6');
  
  addText('Response Time Breakdown', 16, true);
  
  // Performance breakdown pie chart
  if (data.website.performanceBreakdown) {
    const breakdown = data.website.performanceBreakdown;
    const chartData = [
      { label: 'DNS', value: breakdown.dns || 0, color: '#3B82F6' },
      { label: 'Connect', value: breakdown.connect || 0, color: '#22C55E' },
      { label: 'TTFB', value: breakdown.ttfb || 0, color: '#FB923C' },
      { label: 'Download', value: breakdown.download || 0, color: '#A855F7' }
    ].filter(item => item.value > 0);

    if (chartData.length > 0) {
      drawSimplePieChart(chartData, pageWidth / 2, yPosition + 40, 30);
      yPosition += 90;
    }
  }

  // Performance scores bar chart
  addText('Performance Scores', 16, true);
  yPosition += 10;

  const scores = [
    { label: 'Performance', value: data.website.performanceScore || 0, color: '#3B82F6' },
    { label: 'Mobile', value: data.website.mobileScore || 0, color: '#22C55E' },
    { label: 'Desktop', value: data.website.desktopScore || 0, color: '#FB923C' },
    { label: 'Accessibility', value: data.website.accessibilityScore || 0, color: '#A855F7' },
    { label: 'Best Practices', value: data.website.bestPracticesScore || 0, color: '#EF4444' }
  ];

  scores.forEach((score) => {
    addText(`${score.label}:`, 11, true);
    const barWidth = (score.value / 100) * 100;
    drawBar(margin + 40, yPosition - 5, barWidth, 8, score.color);
    addText(`${score.value}/100`, 11);
    yPosition += 12;
  });

  // PAGE 3: Core Web Vitals & Timing
  addNewPage('Core Web Vitals & Timing', '#FB923C');
  
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
  addNewPage('Response Time History', '#22C55E');
  
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
  addNewPage('SEO Analysis', '#A855F7');
  
  // SEO Score
  addText('SEO Score', 16, true);
  const seoScoreValue = data.seo.score || 0;
  const seoBarWidth = (seoScoreValue / 100) * 100;
  drawBar(margin, yPosition - 5, seoBarWidth, 10, '#A855F7');
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
    const statusColor = element.present ? '#22C55E' : '#EF4444';
    addColoredBox(element.content, statusColor, '#FFFFFF');
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
  for (let i = 1; i <= currentPage; i++) {
    pdf.setPage(i);
    pdf.setTextColor('#999999');
    pdf.setFontSize(8);
    pdf.text(`Generated by WebMetrics - Real-Time Website Monitoring & SEO Analytics`, margin, pageHeight - 10);
    pdf.text(`Page ${i} of ${currentPage}`, pageWidth - margin - 20, pageHeight - 10);
  }

  // Save the PDF
  const filename = `webmetrics-report-${new URL(url).hostname}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
  
  console.log('Professional PDF report generated successfully:', filename);
}
