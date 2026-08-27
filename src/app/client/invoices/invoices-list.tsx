'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ToneChip } from '@/components/shared/tone-chip';
import { statusTone, type Tone } from '@/lib/status-tone';
import { format } from 'date-fns';
import { Receipt, CreditCard, ArrowRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { InvoiceWithRelations } from '@/types';

interface InvoicesListProps {
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

export function InvoicesList({ invoices }: InvoicesListProps) {
  const router = useRouter();
  const t = useTranslations('invoices');

  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12">
        <EmptyState
          icon={Receipt}
          title={t('noInvoices')}
          description={t('noInvoicesDescription')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => {
        const tone = statusTone(invoice.status);
        const toneStyle = TONE_ICON_STYLES[tone];
        const StatusIcon = STATUS_ICONS[invoice.status] ?? Clock;
        const isPaid = invoice.status === 'paid';
        const isCancelled = invoice.status === 'cancelled';

        return (
          <div
            key={invoice.id}
            className={cn(
              'group rounded-xl border bg-card p-4 cursor-pointer transition-all duration-300',
              'hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.15)] hover:-translate-y-0.5',
            )}
            onClick={() => router.push(`/client/invoices/${invoice.id}`)}
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className={cn('p-2.5 rounded-xl shrink-0', toneStyle.bg)}>
                <StatusIcon className={cn('h-5 w-5', toneStyle.text)} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-sm">{invoice.invoice_number}</span>
                  <ToneChip tone={tone}>
                    {invoice.status === 'paid'
                      ? t('paid')
                      : invoice.status === 'overdue'
                        ? t('overdue')
                        : t('pending')}
                  </ToneChip>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {invoice.project?.title && (
                    <span className="truncate">{invoice.project.title}</span>
                  )}
                  <span>
                    {t('dueDate')}: {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>

              {/* Amount + Action */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-lg tabular-nums">
                  {(invoice.total ?? 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}&euro;
                </span>
                {!isPaid && !isCancelled ? (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/client/invoices/${invoice.id}`);
                    }}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('payNow')}</span>
                  </Button>
                ) : (
                  <ArrowRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
