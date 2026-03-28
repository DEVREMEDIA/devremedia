'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, DollarSign, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { BookingFormData } from './booking-wizard';

interface StepLocationProps {
  formData: BookingFormData;
  updateFormData: (data: Partial<BookingFormData>) => void;
}

const BUDGET_RANGE_KEYS = [
  'under_1000',
  '1000_2500',
  '2500_5000',
  '5000_10000',
  '10000_plus',
  'flexible',
] as const;

const BUDGET_LABEL_MAP: Record<string, string> = {
  under_1000: 'budgetUnder1000',
  '1000_2500': 'budget1000_2500',
  '2500_5000': 'budget2500_5000',
  '5000_10000': 'budget5000_10000',
  '10000_plus': 'budget10000Plus',
  flexible: 'budgetFlexible',
};

export function StepLocation({ formData, updateFormData }: StepLocationProps) {
  const t = useTranslations('booking');

  // Check if budget was pre-filled from a package (numeric value)
  const isPackageBudget =
    formData.selected_package &&
    formData.budget_range &&
    !BUDGET_RANGE_KEYS.includes(formData.budget_range as (typeof BUDGET_RANGE_KEYS)[number]);

  return (
    <div className="space-y-8">
      {/* Location Section */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div>
            <Label htmlFor="location" className="font-medium">
              {t('filmingLocationLabel')}
            </Label>
            <p className="text-xs text-muted-foreground">{t('whereWillFilming')}</p>
          </div>
        </div>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => updateFormData({ location: e.target.value })}
          placeholder={t('filmingLocationPlaceholder')}
          className="h-11"
        />
      </div>

      {/* Budget Section */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div>
            <Label className="font-medium">{t('budgetRangeLabel')}</Label>
            <p className="text-xs text-muted-foreground">{t('locationHelperText')}</p>
          </div>
        </div>

        {/* If package was selected, show that info instead */}
        {isPackageBudget ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Package className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t('packageSelected')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {Number(formData.budget_range).toLocaleString('el-GR')}&euro;
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {t('selected')}
            </Badge>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {BUDGET_RANGE_KEYS.map((key) => {
              const isActive = formData.budget_range === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateFormData({ budget_range: isActive ? '' : key })}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-all border',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
                  )}
                >
                  {t(BUDGET_LABEL_MAP[key])}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
