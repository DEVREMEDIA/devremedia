import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/page-header';
import { ProjectList } from '@/components/employee/projects/project-list';
import { getMyProjects } from '@/lib/queries/employee-dashboard';

export default async function EmployeeProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const t = await getTranslations('employee.projects');
  const projects = await getMyProjects(user.id);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />
      <ProjectList projects={projects} />
    </div>
  );
}
