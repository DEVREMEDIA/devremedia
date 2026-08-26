import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';

import EmployeeTasksPage from '@/app/employee/tasks/tasks-page';
import { DeliverablesIndex } from './deliverables-index';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.employeeWork');
  return { title: t('title') };
}

type SearchParams = Promise<{ tab?: string }>;

export default async function EmployeeV2WorkPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations('shellV2.pages.employeeWork');
  const TABS: SectionTab[] = [
    { key: 'tasks', label: t('tabTasks') },
    { key: 'deliverables', label: t('tabDeliverables') },
  ];
  const params = await searchParams;
  const active = TABS.some((tab) => tab.key === params.tab) ? (params.tab as string) : 'tasks';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      <SectionTabs basePath="/employee/work" tabs={TABS} active={active} />

      {active === 'tasks' ? <EmployeeTasksPage /> : <DeliverablesIndex />}
    </div>
  );
}
