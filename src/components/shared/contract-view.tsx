'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

interface Contract {
  id: string;
  title: string;
  status: string;
  created_at: string;
  expires_at?: string | null;
  agreed_amount?: number | null;
  payment_method?: string | null;
  client?: { contact_name?: string | null; company_name?: string | null } | null;
}

interface ContractViewProps {
  contract: Contract;
}

export function ContractView({ contract }: ContractViewProps) {
  const t = useTranslations('contracts');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      try {
        const res = await fetch(`/api/contracts/${contract.id}/pdf?inline=true`);
        if (!res.ok) throw new Error('Failed to load PDF');
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch {
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.id]);

  return (
    <div className="space-y-4">
      {/* PDF Preview */}
      <div className="rounded-lg border bg-muted/30 overflow-hidden" style={{ height: '70vh' }}>
        {isLoading && (
          <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>{t('loadingPdf')}</p>
          </div>
        )}
        {hasError && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <p>{t('pdfPreviewUnavailable')}</p>
            <a
              href={`/api/contracts/${contract.id}/pdf`}
              className="text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('openPdfNewTab')}
            </a>
          </div>
        )}
        {blobUrl && (
          <iframe src={blobUrl} className="w-full h-full border-0" title={contract.title} />
        )}
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('status')}</p>
            <div className="mt-1">
              <StatusBadge status={contract.status} />
            </div>
          </CardContent>
        </Card>
        {contract.client && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('client')}
              </p>
              <p className="mt-1 font-semibold text-sm">
                {contract.client.contact_name || contract.client.company_name}
              </p>
            </CardContent>
          </Card>
        )}
        {contract.agreed_amount != null && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('amount')}
              </p>
              <p className="mt-1 font-semibold text-sm">
                &euro;{contract.agreed_amount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        )}
        {contract.expires_at && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('deadline')}
              </p>
              <p className="mt-1 font-semibold text-sm">
                {format(new Date(contract.expires_at), 'dd/MM/yyyy')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
