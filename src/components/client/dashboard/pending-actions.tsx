'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle, Receipt, FileText, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { INVOICE_STATUS_LABELS } from '@/lib/constants';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { InvoiceWithRelations, Contract } from '@/types';

interface PendingActionsProps {
  invoices: InvoiceWithRelations[];
  unsignedContracts?: Contract[];
}

export function PendingActions({ invoices, unsignedContracts = [] }: PendingActionsProps) {
  const router = useRouter();
  const t = useTranslations('client.dashboard');

  const pendingItems = [
    ...invoices.map((invoice) => ({
      type: 'invoice' as const,
      id: invoice.id,
      title: `${t('invoice')} ${invoice.invoice_number}`,
      description: `${INVOICE_STATUS_LABELS[invoice.status as keyof typeof INVOICE_STATUS_LABELS]} - €${invoice.total?.toFixed(2) || '0.00'}`,
      action: t('payNow'),
      icon: Receipt,
      onClick: () => router.push(`/client/invoices/${invoice.id}`),
    })),
    ...unsignedContracts.map((contract) => ({
      type: 'contract' as const,
      id: contract.id,
      title: contract.title,
      description: t('signatureRequired'),
      action: t('uploadSigned'),
      icon: FileText,
      onClick: () => router.push(`/client/contracts/${contract.id}`),
    })),
  ];

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border/50">
        {pendingItems.length > 0 ? (
          <AlertCircle className="h-5 w-5 text-orange-500" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        )}
        <h2 className="text-lg font-semibold">{t('pendingActions')}</h2>
      </div>
      <div className="p-5">
        {pendingItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t('noPendingActions')}</p>
        ) : (
          <div className="space-y-2">
            {pendingItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg transition-all duration-200',
                    'border border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5',
                  )}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                  <Button size="sm" onClick={item.onClick} className="shrink-0">
                    {item.action}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
