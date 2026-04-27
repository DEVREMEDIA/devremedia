'use client';

import * as React from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { bulkUpdateInvoiceStatus, bulkDeleteInvoices } from '@/lib/actions/invoices';
import { Send, CheckCircle, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const tc = useTranslations('common');
  const router = useRouter();
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const selectedIds = React.useMemo(() => {
    return Object.entries(rowSelection)
      .filter(([, selected]) => selected)
      .map(([index]) => invoices[parseInt(index)]?.id)
      .filter(Boolean) as string[];
  }, [rowSelection, invoices]);

  const handleBulkStatus = async (status: InvoiceStatus) => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    const result = await bulkUpdateInvoiceStatus(selectedIds, status);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      toast.success(t('bulkStatusUpdated', { count: result.data.succeeded, status }));
      setRowSelection({});
      router.refresh();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    const result = await bulkDeleteInvoices(selectedIds);
    setLoading(false);
    setDeleteDialogOpen(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      toast.success(t('bulkDeleted', { count: result.data.succeeded }));
      setRowSelection({});
      router.refresh();
    }
  };

  const columns: ColumnDef<Invoice>[] = React.useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'invoice_number',
        header: t('invoiceNumber'),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.getValue('invoice_number')}</span>
        ),
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
      },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
      },
    ],
    [t],
  );

  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, rowSelection, globalFilter },
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('searchInvoice')}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">
            {t('selectedCount', { count: selectedIds.length })}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkStatus('sent')}
              disabled={loading}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {t('markAsSent')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkStatus('paid')}
              disabled={loading}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              {t('markAsPaid')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={loading}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {t('deleteSelected')}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {tc('noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {t('showing', {
            from: table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1,
            to: Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              invoices.length,
            ),
            total: invoices.length,
          })}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('bulkDeleteTitle')}
        description={t('bulkDeleteConfirm', { count: selectedIds.length })}
        confirmLabel={t('delete')}
        onConfirm={handleBulkDelete}
        loading={loading}
        destructive
      />
    </div>
  );
}
