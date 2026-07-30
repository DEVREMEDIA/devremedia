import type { Metadata } from 'next';

import SalesmanLeadsPage from '@/app/salesman/leads/page';

export const metadata: Metadata = { title: 'Ευκαιρίες' };

export default function SalesmanV2LeadsPage() {
  return <SalesmanLeadsPage />;
}
