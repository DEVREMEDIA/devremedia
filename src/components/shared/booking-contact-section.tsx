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
      <h2 className="text-lg font-semibold text-white">{t('contactInfoSection')}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact_name" className="text-zinc-300">
            {t('nameLabel')} <span className="text-red-400">*</span>
          </Label>
          <Input
            id="contact_name"
            {...register('contact_name')}
            placeholder={t('namePlaceholder')}
            className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
          />
          {errors.contact_name && (
            <p className="text-sm text-red-400">{errors.contact_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email" className="text-zinc-300">
            {t('emailLabel')} <span className="text-red-400">*</span>
          </Label>
          <Input
            id="contact_email"
            type="email"
            {...register('contact_email')}
            placeholder={t('emailPlaceholder')}
            className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
          />
          {errors.contact_email && (
            <p className="text-sm text-red-400">{errors.contact_email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_phone" className="text-zinc-300">
            {t('phoneLabel')}
          </Label>
          <Input
            id="contact_phone"
            {...register('contact_phone')}
            placeholder={t('phonePlaceholder')}
            className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_company" className="text-zinc-300">
            {t('companyLabel')}
          </Label>
          <Input
            id="contact_company"
            {...register('contact_company')}
            placeholder={t('companyPlaceholder')}
            className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
          />
        </div>
      </div>
    </section>
  );
}
