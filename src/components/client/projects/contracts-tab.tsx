'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { format } from 'date-fns';
import { FileText, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ContractWithRelations } from '@/types';

type ContractWithExtras = ContractWithRelations & {
  description?: string;
};

interface ContractsTabProps {
  contracts: ContractWithExtras[];
}

export function ContractsTab({ contracts }: ContractsTabProps) {
  const router = useRouter();
  const t = useTranslations('client.projects');

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={FileText}
            title={t('noContracts')}
            description={t('contractsWillAppear')}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {contracts.map((contract) => (
        <Card key={contract.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base">{contract.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={contract.status} />
                  {contract.sent_at && (
                    <span className="text-xs text-muted-foreground">
                      Sent {format(new Date(contract.sent_at), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/client/contracts/${contract.id}`)}
                >
                  View
                </Button>
                {(contract.status === 'sent' || contract.status === 'viewed') && (
                  <Button
                    size="sm"
                    onClick={() => router.push(`/client/contracts/${contract.id}/sign`)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Sign
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          {contract.description && (
            <CardContent>
              <p className="text-sm text-muted-foreground">{contract.description}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
