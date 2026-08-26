'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { FileText, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { DataTable } from '@/components/shared/data-table';

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

  const columns: ColumnDef<ContractItem>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: t('contractTitle'),
        cell: ({ row }) => (
          <Link
            href={`/admin/contracts/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'client',
        header: t('client'),
        accessorFn: (row) => row.client?.company_name || row.client?.contact_name || '-',
      },
      {
        id: 'project',
        header: t('project'),
        accessorFn: (row) => row.project?.title || '-',
      },
      {
        accessorKey: 'created_at',
        header: t('created'),
        cell: ({ row }) => (
          <span>
            {new Date(row.original.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        ),
        meta: { numeric: true, align: 'left' },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/admin/contracts/${row.original.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        meta: { width: 'w-[110px]' },
      },
    ],
    [t],
  );

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
      <DataTable columns={columns} data={contracts} mobileHiddenColumns={['project']} />

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
