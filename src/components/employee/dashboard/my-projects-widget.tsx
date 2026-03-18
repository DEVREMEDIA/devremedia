'use client';

import Link from 'next/link';
import { FolderKanban, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';

interface ProjectItem {
  id: string;
  title: string;
  status: string;
  project_type: string;
  deadline: string | null;
  taskCount: number;
}

interface MyProjectsWidgetProps {
  projects: ProjectItem[];
}

export function MyProjectsWidget({ projects }: MyProjectsWidgetProps) {
  const t = useTranslations('employee.dashboard');
  const tCommon = useTranslations('common');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{t('myProjects')}</CardTitle>
        </div>
        <CardDescription>
          {projects.length} {t('activeProjectsCount')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t('noProjects')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                href={`/employee/projects/${project.id}`}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">{project.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {project.taskCount}{' '}
                    {project.taskCount === 1 ? tCommon('task') : tCommon('tasks')}
                  </p>
                </div>
                <StatusBadge status={project.status} />
              </Link>
            ))}
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/employee/projects">
                {t('viewAllProjects')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
