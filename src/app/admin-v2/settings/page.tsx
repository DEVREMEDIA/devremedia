import type { Metadata } from 'next';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';

// Οι υπάρχουσες σελίδες μπαίνουν αυτούσιες ως καρτέλες — καμία αντιγραφή λογικής.
import AdminSettingsPage from '@/app/admin/settings/page';
import AdminUsersPage from '@/app/admin/users/page';
import ProposalPackagesPage from '@/app/admin/proposal-packages/page';
import ContractTemplatesPage from '@/app/admin/contracts/templates/page';

export const metadata: Metadata = { title: 'Ρυθμίσεις' };

const TABS: SectionTab[] = [
  { key: 'general', label: 'Γενικές' },
  { key: 'users', label: 'Χρήστες & ρόλοι' },
  { key: 'packages', label: 'Πακέτα & τιμές' },
  { key: 'templates', label: 'Πρότυπα' },
];

type SearchParams = Promise<{ tab?: string }>;

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const active = TABS.some((t) => t.key === params.tab) ? (params.tab as string) : 'general';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ρυθμίσεις</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ό,τι ρυθμίζεται μία φορά και μετά δουλεύει μόνο του
        </p>
      </header>

      <SectionTabs basePath="/admin-v2/settings" tabs={TABS} active={active} />

      {active === 'general' && <AdminSettingsPage />}
      {active === 'users' && <AdminUsersPage />}
      {active === 'packages' && <ProposalPackagesPage />}
      {active === 'templates' && <ContractTemplatesPage />}
    </div>
  );
}
