'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { FileText, Download, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { EmptyState } from '@/components/shared/empty-state';
import { useTranslations } from 'next-intl';
import { isContractSignable } from '@/lib/constants';
import type { ContractWithProject } from '@/types';

interface RecentContractsProps {
  contracts: ContractWithProject[];
}

export function RecentContracts({ contracts }: RecentContractsProps) {
  const router = useRouter();
  const t = useTranslations('client.dashboard');

  if (contracts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('contracts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={FileText}
            title={t('noContracts')}
            description={t('noContractsDescription')}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('contracts')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm line-clamp-1">{contract.title}</div>
                  {contract.project?.title && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {contract.project.title}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={contract.status} />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(contract.created_at), 'dd/MM/yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {isContractSignable(contract.status) && (
                  <Button size="sm" onClick={() => router.push(`/client/contracts/${contract.id}`)}>
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {t('uploadSigned')}
                  </Button>
                )}
                {['signed', 'pending_review'].includes(contract.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/api/contracts/${contract.id}/pdf`, '_blank')}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    {t('downloadPdf')}
                  </Button>
                )}
                {!isContractSignable(contract.status) &&
                  contract.status !== 'signed' &&
                  contract.status !== 'pending_review' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/client/contracts/${contract.id}`)}
                    >
                      {t('viewContract')}
                    </Button>
                  )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
