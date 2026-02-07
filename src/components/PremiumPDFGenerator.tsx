import { MonitoringResult } from '@/types/metrics';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ChartScreenshots {
  performanceChart?: string;
  seoChart?: string;
  responseTimeChart?: string;
  pieChart?: string;
}

export function generatePremiumPDF({
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
  const margin = 25;
  let yPosition = margin;
  let currentPage = 1;

  // Professional color scheme
  const colors = {
    primary: [41, 98, 255],      // Professional blue
    secondary: [245, 158, 11],   // Amber
    success: [16, 185, 129],     // Emerald
    danger: [239, 68, 68],       // Red
    warning: [251, 146, 60],     // Orange
    info: [59, 130, 246],        // Light blue
    purple: [139, 92, 246],      // Purple
    dark: [30, 41, 59],          // Dark blue-gray
    light: [248, 250, 252],      // Light gray
    border: [226, 232, 240]      // Border gray
  };

  // Helper functions with professional typography
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left', color: number[] = colors.dark) => {
    // Use different fonts for different purposes
    if (fontSize >= 20) {
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal'); // Headers
    } else if (fontSize >= 14) {
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal'); // Subheaders
    } else {
      pdf.setFont('courier', isBold ? 'bold' : 'normal'); // Data text for better readability
    }

    pdf.setFontSize(fontSize);
    pdf.setTextColor(color[0], color[1], color[2]);

    let xPos = margin;
    if (align === 'center') {
      xPos = pageWidth / 2 - pdf.getTextWidth(text) / 2;
    } else if (align === 'right') {
      xPos = pageWidth - margin - pdf.getTextWidth(text);
    }

    pdf.text(text, xPos, yPosition);
    yPosition += fontSize * 0.7 + 1;
  };

  const addSection = (title: string, icon: string = '') => {
    yPosition += 15;
    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      currentPage++;
      yPosition = margin;
    }

    // Section header with icon
    if (icon) {
      addText(`${icon} ${title}`, 18, true, 'left', colors.primary);
    } else {
      addText(title, 18, true, 'left', colors.primary);
    }

    // Add underline
    pdf.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, margin + 60, yPosition);

    yPosition += 10;
  };

  const addMetricCard = (label: string, value: string | number, color: number[], width: number = 80) => {
    const cardHeight = 25;
    const cardPadding = 8;

    // Card background
    pdf.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
    pdf.rect(margin, yPosition - cardHeight + cardPadding, width, cardHeight - cardPadding * 2, 'F');

    // Card border
    pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    pdf.rect(margin, yPosition - cardHeight + cardPadding, width, cardHeight - cardPadding * 2);

    // Label
    pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(label, margin + 8, yPosition - cardHeight + cardPadding + 8);

    // Value with color
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    const valueText = String(value);
    pdf.text(valueText, margin + 8, yPosition - cardHeight + cardPadding + 18);

    yPosition += cardHeight + 10;
  };

  const addTwoColumnMetrics = (metrics: Array<{ label: string, value: string | number, color: number[] }>) => {
    metrics.forEach((metric, index) => {
      if (index % 2 === 0) {
        // First column
        addMetricCard(metric.label, metric.value, metric.color, 80);
      } else {
        // Second column - go back up and place next to first
        yPosition -= 35;
        addMetricCard(metric.label, metric.value, metric.color, 80);
        yPosition += 10;
      }
    });
  };

  const addProfessionalScreenshot = (imageData: string, title: string, subtitle: string = '') => {
    if (imageData && imageData.startsWith('data:image')) {
      // Title
      addText(title, 16, true, 'center', colors.primary);
      if (subtitle) {
        addText(subtitle, 11, false, 'center', colors.info);
        yPosition += 5;
      }

      // Image with professional border
      const imageWidth = 160;
      const imageHeight = 90;
      const imageX = (pageWidth - imageWidth) / 2;

      // Shadow effect
      pdf.setFillColor(0, 0, 0, 0.1);
      pdf.rect(imageX + 2, yPosition + 2, imageWidth, imageHeight, 'F');

      // Border
      pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      pdf.setLineWidth(1);
      pdf.rect(imageX, yPosition, imageWidth, imageHeight);

      // Image
      pdf.addImage(imageData, 'PNG', imageX, yPosition, imageWidth, imageHeight);

      yPosition += imageHeight + 20;
    } else {
      // Professional placeholder
      addText(title, 16, true, 'center', colors.primary);

      const placeholderWidth = 160;
      const placeholderHeight = 90;
      const placeholderX = (pageWidth - placeholderWidth) / 2;

      // Placeholder background
      pdf.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
      pdf.rect(placeholderX, yPosition, placeholderWidth, placeholderHeight, 'F');

      // Placeholder border
      pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      pdf.setLineWidth(1);
      pdf.rect(placeholderX, yPosition, placeholderWidth, placeholderHeight);

      // Placeholder text
      pdf.setTextColor(colors.info[0], colors.info[1], colors.info[2]);
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(12);
      pdf.text('Chart Screenshot', pageWidth / 2, yPosition + placeholderHeight / 2 - 5, { align: 'center' });
      pdf.text('Not Available', pageWidth / 2, yPosition + placeholderHeight / 2 + 5, { align: 'center' });

      yPosition += placeholderHeight + 20;
    }
  };

  const addDetailedTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    };
    return date.toLocaleString('en-US', options);
  };

  const addWatermark = () => {
    pdf.setTextColor(colors.border[0], colors.border[1], colors.border[2]);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.text('WebMetrics Professional Report', pageWidth / 2, pageHeight - 15, { align: 'center' });
  };

  // PAGE 1: Professional Cover Page
  // Gradient header
  const gradientSteps = 20;
  for (let i = 0; i < gradientSteps; i++) {
    const ratio = i / gradientSteps;
    const r = Math.round(colors.primary[0] * (1 - ratio) + colors.dark[0] * ratio);
    const g = Math.round(colors.primary[1] * (1 - ratio) + colors.dark[1] * ratio);
    const b = Math.round(colors.primary[2] * (1 - ratio) + colors.dark[2] * ratio);
    pdf.setFillColor(r, g, b);
    pdf.rect(0, i * 3, pageWidth, 3, 'F');
  }

  // Company branding area
  pdf.setTextColor(255, 255, 255);
  yPosition = 35;
  addText('WebMetrics Professional', 32, true, 'center', [255, 255, 255]);
  addText('Website Analytics Report', 20, false, 'center', [255, 255, 255]);

  // URL in a box
  pdf.setFillColor(255, 255, 255, 0.2);
  pdf.rect(margin + 30, yPosition, pageWidth - margin * 2 - 60, 15, 'F');
  const urlText = String(url);
  addText(urlText, 16, true, 'center', [255, 255, 255]);

  // Report details
  yPosition += 25;
  addText(`Generated: ${addDetailedTimestamp(new Date().toISOString())}`, 12, false, 'center', [255, 255, 255]);
  addText(`Report ID: WM-${Date.now()}`, 10, false, 'center', [255, 255, 255]);

  pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  yPosition = 120;

  // Executive Summary
  addSection('📊 Executive Summary', '');

  const statusColors = {
    up: colors.success,
    down: colors.danger,
    degraded: colors.warning,
    pending: colors.info
  };

  // Status indicator with large card
  const statusCardWidth = 120;
  const statusCardHeight = 40;
  const statusColor = statusColors[data.website.status] || colors.info;
  pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  pdf.roundedRect(margin, yPosition - statusCardHeight + 10, statusCardWidth, statusCardHeight, 5, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  const statusText = String(data.website.status.toUpperCase());
  pdf.text(statusText, margin + 10, yPosition - statusCardHeight + 30);

  pdf.setFontSize(10);
  pdf.text('Current Status', margin + 10, yPosition - statusCardHeight + 15);

  yPosition += 50;

  // Key Performance Indicators
  addSection('🎯 Key Performance Indicators', '');

  const kpis = [
    { label: 'Response Time', value: `${data.website.responseTime || 'N/A'}ms`, color: colors.primary },
    { label: 'HTTP Status', value: String(data.website.httpStatusCode || 'N/A'), color: data.website.httpStatusCode === 200 ? colors.success : colors.danger },
    { label: 'Uptime', value: `${data.website.uptime24h || 'N/A'}%`, color: colors.success },
    { label: 'SEO Score', value: `${data.seo.score || 'N/A'}/100`, color: colors.secondary }
  ];

  addTwoColumnMetrics(kpis);

  // PAGE 2: Performance Analysis
  pdf.addPage();
  currentPage++;
  yPosition = margin;

  // Header
  pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  pdf.rect(0, 0, pageWidth, 60, 'F');

  pdf.setTextColor(255, 255, 255);
  yPosition = 35;
  addText('Performance Analysis', 24, true, 'center', [255, 255, 255]);
  addText('Detailed Performance Metrics & Analysis', 12, false, 'center', [255, 255, 255]);

  pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  yPosition = 80;

  // Performance Scores Dashboard
  addSection('⚡ Performance Scores Dashboard', '');

  const scores = [
    { label: 'Performance', value: `${data.website.performanceScore || 0}/100`, color: colors.primary },
    { label: 'Mobile', value: `${data.website.mobileScore || 0}/100`, color: colors.success },
    { label: 'Desktop', value: `${data.website.desktopScore || 0}/100`, color: colors.warning },
    { label: 'Accessibility', value: `${data.website.accessibilityScore || 0}/100`, color: colors.info },
    { label: 'Best Practices', value: `${data.website.bestPracticesScore || 0}/100`, color: colors.purple }
  ];

  addTwoColumnMetrics(scores);

  // Performance Chart
  if (screenshots.performanceChart) {
    addSection('📈 Performance Breakdown', '');
    addProfessionalScreenshot(screenshots.performanceChart, 'Performance Breakdown Analysis', 'Response time components distribution');
  }

  // PAGE 3: Technical Analysis
  pdf.addPage();
  currentPage++;
  yPosition = margin;

  pdf.setFillColor(colors.info[0], colors.info[1], colors.info[2]);
  pdf.rect(0, 0, pageWidth, 60, 'F');

  pdf.setTextColor(255, 255, 255);
  yPosition = 35;
  addText('Technical Analysis', 24, true, 'center', [255, 255, 255]);
  addText('Response Time & Core Web Vitals', 12, false, 'center', [255, 255, 255]);

  pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  yPosition = 80;

  // Timing Metrics
  addSection('⏱️ Detailed Timing Analysis', '');

  const timingMetrics = [
    { label: 'DNS Lookup', value: `${data.website.dnsLookupTime || 'N/A'}ms`, color: colors.primary },
    { label: 'TCP Connect', value: `${data.website.tcpConnectTime || 'N/A'}ms`, color: colors.success },
    { label: 'TLS Handshake', value: `${data.website.tlsHandshakeTime || 'N/A'}ms`, color: colors.warning },
    { label: 'Time to First Byte', value: `${data.website.ttfb || 'N/A'}ms`, color: colors.info }
  ];

  addTwoColumnMetrics(timingMetrics);

  // Response Time Chart
  if (screenshots.responseTimeChart) {
    addSection('📉 Response Time History', '');
    addProfessionalScreenshot(screenshots.responseTimeChart, 'Response Time Trend Analysis', 'Last 20 monitoring checks');
  }

  // Core Web Vitals
  if (data.website.coreWebVitals) {
    addSection('🎯 Core Web Vitals', '');

    const vitals = [
      { label: 'Largest Contentful Paint', value: `${data.website.coreWebVitals.lcp || 'N/A'}ms`, color: colors.primary },
      { label: 'First Input Delay', value: `${data.website.coreWebVitals.fid || 'N/A'}ms`, color: colors.success },
      { label: 'Cumulative Layout Shift', value: data.website.coreWebVitals.cls || 'N/A', color: colors.warning }
    ];

    addTwoColumnMetrics(vitals);
  }

  // PAGE 4: SEO Analysis
  pdf.addPage();
  currentPage++;
  yPosition = margin;

  pdf.setFillColor(colors.purple[0], colors.purple[1], colors.purple[2]);
  pdf.rect(0, 0, pageWidth, 60, 'F');

  pdf.setTextColor(255, 255, 255);
  yPosition = 35;
  addText('SEO Analysis', 24, true, 'center', [255, 255, 255]);
  addText('Search Engine Optimization Assessment', 12, false, 'center', [255, 255, 255]);

  pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  yPosition = 80;

  // SEO Score
  addSection('🔍 SEO Performance Score', '');

  const seoScoreValue = data.seo.score || 0;
  const seoColor = seoScoreValue >= 80 ? colors.success : seoScoreValue >= 60 ? colors.warning : colors.danger;

  // Large SEO Score display
  const scoreCardWidth = 100;
  const scoreCardHeight = 50;
  pdf.setFillColor(seoColor[0], seoColor[1], seoColor[2]);
  pdf.roundedRect(margin, yPosition - scoreCardHeight + 10, scoreCardWidth, scoreCardHeight, 8, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.text(`${seoScoreValue}`, margin + 20, yPosition - scoreCardHeight + 35);
  pdf.setFontSize(12);
  pdf.text('/100', margin + 55, yPosition - scoreCardHeight + 35);

  yPosition += 60;

  // SEO Elements Analysis
  addSection('📋 SEO Elements Analysis', '');

  const seoElements = [
    { label: 'Title Tag', value: data.seo.titleTag.present ? '✓ Present' : '✗ Missing', color: data.seo.titleTag.present ? colors.success : colors.danger },
    { label: 'Meta Description', value: data.seo.metaDescription.present ? '✓ Present' : '✗ Missing', color: data.seo.metaDescription.present ? colors.success : colors.danger },
    { label: 'H1 Structure', value: `${data.seo.headings.h1Count} found`, color: data.seo.headings.h1Count === 1 ? colors.success : data.seo.headings.h1Count === 0 ? colors.danger : colors.warning },
    { label: 'Canonical Tag', value: data.seo.canonicalTag ? '✓ Present' : '✗ Missing', color: data.seo.canonicalTag ? colors.success : colors.danger },
    { label: 'Mobile Friendly', value: data.seo.mobileFriendly ? '✓ Yes' : '✗ No', color: data.seo.mobileFriendly ? colors.success : colors.danger },
    { label: 'Robots.txt', value: data.seo.robotsTxt ? '✓ Found' : '✗ Missing', color: data.seo.robotsTxt ? colors.success : colors.danger },
    { label: 'Sitemap.xml', value: data.seo.sitemap ? '✓ Found' : '✗ Missing', color: data.seo.sitemap ? colors.success : colors.danger }
  ];

  addTwoColumnMetrics(seoElements);

  // SEO Chart
  if (screenshots.seoChart) {
    addSection('📊 SEO Analysis Visualization', '');
    addProfessionalScreenshot(screenshots.seoChart, 'SEO Elements Overview', 'Comprehensive SEO assessment visualization');
  }

  // PAGE 5: Recommendations & Summary
  pdf.addPage();
  currentPage++;
  yPosition = margin;

  pdf.setFillColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  pdf.rect(0, 0, pageWidth, 60, 'F');

  pdf.setTextColor(255, 255, 255);
  yPosition = 35;
  addText('Recommendations & Summary', 24, true, 'center', [255, 255, 255]);
  addText('Actionable Insights & Next Steps', 12, false, 'center', [255, 255, 255]);

  pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
  yPosition = 80;

  // Issues
  if (data.seo.issues.length > 0) {
    addSection('⚠️ Critical Issues Identified', '');

    data.seo.issues.forEach((issue, index) => {
      pdf.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text(`${index + 1}. ${issue}`, margin + 5, yPosition);
      yPosition += 8;
    });

    yPosition += 10;
  }

  // Recommendations
  if (data.seo.recommendations.length > 0) {
    addSection('💡 Professional Recommendations', '');

    data.seo.recommendations.slice(0, 12).forEach((rec, index) => {
      pdf.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text(`${index + 1}. ${rec}`, margin + 5, yPosition);
      yPosition += 8;
    });
  }

  // Professional footer on all pages
  for (let i = 1; i <= currentPage; i++) {
    pdf.setPage(i);

    // Footer line
    pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    pdf.setLineWidth(0.5);
    pdf.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

    // Footer text
    pdf.setTextColor(colors.border[0], colors.border[1], colors.border[2]);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.text('Generated by WebMetrics Professional - Real-Time Website Monitoring & SEO Analytics', margin, pageHeight - 15);
    pdf.text(`Page ${i} of ${currentPage}`, pageWidth - margin - 20, pageHeight - 15);
    pdf.text(`Report Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, pageHeight - 10);

    // Confidentiality notice
    pdf.setFontSize(7);
    pdf.text('This report contains proprietary and confidential information', pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  // Save the PDF
  const filename = `WebMetrics-Professional-Report-${new URL(url).hostname}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);

  console.log('Premium PDF report generated successfully:', filename);
}
