import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/page-header';
import { ProjectDetail } from '@/components/employee/projects/project-detail';

export default async function EmployeeProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Verify employee has tasks in this project
  const { data: userTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
    .eq('assigned_to', user.id)
    .limit(1);

  if (!userTasks || userTasks.length === 0) notFound();

  const t = await getTranslations('employee.projects');

  // Fetch project info, user's tasks, and deliverables in parallel
  const [projectResult, tasksResult, deliverablesResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, status, project_type, deadline, description')
      .eq('id', projectId)
      .single(),
    supabase
      .from('tasks')
      .select(
        'id, project_id, title, description, status, priority, assigned_to, due_date, sort_order, created_at',
      )
      .eq('project_id', projectId)
      .eq('assigned_to', user.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('deliverables')
      .select(
        'id, project_id, title, description, file_path, file_size, file_type, version, status, uploaded_by, download_count, expires_at, created_at',
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
  ]);

  if (!projectResult.data) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={projectResult.data.title} description={t('description')} />
      <ProjectDetail
        project={projectResult.data}
        tasks={tasksResult.data ?? []}
        deliverables={deliverablesResult.data ?? []}
        currentUserId={user.id}
        projectId={projectId}
      />
    </div>
  );
}
