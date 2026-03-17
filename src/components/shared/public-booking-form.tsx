'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { publicBookingSchema, type PublicBookingInput } from '@/lib/schemas/filming-request';
import { createPublicFilmingRequest } from '@/lib/actions/filming-requests';
import { getServiceCategory, type ProjectType } from '@/lib/constants';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookingSuccess } from '@/components/shared/booking-success';
import { BookingContactSection } from '@/components/shared/booking-contact-section';
import { BookingProjectTypeSection } from '@/components/shared/booking-project-type-section';
import { BookingPackageSection } from '@/components/shared/booking-package-section';
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
      selected_package: '',
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
  const serviceCategory = selectedProjectType ? getServiceCategory(selectedProjectType) : undefined;

  const handleProjectTypeSelect = (type: ProjectType) => {
    setValue('project_type', type);
    setValue('selected_package', '');
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

      {serviceCategory && (
        <BookingPackageSection
          packages={serviceCategory.packages}
          selectedPackage={watch('selected_package') ?? ''}
          onSelect={(id) => setValue('selected_package', id)}
        />
      )}

      <BookingDetailsSection register={register} errors={errors} />

      <BookingDatesSection register={register} fields={fields} append={append} remove={remove} />

      <BookingLocationBudgetSection register={register} watch={watch} setValue={setValue} />

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
