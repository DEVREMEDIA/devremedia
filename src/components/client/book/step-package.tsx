'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getServiceCategory, type ServicePackage } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Check, Clock, FileText, Package, Info, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { BookingFormData } from './booking-wizard';

interface StepPackageProps {
  formData: BookingFormData;
  updateFormData: (data: Partial<BookingFormData>) => void;
}

export function StepPackage({ formData, updateFormData }: StepPackageProps) {
  const t = useTranslations('booking');
  const category = formData.project_type ? getServiceCategory(formData.project_type) : undefined;

  if (!category) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Package className="h-8 w-8 opacity-50" />
        </div>
        <p className="font-medium">{t('noPackagesAvailable')}</p>
        <p className="text-sm mt-2">{t('continueToDescribe')}</p>
      </div>
    );
  }

  const hasPackages = category.packages.length > 0;
  const hasPerCase = !!category.perCasePricing;

  return (
    <div className="space-y-6">
      {/* Category header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">{category.label}</h3>
        <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
      </div>

      {/* Fixed packages — side by side */}
      {hasPackages && (
        <div
          className={cn(
            'grid gap-4 p-2',
            category.packages.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3',
          )}
        >
          {category.packages.map((pkg, index) => {
            const isPopular = category.packages.length >= 3 && index === 1;
            return (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                isSelected={formData.selected_package === pkg.id}
                isPopular={isPopular}
                popularLabel={t('popular')}
                selectedLabel={t('selected')}
                onSelect={() =>
                  updateFormData({
                    selected_package: pkg.id,
                    budget_range: `${pkg.price}`,
                  })
                }
              />
            );
          })}
        </div>
      )}

      {/* Per-case services (corporate video) */}
      {hasPerCase && category.perCasePricing && (
        <div className="space-y-4">
          <Card className="p-6 bg-gradient-to-br from-muted/30 to-muted/10">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              {t('indicativePricing')}
            </h4>
            <div className="space-y-2">
              {category.perCasePricing.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {category.perCasePricing.includes && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>{category.perCasePricing.includes}</span>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                {t('delivery')}: {category.perCasePricing.deliveryTime}
              </span>
            </div>

            {category.perCasePricing.note && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground mt-3">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{category.perCasePricing.note}</span>
              </div>
            )}
          </Card>

          <p className="text-sm text-muted-foreground text-center">{t('continueForQuote')}</p>
        </div>
      )}

      {/* No packages and no per-case */}
      {!hasPackages && !hasPerCase && (
        <Card className="p-8 text-center bg-gradient-to-br from-muted/30 to-muted/10">
          <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('describeForCustomQuote')}</p>
        </Card>
      )}

      {/* Cancellation policy */}
      <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
        <h4 className="text-sm font-medium mb-1">{t('cancellationPolicy')}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {category.cancellationPolicy}
        </p>
      </div>
    </div>
  );
}

function PackageCard({
  pkg,
  isSelected,
  isPopular,
  popularLabel,
  selectedLabel,
  onSelect,
}: {
  pkg: ServicePackage;
  isSelected: boolean;
  isPopular: boolean;
  popularLabel: string;
  selectedLabel: string;
  onSelect: () => void;
}) {
  return (
    <Card
      className={cn(
        'relative p-6 cursor-pointer transition-all duration-200 hover:shadow-lg flex flex-col',
        isPopular && !isSelected && 'border-primary/50 shadow-md scale-[1.02]',
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-lg'
          : 'border-border hover:border-primary/50 hover:scale-[1.01]',
      )}
      onClick={onSelect}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground gap-1 px-3 py-1">
            <Star className="h-3 w-3 fill-current" />
            {popularLabel}
          </Badge>
        </div>
      )}

      {/* Selected check */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      )}

      <div className="flex-1 space-y-4">
        {/* Package name */}
        <div className={cn('text-center', isPopular && 'mt-2')}>
          <h4 className="font-bold text-base">{pkg.name}</h4>
          <Badge variant="secondary" className="mt-1.5 text-xs">
            {pkg.deliverables}
          </Badge>
        </div>

        {/* Price */}
        <div className="text-center py-2">
          <span className="text-3xl font-bold">{pkg.price.toLocaleString('el-GR')}</span>
          <span className="text-lg text-muted-foreground">&euro;</span>
          {pkg.contractDuration && (
            <span className="text-xs text-muted-foreground block mt-0.5">/month</span>
          )}
        </div>

        {/* Features */}
        <div className="space-y-2.5">
          <div className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>{pkg.includes}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{pkg.deliveryTime}</span>
          </div>
          {pkg.contractDuration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              <span>{pkg.contractDuration}</span>
            </div>
          )}
          {pkg.notes && <p className="text-xs text-muted-foreground italic pt-1">{pkg.notes}</p>}
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t text-sm text-primary font-medium">
          <Check className="h-4 w-4" />
          {selectedLabel}
        </div>
      )}
    </Card>
  );
}
