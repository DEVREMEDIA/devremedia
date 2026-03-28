'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { format } from 'date-fns';
import { Receipt, CreditCard, ArrowRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { InvoiceWithRelations } from '@/types';

interface InvoicesListProps {
  invoices: InvoiceWithRelations[];
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle2; color: string; bg: string; badge: string }
> = {
  paid: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    badge: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  },
  sent: {
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    badge: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  },
  viewed: {
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    badge: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  },
  overdue: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    badge: 'border-red-500/40 text-red-600 dark:text-red-400',
  },
  cancelled: {
    icon: AlertTriangle,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    badge: 'border-muted-foreground/40 text-muted-foreground',
  },
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
        const config = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.sent;
        const StatusIcon = config.icon;
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
              <div className={cn('p-2.5 rounded-xl shrink-0', config.bg)}>
                <StatusIcon className={cn('h-5 w-5', config.color)} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-sm">{invoice.invoice_number}</span>
                  <Badge variant="outline" className={cn('text-[10px]', config.badge)}>
                    {invoice.status === 'paid'
                      ? t('paid')
                      : invoice.status === 'overdue'
                        ? t('overdue')
                        : t('pending')}
                  </Badge>
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
                  <ArrowRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-amber-500 transition-colors" />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
