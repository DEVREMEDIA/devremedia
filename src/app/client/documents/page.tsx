import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';
import { PageHeading } from '@/components/shared/page-heading';

// Μετακομίζουν αυτούσιες οι δύο υπάρχουσες σελίδες, κάτω από μία στέγη.
import ClientContractsPage from '../contracts/contracts-page';
import ClientInvoicesPage from '../invoices/invoices-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.clientDocuments');
  return { title: t('title') };
}

type SearchParams = Promise<{ tab?: string }>;

export default async function ClientV2DocumentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations('shellV2.pages.clientDocuments');
  const TABS: SectionTab[] = [
    { key: 'contracts', label: t('tabContracts') },
    { key: 'invoices', label: t('tabInvoices') },
  ];
  const params = await searchParams;
  const active = TABS.some((tab) => tab.key === params.tab) ? (params.tab as string) : 'contracts';

  return (
    <div className="space-y-5">
      <PageHeading title={t('title')} subtitle={t('subtitle')} />

      <SectionTabs basePath="/client/documents" tabs={TABS} active={active} />

      {active === 'contracts' ? <ClientContractsPage /> : <ClientInvoicesPage />}
    </div>
  );
}
