import type { Metadata } from 'next';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';

// Μετακομίζουν αυτούσιες οι δύο υπάρχουσες σελίδες, κάτω από μία στέγη.
import ClientContractsPage from '@/app/client/contracts/page';
import ClientInvoicesPage from '@/app/client/invoices/page';

export const metadata: Metadata = { title: 'Τα χαρτιά μου' };

const TABS: SectionTab[] = [
  { key: 'contracts', label: 'Συμφωνητικά' },
  { key: 'invoices', label: 'Τιμολόγια' },
];

type SearchParams = Promise<{ tab?: string }>;

export default async function ClientV2DocumentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const active = TABS.some((t) => t.key === params.tab) ? (params.tab as string) : 'contracts';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Τα χαρτιά μου</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ό,τι έχεις υπογράψει και ό,τι έχεις πληρώσει — ένα μέρος
        </p>
      </header>

      <SectionTabs basePath="/client-v2/documents" tabs={TABS} active={active} />

      {active === 'contracts' ? <ClientContractsPage /> : <ClientInvoicesPage />}
    </div>
  );
}
