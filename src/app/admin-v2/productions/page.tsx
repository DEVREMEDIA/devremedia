import type { Metadata } from 'next';
import { SectionTabs, type SectionTab } from '@/components/admin-v2/section-tabs';

import { ProjectsContent } from '@/app/admin/projects/projects-content';
import AdminFilmingRequestsPage from '@/app/admin/filming-requests/page';

import { getProjects } from '@/lib/actions/projects';
import type { ProjectWithClient } from '@/types';

export const metadata: Metadata = { title: 'Παραγωγές' };

const TABS: SectionTab[] = [
  { key: 'all', label: 'Όλες' },
  { key: 'requests', label: 'Αιτήματα & κρατήσεις' },
];

type SearchParams = Promise<{ tab?: string }>;

async function AllTab() {
  const result = await getProjects();

  if (result.error) {
    return <p className="text-sm text-destructive">Σφάλμα: {result.error}</p>;
  }

  return <ProjectsContent projects={(result.data as ProjectWithClient[]) ?? []} />;
}

function RequestsTab() {
  return <AdminFilmingRequestsPage />;
}

export default async function ProductionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const active = TABS.some((t) => t.key === params.tab) ? (params.tab as string) : 'all';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Παραγωγές</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Όλα τα έργα όλων των πελατών · η προετοιμασία γυρίσματος ζει μέσα στο κάθε έργο
        </p>
      </header>

      <SectionTabs basePath="/admin-v2/productions" tabs={TABS} active={active} />

      {active === 'all' && <AllTab />}
      {active === 'requests' && <RequestsTab />}
    </div>
  );
}
