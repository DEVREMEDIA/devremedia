import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/page-header';
import { TodayTasks } from '@/components/employee/dashboard/today-tasks';
import { OverdueTasks } from '@/components/employee/dashboard/overdue-tasks';
import { UpcomingTasks } from '@/components/employee/dashboard/upcoming-tasks';
import { MyProjectsWidget } from '@/components/employee/dashboard/my-projects-widget';
import { TaskStats } from '@/components/employee/dashboard/task-stats';
import {
  getMyTasksToday,
  getMyOverdueTasks,
  getMyUpcomingTasks,
  getMyTaskStats,
  getMyProjects,
} from '@/lib/queries/employee-dashboard';

export default async function EmployeeDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const t = await getTranslations('employee.dashboard');

  const [todayTasks, overdueTasks, upcomingTasks, taskStats, myProjects] = await Promise.all([
    getMyTasksToday(user.id),
    getMyOverdueTasks(user.id),
    getMyUpcomingTasks(user.id),
    getMyTaskStats(user.id),
    getMyProjects(user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />
      <TaskStats stats={taskStats} />
      <div className="grid gap-6 md:grid-cols-2">
        <TodayTasks tasks={todayTasks} />
        <OverdueTasks tasks={overdueTasks} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <UpcomingTasks tasks={upcomingTasks} />
        <MyProjectsWidget projects={myProjects} />
      </div>
    </div>
  );
}
