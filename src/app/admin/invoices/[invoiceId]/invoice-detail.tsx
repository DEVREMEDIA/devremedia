'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { PaymentActions } from '@/components/admin/invoices/payment-actions';
import { deleteInvoice, updateInvoiceStatus } from '@/lib/actions/invoices';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { format } from 'date-fns';
import { Trash2, Download, Eye } from 'lucide-react';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string;
  line_items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string;
  currency: string;
  file_path?: string | null;
  client: { id: string; contact_name: string; company_name?: string; email: string };
  project?: { id: string; title: string };
}

interface InvoiceDetailProps {
  invoice: Invoice;
}

const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('el-GR', { style: 'currency', currency }).format(amount);
};

export function InvoiceDetail({ invoice: initialInvoice }: InvoiceDetailProps) {
  const router = useRouter();
  const t = useTranslations('invoices');
  const tc = useTranslations('common');
  const [invoice, setInvoice] = React.useState(initialInvoice);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!invoice.file_path) return;
    const supabase = createClient();
    supabase.storage
      .from('invoices')
      .createSignedUrl(invoice.file_path, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setPdfUrl(data.signedUrl);
      });
  }, [invoice.file_path]);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteInvoice(invoice.id);
    setIsDeleting(false);

    if (result.error) {
      toast.error(t('failedToDeleteInvoice'), { description: result.error });
    } else {
      toast.success(t('invoiceDeletedSuccess'));
      router.push('/admin/invoices');
    }
  };

  const handleSendInvoice = async () => {
    if (invoice.status !== 'draft') return;

    setIsUpdatingStatus(true);
    const result = await updateInvoiceStatus(invoice.id, 'sent');
    setIsUpdatingStatus(false);

    if (result.error) {
      toast.error(t('failedToSendInvoice'), { description: result.error });
    } else {
      toast.success(t('invoiceMarkedSent'));
      setInvoice({ ...invoice, status: 'sent' });
      router.refresh();
    }
  };

  const handlePreview = () => {
    if (!pdfUrl) {
      toast.error('PDF not loaded yet');
      return;
    }
    setPreviewUrl(pdfUrl);
    setPreviewOpen(true);
  };

  const handleDownload = () => {
    if (!pdfUrl) {
      toast.error('PDF not loaded yet');
      return;
    }
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePreviewClose = (open: boolean) => {
    setPreviewOpen(open);
    if (!open) setPreviewUrl(null);
  };

  const handleStatusChange = () => {
    router.refresh();
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{invoice.invoice_number}</h1>
            <p className="text-muted-foreground mt-2">{t('invoiceDetailsDescription')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              {tc('delete')}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('invoiceInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{tc('status')}</p>
                <div className="mt-1">
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('invoiceNumber')}</p>
                <p className="mt-1 font-medium">{invoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('issueDate')}</p>
                <p className="mt-1">{format(new Date(invoice.issue_date), 'MMMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('dueDate')}</p>
                <p className="mt-1">{format(new Date(invoice.due_date), 'MMMM d, yyyy')}</p>
              </div>
              {invoice.project && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('project')}</p>
                  <Link
                    href={`/admin/projects/${invoice.project.id}`}
                    className="mt-1 text-primary hover:underline"
                  >
                    {invoice.project.title}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('clientInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('clientName')}</p>
                <p className="mt-1 font-medium">
                  {invoice.client?.company_name || invoice.client?.contact_name || '—'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('contact')}</p>
                <p className="mt-1">{invoice.client?.contact_name || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{tc('email')}</p>
                {invoice.client?.email ? (
                  <a
                    href={`mailto:${invoice.client.email}`}
                    className="mt-1 text-primary hover:underline"
                  >
                    {invoice.client.email}
                  </a>
                ) : (
                  <p className="mt-1">—</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('lineItems')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('itemDescription')}</TableHead>
                  <TableHead className="text-right">{t('quantity')}</TableHead>
                  <TableHead className="text-right">{t('unitPrice')}</TableHead>
                  <TableHead className="text-right">{t('lineTotal')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.line_items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unit_price, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.quantity * item.unit_price, invoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{tc('subtotal')}</span>
                <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('vat')} ({invoice.tax_rate}%)
                </span>
                <span>{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>{tc('total')}</span>
                <span>{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-6">
                <p className="text-sm font-medium text-muted-foreground">{tc('notes')}</p>
                <p className="mt-2 text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('paymentAndActions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {invoice.status === 'draft' && (
                <Button onClick={handleSendInvoice} disabled={isUpdatingStatus}>
                  {isUpdatingStatus ? t('sending') : t('markAsSent')}
                </Button>
              )}
              <PaymentActions invoice={invoice} onStatusChange={handleStatusChange} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={handlePreviewClose}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 py-4 shrink-0">
            <DialogTitle>{invoice.invoice_number} — Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe
              key={previewUrl}
              src={previewUrl}
              className="w-full flex-1 min-h-0 border-t"
              title="Invoice Preview"
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('deleteInvoice')}
        description={t('deleteConfirmation')}
        confirmLabel={tc('delete')}
        onConfirm={handleDelete}
        destructive
        loading={isDeleting}
      />
    </>
  );
}
