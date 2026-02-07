import { MonitoringResult } from '@/types/metrics';
import jsPDF from 'jspdf';

interface ChartScreenshots {
  performanceChart?: string;
  seoChart?: string;
  responseTimeChart?: string;
  pieChart?: string;
}

export function generatePerfectPDF({
  data,
  url,
  screenshots
}: {
  data: MonitoringResult;
  url: string;
  screenshots: ChartScreenshots;
}) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;
  let currentPage = 1;

  // Helper functions for perfect alignment
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left') => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');

    let xPos = margin;
    if (align === 'center') {
      xPos = pageWidth / 2 - pdf.getTextWidth(text) / 2;
    } else if (align === 'right') {
      xPos = pageWidth - margin - pdf.getTextWidth(text);
    }

    pdf.text(text, xPos, yPosition);
    yPosition += fontSize * 0.6 + 1;
  };

  const addSection = (title: string) => {
    yPosition += 10;
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      currentPage++;
      yPosition = margin;
    }
    addText(title, 16, true);
    yPosition += 5;
  };

  const addMetricRow = (label: string, value: string | number, color: string) => {
    const labelWidth = 80;
    const valueWidth = 60;
    const rowHeight = 12;
    const boxPadding = 3;

    // Label box
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, yPosition - rowHeight + boxPadding, labelWidth, rowHeight - boxPadding * 2, 'F');
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(11);
    pdf.text(label, margin + 5, yPosition - rowHeight / 2 + 2);

    // Value box
    pdf.setFillColor(color);
    pdf.rect(margin + labelWidth + 5, yPosition - rowHeight + boxPadding, valueWidth, rowHeight - boxPadding * 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text(String(value), margin + labelWidth + 10, yPosition - rowHeight / 2 + 2);

    yPosition += rowHeight + 5;
  };

  const addScreenshot = (imageData: string, title: string, width: number = 170, height: number = 100) => {
    if (imageData && imageData.startsWith('data:image')) {
      addText(title, 14, true, 'center');

      // Center the image
      const imageX = (pageWidth - width) / 2;

      // Add border around image
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(imageX - 2, yPosition - 2, width + 4, height + 4);

      // Add image
      pdf.addImage(imageData, 'PNG', imageX, yPosition, width, height);

      yPosition += height + 15;
    } else {
      // Placeholder if no image
      addText(title, 14, true, 'center');
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin, yPosition, pageWidth - margin * 2, height);
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(10);
      pdf.text('Screenshot not available', pageWidth / 2, yPosition + height / 2, { align: 'center' });
      yPosition += height + 15;
    }
  };

  const addDetailedTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const formatted = date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
    return formatted;
  };

  // PAGE 1: Cover Page with Perfect Alignment
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, 0, pageWidth, 70, 'F');

  pdf.setTextColor(255, 255, 255);
  yPosition = 30;
  addText('Website Analytics Report', 24, true, 'center');
  addText(url, 16, false, 'center');
  addText(`Generated: ${addDetailedTime(new Date().toISOString())}`, 12, false, 'center');

  pdf.setTextColor(0, 0, 0);
  yPosition = 90;

  // Status Section
  addSection('🌐 Website Status');
  const statusColors = {
    up: '#22C55E',
    down: '#EF4444',
    degraded: '#FB923C',
    pending: '#9CA3AF'
  };

  addMetricRow('Current Status', data.website.status.toUpperCase(), statusColors[data.website.status] || '#9CA3AF');
  addMetricRow('HTTP Status', String(data.website.httpStatusCode || 'N/A'), data.website.httpStatusCode === 200 ? '#22C55E' : '#EF4444');
  addMetricRow('Last Checked', addDetailedTime(data.lastChecked || new Date().toISOString()), '#6B7280');

  // Key Metrics Grid
  addSection('📊 Key Metrics');

  const metrics = [
    { label: 'Response Time', value: `${data.website.responseTime || 'N/A'}ms`, color: '#3B82F6' },
    { label: 'Average Response', value: `${data.website.averageResponseTime || 'N/A'}ms`, color: '#8B5CF6' },
    { label: 'Uptime', value: `${data.website.uptime24h || 'N/A'}%`, color: '#10B981' },
    { label: 'SEO Score', value: `${data.seo.score || 'N/A'}/100`, color: '#F59E0B' }
  ];

  metrics.forEach((metric, index) => {
    if (index % 2 === 1) {
      // Second column - reset x position
      yPosition -= 17; // Go back up for second column
      addMetricRow(metric.label, metric.value, metric.color);
      yPosition += 5; // Add space after row pair
    } else {
      addMetricRow(metric.label, metric.value, metric.color);
    }
  });

  // PAGE 2: Performance Overview with Screenshots
  pdf.addPage();
  currentPage++;
  yPosition = margin;

  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, 0, pageWidth, 50, 'F');
  pdf.setTextColor(255, 255, 255);
  yPosition = 30;
  addText('Performance Analysis', 20, true, 'center');

  pdf.setTextColor(0, 0, 0);
  yPosition = 70;

  // Performance Scores
  addSection('⚡ Performance Scores');

  const scores = [
    { label: 'Performance', value: data.website.performanceScore || 0, color: '#3B82F6' },
    { label: 'Mobile', value: data.website.mobileScore || 0, color: '#10B981' },
    { label: 'Desktop', value: data.website.desktopScore || 0, color: '#F59E0B' },
    { label: 'Accessibility', value: data.website.accessibilityScore || 0, color: '#8B5CF6' },
    { label: 'Best Practices', value: data.website.bestPracticesScore || 0, color: '#EF4444' }
  ];

  scores.forEach((score) => {
    addMetricRow(score.label, `${score.value}/100`, score.color);
  });

  // Performance Chart Screenshot
  if (screenshots.performanceChart) {
    addSection('📈 Performance Breakdown Chart');
    addScreenshot(screenshots.performanceChart, 'Performance Breakdown Analysis');
  }

  // PAGE 3: Response Time Analysis
  pdf.addPage();
  currentPage++;
  yPosition = margin;

  pdf.setFillColor(16, 185, 129);
  pdf.rect(0, 0, pageWidth, 50, 'F');
  pdf.setTextColor(255, 255, 255);
  yPosition = 30;
  addText('Response Time Analysis', 20, true, 'center');

  pdf.setTextColor(0, 0, 0);
  yPosition = 70;

  // Detailed Timing Metrics
  addSection('⏱️ Detailed Timing Metrics');

  const timingMetrics = [
    { label: 'DNS Lookup', value: `${data.website.dnsLookupTime || 'N/A'}ms`, color: '#3B82F6' },
    { label: 'TCP Connect', value: `${data.website.tcpConnectTime || 'N/A'}ms`, color: '#10B981' },
    { label: 'TLS Handshake', value: `${data.website.tlsHandshakeTime || 'N/A'}ms`, color: '#F59E0B' },
    { label: 'Time to First Byte', value: `${data.website.ttfb || 'N/A'}ms`, color: '#8B5CF6' }
  ];

  timingMetrics.forEach((metric) => {
    addMetricRow(metric.label, metric.value, metric.color);
  });

  // Response Time Chart Screenshot
  if (screenshots.responseTimeChart) {
    addSection('📉 Response Time History');
    addScreenshot(screenshots.responseTimeChart, 'Response Time Trend Analysis');
  }

  // Core Web Vitals
  if (data.website.coreWebVitals) {
    addSection('🎯 Core Web Vitals');

    const vitals = [
      { label: 'Largest Contentful Paint', value: `${data.website.coreWebVitals.lcp || 'N/A'}ms`, color: '#3B82F6' },
      { label: 'First Input Delay', value: `${data.website.coreWebVitals.fid || 'N/A'}ms`, color: '#10B981' },
      { label: 'Cumulative Layout Shift', value: data.website.coreWebVitals.cls || 'N/A', color: '#F59E0B' }
    ];

    vitals.forEach((vital) => {
      addMetricRow(vital.label, vital.value, vital.color);
    });
  }

  // PAGE 4: SEO Analysis
  pdf.addPage();
  currentPage++;
  yPosition = margin;

  pdf.setFillColor(139, 92, 246);
  pdf.rect(0, 0, pageWidth, 50, 'F');
  pdf.setTextColor(255, 255, 255);
  yPosition = 30;
  addText('SEO Analysis', 20, true, 'center');

  pdf.setTextColor(0, 0, 0);
  yPosition = 70;

  // SEO Score
  addSection('🔍 SEO Score');
  const seoScoreValue = data.seo.score || 0;
  const seoColor = seoScoreValue >= 80 ? '#10B981' : seoScoreValue >= 60 ? '#F59E0B' : '#EF4444';
  addMetricRow('Overall SEO Score', `${seoScoreValue}/100`, seoColor);

  // SEO Elements
  addSection('📋 SEO Elements Analysis');

  const seoElements = [
    { label: 'Title Tag', value: data.seo.titleTag.present ? 'Present' : 'Missing', color: data.seo.titleTag.present ? '#10B981' : '#EF4444' },
    { label: 'Meta Description', value: data.seo.metaDescription.present ? 'Present' : 'Missing', color: data.seo.metaDescription.present ? '#10B981' : '#EF4444' },
    { label: 'H1 Tags', value: `${data.seo.headings.h1Count} found`, color: data.seo.headings.h1Count === 1 ? '#10B981' : data.seo.headings.h1Count === 0 ? '#EF4444' : '#F59E0B' },
    { label: 'Canonical Tag', value: data.seo.canonicalTag ? 'Present' : 'Missing', color: data.seo.canonicalTag ? '#10B981' : '#EF4444' },
    { label: 'Mobile Friendly', value: data.seo.mobileFriendly ? 'Yes' : 'No', color: data.seo.mobileFriendly ? '#10B981' : '#EF4444' },
    { label: 'Robots.txt', value: data.seo.robotsTxt ? 'Found' : 'Not Found', color: data.seo.robotsTxt ? '#10B981' : '#EF4444' },
    { label: 'Sitemap.xml', value: data.seo.sitemap ? 'Found' : 'Not Found', color: data.seo.sitemap ? '#10B981' : '#EF4444' }
  ];

  seoElements.forEach((element) => {
    addMetricRow(element.label, element.value, element.color);
  });

  // Images Analysis
  addSection('🖼️ Images Analysis');
  addMetricRow('Total Images', String(data.seo.images.total), '#6B7280');
  addMetricRow('With ALT Text', String(data.seo.images.withAlt), '#10B981');
  addMetricRow('Missing ALT', String(data.seo.images.missingAlt), data.seo.images.missingAlt > 0 ? '#EF4444' : '#10B981');

  // SEO Chart Screenshot
  if (screenshots.seoChart) {
    addSection('📊 SEO Analysis Chart');
    addScreenshot(screenshots.seoChart, 'SEO Elements Visualization');
  }

  // PAGE 5: Issues & Recommendations
  pdf.addPage();
  currentPage++;
  yPosition = margin;

  pdf.setFillColor(239, 68, 68);
  pdf.rect(0, 0, pageWidth, 50, 'F');
  pdf.setTextColor(255, 255, 255);
  yPosition = 30;
  addText('Issues & Recommendations', 20, true, 'center');

  pdf.setTextColor(0, 0, 0);
  yPosition = 70;

  // Issues
  if (data.seo.issues.length > 0) {
    addSection('⚠️ SEO Issues');
    data.seo.issues.forEach((issue, index) => {
      pdf.setTextColor(239, 68, 68);
      pdf.setFontSize(10);
      pdf.text(`${index + 1}. ${issue}`, margin + 5, yPosition);
      yPosition += 8;
    });
  }

  // Recommendations
  if (data.seo.recommendations.length > 0) {
    addSection('💡 Recommendations');
    data.seo.recommendations.slice(0, 15).forEach((rec, index) => {
      pdf.setTextColor(16, 185, 129);
      pdf.setFontSize(10);
      pdf.text(`${index + 1}. ${rec}`, margin + 5, yPosition);
      yPosition += 8;
    });
  }

  // Footer on all pages
  for (let i = 1; i <= currentPage; i++) {
    pdf.setPage(i);
    pdf.setTextColor(156, 163, 175);
    pdf.setFontSize(8);
    pdf.text(`Generated by WebMetrics - Real-Time Website Monitoring & SEO Analytics`, margin, pageHeight - 10);
    pdf.text(`Page ${i} of ${currentPage}`, pageWidth - margin - 20, pageHeight - 10);
    pdf.text(`Report Date: ${new Date().toLocaleDateString()}`, margin, pageHeight - 15);
  }

  // Save the PDF
  const filename = `webmetrics-report-${new URL(url).hostname}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);

  console.log('Perfect PDF report generated successfully:', filename);
}
