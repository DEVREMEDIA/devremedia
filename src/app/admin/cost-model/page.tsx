import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  getCostCategories,
  getCostItems,
  getCostSettings,
  getCostSummary,
} from '@/lib/actions/cost-model';
import { getCostItemBreakdowns } from '@/lib/actions/cost-item-breakdown';
import { CostModelContent } from './cost-model-content';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('costModel');
  return { title: t('title') };
}

export default async function CostModelPage() {
  const [categories, items, settings, summary, breakdowns] = await Promise.all([
    getCostCategories(),
    getCostItems({ include_inactive: true }),
    getCostSettings(),
    getCostSummary(),
    getCostItemBreakdowns({ include_inactive: true }),
  ]);

  return (
    <CostModelContent
      initialCategories={categories.data ?? []}
      initialItems={items.data ?? []}
      initialSettings={settings.data}
      initialSummary={summary.data}
      initialBreakdowns={breakdowns.data ?? []}
    />
  );
}
