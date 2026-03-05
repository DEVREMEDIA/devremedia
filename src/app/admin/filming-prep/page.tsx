import { getProjects } from '@/lib/actions/projects';
import { PageHeader } from '@/components/shared/page-header';
import { ProjectPrepList } from '@/components/admin/filming-prep/project-prep-list';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import type { ProjectWithClient } from '@/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('filmingPrep');
  return {
    title: `${t('title')} - Devre Media`,
    description: t('description'),
  };
}

export default async function FilmingPrepIndexPage() {
  const t = await getTranslations('filmingPrep');
  const result = await getProjects();
  const projects = (result.data ?? []).filter(
    (p) => p.status !== 'archived' && p.status !== 'delivered',
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />
      <ProjectPrepList projects={projects as ProjectWithClient[]} />
    </div>
  );
}
