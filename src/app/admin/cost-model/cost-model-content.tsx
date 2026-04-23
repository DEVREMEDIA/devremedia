'use client';

import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/page-header';
import type { CostCategory, CostItemWithCategory, CostSettings, CostSummary } from '@/types/index';
import { CostSummaryTab } from './tabs/summary-tab';
import { CostItemsTab } from './tabs/items-tab';
import { CostCategoriesTab } from './tabs/categories-tab';
import { CostSettingsTab } from './tabs/settings-tab';

interface Props {
  initialCategories: CostCategory[];
  initialItems: CostItemWithCategory[];
  initialSettings: CostSettings | null;
  initialSummary: CostSummary | null;
}

export function CostModelContent({
  initialCategories,
  initialItems,
  initialSettings,
  initialSummary,
}: Props) {
  const t = useTranslations('costModel');

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid md:grid-cols-4">
          <TabsTrigger value="summary">{t('tabs.summary')}</TabsTrigger>
          <TabsTrigger value="items">{t('tabs.items')}</TabsTrigger>
          <TabsTrigger value="categories">{t('tabs.categories')}</TabsTrigger>
          <TabsTrigger value="settings">{t('tabs.settings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <CostSummaryTab initialSummary={initialSummary} />
        </TabsContent>

        <TabsContent value="items" className="mt-6">
          <CostItemsTab initialItems={initialItems} categories={initialCategories} />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CostCategoriesTab initialCategories={initialCategories} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <CostSettingsTab initialSettings={initialSettings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
