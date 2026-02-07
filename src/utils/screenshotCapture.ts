import html2canvas from 'html2canvas';

export async function captureChartScreenshot(elementId: string): Promise<string> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element with id "${elementId}" not found`);
      return '';
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error(`Error capturing screenshot for ${elementId}:`, error);
    return '';
  }
}

export async function captureAllCharts(): Promise<{
  performanceChart?: string;
  seoChart?: string;
  responseTimeChart?: string;
  pieChart?: string;
}> {
  const screenshots = {
    performanceChart: await captureChartScreenshot('performance-breakdown-chart'),
    seoChart: await captureChartScreenshot('seo-analysis-chart'),
    responseTimeChart: await captureChartScreenshot('response-time-chart'),
    pieChart: await captureChartScreenshot('pie-chart'),
  };

  return screenshots;
}

export function addChartIdsToComponents() {
  // This function should be called to add IDs to chart components
  // You can add these IDs to your chart components:
  
  // For PerformanceBreakdown component:
  // <div id="performance-breakdown-chart">
  
  // For SEOAnalysis component:
  // <div id="seo-analysis-chart">
  
  // For ResponseTimeChart component:
  // <div id="response-time-chart">
  
  // For PieChartCard component:
  // <div id="pie-chart">
}
