import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import ClientProjectsPage from '@/app/client/projects/page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.clientProductions');
  return { title: t('title') };
}

export default function ClientV2ProductionsPage() {
  return <ClientProjectsPage />;
}
