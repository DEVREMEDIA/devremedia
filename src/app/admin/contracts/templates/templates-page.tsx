import { getContractTemplates } from '@/lib/actions/contracts';
import { TemplatesContent } from './templates-content';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('contracts');
  return {
    title: `${t('templates')} | Devre Media`,
    description: t('description'),
  };
}

export default async function ContractTemplatesPage() {
  const result = await getContractTemplates();

  if (result.error) {
    return (
      <div className="space-y-6">
        <div className="text-center text-red-600">
          <p>Failed to load templates: {result.error}</p>
        </div>
      </div>
    );
  }

  const templates = result.data ?? [];

  return (
    <div className="space-y-6">
      <TemplatesContent templates={templates} />
    </div>
  );
}
