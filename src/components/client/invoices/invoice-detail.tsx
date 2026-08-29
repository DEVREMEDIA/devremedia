'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DetailShell } from '@/components/shared/detail-shell';
import { StatusBadge } from '@/components/shared/status-badge';
import { format } from 'date-fns';
import { Download, CreditCard, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import type { InvoiceWithRelations, InvoiceLineItem } from '@/types';

interface InvoiceDetailProps {
  invoice: InvoiceWithRelations;
}

export function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  const t = useTranslations('invoices');
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/pay`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.url) {
        toast.error(data.error || t('paymentError'));
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error(t('paymentError'));
      setLoading(false);
    }
  };

  const pdfUrl = invoice.file_path ? `/api/invoices/${invoice.id}/file` : null;

  const handlePreview = () => {
    if (!pdfUrl) return;
    setPreviewUrl(pdfUrl);
    setPreviewOpen(true);
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <DetailShell
      backHref="/client/documents?tab=invoices"
      backLabel={t('title')}
      title={invoice.invoice_number}
      meta={<StatusBadge status={invoice.status} />}
      actions={
        <>
          <Button variant="outline" onClick={handlePreview} className="gap-2">
            <Eye className="h-4 w-4" />
            {t('preview')}
          </Button>
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            {t('download')}
          </Button>
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <Button onClick={handlePayment} disabled={loading} className="gap-2">
              <CreditCard className="h-4 w-4" />
              {loading ? t('processing') : t('payNow')}
            </Button>
          )}
        </>
      }
    >
      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t('invoiceDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-medium text-sm mb-2">{t('billTo')}</h3>
              <div className="text-sm text-muted-foreground">
                {invoice.client?.company_name && (
                  <div className="font-medium">{invoice.client.company_name}</div>
                )}
                <div>{invoice.client?.contact_name}</div>
                <div>{invoice.client?.email}</div>
                {invoice.client?.phone && <div>{invoice.client.phone}</div>}
                {invoice.client?.address && <div>{invoice.client.address}</div>}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-2">{t('invoiceInfo')}</h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('invoiceNumber')}:</span>
                  <span className="font-medium">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('issueDate')}:</span>
                  <span>{format(new Date(invoice.issue_date), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('dueDate')}:</span>
                  <span>{format(new Date(invoice.due_date), 'MMM d, yyyy')}</span>
                </div>
                {invoice.project && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('project')}:</span>
                    <span>{invoice.project.title}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div>
            <h3 className="font-medium text-sm mb-3">{t('lineItems')}</h3>
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
                {invoice.line_items?.map((item: InvoiceLineItem, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="font-medium">{item.description}</div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unit_price, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.quantity * item.unit_price, invoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('subtotal')}:</span>
                <span>{formatCurrency(invoice.subtotal || 0, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('vat')} ({invoice.tax_rate || 24}%):
                </span>
                <span>{formatCurrency(invoice.tax_amount || 0, invoice.currency)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>{t('totalDue')}:</span>
                <span>{formatCurrency(invoice.total || 0, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium text-sm mb-2">{t('invoiceNotes')}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* PDF Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t('previewTitle', { number: invoice.invoice_number })}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full flex-1 min-h-0 rounded-md border"
              title={t('previewFrameTitle')}
            />
          )}
        </DialogContent>
      </Dialog>
    </DetailShell>
  );
}
