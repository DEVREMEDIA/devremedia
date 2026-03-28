'use client';

import Link from 'next/link';
import { FolderKanban, Calendar, CheckSquare, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';

const PROJECT_STAGES = [
  'briefing',
  'pre_production',
  'filming',
  'editing',
  'review',
  'revisions',
  'delivered',
] as const;

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

  const stageLabels = [
    t('stageBriefing'),
    t('stagePreProduction'),
    t('stageFilming'),
    t('stageEditing'),
    t('stageReview'),
    t('stageRevisions'),
    t('stageDelivered'),
  ];

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
    <div className="grid gap-4 md:grid-cols-2">
      {projects.map((project) => {
        const stageIndex = PROJECT_STAGES.indexOf(
          project.status as (typeof PROJECT_STAGES)[number],
        );

        return (
          <Link key={project.id} href={`/employee/projects/${project.id}`}>
            <div
              className={cn(
                'group rounded-xl border bg-card cursor-pointer transition-all duration-300 h-full',
                'hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.15)] hover:-translate-y-0.5',
              )}
            >
              {/* Header */}
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-base line-clamp-2 flex-1">{project.title}</h3>
                  <ArrowRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-amber-500 transition-colors shrink-0 mt-0.5" />
                </div>
              </div>

              {/* Timeline */}
              <div className="px-5 pb-4">
                <div className="space-y-2.5">
                  <div className="flex gap-1">
                    {PROJECT_STAGES.map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-2 flex-1 rounded-full transition-all relative',
                          i < stageIndex
                            ? 'bg-amber-500/70'
                            : i === stageIndex
                              ? 'bg-amber-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]'
                              : 'bg-muted-foreground/10',
                        )}
                      >
                        {i === stageIndex && (
                          <div className="absolute inset-0 rounded-full bg-amber-500 animate-pulse opacity-40" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {PROJECT_STAGES.map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          'flex-1 text-center text-[10px] leading-tight',
                          i === stageIndex
                            ? 'text-amber-600 dark:text-amber-400 font-semibold'
                            : i < stageIndex
                              ? 'text-muted-foreground/60'
                              : 'text-muted-foreground/30',
                        )}
                      >
                        {stageLabels[i]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
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
            </div>
          </Link>
        );
      })}
    </div>
  );
}
