'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { publicBookingSchema, type PublicBookingInput } from '@/lib/schemas/filming-request';
import { createPublicFilmingRequest } from '@/lib/actions/filming-requests';
import { type ProjectType } from '@/lib/constants';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookingSuccess } from '@/components/shared/booking-success';
import { BookingContactSection } from '@/components/shared/booking-contact-section';
import { BookingProjectTypeSection } from '@/components/shared/booking-project-type-section';
import { BookingDetailsSection } from '@/components/shared/booking-details-section';
import { BookingDatesSection } from '@/components/shared/booking-dates-section';
import { BookingLocationBudgetSection } from '@/components/shared/booking-location-budget-section';

type PublicBookingFormData = PublicBookingInput;

export function PublicBookingForm() {
  const t = useTranslations('publicBooking');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<PublicBookingFormData>({
    resolver: zodResolver(publicBookingSchema),
    defaultValues: {
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      contact_company: '',
      title: '',
      description: '',
      project_type: undefined,
      budget_range: '',
      location: '',
      preferred_dates: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'preferred_dates',
  });

  const selectedProjectType = watch('project_type') as ProjectType | undefined;

  const handleProjectTypeSelect = (type: ProjectType) => {
    setValue('project_type', type);
  };

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

      <BookingProjectTypeSection
        selectedProjectType={selectedProjectType}
        errors={errors}
        onSelect={handleProjectTypeSelect}
      />

      <BookingDetailsSection register={register} errors={errors} />

      <BookingDatesSection register={register} fields={fields} append={append} remove={remove} />

      <BookingLocationBudgetSection register={register} watch={watch} setValue={setValue} />

      <div className="pt-4 space-y-3">
        <Button type="submit" disabled={isSubmitting} className="w-full font-semibold py-6 text-lg">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t('submitting')}
            </>
          ) : (
            t('submitRequest')
          )}
        </Button>
        <Button
          asChild
          variant="ghost"
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToHome')}
          </Link>
        </Button>
      </div>
    </form>
  );
}
