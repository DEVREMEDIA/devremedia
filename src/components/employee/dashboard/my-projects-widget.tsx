'use client';

import Link from 'next/link';
import { FolderKanban, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border/50">
        <FolderKanban className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold">{t('myProjects')}</h2>
        {projects.length > 0 && (
          <Badge variant="secondary" className="text-xs">{projects.length}</Badge>
        )}
      </div>
      <div className="p-5">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderKanban className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{t('noProjects')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                href={"/employee/projects/" + project.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg transition-all duration-200',
                  'border border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5',
                )}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">{project.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {project.taskCount} {project.taskCount === 1 ? tCommon('task') : tCommon('tasks')}
                  </p>
                </div>
                <StatusBadge status={project.status} />
              </Link>
            ))}
            <Button asChild variant="outline" className="w-full mt-3 gap-2">
              <Link href="/employee/projects">
                {t('viewAllProjects')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
