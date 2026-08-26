import { createClient } from '@/lib/supabase/server';
import { getMyContracts } from '@/lib/actions/contracts';
import { redirect } from 'next/navigation';
import { ContractsList } from './contracts-list';

export default async function ClientContractsPage() {
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
      <ContractsList contracts={contracts} />
    </div>
  );
}
