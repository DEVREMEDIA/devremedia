'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, isPast } from 'date-fns';
import { toast } from 'sonner';
import { Receipt, Plus, MoreHorizontal, Eye, FileDown, CheckCircle } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

import { createClient } from '@/lib/supabase/client';
import { getInvoices, getNextInvoiceNumber, updateInvoiceStatus } from '@/lib/actions/invoices';
import type { InvoiceWithRelations } from '@/types/relations';
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
import { CreateInvoiceDrawer } from '@/components/admin/invoices/create-invoice-drawer';
import { cn } from '@/lib/utils';
import { formatEur as formatCurrency } from '@/lib/format';

interface InvoicesTabProps {
  projectId: string;
  clientId: string;
  projectTitle: string;
}

const isOverdue = (invoice: InvoiceWithRelations) =>
  invoice.status !== 'paid' && invoice.status !== 'cancelled' && isPast(new Date(invoice.due_date));

export function InvoicesTab({ projectId, clientId, projectTitle }: InvoicesTabProps) {
  const t = useTranslations('invoices');
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [nextInvoiceNum, setNextInvoiceNum] = useState('');

  const fetchInvoices = async () => {
    setIsLoading(true);
    const result = await getInvoices({ project_id: projectId });
    if (!result.error && result.data) {
      setInvoices(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleCreate = async () => {
    const num = await getNextInvoiceNumber();
    setNextInvoiceNum(num);
    setDrawerOpen(true);
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
        toast.success(t('markedAsPaid'));
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
        toast.success(t('markedAsUnpaid'));
      }
    },
    [invoices, t],
  );

  const columns: ColumnDef<InvoiceWithRelations>[] = useMemo(
    () => [
      {
        accessorKey: 'invoice_number',
        header: t('invoiceNumber'),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.getValue('invoice_number')}</span>
        ),
      },
      {
        accessorKey: 'total',
        header: t('total'),
        cell: ({ row }) => <span className="text-sm">{formatCurrency(row.getValue('total'))}</span>,
        meta: { numeric: true },
      },
      {
        id: 'status',
        header: t('status'),
        cell: ({ row }) => {
          const invoice = row.original;
          return <StatusBadge status={isOverdue(invoice) ? 'overdue' : invoice.status} />;
        },
      },
      {
        accessorKey: 'due_date',
        header: t('dueDate'),
        cell: ({ row }) => {
          const invoice = row.original;
          const overdue = isOverdue(invoice);
          return (
            <span className={cn('text-sm', overdue && 'font-medium text-tone-critical')}>
              {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
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
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/invoices/${invoice.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    {t('viewInvoice')}
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
                    {t('downloadPdf')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>
                    <CheckCircle className="mr-2 h-4 w-4 text-tone-positive" />
                    {t('markAsPaid')}
                  </DropdownMenuItem>
                )}
                {invoice.status === 'paid' && (
                  <DropdownMenuItem onClick={() => handleMarkAsUnpaid(invoice.id)}>
                    <CheckCircle className="mr-2 h-4 w-4 text-tone-caution" />
                    {t('markAsUnpaid')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t, handleMarkAsPaid, handleMarkAsUnpaid],
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

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);
  const unpaid = totalInvoiced - totalPaid;

  return (
    <>
      {invoices.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Receipt}
              title={t('noInvoices')}
              description={t('noInvoicesDescription')}
              action={{ label: t('createInvoice'), onClick: handleCreate }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {t('title')} ({invoices.length})
            </h3>
            <Button onClick={handleCreate} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t('createInvoice')}
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={invoices}
            emptyState={<span className="text-muted-foreground">{t('noInvoices')}</span>}
          />

          <div className="flex flex-wrap items-baseline justify-end gap-x-6 gap-y-1 border-t border-border pt-3 text-sm">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
              {t('total')}
            </span>
            <span className="font-mono tabular-nums">{formatCurrency(totalInvoiced)}</span>
            <span className="text-muted-foreground">
              {t('paid')}:{' '}
              <span className="font-mono tabular-nums">{formatCurrency(totalPaid)}</span>
            </span>
            <span className={cn('font-mono tabular-nums', unpaid > 0 && 'text-tone-critical')}>
              {t('outstanding')}: {formatCurrency(unpaid)}
            </span>
          </div>
        </div>
      )}

      <CreateInvoiceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        clientId={clientId}
        projects={[{ id: projectId, title: projectTitle, client_id: clientId }]}
        nextInvoiceNumber={nextInvoiceNum}
        onSuccess={() => {
          setDrawerOpen(false);
          fetchInvoices();
          router.refresh();
        }}
      />
    </>
  );
}
