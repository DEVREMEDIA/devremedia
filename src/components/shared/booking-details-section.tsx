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
      <h2 className="text-lg font-semibold text-foreground">{t('detailsSection')}</h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">
            {t('titleLabel')} <span className="text-destructive">*</span>
          </Label>
          <Input id="title" {...register('title')} placeholder={t('titlePlaceholder')} />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('descriptionLabel')}</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder={t('descriptionPlaceholder')}
            rows={4}
            className="resize-none"
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>
      </div>
    </section>
  );
}
