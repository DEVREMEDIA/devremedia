import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import SalesmanSettingsPage from '@/app/salesman/settings/page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.salesmanSettings');
  return { title: t('title') };
}

export default function SalesmanV2SettingsPage() {
  return <SalesmanSettingsPage />;
}
