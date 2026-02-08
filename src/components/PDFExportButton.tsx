import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import { generatePDFReport } from '@/lib/pdfReportGenerator';
import type { MonitoringResult } from '@/types/metrics';

interface PDFExportButtonProps {
  data: MonitoringResult;
  url: string;
  disabled?: boolean;
}

export function PDFExportButton({ data, disabled }: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      generatePDFReport(data);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDF export failed. Please check the console for details.');
    } finally {
      setIsExporting(false);
    }
  }, [data]);

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
