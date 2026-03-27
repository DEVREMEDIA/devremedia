'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateInvoiceStatus } from '@/lib/actions/invoices';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CreditCard, CheckCircle2, Send } from 'lucide-react';

type InvoiceData = {
  id: string;
  status: string;
};

interface PaymentActionsProps {
  invoice: InvoiceData;
  onStatusChange: () => void;
}

export function PaymentActions({ invoice, onStatusChange }: PaymentActionsProps) {
  const tToast = useTranslations('toast');
  const t = useTranslations('invoices');
  const tc = useTranslations('common');
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<string>('bank_transfer');
  const [paymentDate, setPaymentDate] = React.useState<string>(
    new Date().toISOString().split('T')[0],
  );

  const handleSendPaymentLink = async () => {
    setIsUpdating(true);
    const result = await updateInvoiceStatus(invoice.id, 'sent');
    setIsUpdating(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('paymentLinkSent'));
      onStatusChange();
    }
  };

  const handleRecordPayment = async () => {
    setIsUpdating(true);
    const result = await updateInvoiceStatus(invoice.id, 'paid');
    setIsUpdating(false);

    if (result.error) {
      toast.error(tToast('updateError'), { description: result.error });
    } else {
      toast.success(t('paymentRecordedVia', { method: paymentMethod }));
      setPaymentDialogOpen(false);
      onStatusChange();
    }
  };

  if (invoice.status === 'paid') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span>{t('paymentReceived')}</span>
      </div>
    );
  }

  return (
    <>
      {(invoice.status === 'sent' || invoice.status === 'viewed') && (
        <>
          <Button variant="outline" onClick={handleSendPaymentLink}>
            <Send className="mr-2 h-4 w-4" />
            {t('sendPaymentLink')}
          </Button>
          <Button onClick={() => setPaymentDialogOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" />
            {t('recordManualPayment')}
          </Button>
        </>
      )}

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('recordManualPayment')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method">{t('paymentMethod')}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder={t('selectPaymentMethod')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">{t('bankTransfer')}</SelectItem>
                  <SelectItem value="cash">{t('cash')}</SelectItem>
                  <SelectItem value="check">{t('checkPayment')}</SelectItem>
                  <SelectItem value="other">{t('otherPayment')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-date">{t('paymentDate')}</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={isUpdating}
            >
              {tc('cancel')}
            </Button>
            <Button onClick={handleRecordPayment} disabled={isUpdating}>
              {isUpdating ? t('recording') : t('recordPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
