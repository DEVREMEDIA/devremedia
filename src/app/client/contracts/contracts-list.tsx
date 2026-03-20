'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { FileText, Download, Upload, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { isContractSignable } from '@/lib/constants';
import type { ContractWithProject } from '@/types';

interface ContractsListProps {
  contracts: ContractWithProject[];
}

export function ContractsList({ contracts }: ContractsListProps) {
  const router = useRouter();
  const t = useTranslations('client.contracts');

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
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
    <div className="space-y-3">
      {contracts.map((contract) => (
        <Card key={contract.id} className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium line-clamp-1">{contract.title}</div>
                {contract.project?.title && (
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {contract.project.title}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <StatusBadge status={contract.status} />
                  <span className="text-xs text-muted-foreground">
                    {t('created')}: {format(new Date(contract.created_at), 'dd/MM/yyyy')}
                  </span>
                  {contract.expires_at && (
                    <span className="text-xs text-muted-foreground">
                      {t('expires')}: {format(new Date(contract.expires_at), 'dd/MM/yyyy')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              {isContractSignable(contract.status) && (
                <Button size="sm" onClick={() => router.push(`/client/contracts/${contract.id}`)}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {t('uploadSigned')}
                </Button>
              )}
              {['signed', 'pending_review'].includes(contract.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/api/contracts/${contract.id}/pdf`, '_blank')}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  {t('downloadPdf')}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push(`/client/contracts/${contract.id}`)}
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                {t('viewContract')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
