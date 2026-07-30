import type { Metadata } from 'next';

import ClientProjectsPage from '@/app/client/projects/page';

export const metadata: Metadata = { title: 'Οι παραγωγές μου' };

export default function ClientV2ProductionsPage() {
  return <ClientProjectsPage />;
}
