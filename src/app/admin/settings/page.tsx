import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';
import { PageHeading } from '@/components/shared/page-heading';

// Οι υπάρχουσες σελίδες μπαίνουν αυτούσιες ως καρτέλες — καμία αντιγραφή λογικής.
import AdminSettingsPage from './settings-page';
import AdminUsersPage from '@/app/admin/users/users-page';
import ProposalPackagesPage from '@/app/admin/proposal-packages/packages-page';
import ContractTemplatesPage from '@/app/admin/contracts/templates/templates-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.adminSettings');
  return { title: t('title') };
}

type SearchParams = Promise<{ tab?: string }>;

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations('shellV2.pages.adminSettings');
  const TABS: SectionTab[] = [
    { key: 'general', label: t('tabGeneral') },
    { key: 'users', label: t('tabUsers') },
    { key: 'packages', label: t('tabPackages') },
    { key: 'templates', label: t('tabTemplates') },
  ];
  const params = await searchParams;
  const active = TABS.some((tab) => tab.key === params.tab) ? (params.tab as string) : 'general';

  return (
    <div className="space-y-5">
      <PageHeading title={t('title')} subtitle={t('subtitle')} />

      <SectionTabs basePath="/admin/settings" tabs={TABS} active={active} />

      {active === 'general' && <AdminSettingsPage />}
      {active === 'users' && <AdminUsersPage />}
      {active === 'packages' && <ProposalPackagesPage />}
      {active === 'templates' && <ContractTemplatesPage />}
    </div>
  );
}
