import { MonitoringResult } from '@/types/metrics';
import jsPDF from 'jspdf';
import { ChartDataPoint } from './ResponseTimeChart';

interface PDFReportGeneratorProps {
  data: MonitoringResult;
  url: string;
}

export function generatePDFReport({ data, url }: PDFReportGeneratorProps) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper functions
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.text(text, margin, yPosition);
    yPosition += fontSize * 0.5 + 2;
  };

  const addSection = (title: string) => {
    yPosition += 10;
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = margin;
    }
    addText(title, 16, true);
    yPosition += 5;
  };

  const addMetric = (label: string, value: string | number | null, unit: string = '') => {
    const displayValue = value !== null ? `${value}${unit}` : 'N/A';
    addText(`${label}: ${displayValue}`, 11);
  };

  // Header Section
  pdf.setFillColor(59, 130, 246); // Blue background
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setTextColor(255, 255, 255);
  addText('Website Analytics Report', 20, true);
  addText(url, 14, false);
  
  // Make URL clickable (blue underline effect)
  pdf.setTextColor(100, 149, 237);
  pdf.textWithLink(url, margin, yPosition - 5, { url: url.startsWith('http') ? url : `https://${url}` });
  
  pdf.setTextColor(255, 255, 255);
  addText(`Report Generated: ${new Date().toLocaleString()}`, 10);
  
  pdf.setTextColor(0, 0, 0);
  yPosition = 50;

  // Overview Section
  addSection('📊 Overview');
  
  // Status Badge
  const statusColors = {
    up: [34, 197, 94],    // green
    down: [239, 68, 68],  // red
    degraded: [251, 146, 60], // orange
    pending: [156, 163, 175]  // gray
  };
  
  const [r, g, b] = statusColors[data.website.status] || statusColors.pending;
  pdf.setFillColor(r, g, b);
  pdf.circle(margin + 2, yPosition, 3, 'F');
  addText(`Status: ${data.website.status.toUpperCase()}`, 12);
  
  addMetric('HTTP Status Code', data.website.httpStatusCode);
  addMetric('Response Time', data.website.responseTime, 'ms');
  addMetric('Average Response Time', data.website.averageResponseTime, 'ms');
  addMetric('Uptime (Session)', data.website.uptime24h, '%');
  addMetric('Last Checked', data.lastChecked ? new Date(data.lastChecked).toLocaleString() : null);

  // Performance Metrics Section
  addSection('⚡ Performance Metrics');
  
  addMetric('Time to First Byte (TTFB)', data.website.ttfb, 'ms');
  addMetric('DNS Lookup Time', data.website.dnsLookupTime, 'ms');
  addMetric('TCP Connect Time', data.website.tcpConnectTime, 'ms');
  addMetric('TLS Handshake Time', data.website.tlsHandshakeTime, 'ms');

  // Performance Scores
  addMetric('Performance Score', data.website.performanceScore, '/100');
  addMetric('Mobile Score', data.website.mobileScore, '/100');
  addMetric('Desktop Score', data.website.desktopScore, '/100');
  addMetric('Accessibility Score', data.website.accessibilityScore, '/100');
  addMetric('Best Practices Score', data.website.bestPracticesScore, '/100');

  // Core Web Vitals
  if (data.website.coreWebVitals) {
    addSection('🎯 Core Web Vitals');
    addMetric('Largest Contentful Paint (LCP)', data.website.coreWebVitals.lcp, 'ms');
    addMetric('First Input Delay (FID)', data.website.coreWebVitals.fid, 'ms');
    addMetric('Cumulative Layout Shift (CLS)', data.website.coreWebVitals.cls);
  }

  // Performance Breakdown Chart
  if (data.website.performanceBreakdown) {
    addSection('📈 Performance Breakdown');
    
    const breakdown = data.website.performanceBreakdown;
    const total = Object.values(breakdown).reduce((sum, val) => sum + (val || 0), 0);
    
    if (total > 0) {
      // Create pie chart
      const chartX = margin + 60;
      const chartY = yPosition + 20;
      const radius = 30;
      
      const segments = [
        { label: 'DNS', value: breakdown.dns || 0, color: [59, 130, 246] },
        { label: 'Connect', value: breakdown.connect || 0, color: [34, 197, 94] },
        { label: 'TTFB', value: breakdown.ttfb || 0, color: [251, 146, 60] },
        { label: 'Download', value: breakdown.download || 0, color: [168, 85, 247] }
      ];
      
      let currentAngle = -90; // Start from top
      
      segments.forEach((segment) => {
        if (segment.value > 0) {
          const angle = (segment.value / total) * 360;
          const endAngle = currentAngle + angle;
          
          // Draw pie segment
          pdf.setFillColor(...segment.color);
          pdf.beginPath();
          pdf.arc(chartX, chartY, radius, currentAngle * Math.PI / 180, endAngle * Math.PI / 180);
          pdf.lineTo(chartX, chartY);
          pdf.fill();
          
          // Draw label
          const labelAngle = (currentAngle + endAngle) / 2;
          const labelX = chartX + Math.cos(labelAngle * Math.PI / 180) * (radius + 15);
          const labelY = chartY + Math.sin(labelAngle * Math.PI / 180) * (radius + 15);
          
          pdf.setFontSize(10);
          pdf.text(`${segment.label}: ${Math.round(segment.value)}ms`, labelX, labelY);
          
          currentAngle = endAngle;
        }
      });
      
      yPosition += 80;
    }
  }

  // Response Time History Chart
  if (data.website.responseTimeHistory && data.website.responseTimeHistory.length > 0) {
    addSection('📉 Response Time History');
    
    const history = data.website.responseTimeHistory.slice(-20); // Last 20 data points
    const chartWidth = pageWidth - margin * 2;
    const chartHeight = 60;
    const chartX = margin;
    const chartY = yPosition;
    
    // Draw chart axes
    pdf.setDrawColor(200, 200, 200);
    pdf.line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight);
    pdf.line(chartX, chartY, chartX, chartY + chartHeight);
    
    if (history.length > 0) {
      const maxTime = Math.max(...history.map(h => h.value));
      const minTime = Math.min(...history.map(h => h.value));
      const range = maxTime - minTime || 1;
      
      // Draw line chart
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(1.5);
      
      history.forEach((point, index) => {
        const x = chartX + (index / (history.length - 1)) * chartWidth;
        const y = chartY + chartHeight - ((point.value - minTime) / range) * chartHeight;
        
        if (index === 0) {
          pdf.moveTo(x, y);
        } else {
          pdf.lineTo(x, y);
        }
        
        // Draw data point
        pdf.setFillColor(59, 130, 246);
        pdf.circle(x, y, 2, 'F');
      });
      
      pdf.stroke();
      
      // Add min/max labels
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Max: ${maxTime}ms`, chartX, chartY - 5);
      pdf.text(`Min: ${minTime}ms`, chartX + chartWidth - 30, chartY - 5);
    }
    
    yPosition += chartHeight + 30;
  }

  // SEO Analysis Section
  addSection('🔍 SEO Analysis');
  
  addMetric('SEO Score', data.seo.score, '/100');
  
  // Title Tag Analysis
  addText('Title Tag:', 12, true);
  addText(`Present: ${data.seo.titleTag.present ? '✅ Yes' : '❌ No'}`);
  if (data.seo.titleTag.content) {
    addText(`Content: ${data.seo.titleTag.content.substring(0, 80)}${data.seo.titleTag.content.length > 80 ? '...' : ''}`);
    addText(`Length: ${data.seo.titleTag.length} characters`);
  }
  
  // Meta Description Analysis
  addText('Meta Description:', 12, true);
  addText(`Present: ${data.seo.metaDescription.present ? '✅ Yes' : '❌ No'}`);
  if (data.seo.metaDescription.content) {
    addText(`Content: ${data.seo.metaDescription.content.substring(0, 80)}${data.seo.metaDescription.content.length > 80 ? '...' : ''}`);
    addText(`Length: ${data.seo.metaDescription.length} characters`);
  }
  
  // Headings Structure
  addText('Headings Structure:', 12, true);
  addText(`H1 Tags: ${data.seo.headings.h1Count} ${data.seo.headings.h1Count === 1 ? '✅' : data.seo.headings.h1Count === 0 ? '❌' : '⚠️'}`);
  addText(`H2 Tags: ${data.seo.headings.h2Count}`);
  addText(`Proper Structure: ${data.seo.headings.hasProperStructure ? '✅ Yes' : '❌ No'}`);
  
  // Images Analysis
  addText('Images:', 12, true);
  addText(`Total Images: ${data.seo.images.total}`);
  addText(`With ALT: ${data.seo.images.withAlt} ✅`);
  addText(`Missing ALT: ${data.seo.images.missingAlt} ${data.seo.images.missingAlt === 0 ? '✅' : '❌'}`);
  
  // Technical SEO
  addText('Technical SEO:', 12, true);
  addText(`Canonical Tag: ${data.seo.canonicalTag ? '✅ Present' : '❌ Missing'}`);
  addText(`Robots.txt: ${data.seo.robotsTxt ? '✅ Found' : '❌ Not Found'}`);
  addText(`Sitemap.xml: ${data.seo.sitemap ? '✅ Found' : '❌ Not Found'}`);
  addText(`Mobile Friendly: ${data.seo.mobileFriendly ? '✅ Yes' : '❌ No'}`);
  addText(`Indexable: ${data.seo.indexable ? '✅ Yes' : '❌ No'}`);
  
  // Issues and Recommendations
  if (data.seo.issues.length > 0) {
    addSection('⚠️ SEO Issues');
    data.seo.issues.forEach(issue => {
      addText(`• ${issue}`, 10);
    });
  }
  
  if (data.seo.recommendations.length > 0) {
    addSection('💡 Recommendations');
    data.seo.recommendations.forEach(rec => {
      addText(`• ${rec}`, 10);
    });
  }

  // Footer
  const footerY = pageHeight - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text('Generated by WebMetrics - Real-Time Website Monitoring & SEO Analytics', margin, footerY);
  pdf.text(`Page 1 of 1`, pageWidth - margin - 20, footerY);

  // Save the PDF
  const filename = `webmetrics-report-${new URL(url).hostname}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}
