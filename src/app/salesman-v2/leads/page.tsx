import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import SalesmanLeadsPage from '@/app/salesman/leads/page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.salesmanLeads');
  return { title: t('title') };
}

export default function SalesmanV2LeadsPage() {
  return <SalesmanLeadsPage />;
}
