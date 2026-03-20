'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { format, isPast } from 'date-fns';
import { toast } from 'sonner';
import { Receipt, Plus, MoreHorizontal, Eye, Pencil, FileDown, CheckCircle } from 'lucide-react';

import { getInvoices, getNextInvoiceNumber, updateInvoiceStatus } from '@/lib/actions/invoices';
import { getProjects } from '@/lib/actions/projects';
import type { InvoiceWithRelations, ClientDrawerMode } from '@/types/relations';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';

interface ClientInvoicesTabProps {
  clientId: string;
  refreshKey: number;
  onOpenDrawer: (mode: ClientDrawerMode) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(amount);

const isOverdue = (invoice: InvoiceWithRelations) =>
  invoice.status !== 'paid' && invoice.status !== 'cancelled' && isPast(new Date(invoice.due_date));

export function ClientInvoicesTab({ clientId, refreshKey, onOpenDrawer }: ClientInvoicesTabProps) {
  const t = useTranslations('clients');
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<{ id: string; title: string; client_id: string }[]>([]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [invoicesResult, projectsResult] = await Promise.all([
        getInvoices({ client_id: clientId }),
        getProjects({ client_id: clientId }),
      ]);
      if (!invoicesResult.error && invoicesResult.data) {
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
      setIsLoading(false);
    }
    fetchData();
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

  const handleMarkAsPaid = async (invoiceId: string) => {
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
      toast.success('Invoice marked as paid');
    }
  };

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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>{t('invoices.project')}</TableHead>
              <TableHead>{t('invoices.amount')}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{t('invoices.dueDate')}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              const overdue = isOverdue(invoice);
              return (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                  <TableCell className="text-sm">{invoice.project.title}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(invoice.total)}</TableCell>
                  <TableCell>
                    <StatusBadge status={overdue ? 'overdue' : invoice.status} />
                  </TableCell>
                  <TableCell className={cn('text-sm', overdue && 'font-medium text-red-600')}>
                    {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <InvoiceActions invoice={invoice} onMarkAsPaid={handleMarkAsPaid} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-semibold">
                {t('invoices.summary')}
              </TableCell>
              <TableCell className="font-semibold">{formatCurrency(totalInvoiced)}</TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {t('totalPaid')}: {formatCurrency(totalPaid)}
                </span>
              </TableCell>
              <TableCell colSpan={2} className={cn('font-semibold', unpaid > 0 && 'text-red-600')}>
                {t('outstanding')}: {formatCurrency(unpaid)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>
    </div>
  );
}

interface InvoiceActionsProps {
  invoice: InvoiceWithRelations;
  onMarkAsPaid: (id: string) => Promise<void>;
}

function InvoiceActions({ invoice, onMarkAsPaid }: InvoiceActionsProps) {
  const canMarkAsPaid = invoice.status !== 'paid' && invoice.status !== 'cancelled';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/admin/invoices/${invoice.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/invoices/${invoice.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/api/invoices/pdf?id=${invoice.id}`} target="_blank" rel="noopener noreferrer">
            <FileDown className="mr-2 h-4 w-4" />
            Download PDF
          </a>
        </DropdownMenuItem>
        {canMarkAsPaid && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onMarkAsPaid(invoice.id)}>
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              Mark as Paid
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
