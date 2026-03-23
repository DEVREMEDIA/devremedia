import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getAllContracts } from '@/lib/actions/contracts';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
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
      <PageHeader title={t('title')} description={t('description')}>
        <Button asChild>
          <Link href="/admin/contracts/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('addContract')}
          </Link>
        </Button>
      </PageHeader>
      <ContractsListPage contracts={contracts} />
    </div>
  );
}
