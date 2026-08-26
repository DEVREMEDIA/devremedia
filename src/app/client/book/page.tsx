import { PageHeading } from '@/components/shared/page-heading';
import { AvailabilityView } from '@/components/client/book/availability-view';
import { getMyAvailability } from '@/lib/actions/booking-availability';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarOff } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const CONTACT_EMAIL = 'info@devremedia.com';

export default async function ClientBookingPage() {
  const t = await getTranslations('booking');
  const { data: availability } = await getMyAvailability();

  return (
    <div className="container mx-auto space-y-6 px-4 py-6 sm:px-6">
      <PageHeading title={t('title')} subtitle={t('description')} />

      {availability ? (
        <AvailabilityView availability={availability} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <CalendarOff className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-lg font-semibold">{t('noAgreementTitle')}</p>
              <p className="max-w-md text-sm text-muted-foreground">{t('noAgreementBody')}</p>
            </div>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {t('contactUs')}
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
