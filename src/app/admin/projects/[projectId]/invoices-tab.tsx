'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, isPast } from 'date-fns';
import { toast } from 'sonner';
import { Receipt, Plus, MoreHorizontal, Eye, FileDown, CheckCircle } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { getInvoices, getNextInvoiceNumber, updateInvoiceStatus } from '@/lib/actions/invoices';
import type { InvoiceWithRelations } from '@/types/relations';
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
import { CreateInvoiceDrawer } from '@/components/admin/invoices/create-invoice-drawer';
import { cn } from '@/lib/utils';

interface InvoicesTabProps {
  projectId: string;
  clientId: string;
  projectTitle: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(amount);

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
      toast.success(t('markedAsPaid'));
    }
  };

  const handleMarkAsUnpaid = async (invoiceId: string) => {
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

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invoiceNumber')}</TableHead>
                  <TableHead>{t('total')}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{t('dueDate')}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const overdue = isOverdue(invoice);
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>
                        <StatusBadge status={overdue ? 'overdue' : invoice.status} />
                      </TableCell>
                      <TableCell className={cn('text-sm', overdue && 'font-medium text-red-600')}>
                        {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
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
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                {t('markAsPaid')}
                              </DropdownMenuItem>
                            )}
                            {invoice.status === 'paid' && (
                              <DropdownMenuItem onClick={() => handleMarkAsUnpaid(invoice.id)}>
                                <CheckCircle className="mr-2 h-4 w-4 text-orange-500" />
                                {t('markAsUnpaid')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">{t('total')}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(totalInvoiced)}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {t('paid')}: {formatCurrency(totalPaid)}
                    </span>
                  </TableCell>
                  <TableCell
                    colSpan={2}
                    className={cn('font-semibold', unpaid > 0 && 'text-red-600')}
                  >
                    {t('outstanding')}: {formatCurrency(unpaid)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Card>
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
