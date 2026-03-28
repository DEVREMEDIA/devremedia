'use client';

import { Badge } from '@/components/ui/badge';
import { PROJECT_TYPE_LABELS } from '@/lib/constants';
import { format } from 'date-fns';
import { CheckCircle2, ArrowRight, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { ProjectWithClient } from '@/types';

interface CompletedProjectsProps {
  projects: ProjectWithClient[];
}

export function CompletedProjects({ projects }: CompletedProjectsProps) {
  const router = useRouter();
  const t = useTranslations('client.dashboard');

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border/50">
        <Trophy className="h-5 w-5 text-emerald-500" />
        <h2 className="text-lg font-semibold">{t('completedProjectsTitle')}</h2>
        <Badge variant="secondary" className="text-xs">
          {projects.length}
        </Badge>
      </div>
      <div className="p-5 space-y-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200',
              'border border-border/50 hover:border-emerald-500/30 hover:bg-emerald-500/5',
            )}
            onClick={() => router.push(`/client/projects/${project.id}`)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm line-clamp-1">{project.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {project.project_type && (
                    <span>
                      {PROJECT_TYPE_LABELS[
                        project.project_type as keyof typeof PROJECT_TYPE_LABELS
                      ] || project.project_type}
                    </span>
                  )}
                  <span>{format(new Date(project.updated_at), 'MMM yyyy')}</span>
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
