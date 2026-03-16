import { getTranslations } from 'next-intl/server';
import { getAllContracts } from '@/lib/actions/contracts';
import { PageHeader } from '@/components/shared/page-header';
import { ContractsListPage } from './contracts-list-page';

export default async function AdminContractsPage() {
  const t = await getTranslations('contracts');
  const result = await getAllContracts();
  const contracts = (result.data ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
    client?: { company_name?: string; contact_name?: string } | null;
    project?: { title?: string } | null;
  }>;

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />
      <ContractsListPage contracts={contracts} />
    </div>
  );
}
