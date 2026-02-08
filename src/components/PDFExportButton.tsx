import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { generateWorkingPremiumPDF } from './WorkingPremiumPDF';
import { captureAllCharts } from '@/utils/screenshotCapture';
import type { MonitoringResult } from '@/types/metrics';

interface PDFExportButtonProps {
  data: MonitoringResult;
  url: string;
  disabled?: boolean;
}

export function PDFExportButton({ data, url, disabled }: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      console.log('Starting PDF export for:', url);
      console.log('Data:', data);

      // Capture screenshots of all charts
      const screenshots = await captureAllCharts();
      console.log('Captured screenshots:', Object.keys(screenshots));

      // Generate PDF with screenshots
      generateWorkingPremiumPDF({ data, url, screenshots });
      console.log('Working Premium PDF export completed');
    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDF export failed. Please check the console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={disabled || isExporting}
      className="gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Export PDF
        </>
      )}
    </Button>
  );
}
