'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { format, isPast } from 'date-fns';
import { toast } from 'sonner';
import { Receipt, Plus, MoreHorizontal, Eye, FileDown, CheckCircle } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

import { createClient } from '@/lib/supabase/client';
import { getInvoices, getNextInvoiceNumber, updateInvoiceStatus } from '@/lib/actions/invoices';
import { getProjects } from '@/lib/actions/projects';
import { shouldFetchTabData } from '@/lib/tab-data';
import type { InvoiceWithRelations, ClientDrawerMode } from '@/types/relations';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { DataTable } from '@/components/shared/data-table';
import { cn } from '@/lib/utils';
import { formatEur as formatCurrency } from '@/lib/format';

interface ClientInvoicesTabProps {
  clientId: string;
  refreshKey: number;
  onOpenDrawer: (mode: ClientDrawerMode) => void;
  initialInvoices?: InvoiceWithRelations[];
}

const isOverdue = (invoice: InvoiceWithRelations) =>
  invoice.status !== 'paid' && invoice.status !== 'cancelled' && isPast(new Date(invoice.due_date));

export function ClientInvoicesTab({
  clientId,
  refreshKey,
  onOpenDrawer,
  initialInvoices,
}: ClientInvoicesTabProps) {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>(initialInvoices ?? []);
  // Invoices arrive on the first byte from the server; only block on a spinner
  // when there is nothing to render yet (Phase 1).
  const [isLoading, setIsLoading] = useState(
    shouldFetchTabData({ hasInitialData: !!initialInvoices, refreshKey }),
  );
  const [projects, setProjects] = useState<{ id: string; title: string; client_id: string }[]>([]);

  useEffect(() => {
    const fetchInvoices = shouldFetchTabData({ hasInitialData: !!initialInvoices, refreshKey });
    async function fetchData() {
      if (fetchInvoices) setIsLoading(true);
      // Projects power the create-invoice drawer dropdown — not provided by the
      // server page, so always loaded. Invoices are only re-fetched when the
      // server did not seed them or after a refresh.
      const [invoicesResult, projectsResult] = await Promise.all([
        fetchInvoices ? getInvoices({ client_id: clientId }) : Promise.resolve(null),
        getProjects({ client_id: clientId }),
      ]);
      if (invoicesResult && !invoicesResult.error && invoicesResult.data) {
        setInvoices(invoicesResult.data);
      }
      if (!projectsResult.error && projectsResult.data) {
        setProjects(
          projectsResult.data.map((p) => ({
            id: p.id,
            title: p.title,
            client_id: p.client_id,
          })),
        );
      }
      if (fetchInvoices) setIsLoading(false);
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, refreshKey]);

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);
  const unpaid = totalInvoiced - totalPaid;

  const handleCreate = async () => {
    const nextInvoiceNumber = await getNextInvoiceNumber();
    onOpenDrawer({ type: 'create-invoice', clientId, projects, nextInvoiceNumber });
  };

  const handleMarkAsPaid = useCallback(
    async (invoiceId: string) => {
      const previous = invoices.find((inv) => inv.id === invoiceId);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: 'paid' as const } : inv)),
      );
      const result = await updateInvoiceStatus(invoiceId, 'paid');
      if (result.error) {
        if (previous) {
          setInvoices((prev) =>
            prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: previous.status } : inv)),
          );
        }
        toast.error(result.error);
      } else {
        toast.success(t('invoices.markedAsPaid'));
      }
    },
    [invoices, t],
  );

  const handleMarkAsUnpaid = useCallback(
    async (invoiceId: string) => {
      const previous = invoices.find((inv) => inv.id === invoiceId);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: 'draft' as const } : inv)),
      );
      const result = await updateInvoiceStatus(invoiceId, 'draft');
      if (result.error) {
        if (previous) {
          setInvoices((prev) =>
            prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: previous.status } : inv)),
          );
        }
        toast.error(result.error);
      } else {
        toast.success(t('invoices.markedAsUnpaid'));
      }
    },
    [invoices, t],
  );

  const columns: ColumnDef<InvoiceWithRelations>[] = useMemo(
    () => [
      {
        accessorKey: 'invoice_number',
        header: t('invoices.invoiceNumber'),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.getValue('invoice_number')}</span>
        ),
      },
      {
        id: 'project',
        header: t('invoices.project'),
        cell: ({ row }) => <span className="text-sm">{row.original.project?.title ?? '—'}</span>,
      },
      {
        accessorKey: 'total',
        header: t('invoices.amount'),
        cell: ({ row }) => <span className="text-sm">{formatCurrency(row.getValue('total'))}</span>,
        meta: { numeric: true },
      },
      {
        id: 'status',
        header: tc('status'),
        cell: ({ row }) => {
          const invoice = row.original;
          return <StatusBadge status={isOverdue(invoice) ? 'overdue' : invoice.status} />;
        },
      },
      {
        accessorKey: 'due_date',
        header: t('invoices.dueDate'),
        cell: ({ row }) => {
          const invoice = row.original;
          const overdue = isOverdue(invoice);
          return (
            <span className={cn('text-sm', overdue && 'font-medium text-tone-critical')}>
              {format(new Date(invoice.due_date), 'MMM d, yyyy')}
            </span>
          );
        },
        meta: { numeric: true, align: 'left' },
      },
      {
        id: 'actions',
        header: '',
        meta: { width: 'w-10' },
        cell: ({ row }) => {
          const invoice = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">{tc('openMenu')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/invoices/${invoice.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    {tc('view')}
                  </Link>
                </DropdownMenuItem>
                {invoice.file_path && (
                  <DropdownMenuItem
                    onClick={async () => {
                      const supabase = createClient();
                      const { data } = await supabase.storage
                        .from('invoices')
                        .createSignedUrl(invoice.file_path!, 3600);
                      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                    }}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    {t('contracts.downloadPdf')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>
                    <CheckCircle className="mr-2 h-4 w-4 text-tone-positive" />
                    {t('invoices.markAsPaid')}
                  </DropdownMenuItem>
                )}
                {invoice.status === 'paid' && (
                  <DropdownMenuItem onClick={() => handleMarkAsUnpaid(invoice.id)}>
                    <CheckCircle className="mr-2 h-4 w-4 text-tone-caution" />
                    {t('invoices.markAsUnpaid')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t, tc, handleMarkAsPaid, handleMarkAsUnpaid],
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Receipt}
            title={t('invoices.noInvoices')}
            description={t('invoices.noInvoicesDescription')}
            action={{ label: t('invoices.createFirst'), onClick: handleCreate }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t('tabs.invoices')} ({invoices.length})
        </h3>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('drawer.createInvoice')}
        </Button>
      </div>

      <DataTable columns={columns} data={invoices} />

      <div className="flex flex-wrap items-baseline justify-end gap-x-6 gap-y-1 border-t border-border pt-3 text-sm">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
          {t('invoices.summary')}
        </span>
        <span className="font-mono tabular-nums">{formatCurrency(totalInvoiced)}</span>
        <span className="text-muted-foreground">
          {t('totalPaid')}:{' '}
          <span className="font-mono tabular-nums">{formatCurrency(totalPaid)}</span>
        </span>
        <span className={cn('font-mono tabular-nums', unpaid > 0 && 'text-tone-critical')}>
          {t('outstanding')}: {formatCurrency(unpaid)}
        </span>
      </div>
    </div>
  );
}
