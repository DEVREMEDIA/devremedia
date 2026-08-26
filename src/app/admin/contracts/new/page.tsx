import { getTranslations } from 'next-intl/server';
import { getClients } from '@/lib/actions/clients';
import { PageHeading } from '@/components/shared/page-heading';
import { NewContractForm } from './new-contract-form';

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const t = await getTranslations('contracts');
  const params = await searchParams;
  const clientsResult = await getClients();
  const clients = clientsResult.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeading title={t('newContract')} subtitle={t('newContractDescription')} />
      <div className="max-w-2xl">
        <NewContractForm clients={clients} preselectedClientId={params.clientId} />
      </div>
    </div>
  );
}
