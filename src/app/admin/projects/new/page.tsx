import { getClients } from '@/lib/actions/clients';
import { Client } from '@/types';
import { PageHeading } from '@/components/shared/page-heading';
import { ProjectForm } from '@/components/admin/projects/project-form';
import { Card, CardContent } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('projects');
  return {
    title: t('addProject'),
  };
}

export default async function NewProjectPage() {
  const result = await getClients();
  const t = await getTranslations('projects');

  if (result.error) {
    redirect('/admin/projects');
  }

  const clients = result.data as Client[];

  return (
    <div className="space-y-6">
      <PageHeading title={t('addProject')} subtitle={t('description')} />

      <Card>
        <CardContent className="pt-6">
          <ProjectForm clients={clients} />
        </CardContent>
      </Card>
    </div>
  );
}
