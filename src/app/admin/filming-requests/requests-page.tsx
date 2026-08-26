import { getFilmingRequests } from '@/lib/actions/filming-requests';
import { PageHeader } from '@/components/shared/page-header';
import { FilmingRequestsList } from '@/components/admin/filming-requests/filming-requests-list';
import { getTranslations } from 'next-intl/server';

export default async function AdminFilmingRequestsPage() {
  const t = await getTranslations('filmingRequests');
  const requestsResult = await getFilmingRequests();
  const requests = requestsResult.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <FilmingRequestsList requests={requests} />
    </div>
  );
}
