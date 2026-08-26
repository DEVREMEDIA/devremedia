import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import ClientBookingPage from '@/app/client/book/page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.clientBook');
  return { title: t('title') };
}

export default function ClientV2BookPage() {
  return <ClientBookingPage />;
}
