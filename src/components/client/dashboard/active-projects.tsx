'use client';

import { Card } from '@/components/ui/card';
import { PROJECT_TYPE_LABELS } from '@/lib/constants';
import { format } from 'date-fns';
import { FolderKanban, ArrowRight, Calendar, Clapperboard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/shared/empty-state';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { ProjectWithClient } from '@/types';

const PROJECT_STAGES = [
  'briefing',
  'pre_production',
  'filming',
  'editing',
  'review',
  'revisions',
  'delivered',
] as const;

type ProjectWithExtras = ProjectWithClient & {
  filming_date?: string;
};

interface ActiveProjectsProps {
  projects: ProjectWithExtras[];
}

export function ActiveProjects({ projects }: ActiveProjectsProps) {
  const router = useRouter();
  const t = useTranslations('client.dashboard');
  const tStages = useTranslations('client.projects');

  const stageLabels = [
    tStages('stageBriefing'),
    tStages('stagePreProduction'),
    tStages('stageFilming'),
    tStages('stageEditing'),
    tStages('stageReview'),
    tStages('stageRevisions'),
    tStages('stageDelivered'),
  ];

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clapperboard className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">{t('activeProjects')}</h2>
        </div>
        <EmptyState
          icon={FolderKanban}
          title={t('noProjects')}
          description={t('noProjectsDescription')}
          action={{
            label: t('bookFilming'),
            onClick: () => router.push('/client/book'),
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Clapperboard className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold">{t('activeProjects')}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => {
          const stageIndex = PROJECT_STAGES.indexOf(
            project.status as (typeof PROJECT_STAGES)[number],
          );

          return (
            <Card
              key={project.id}
              className={cn(
                'group cursor-pointer border bg-card transition-all duration-300',
                'hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.2)] hover:-translate-y-0.5',
              )}
              onClick={() => router.push(`/client/projects/${project.id}`)}
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
                {project.project_type && (
                  <span>
                    {PROJECT_TYPE_LABELS[
                      project.project_type as keyof typeof PROJECT_TYPE_LABELS
                    ] || project.project_type}
                  </span>
                )}
                {project.filming_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(project.filming_date), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
