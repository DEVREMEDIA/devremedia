'use client';

import { useState } from 'react';
import { FileText, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';

import { deleteContract } from '@/lib/actions/contracts';
import { toast } from 'sonner';

interface ContractItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  client?: {
    company_name?: string;
    contact_name?: string;
  } | null;
  project?: {
    title?: string;
  } | null;
}

interface ContractsListPageProps {
  contracts: ContractItem[];
}

export function ContractsListPage({ contracts: initialContracts }: ContractsListPageProps) {
  const t = useTranslations('contracts');
  const [contracts, setContracts] = useState(initialContracts);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const result = await deleteContract(deleteId);

    if (result.error) {
      toast.error(result.error);
      setIsDeleting(false);
      return;
    }

    toast.success(t('contractDeletedSuccess'));
    setContracts((prev) => prev.filter((c) => c.id !== deleteId));
    setDeleteId(null);
    setIsDeleting(false);
  };

  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={t('noContracts')}
        description={t('noContractsListDescription')}
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {contracts.map((contract) => (
          <div
            key={contract.id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href={`/admin/contracts/${contract.id}`}
                    className="font-semibold text-sm hover:underline truncate"
                  >
                    {contract.title}
                  </Link>
                  <StatusBadge status={contract.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span>
                    {contract.client?.company_name || contract.client?.contact_name || '-'}
                  </span>
                  <span className="hidden sm:inline">{contract.project?.title || '-'}</span>
                  <span>
                    {new Date(contract.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/admin/contracts/${contract.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setDeleteId(contract.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('deleteContract')}
        description={t('deleteContractConfirm')}
        confirmLabel={t('delete')}
        onConfirm={handleDelete}
        loading={isDeleting}
        destructive
      />
    </>
  );
}
