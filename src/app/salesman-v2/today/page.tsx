import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import SalesmanDashboardPage from '@/app/salesman/dashboard/page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.salesmanToday');
  return { title: t('title') };
}

export default function SalesmanV2TodayPage() {
  return <SalesmanDashboardPage />;
}
