'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { publicBookingSchema, type PublicBookingInput } from '@/lib/schemas/filming-request';
import { createPublicFilmingRequest } from '@/lib/actions/filming-requests';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookingSuccess } from '@/components/shared/booking-success';
import { BookingContactSection } from '@/components/shared/booking-contact-section';

type PublicBookingFormData = PublicBookingInput;

export function PublicBookingForm() {
  const t = useTranslations('publicBooking');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PublicBookingFormData>({
    resolver: zodResolver(publicBookingSchema),
    defaultValues: {
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      contact_company: '',
      description: '',
    },
  });

  const onSubmit = async (data: PublicBookingFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createPublicFilmingRequest(data);
      if (result.error) {
        toast.error(result.error);
      } else {
        setIsSuccess(true);
      }
    } catch {
      toast.error(t('submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return <BookingSuccess />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <BookingContactSection register={register} errors={errors} />

      <section className="space-y-2">
        <Label htmlFor="description" className="text-zinc-300">
          {t('messageLabel')}
        </Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder={t('messagePlaceholder')}
          rows={5}
          className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
        />
        {errors.description && <p className="text-sm text-red-400">{errors.description.message}</p>}
      </section>

      <div className="pt-4 space-y-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold py-6 text-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t('submitting')}
            </>
          ) : (
            t('submitRequest')
          )}
        </Button>
        <Button asChild variant="ghost" className="w-full text-zinc-400 hover:text-white">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToHome')}
          </Link>
        </Button>
      </div>
    </form>
  );
}
