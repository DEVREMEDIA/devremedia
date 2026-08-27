'use client';

import { useMemo, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { FileText, Eye, Trash2, Download } from 'lucide-react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { DataTable } from '@/components/shared/data-table';
import { deleteContract } from '@/lib/actions/contracts';
import { toast } from 'sonner';
import type { Contract } from '@/types';

interface ContractListProps {
  contracts: Contract[];
  onDelete: (id: string) => void;
}

export function ContractList({ contracts, onDelete }: ContractListProps) {
  const t = useTranslations('contracts');
  const tc = useTranslations('common');
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
    onDelete(deleteId);
    setDeleteId(null);
    setIsDeleting(false);
  };

  const handleDownloadPDF = useCallback(
    async (contractId: string) => {
      try {
        const response = await fetch(`/api/contracts/${contractId}/pdf`);
        if (!response.ok) {
          throw new Error('Failed to generate PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract-${contractId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success(t('pdfDownloaded'));
      } catch {
        toast.error(t('pdfDownloadFailed'));
      }
    },
    [t],
  );

  const columns: ColumnDef<Contract>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: t('contractTitle'),
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'created_at',
        header: t('created'),
        cell: ({ row }) => <span>{format(new Date(row.original.created_at), 'MMM d, yyyy')}</span>,
        meta: { numeric: true, align: 'left' },
      },
      {
        accessorKey: 'expires_at',
        header: t('expires'),
        cell: ({ row }) =>
          row.original.expires_at ? (
            <span>{format(new Date(row.original.expires_at), 'MMM d, yyyy')}</span>
          ) : (
            <span>-</span>
          ),
        meta: { numeric: true, align: 'left' },
      },
      {
        id: 'actions',
        header: tc('actions'),
        meta: { align: 'right', width: 'w-[130px]' },
        cell: ({ row }) => {
          const contract = row.original;
          return (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/admin/contracts/${contract.id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDownloadPDF(contract.id)}>
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteId(contract.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [t, tc, handleDownloadPDF],
  );

  if (contracts.length === 0) {
    return (
      <EmptyState icon={FileText} title={t('noContracts')} description={t('noContractsProject')} />
    );
  }

  return (
    <>
      <DataTable columns={columns} data={contracts} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('deleteContract')}
        description={t('deleteContractConfirm')}
        confirmLabel={tc('delete')}
        onConfirm={handleDelete}
        loading={isDeleting}
        destructive
      />
    </>
  );
}
