'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PROJECT_TYPE_LABELS, SERVICE_CATEGORIES } from '@/lib/constants';
import {
  Video,
  FileText,
  CalendarDays,
  MapPin,
  DollarSign,
  Package,
  Pencil,
  Check,
  Clock,
  Link2,
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import type { BookingFormData } from './booking-wizard';

interface StepReviewProps {
  formData: BookingFormData;
  onGoToStep?: (step: number) => void;
}

function getSelectedPackageInfo(formData: BookingFormData) {
  if (!formData.selected_package || !formData.project_type) return null;
  const category = SERVICE_CATEGORIES.find((c) => c.projectType === formData.project_type);
  if (!category) return null;
  const pkg = category.packages.find((p) => p.id === formData.selected_package);
  if (!pkg) return null;
  return { category, pkg };
}

const BUDGET_RANGE_LABELS: Record<string, string> = {
  under_1000: '< €1.000',
  '1000_2500': '€1.000 - €2.500',
  '2500_5000': '€2.500 - €5.000',
  '5000_10000': '€5.000 - €10.000',
  '10000_plus': '€10.000+',
  flexible: 'Ευέλικτο',
};

export function StepReview({ formData, onGoToStep }: StepReviewProps) {
  const t = useTranslations('booking');
  const packageInfo = getSelectedPackageInfo(formData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-2">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{t('reviewTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('reviewSubtitle')}</p>
      </div>

      {/* Project Info */}
      <ReviewSection
        icon={<Video className="h-4 w-4" />}
        title={t('projectInfo')}
        onEdit={onGoToStep ? () => onGoToStep(1) : undefined}
        editLabel={t('edit')}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ReviewField
            label={t('projectType')}
            value={
              formData.project_type ? PROJECT_TYPE_LABELS[formData.project_type] : t('notSpecified')
            }
          />
          <ReviewField label={t('projectTitleLabel')} value={formData.title || t('notSpecified')} />
        </div>
        {formData.description && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <ReviewField
              label={t('projectDescriptionLabel')}
              value={formData.description}
              multiline
            />
          </div>
        )}
        {formData.reference_links.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t('referenceLinksLabel')}
            </p>
            <div className="flex flex-wrap gap-2">
              {formData.reference_links
                .filter((l) => l.trim().length > 0)
                .map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Link2 className="h-3 w-3" />
                    {getDomain(link) || link}
                  </a>
                ))}
            </div>
          </div>
        )}
      </ReviewSection>

      {/* Selected Package */}
      {packageInfo && (
        <ReviewSection
          icon={<Package className="h-4 w-4" />}
          title={t('selectedPackage')}
          onEdit={onGoToStep ? () => onGoToStep(2) : undefined}
          editLabel={t('edit')}
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold">
                    {packageInfo.category.label} — {packageInfo.pkg.name}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {packageInfo.pkg.deliverables}
                  </Badge>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl font-bold">
                    {packageInfo.pkg.price.toLocaleString('el-GR')}&euro;
                  </span>
                  {packageInfo.pkg.contractDuration && (
                    <span className="text-xs text-muted-foreground block">{t('perMonth')}</span>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-primary/10 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-primary" />
                  {packageInfo.pkg.includes}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {packageInfo.pkg.deliveryTime}
                </span>
                {packageInfo.pkg.contractDuration && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {packageInfo.pkg.contractDuration}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </ReviewSection>
      )}

      {/* Preferred Dates */}
      {formData.preferred_dates.length > 0 && (
        <ReviewSection
          icon={<CalendarDays className="h-4 w-4" />}
          title={t('preferredDates')}
          onEdit={onGoToStep ? () => onGoToStep(4) : undefined}
          editLabel={t('edit')}
        >
          <div className="space-y-2">
            {formData.preferred_dates.map((dateInfo, index) => (
              <div
                key={index}
                className="flex items-center gap-3 text-sm p-2.5 rounded-lg bg-muted/30"
              >
                <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium">
                  {dateInfo.date
                    ? format(new Date(dateInfo.date), 'd MMMM yyyy', { locale: el })
                    : t('notSpecified')}
                </span>
                {dateInfo.time_slot && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    {dateInfo.time_slot}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ReviewSection>
      )}

      {/* Additional Details */}
      {(formData.location || formData.budget_range) && (
        <ReviewSection
          icon={<FileText className="h-4 w-4" />}
          title={t('additionalDetails')}
          onEdit={onGoToStep ? () => onGoToStep(5) : undefined}
          editLabel={t('edit')}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {formData.location && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('filmingLocationLabel')}</p>
                  <p className="text-sm font-medium">{formData.location}</p>
                </div>
              </div>
            )}
            {formData.budget_range && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30">
                <DollarSign className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('budgetRangeLabel')}</p>
                  <p className="text-sm font-medium">
                    {BUDGET_RANGE_LABELS[formData.budget_range] ||
                      `${Number(formData.budget_range).toLocaleString('el-GR')}€`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </ReviewSection>
      )}
    </div>
  );
}

function ReviewSection({
  icon,
  title,
  onEdit,
  editLabel,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  onEdit?: () => void;
  editLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20 rounded-t-xl">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </div>
        {onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
            {editLabel}
          </Button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ReviewField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={multiline ? 'text-sm whitespace-pre-wrap mt-1' : 'text-sm font-medium mt-0.5'}>
        {value}
      </p>
    </div>
  );
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}
