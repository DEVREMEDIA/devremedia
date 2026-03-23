'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getContractsByClient } from '@/lib/actions/contracts';
import type { ContractWithProject } from '@/types/relations';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileSignature, Plus, ExternalLink, Download, Send } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface ClientContractsTabProps {
  clientId: string;
  refreshKey: number;
}

export function ClientContractsTab({ clientId, refreshKey }: ClientContractsTabProps) {
  const t = useTranslations('clients');
  const [contracts, setContracts] = useState<ContractWithProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const contractsResult = await getContractsByClient(clientId);
      if (!contractsResult.error && contractsResult.data) {
        setContracts(contractsResult.data);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [clientId, refreshKey]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={FileSignature}
            title={t('contracts.noContracts')}
            description={t('contracts.noContractsDescription')}
            action={{
              label: t('contracts.addContract'),
              onClick: () => {
                window.location.href = '/admin/contracts/new?clientId=${clientId}';
              },
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t('tabs.contracts')} ({contracts.length})
        </h3>
        <Button size="sm" asChild>
          <Link href="/admin/contracts/new?clientId=${clientId}">
            <Plus className="mr-2 h-4 w-4" />
            {t('contracts.addContract')}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {contracts.map((contract) => (
          <ContractCard key={contract.id} contract={contract} />
        ))}
      </div>
    </div>
  );
}

function ContractCard({ contract }: { contract: ContractWithProject }) {
  const t = useTranslations('clients');
  const displayDate =
    contract.signed_at ?? contract.viewed_at ?? contract.sent_at ?? contract.created_at;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{contract.title}</CardTitle>
          <StatusBadge status={contract.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {contract.project && (
          <p className="text-sm text-muted-foreground">{contract.project.title}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {format(new Date(displayDate), 'MMM d, yyyy')}
        </p>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/contracts/${contract.id}`}>
              <ExternalLink className="mr-1 h-3 w-3" />
              {t('contracts.view')}
            </Link>
          </Button>
          {contract.status === 'signed' && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/api/contracts/pdf?id=${contract.id}`} target="_blank">
                <Download className="mr-1 h-3 w-3" />
                {t('contracts.downloadPdf')}
              </Link>
            </Button>
          )}
          {(contract.status === 'sent' || contract.status === 'viewed') && (
            <Button variant="outline" size="sm">
              <Send className="mr-1 h-3 w-3" />
              {t('contracts.resend')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
