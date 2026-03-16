'use client';

import { UseFormRegister, UseFieldArrayReturn } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';

import { type PublicBookingInput } from '@/lib/schemas/filming-request';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BookingDatesSectionProps {
  register: UseFormRegister<PublicBookingInput>;
  fields: UseFieldArrayReturn<PublicBookingInput, 'preferred_dates'>['fields'];
  append: UseFieldArrayReturn<PublicBookingInput, 'preferred_dates'>['append'];
  remove: UseFieldArrayReturn<PublicBookingInput, 'preferred_dates'>['remove'];
}

export function BookingDatesSection({
  register,
  fields,
  append,
  remove,
}: BookingDatesSectionProps) {
  const t = useTranslations('publicBooking');

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">{t('datesSection')}</h2>
        <p className="text-sm text-zinc-400">{t('datesHelp')}</p>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-3">
            <div className="flex-1">
              <Input
                type="date"
                {...register(`preferred_dates.${index}.date`)}
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="flex-1">
              <Input
                {...register(`preferred_dates.${index}.time_slot`)}
                placeholder={t('timeSlotPlaceholder')}
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => append({ date: '', time_slot: '' })}
          className="w-full border-zinc-700 bg-zinc-800/30 text-zinc-300 hover:bg-zinc-800/50 hover:text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('addDate')}
        </Button>
      </div>
    </section>
  );
}
