'use client';

import { format } from 'date-fns';
import { Calendar, MapPin } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { ProjectWithClient } from '@/types';

type ProjectWithExtras = ProjectWithClient & {
  filming_date?: string;
  filming_time?: string;
  location?: string;
};

interface UpcomingFilmingsProps {
  projects: ProjectWithExtras[];
}

export function UpcomingFilmings({ projects }: UpcomingFilmingsProps) {
  const t = useTranslations('client.dashboard');
  const upcomingFilmings = projects
    .filter((p) => p.filming_date && new Date(p.filming_date) >= new Date())
    .sort((a, b) => new Date(a.filming_date!).getTime() - new Date(b.filming_date!).getTime())
    .slice(0, 5);

  if (upcomingFilmings.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border/50">
        <Calendar className="h-5 w-5 text-blue-500" />
        <h2 className="text-lg font-semibold">{t('upcomingFilmings')}</h2>
      </div>
      <div className="p-5">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {upcomingFilmings.map((project) => (
            <div
              key={project.id}
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg transition-all duration-200',
                'border border-border/50 hover:border-blue-500/30 hover:bg-blue-500/5',
              )}
            >
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm line-clamp-1">{project.title}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {format(new Date(project.filming_date!), 'EEEE, MMMM d, yyyy')}
                </div>
                {project.filming_time && (
                  <div className="text-xs text-muted-foreground">{project.filming_time}</div>
                )}
                {project.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    {project.location}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
