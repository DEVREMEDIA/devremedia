'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ContractView } from '@/components/shared/contract-view';
import { PageHeader } from '@/components/shared/page-header';
import type { ContractWithRelations } from '@/types';

interface ContractViewClientProps {
  contract: ContractWithRelations;
}

export function ContractViewClient({ contract }: ContractViewClientProps) {
  const t = useTranslations('contracts');
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/contracts/${contract.id}/pdf`);
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-${contract.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('pdfDownloaded'));
    } catch {
      toast.error(t('pdfDownloadFailed'));
    }
  };

  const handleUpload = async () => {
    if (!fileRef.current?.files?.[0]) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', fileRef.current.files[0]);
    try {
      const response = await fetch(`/api/contracts/${contract.id}/upload-signed`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }
      toast.success(t('uploadSuccess'));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <PageHeader title={contract.title}>
        <div className="flex items-center gap-2">
          {['sent', 'viewed', 'signed', 'pending_review'].includes(contract.status) && (
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              {t('downloadPdf')}
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUpload}
          />
          {['sent', 'viewed'].includes(contract.status) && (
            <Button onClick={() => fileRef.current?.click()} disabled={isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? t('uploading') : t('uploadSigned')}
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="mt-6">
        <ContractView contract={contract} />
      </div>

      {contract.status === 'pending_review' && (
        <div className="mt-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-center text-sm">
          {t('pendingReviewMessage')}
        </div>
      )}
    </>
  );
}
