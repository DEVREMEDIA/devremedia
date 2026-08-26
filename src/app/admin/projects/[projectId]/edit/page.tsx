import { getProject } from '@/lib/actions/projects';
import { getClients } from '@/lib/actions/clients';
import { ProjectWithClient, Client } from '@/types';
import { PageHeading } from '@/components/shared/page-heading';
import { ProjectForm } from '@/components/admin/projects/project-form';
import { Card, CardContent } from '@/components/ui/card';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

interface EditProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({ params }: EditProjectPageProps) {
  const { projectId } = await params;
  const result = await getProject(projectId);
  const t = await getTranslations('projects');

  if (result.error) {
    return { title: t('editProject') };
  }

  const project = result.data as ProjectWithClient;
  return { title: `${t('editProject')}: ${project.title}` };
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { projectId } = await params;
  const t = await getTranslations('projects');

  const [projectResult, clientsResult] = await Promise.all([getProject(projectId), getClients()]);

  if (projectResult.error) {
    notFound();
  }

  if (clientsResult.error) {
    redirect('/admin/projects');
  }

  const project = projectResult.data as ProjectWithClient;
  const clients = clientsResult.data as Client[];

  return (
    <div className="space-y-6">
      <PageHeading title={`${t('editProject')}: ${project.title}`} subtitle={t('description')} />

      <Card>
        <CardContent className="pt-6">
          <ProjectForm project={project} clients={clients} />
        </CardContent>
      </Card>
    </div>
  );
}
