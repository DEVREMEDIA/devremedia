import { getTranslations } from 'next-intl/server';
import { PageHeading } from '@/components/shared/page-heading';
import { AvailabilityEditor } from '@/components/admin/availability/availability-editor';

export default async function AvailabilityPage() {
  const t = await getTranslations('availability');
  const month = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' }).slice(0, 7);

  return (
    <div className="space-y-6">
      <PageHeading title={t('title')} subtitle={t('description')} />
      <AvailabilityEditor initialMonth={month} />
    </div>
  );
}
