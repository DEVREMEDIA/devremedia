'use client';

import { Button } from '@/components/ui/button';
import { ToneChip } from '@/components/shared/tone-chip';
import { statusTone, type Tone } from '@/lib/status-tone';
import { format } from 'date-fns';
import { Receipt, ArrowRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { InvoiceWithRelations } from '@/types';

interface InvoicesSummaryProps {
  invoices: InvoiceWithRelations[];
}

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  paid: CheckCircle2,
  sent: Clock,
  viewed: Clock,
  overdue: AlertTriangle,
  cancelled: AlertTriangle,
};

// Ίδια λογική με το ToneChip: 4 κάδοι τόνου, όχι ένας ανά κατάσταση.
const TONE_ICON_STYLES: Record<Tone, { bg: string; text: string }> = {
  critical: { bg: 'bg-tone-critical-bg', text: 'text-tone-critical' },
  caution: { bg: 'bg-tone-caution-bg', text: 'text-tone-caution' },
  positive: { bg: 'bg-tone-positive-bg', text: 'text-tone-positive' },
  neutral: { bg: 'bg-tone-neutral-bg', text: 'text-tone-neutral' },
};

export function InvoicesSummary({ invoices }: InvoicesSummaryProps) {
  const router = useRouter();
  const t = useTranslations('client.dashboard');

  if (invoices.length === 0) {
    return null;
  }

  const paidTotal = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total ?? 0), 0);

  const pendingTotal = invoices
    .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + (i.total ?? 0), 0);

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('invoicesTitle')}</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs text-muted-foreground hover:text-primary"
          onClick={() => router.push('/client/invoices')}
        >
          {t('viewAll')}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 px-5 py-4 border-b border-border/50">
        <div>
          <p className="text-xs text-muted-foreground">{t('totalPaid')}</p>
          <p className="text-2xl font-bold text-tone-positive mt-0.5">
            {paidTotal.toLocaleString('el-GR', { minimumFractionDigits: 2 })}&euro;
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('totalPending')}</p>
          <p
            className={cn(
              'text-2xl font-bold mt-0.5',
              pendingTotal > 0 ? 'text-tone-caution' : 'text-muted-foreground',
            )}
          >
            {pendingTotal.toLocaleString('el-GR', { minimumFractionDigits: 2 })}&euro;
          </p>
        </div>
      </div>

      {/* Recent invoices list */}
      <div className="p-5 space-y-2">
        {recentInvoices.map((invoice) => {
          const tone = statusTone(invoice.status);
          const toneStyle = TONE_ICON_STYLES[tone];
          const StatusIcon = STATUS_ICONS[invoice.status] ?? Clock;

          return (
            <div
              key={invoice.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200',
                'border border-border/50 hover:border-primary/30 hover:bg-primary/5',
              )}
              onClick={() => router.push(`/client/invoices/${invoice.id}`)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn('p-2 rounded-lg', toneStyle.bg)}>
                  <StatusIcon className={cn('h-4 w-4', toneStyle.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{invoice.invoice_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-semibold text-sm">
                  {(invoice.total ?? 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}&euro;
                </span>
                <ToneChip tone={tone}>
                  {invoice.status === 'paid'
                    ? t('paid')
                    : invoice.status === 'overdue'
                      ? t('overdue')
                      : t('pending')}
                </ToneChip>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
