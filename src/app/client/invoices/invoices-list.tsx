'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ToneChip } from '@/components/shared/tone-chip';
import { ToneIcon } from '@/components/shared/tone-icon';
import { statusTone } from '@/lib/status-tone';
import { format } from 'date-fns';
import { Receipt, Landmark, ArrowRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
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

export function InvoicesList({ invoices }: InvoicesListProps) {
  const router = useRouter();
  const t = useTranslations('invoices');
  const tStatus = useTranslations('statuses.invoiceStatus');

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
        const StatusIcon = STATUS_ICONS[invoice.status] ?? Clock;
        const isPaid = invoice.status === 'paid';
        const isCancelled = invoice.status === 'cancelled';

        return (
          <div
            key={invoice.id}
            className={cn(
              'group rounded-xl border bg-card p-4 cursor-pointer transition-all duration-300',
              'hover:shadow-[0_8px_30px_-4px_color-mix(in_srgb,var(--primary)_15%,transparent)] hover:-translate-y-0.5',
            )}
            onClick={() => router.push(`/client/invoices/${invoice.id}`)}
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <ToneIcon tone={tone}>
                <StatusIcon className="h-5 w-5" />
              </ToneIcon>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-sm">{invoice.invoice_number}</span>
                  <ToneChip tone={tone}>
                    {invoice.status === 'paid'
                      ? t('paid')
                      : invoice.status === 'overdue'
                        ? t('overdue')
                        : invoice.status === 'cancelled'
                          ? tStatus('cancelled')
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
                    <Landmark className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('paymentInstructions.action')}</span>
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
