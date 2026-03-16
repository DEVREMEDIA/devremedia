'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getServiceCategory, type ServicePackage } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Check, Clock, FileText, Package, Euro, Info } from 'lucide-react';
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
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t('noPackagesAvailable')}</p>
        <p className="text-sm mt-2">{t('continueToDescribe')}</p>
      </div>
    );
  }

  const hasPackages = category.packages.length > 0;
  const hasPerCase = !!category.perCasePricing;

  return (
    <div className="space-y-6">
      {/* Category header */}
      <div>
        <h3 className="text-lg font-semibold">{category.label}</h3>
        <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
      </div>

      {/* Fixed packages */}
      {hasPackages && (
        <div className="grid gap-4">
          {category.packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              isSelected={formData.selected_package === pkg.id}
              onSelect={() =>
                updateFormData({
                  selected_package: pkg.id,
                  budget_range: `${pkg.price}`,
                })
              }
            />
          ))}
        </div>
      )}

      {/* Per-case pricing (corporate video) */}
      {hasPerCase && category.perCasePricing && (
        <div className="space-y-4">
          <Card className="p-5">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Euro className="h-4 w-4" />
              {t('indicativePricing')}
            </h4>
            <div className="space-y-2">
              {category.perCasePricing.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.price}</span>
                </div>
              ))}
            </div>

            {category.perCasePricing.includes && (
              <>
                <Separator className="my-3" />
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>{category.perCasePricing.includes}</span>
                </div>
              </>
            )}

            <Separator className="my-3" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                {t('delivery')}: {category.perCasePricing.deliveryTime}
                {category.perCasePricing.fastDeliveryFee &&
                  ` (${t('fastDelivery')}: +${category.perCasePricing.fastDeliveryFee}\u20AC)`}
              </span>
            </div>

            {category.perCasePricing.note && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{category.perCasePricing.note}</span>
              </div>
            )}
          </Card>

          <p className="text-sm text-muted-foreground text-center">{t('continueForQuote')}</p>
        </div>
      )}

      {/* No packages and no per-case: custom request */}
      {!hasPackages && !hasPerCase && (
        <Card className="p-5 text-center">
          <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('describeForCustomQuote')}</p>
        </Card>
      )}

      {/* Cancellation policy */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-1">{t('cancellationPolicy')}</h4>
        <p className="text-xs text-muted-foreground">{category.cancellationPolicy}</p>
      </div>
    </div>
  );
}

function PackageCard({
  pkg,
  isSelected,
  onSelect,
}: {
  pkg: ServicePackage;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className={cn(
        'p-5 cursor-pointer transition-all hover:shadow-md',
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary'
          : 'border-border hover:border-primary/50',
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* Package name + deliverables */}
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{pkg.name}</h4>
            <Badge variant="secondary" className="text-xs">
              {pkg.deliverables}
            </Badge>
          </div>

          {/* Includes */}
          <p className="text-sm text-muted-foreground">{pkg.includes}</p>

          {/* Meta info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {pkg.deliveryTime}
            </span>
            {pkg.contractDuration && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {pkg.contractDuration}
              </span>
            )}
            {pkg.hasPrePayDiscount && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 text-green-600 border-green-300"
              >
                10% έκπτωση προεξόφλησης 6μηνου
              </Badge>
            )}
          </div>

          {pkg.notes && <p className="text-xs text-muted-foreground italic">{pkg.notes}</p>}
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <div className="text-xl font-bold">{pkg.price.toLocaleString('el-GR')}&euro;</div>
          {pkg.priceWithScripts && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {pkg.priceWithScripts.toLocaleString('el-GR')}&euro; με σενάρια
            </div>
          )}
          <div className="text-xs text-muted-foreground">/ μήνα</div>
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="flex items-center gap-1 mt-3 text-sm text-primary font-medium">
          <Check className="h-4 w-4" />
          Επιλεγμένο
        </div>
      )}
    </Card>
  );
}
