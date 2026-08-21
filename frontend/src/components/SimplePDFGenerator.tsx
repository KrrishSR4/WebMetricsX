import { MonitoringResult } from '@/types/metrics';
import jsPDF from 'jspdf';

export function generateSimplePDF({ data, url }: { data: MonitoringResult; url: string }) {
  try {
    const pdf = new jsPDF();
    
    // Add title
    pdf.setFontSize(20);
    pdf.text('Website Analytics Report', 20, 20);
    
    // Add URL
    pdf.setFontSize(14);
    pdf.text(`URL: ${url}`, 20, 35);
    
    // Add timestamp
    pdf.setFontSize(12);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 50);
    
    // Add basic metrics
    pdf.text(`Status: ${data.website.status}`, 20, 70);
    pdf.text(`Response Time: ${data.website.responseTime || 'N/A'}ms`, 20, 80);
    pdf.text(`HTTP Status: ${data.website.httpStatusCode || 'N/A'}`, 20, 90);
    pdf.text(`SEO Score: ${data.seo.score || 'N/A'}/100`, 20, 100);
    
    // Save the PDF
    const filename = `webmetrics-report-${new URL(url).hostname}-${Date.now()}.pdf`;
    pdf.save(filename);
    
    console.log('PDF saved successfully:', filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}
