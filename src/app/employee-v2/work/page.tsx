import type { Metadata } from 'next';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';

import EmployeeTasksPage from '@/app/employee/tasks/page';
import { DeliverablesIndex } from './deliverables-index';

export const metadata: Metadata = { title: 'Η δουλειά μου' };

const TABS: SectionTab[] = [
  { key: 'tasks', label: 'Εργασίες' },
  { key: 'deliverables', label: 'Παραδοτέα' },
];

type SearchParams = Promise<{ tab?: string }>;

export default async function EmployeeV2WorkPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const active = TABS.some((t) => t.key === params.tab) ? (params.tab as string) : 'tasks';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Η δουλειά μου</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ό,τι σου έχει ανατεθεί και ό,τι έχεις να ανεβάσεις
        </p>
      </header>

      <SectionTabs basePath="/employee-v2/work" tabs={TABS} active={active} />

      {active === 'tasks' ? <EmployeeTasksPage /> : <DeliverablesIndex />}
    </div>
  );
}
