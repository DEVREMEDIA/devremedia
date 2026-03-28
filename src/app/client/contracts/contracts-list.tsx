'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import {
  FileText,
  Download,
  Upload,
  Eye,
  ArrowRight,
  CheckCircle2,
  Clock,
  PenLine,
  AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { isContractSignable } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ContractWithProject } from '@/types';

interface ContractsListProps {
  contracts: ContractWithProject[];
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle2; color: string; bg: string; badge: string }
> = {
  signed: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    badge: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  },
  sent: {
    icon: PenLine,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    badge: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  },
  viewed: {
    icon: Eye,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    badge: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  },
  pending_review: {
    icon: Clock,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    badge: 'border-blue-500/40 text-blue-600 dark:text-blue-400',
  },
  draft: {
    icon: FileText,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    badge: 'border-muted-foreground/40 text-muted-foreground',
  },
  expired: {
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

export function ContractsList({ contracts }: ContractsListProps) {
  const router = useRouter();
  const t = useTranslations('client.contracts');

  if (contracts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12">
        <EmptyState
          icon={FileText}
          title={t('noContracts')}
          description={t('noContractsDescription')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contracts.map((contract) => {
        const config = STATUS_CONFIG[contract.status] ?? STATUS_CONFIG.draft;
        const StatusIcon = config.icon;
        const signable = isContractSignable(contract.status);

        return (
          <div
            key={contract.id}
            className={cn(
              'group rounded-xl border bg-card p-4 transition-all duration-300',
              'hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.15)] hover:-translate-y-0.5',
            )}
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className={cn('p-2.5 rounded-xl shrink-0', config.bg)}>
                <StatusIcon className={cn('h-5 w-5', config.color)} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-sm line-clamp-1">{contract.title}</span>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', config.badge)}>
                    {contract.status === 'signed'
                      ? t('signed')
                      : signable
                        ? t('awaitingSignature')
                        : contract.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {contract.project?.title && (
                    <span className="truncate">{contract.project.title}</span>
                  )}
                  <span>
                    {t('created')}: {format(new Date(contract.created_at), 'dd/MM/yyyy')}
                  </span>
                  {contract.expires_at && (
                    <span>
                      {t('expires')}: {format(new Date(contract.expires_at), 'dd/MM/yyyy')}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {signable && (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => router.push(`/client/contracts/${contract.id}`)}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('uploadSigned')}</span>
                  </Button>
                )}
                {['signed', 'pending_review'].includes(contract.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => window.open(`/api/contracts/${contract.id}/pdf`, '_blank')}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('downloadPdf')}</span>
                  </Button>
                )}
                {!signable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => router.push(`/client/contracts/${contract.id}`)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('viewContract')}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
