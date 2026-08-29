'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfPreviewProps {
  file: File;
  className?: string;
}

export function PdfPreview({ file, className }: PdfPreviewProps) {
  const t = useTranslations('invoices');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!blobUrl) return null;

  return (
    <div className={className}>
      <iframe
        src={blobUrl}
        className="h-full w-full rounded-md border"
        title={t('previewFrameTitle')}
      />
      <div className="mt-2 text-center">
        <Button variant="outline" size="sm" asChild>
          <a href={blobUrl} download={file.name}>
            <FileDown className="mr-2 h-4 w-4" />
            Download PDF
          </a>
        </Button>
      </div>
    </div>
  );
}
