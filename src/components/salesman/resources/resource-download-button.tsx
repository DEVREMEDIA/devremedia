'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSalesResourceDownloadUrl } from '@/lib/actions/sales-resources';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

interface ResourceDownloadButtonProps {
  filePath: string;
  fileName: string;
}

export function ResourceDownloadButton({ filePath }: ResourceDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    const result = await getSalesResourceDownloadUrl(filePath);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    // Open in new tab for download
    if (result.data) {
      window.open(result.data, '_blank');
    }
  };

  return (
    <Button onClick={handleDownload} disabled={isLoading}>
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          Loading...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download
        </>
      )}
    </Button>
  );
}
