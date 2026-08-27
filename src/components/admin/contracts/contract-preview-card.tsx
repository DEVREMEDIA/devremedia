'use client';

import { useTranslations } from 'next-intl';
import {
  FileSignature,
  CheckCircle,
  Briefcase,
  CreditCard,
  Building2,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

interface ContractPreviewCardProps {
  clientLabel: string;
  projectLabel?: string;
  serviceType: string;
  scopeDescription?: string;
  amountFormatted: string;
  paymentMethodLabel: string;
  specialTerms?: string;
  expiresAtFormatted?: string;
  dateFormatted: string;
  isSubmitting: boolean;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

/**
 * The "DEVRE MEDIA" service-agreement letterhead used by both the standalone
 * new-contract flow and the per-project contract creator. Previously
 * duplicated verbatim (with raw slate/blue colours) in both callers.
 */
export function ContractPreviewCard({
  clientLabel,
  projectLabel,
  serviceType,
  scopeDescription,
  amountFormatted,
  paymentMethodLabel,
  specialTerms,
  expiresAtFormatted,
  dateFormatted,
  isSubmitting,
  onBack,
  onCancel,
  onSubmit,
}: ContractPreviewCardProps) {
  const t = useTranslations('contracts');
  const tc = useTranslations('common');

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">{t('contractPreview')}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{t('reviewBeforeSending')}</p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="bg-foreground px-5 py-4 flex justify-between items-end">
          <div>
            <p className="text-background font-bold tracking-widest text-sm">DEVRE MEDIA</p>
            <p className="text-background/70 text-[10px] tracking-widest mt-0.5 uppercase">
              {t('videographyProduction')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-background/70 text-[10px] tracking-widest font-semibold uppercase">
              {t('serviceAgreementLabel')}
            </p>
            <p className="text-background/50 text-[9px] mt-0.5">{dateFormatted}</p>
          </div>
        </div>
        <div className="h-0.5 bg-primary" />

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted border-l-4 border-primary px-4 py-3">
              <p className="text-[9px] text-muted-foreground tracking-widest mb-1 uppercase">
                {t('serviceProviderLabel')}
              </p>
              <p className="font-bold text-foreground text-sm">Devre Media</p>
              <p className="text-xs text-muted-foreground">{t('videographyProduction')}</p>
            </div>
            <div className="rounded-lg bg-muted border-l-4 border-primary px-4 py-3">
              <p className="text-[9px] text-muted-foreground tracking-widest mb-1 uppercase">
                {t('client')}
              </p>
              <p className="font-bold text-foreground text-sm">{clientLabel}</p>
              {projectLabel && <p className="text-xs text-muted-foreground">{projectLabel}</p>}
            </div>
          </div>

          <div className="space-y-2.5">
            <DetailRow
              icon={<Briefcase className="h-3.5 w-3.5" />}
              label={t('scopeOfServices')}
              value={serviceType || '—'}
            />
            {scopeDescription && (
              <DetailRow
                icon={<Briefcase className="h-3.5 w-3.5" />}
                label={t('scopeDescription')}
                value={scopeDescription}
              />
            )}
            <DetailRow
              icon={<CreditCard className="h-3.5 w-3.5" />}
              label={t('totalAmount')}
              value={amountFormatted}
              highlight
            />
            <DetailRow
              icon={<Building2 className="h-3.5 w-3.5" />}
              label={t('paymentMethod')}
              value={paymentMethodLabel}
            />
            {specialTerms && (
              <DetailRow
                icon={<FileSignature className="h-3.5 w-3.5" />}
                label={t('specialTerms')}
                value={specialTerms}
              />
            )}
            {expiresAtFormatted && (
              <DetailRow
                icon={<Calendar className="h-3.5 w-3.5" />}
                label={t('signatureDeadline')}
                value={expiresAtFormatted}
              />
            )}
          </div>

          <div className="rounded-lg border border-tone-positive/30 bg-tone-positive-bg px-4 py-3 flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-tone-positive mt-0.5 shrink-0" />
            <p className="text-xs text-tone-positive">{t('pdfGenerationNotice')}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-1 border-t">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToEdit')}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {tc('cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
            {t('createAndSendContract')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted px-4 py-2.5">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className={`text-sm font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
