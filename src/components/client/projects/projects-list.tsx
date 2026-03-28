'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PROJECT_TYPE_LABELS } from '@/lib/constants';
import { format } from 'date-fns';
import {
  FolderKanban,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Clapperboard,
  Check,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/shared/empty-state';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Project, FilmingRequest } from '@/types';

const PROJECT_STAGES = [
  'briefing',
  'pre_production',
  'filming',
  'editing',
  'review',
  'revisions',
  'delivered',
] as const;

const BOOKING_STAGES = ['pending', 'reviewed', 'accepted'] as const;

interface ProjectsListProps {
  projects: Project[];
  filmingRequests: FilmingRequest[];
}

export function ProjectsList({ projects, filmingRequests }: ProjectsListProps) {
  const router = useRouter();
  const t = useTranslations('client.projects');

  const activeProjects = projects.filter(
    (p) => p.status !== 'archived' && p.status !== 'delivered',
  );
  const completedProjects = projects.filter(
    (p) => p.status === 'delivered' || p.status === 'archived',
  );

  const pendingRequests = filmingRequests.filter((r) => r.status !== 'converted');
  const convertedRequests = filmingRequests.filter((r) => r.status === 'converted');

  const isEmpty = projects.length === 0 && filmingRequests.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        icon={FolderKanban}
        title={t('noProjects')}
        description={t('noProjectsDescription')}
        action={{
          label: t('bookFilming'),
          onClick: () => router.push('/client/book'),
        }}
      />
    );
  }

  return (
    <div className="space-y-10">
      {/* Booking Requests */}
      {pendingRequests.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">{t('bookingRequests')}</h2>
            <Badge variant="secondary" className="text-xs">
              {pendingRequests.length}
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingRequests.map((request) => (
              <BookingRequestCard key={request.id} request={request} />
            ))}
          </div>
        </section>
      )}

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">{t('activeProjects')}</h2>
            <Badge variant="secondary" className="text-xs">
              {activeProjects.length}
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {activeProjects.map((project) => {
              const source = convertedRequests.find((r) => r.converted_project_id === project.id);
              return <ProjectCard key={project.id} project={project} fromRequest={!!source} />;
            })}
          </div>
        </section>
      )}

      {/* Completed Projects */}
      {completedProjects.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold">{t('completedProjects')}</h2>
            <Badge variant="secondary" className="text-xs">
              {completedProjects.length}
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {completedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} fromRequest={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Booking Request Card ─────────────────────────────── */

function BookingRequestCard({ request }: { request: FilmingRequest }) {
  const t = useTranslations('client.projects');

  const declined = request.status === 'declined';
  const stageIndex = declined
    ? -1
    : BOOKING_STAGES.indexOf(request.status as (typeof BOOKING_STAGES)[number]);

  const stageLabels = [t('stageSubmitted'), t('stageUnderReview'), t('stageAccepted')];

  return (
    <Card
      className={cn(
        'group border bg-card transition-all duration-300',
        'hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.2)] hover:-translate-y-0.5',
        declined && 'opacity-60',
      )}
    >
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-2">{request.title}</h3>
          </div>
          {declined && <XCircle className="h-5 w-5 text-destructive shrink-0" />}
        </div>
      </div>

      {/* Timeline — same style as project cards */}
      <div className="px-5 pb-4">
        {declined ? (
          <p className="text-xs text-muted-foreground">{t('requestDeclined')}</p>
        ) : (
          <div className="space-y-2.5">
            <div className="flex gap-1">
              {BOOKING_STAGES.map((_, i) => (
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
              {BOOKING_STAGES.map((_, i) => (
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
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/50 text-xs text-muted-foreground">
        {t('submitted')} {format(new Date(request.created_at), 'MMM d, yyyy')}
      </div>
    </Card>
  );
}

/* ── Project Card with production timeline ───────────── */

function ProjectCard({ project, fromRequest }: { project: Project; fromRequest: boolean }) {
  const router = useRouter();
  const t = useTranslations('client.projects');

  const stageIndex = PROJECT_STAGES.indexOf(project.status as (typeof PROJECT_STAGES)[number]);
  const isDelivered = project.status === 'delivered' || project.status === 'archived';

  const stageLabels = [
    t('stageBriefing'),
    t('stagePreProduction'),
    t('stageFilming'),
    t('stageEditing'),
    t('stageReview'),
    t('stageRevisions'),
    t('stageDelivered'),
  ];

  return (
    <Card
      className={cn(
        'group cursor-pointer border bg-card transition-all duration-300',
        'hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.2)] hover:-translate-y-0.5',
      )}
      onClick={() => router.push(`/client/projects/${project.id}`)}
    >
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-2">{project.title}</h3>
            {fromRequest && (
              <span className="text-xs text-muted-foreground">{t('fromBooking')}</span>
            )}
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-amber-500 transition-colors shrink-0 mt-0.5" />
        </div>
      </div>

      {/* Production Timeline */}
      <div className="px-5 pb-4">
        {!isDelivered ? (
          <div className="space-y-2.5">
            {/* Stage bars */}
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
            {/* Stage labels */}
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
        ) : (
          /* Completed: full gold bar */
          <div className="space-y-2">
            <div className="flex gap-1">
              {PROJECT_STAGES.map((_, i) => (
                <div key={i} className="h-2 flex-1 rounded-full bg-emerald-500/70" />
              ))}
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {t('stageDelivered')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer meta */}
      <div className="px-5 py-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
        {project.project_type && (
          <span>
            {PROJECT_TYPE_LABELS[project.project_type as keyof typeof PROJECT_TYPE_LABELS] ||
              project.project_type}
          </span>
        )}
        {project.deadline && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(project.deadline), 'MMM d, yyyy')}
          </span>
        )}
        {!project.project_type && !project.deadline && (
          <span>
            {t('created')} {format(new Date(project.created_at), 'MMM d, yyyy')}
          </span>
        )}
      </div>
    </Card>
  );
}
