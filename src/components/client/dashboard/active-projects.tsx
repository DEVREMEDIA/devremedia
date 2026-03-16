'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { PROJECT_TYPE_LABELS, PROJECT_STATUS_LABELS } from '@/lib/constants';
import { format } from 'date-fns';
import { FolderKanban, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/shared/empty-state';
import { useTranslations } from 'next-intl';
import type { ProjectWithClient } from '@/types';

type ProjectWithExtras = ProjectWithClient & {
  filming_date?: string;
};

interface ActiveProjectsProps {
  projects: ProjectWithExtras[];
}

export function ActiveProjects({ projects }: ActiveProjectsProps) {
  const router = useRouter();
  const t = useTranslations('client.dashboard');

  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('activeProjects')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={FolderKanban}
            title={t('noProjects')}
            description={t('noProjectsDescription')}
            action={{
              label: t('bookFilming'),
              onClick: () => router.push('/client/book'),
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('activeProjects')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/client/projects/${project.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-1">{project.title}</CardTitle>
                  <StatusBadge status={project.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {PROJECT_TYPE_LABELS[project.project_type as keyof typeof PROJECT_TYPE_LABELS] ||
                    project.project_type}
                </div>
                {project.filming_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(project.filming_date), 'MMM d, yyyy')}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS]}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
