import { createClient } from '@/lib/supabase/server';
import { getMyContracts } from '@/lib/actions/contracts';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { ContractsList } from './contracts-list';
import { getTranslations } from 'next-intl/server';

export default async function ClientContractsPage() {
  const t = await getTranslations('client.contracts');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const contractsResult = await getMyContracts();
  const contracts = contractsResult.data ?? [];

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 space-y-6">
      <PageHeader title={t('title')} description={t('description')} />
      <ContractsList contracts={contracts} />
    </div>
  );
}
