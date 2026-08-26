import { getFilmingRequests } from '@/lib/actions/filming-requests';
import { FilmingRequestsList } from '@/components/admin/filming-requests/filming-requests-list';

export default async function AdminFilmingRequestsPage() {
  const requestsResult = await getFilmingRequests();
  const requests = requestsResult.data ?? [];

  return (
    <div className="space-y-6">
      <FilmingRequestsList requests={requests} />
    </div>
  );
}
