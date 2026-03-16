'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Film, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import type { Project } from '@/types';

type ProjectWithFilmingDate = Project & {
  filming_date?: string | null;
  client?: { contact_name?: string; company_name?: string | null } | null;
};

interface ProjectPrepListProps {
  projects: ProjectWithFilmingDate[];
}

export function ProjectPrepList({ projects }: ProjectPrepListProps) {
  const t = useTranslations('filmingPrep');

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={Film}
        title={t('noProjectsAvailable')}
        description={t('noProjectsForFilming')}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link key={project.id} href={`/admin/filming-prep/${project.id}`}>
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base line-clamp-2">{project.title}</CardTitle>
                <StatusBadge status={project.status} className="shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {project.client?.contact_name && (
                <p className="text-sm text-muted-foreground">
                  {project.client.company_name || project.client.contact_name}
                </p>
              )}
              {project.filming_date && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {format(new Date(project.filming_date), 'MMM d, yyyy')}
                </div>
              )}
              {project.start_date && !project.filming_date && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {format(new Date(project.start_date), 'MMM d, yyyy')}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
