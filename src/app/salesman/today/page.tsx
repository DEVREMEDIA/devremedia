import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/page-header';
import { PipelineSummary } from '@/components/salesman/dashboard/pipeline-summary';
import { TodayFollowups } from '@/components/salesman/dashboard/today-followups';
import { RecentActivity } from '@/components/salesman/dashboard/recent-activity';
import {
  getMyLeadsSummary,
  getMyPipelineValue,
  getMyTodayFollowUps,
  getMyRecentActivity,
} from '@/lib/queries/salesman-dashboard';

export default async function SalesmanDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const t = await getTranslations('salesman.dashboard');

  const [leadsSummary, pipelineValue, todayFollowUps, recentActivity] = await Promise.all([
    getMyLeadsSummary(user.id),
    getMyPipelineValue(user.id),
    getMyTodayFollowUps(user.id),
    getMyRecentActivity(user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />
      <PipelineSummary summary={leadsSummary} pipelineValue={pipelineValue} />
      <div className="grid gap-6 md:grid-cols-2">
        <TodayFollowups leads={todayFollowUps} />
        <RecentActivity activities={recentActivity} />
      </div>
    </div>
  );
}
