'use client';

import { Separator } from '@/components/ui/separator';
import { useTranslations } from 'next-intl';

interface InvoiceSummaryProps {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency?: string;
}

const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('el-GR', { style: 'currency', currency }).format(amount);
};

export function InvoiceSummary({
  subtotal,
  taxRate,
  taxAmount,
  total,
  currency = 'EUR',
}: InvoiceSummaryProps) {
  const t = useTranslations('invoices');
  const tc = useTranslations('common');

  return (
    <div className="ml-auto max-w-xs space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{tc('subtotal')}</span>
        <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          {t('vat')} ({taxRate}%)
        </span>
        <span className="font-medium">{formatCurrency(taxAmount, currency)}</span>
      </div>
      <Separator />
      <div className="flex justify-between text-base font-bold">
        <span>{tc('total')}</span>
        <span>{formatCurrency(total, currency)}</span>
      </div>
    </div>
  );
}
