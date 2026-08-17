import type { Metadata } from 'next';

import SalesmanDashboardPage from '@/app/salesman/dashboard/page';

export const metadata: Metadata = { title: 'Σήμερα' };

export default function SalesmanV2TodayPage() {
  return <SalesmanDashboardPage />;
}
