'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DataTable } from '@/components/shared/data-table';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { bulkUpdateInvoiceStatus, bulkDeleteInvoices } from '@/lib/actions/invoices';
import { Send, CheckCircle, Trash2 } from 'lucide-react';
import type { InvoiceStatus } from '@/lib/constants';
import { formatEur as formatCurrency } from '@/lib/format';

interface Invoice {
  id: string;
  invoice_number: string;
  client: { id: string; contact_name: string; company_name?: string | null };
  total: number;
  status: string;
  issue_date: string;
  due_date: string;
}

interface InvoicesTableViewProps {
  invoices: Invoice[];
}

export function InvoicesTableView({ invoices }: InvoicesTableViewProps) {
  const t = useTranslations('invoices');
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<{
    invoices: Invoice[];
    clearSelection: () => void;
  } | null>(null);

  const openDeleteDialog = (selected: Invoice[], clearSelection: () => void) =>
    setPendingDelete({ invoices: selected, clearSelection });

  const handleBulkStatus = async (
    selected: Invoice[],
    status: InvoiceStatus,
    clearSelection: () => void,
  ) => {
    if (selected.length === 0) return;
    const ids = selected.map((invoice) => invoice.id);
    setLoading(true);
    const result = await bulkUpdateInvoiceStatus(ids, status);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      toast.success(t('bulkStatusUpdated', { count: result.data.succeeded, status }));
      clearSelection();
      router.refresh();
    }
  };

  const handleBulkDelete = async () => {
    if (!pendingDelete || pendingDelete.invoices.length === 0) return;
    const ids = pendingDelete.invoices.map((invoice) => invoice.id);
    setLoading(true);
    const result = await bulkDeleteInvoices(ids);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      toast.success(t('bulkDeleted', { count: result.data.succeeded }));
      pendingDelete.clearSelection();
      setPendingDelete(null);
      router.refresh();
    }
  };

  const columns: ColumnDef<Invoice>[] = React.useMemo(
    () => [
      {
        accessorKey: 'invoice_number',
        header: t('invoiceNumber'),
        cell: ({ row }) => <span className="font-medium">{row.getValue('invoice_number')}</span>,
        meta: { numeric: true, align: 'left' },
      },
      {
        id: 'client',
        header: t('client'),
        accessorFn: (row) => row.client?.company_name || row.client?.contact_name || '—',
      },
      {
        accessorKey: 'issue_date',
        header: t('issueDate'),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {format(new Date(row.getValue('issue_date')), 'dd/MM/yyyy')}
          </span>
        ),
      },
      {
        accessorKey: 'due_date',
        header: t('dueDate'),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {format(new Date(row.getValue('due_date')), 'dd/MM/yyyy')}
          </span>
        ),
      },
      {
        accessorKey: 'total',
        header: t('total'),
        cell: ({ row }) => (
          <span className="font-medium">{formatCurrency(row.getValue('total'))}</span>
        ),
        meta: { numeric: true },
      },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
      },
    ],
    [t],
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={invoices}
        selectable
        globalSearch
        searchPlaceholder={t('searchInvoice')}
        toolbar={({ selected, clearSelection }) =>
          selected.length === 0 ? null : (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
              <span className="text-sm font-medium">
                {t('selectedCount', { count: selected.length })}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatus(selected, 'sent', clearSelection)}
                  disabled={loading}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {t('markAsSent')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatus(selected, 'paid', clearSelection)}
                  disabled={loading}
                >
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  {t('markAsPaid')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => openDeleteDialog(selected, clearSelection)}
                  disabled={loading}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {t('deleteSelected')}
                </Button>
              </div>
            </div>
          )
        }
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={t('bulkDeleteTitle')}
        description={t('bulkDeleteConfirm', { count: pendingDelete?.invoices.length ?? 0 })}
        confirmLabel={t('delete')}
        onConfirm={handleBulkDelete}
        loading={loading}
        destructive
      />
    </div>
  );
}
