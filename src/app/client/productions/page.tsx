import { createClient } from '@/lib/supabase/server';
import { getProjects } from '@/lib/actions/projects';
import { getClientFilmingRequests } from '@/lib/actions/filming-requests';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { ProjectsList } from '@/components/client/projects/projects-list';
import { getTranslations } from 'next-intl/server';

export default async function ClientProjectsPage() {
  const t = await getTranslations('client.projects');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get client record for this user
  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const [projectsResult, requestsResult] = await Promise.all([
    getProjects({ client_id: clientRecord?.id }),
    getClientFilmingRequests(),
  ]);

  const projects = projectsResult.data ?? [];
  const filmingRequests = requestsResult.data ?? [];

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      <ProjectsList projects={projects} filmingRequests={filmingRequests} />
    </div>
  );
}
