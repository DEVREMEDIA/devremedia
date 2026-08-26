import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeading } from '@/components/shared/page-heading';
import { EmployeeDeliverables } from '@/components/employee/deliverables/deliverable-list';

export default async function EmployeeDeliverablesPage({
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

  const t = await getTranslations('employee.deliverables');

  // Verify employee has tasks in this project
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
    .eq('assigned_to', user.id)
    .limit(1);

  if (!tasks || tasks.length === 0) notFound();

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, client:clients(id, company_name, contact_name)')
    .eq('id', projectId)
    .single();

  if (!project) notFound();

  const client = Array.isArray(project.client) ? project.client[0] : project.client;
  const clientName = client?.company_name ?? client?.contact_name ?? undefined;
  const projectName = project.title;

  const { data: deliverables } = await supabase
    .from('deliverables')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeading title={projectName ?? t('title')} subtitle={clientName ?? t('description')} />
      <EmployeeDeliverables
        projectId={projectId}
        deliverables={deliverables ?? []}
        clientName={clientName}
        projectName={projectName}
      />
    </div>
  );
}
