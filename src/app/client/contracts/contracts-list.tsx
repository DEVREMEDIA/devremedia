'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ToneChip } from '@/components/shared/tone-chip';
import { ToneIcon } from '@/components/shared/tone-icon';
import { statusTone } from '@/lib/status-tone';
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

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  signed: CheckCircle2,
  sent: PenLine,
  viewed: Eye,
  pending_review: Clock,
  draft: FileText,
  expired: AlertTriangle,
  cancelled: AlertTriangle,
};


export function ContractsList({ contracts }: ContractsListProps) {
  const router = useRouter();
  const t = useTranslations('client.contracts');
  const tStatus = useTranslations('statuses.contractStatus');

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
        const tone = statusTone(contract.status);
        const StatusIcon = STATUS_ICONS[contract.status] ?? FileText;
        const signable = isContractSignable(contract.status);

        return (
          <div
            key={contract.id}
            className={cn(
              'group rounded-xl border bg-card p-4 transition-all duration-300',
              'hover:shadow-[0_8px_30px_-4px_color-mix(in_srgb,var(--primary)_15%,transparent)] hover:-translate-y-0.5',
            )}
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <ToneIcon tone={tone}>
                <StatusIcon className="h-5 w-5" />
              </ToneIcon>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-sm line-clamp-1">{contract.title}</span>
                  <ToneChip tone={tone} className="shrink-0">
                    {contract.status === 'signed'
                      ? t('signed')
                      : signable
                        ? t('awaitingSignature')
                        : tStatus(contract.status)}
                  </ToneChip>
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
