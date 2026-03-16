'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Calendar, MapPin } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { useTranslations } from 'next-intl';
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
  // Filter projects with filming dates in the future
  const upcomingFilmings = projects
    .filter((p) => p.filming_date && new Date(p.filming_date) >= new Date())
    .sort((a, b) => new Date(a.filming_date!).getTime() - new Date(b.filming_date!).getTime())
    .slice(0, 5);

  if (upcomingFilmings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('upcomingFilmings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Calendar}
            title={t('noUpcomingFilmings')}
            description={t('noUpcomingFilmingsDescription')}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('upcomingFilmings')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingFilmings.map((project) => (
            <div key={project.id} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
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
      </CardContent>
    </Card>
  );
}
