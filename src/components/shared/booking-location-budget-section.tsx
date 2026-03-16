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
      <h2 className="text-lg font-semibold text-white">{t('locationBudgetSection')}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location" className="text-zinc-300">
            {t('locationLabel')}
          </Label>
          <Input
            id="location"
            {...register('location')}
            placeholder={t('locationPlaceholder')}
            className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget_range" className="text-zinc-300">
            {t('budgetLabel')}
          </Label>
          <Select
            value={watch('budget_range') || undefined}
            onValueChange={(value) => setValue('budget_range', value)}
          >
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
              <SelectValue placeholder={t('selectBudget')} />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem
                value="under_1000"
                className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
              >
                {t('budgetUnder1000')}
              </SelectItem>
              <SelectItem
                value="1000_2500"
                className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
              >
                {t('budget1000_2500')}
              </SelectItem>
              <SelectItem
                value="2500_5000"
                className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
              >
                {t('budget2500_5000')}
              </SelectItem>
              <SelectItem
                value="5000_10000"
                className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
              >
                {t('budget5000_10000')}
              </SelectItem>
              <SelectItem
                value="10000_plus"
                className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
              >
                {t('budget10000Plus')}
              </SelectItem>
              <SelectItem
                value="flexible"
                className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
              >
                {t('budgetFlexible')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
