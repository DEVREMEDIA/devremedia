'use client';

import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { type PublicBookingInput } from '@/lib/schemas/filming-request';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface BookingDetailsSectionProps {
  register: UseFormRegister<PublicBookingInput>;
  errors: FieldErrors<PublicBookingInput>;
}

export function BookingDetailsSection({ register, errors }: BookingDetailsSectionProps) {
  const t = useTranslations('publicBooking');

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-white">{t('detailsSection')}</h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-zinc-300">
            {t('titleLabel')} <span className="text-red-400">*</span>
          </Label>
          <Input
            id="title"
            {...register('title')}
            placeholder={t('titlePlaceholder')}
            className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
          />
          {errors.title && <p className="text-sm text-red-400">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-zinc-300">
            {t('descriptionLabel')}
          </Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder={t('descriptionPlaceholder')}
            rows={4}
            className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
          />
          {errors.description && (
            <p className="text-sm text-red-400">{errors.description.message}</p>
          )}
        </div>
      </div>
    </section>
  );
}
