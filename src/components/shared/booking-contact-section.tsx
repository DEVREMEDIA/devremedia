'use client';

import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { type PublicBookingInput } from '@/lib/schemas/filming-request';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BookingContactSectionProps {
  register: UseFormRegister<PublicBookingInput>;
  errors: FieldErrors<PublicBookingInput>;
}

export function BookingContactSection({ register, errors }: BookingContactSectionProps) {
  const t = useTranslations('publicBooking');

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{t('contactInfoSection')}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact_name">
            {t('nameLabel')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contact_name"
            {...register('contact_name')}
            placeholder={t('namePlaceholder')}
          />
          {errors.contact_name && (
            <p className="text-sm text-destructive">{errors.contact_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email">
            {t('emailLabel')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contact_email"
            type="email"
            {...register('contact_email')}
            placeholder={t('emailPlaceholder')}
          />
          {errors.contact_email && (
            <p className="text-sm text-destructive">{errors.contact_email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_phone">{t('phoneLabel')}</Label>
          <Input
            id="contact_phone"
            {...register('contact_phone')}
            placeholder={t('phonePlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_company">{t('companyLabel')}</Label>
          <Input
            id="contact_company"
            {...register('contact_company')}
            placeholder={t('companyPlaceholder')}
          />
        </div>
      </div>
    </section>
  );
}
