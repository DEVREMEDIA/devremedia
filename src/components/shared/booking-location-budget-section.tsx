'use client';

import { UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { type PublicBookingInput } from '@/lib/schemas/filming-request';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BookingLocationBudgetSectionProps {
  register: UseFormRegister<PublicBookingInput>;
  watch: UseFormWatch<PublicBookingInput>;
  setValue: UseFormSetValue<PublicBookingInput>;
}

export function BookingLocationBudgetSection({
  register,
  watch,
  setValue,
}: BookingLocationBudgetSectionProps) {
  const t = useTranslations('publicBooking');

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{t('locationBudgetSection')}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location">{t('locationLabel')}</Label>
          <Input id="location" {...register('location')} placeholder={t('locationPlaceholder')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget_range">{t('budgetLabel')}</Label>
          <Select
            value={watch('budget_range') || undefined}
            onValueChange={(value) => setValue('budget_range', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectBudget')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="under_1000">{t('budgetUnder1000')}</SelectItem>
              <SelectItem value="1000_2500">{t('budget1000_2500')}</SelectItem>
              <SelectItem value="2500_5000">{t('budget2500_5000')}</SelectItem>
              <SelectItem value="5000_10000">{t('budget5000_10000')}</SelectItem>
              <SelectItem value="10000_plus">{t('budget10000Plus')}</SelectItem>
              <SelectItem value="flexible">{t('budgetFlexible')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
