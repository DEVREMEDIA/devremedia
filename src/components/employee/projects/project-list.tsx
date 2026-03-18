'use client';

import Link from 'next/link';
import { FolderKanban, Calendar, CheckSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';

interface ProjectItem {
  id: string;
  title: string;
  status: string;
  project_type: string;
  deadline: string | null;
  taskCount: number;
}

interface ProjectListProps {
  projects: ProjectItem[];
}

export function ProjectList({ projects }: ProjectListProps) {
  const t = useTranslations('employee.projects');

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title={t('noProjects')}
        description={t('noProjectsDescription')}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link key={project.id} href={`/employee/projects/${project.id}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base line-clamp-2">{project.title}</h3>
                <StatusBadge status={project.status} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  {project.taskCount} {project.taskCount === 1 ? t('task') : t('tasks')}
                </span>
                {project.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(project.deadline).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
