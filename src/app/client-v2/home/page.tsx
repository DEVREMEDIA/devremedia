import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

// Μετακομίζει αυτούσια — η αρχική του πελάτη έχει ήδη τη λίστα εκκρεμοτήτων.
import ClientDashboardPage from '@/app/client/dashboard/page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.clientHome');
  return { title: t('title') };
}

export default function ClientV2HomePage() {
  return <ClientDashboardPage />;
}
