'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getProjects } from '@/lib/actions/projects';
import { shouldFetchTabData } from '@/lib/tab-data';
import type { ProjectWithClient, ClientDrawerMode } from '@/types/relations';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Plus, ExternalLink, ListTodo, Package, Pencil } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface ClientProjectsTabProps {
  clientId: string;
  refreshKey: number;
  onOpenDrawer: (mode: ClientDrawerMode) => void;
  initialProjects?: ProjectWithClient[];
}

export function ClientProjectsTab({
  clientId,
  refreshKey,
  onOpenDrawer,
  initialProjects,
}: ClientProjectsTabProps) {
  const t = useTranslations('clients');
  const [projects, setProjects] = useState<ProjectWithClient[]>(initialProjects ?? []);
  // Data arrives on the first byte from the server — only show a spinner when
  // there was nothing to render and we must fetch (Phase 1).
  const [isLoading, setIsLoading] = useState(
    shouldFetchTabData({ hasInitialData: !!initialProjects, refreshKey }),
  );

  useEffect(() => {
    if (!shouldFetchTabData({ hasInitialData: !!initialProjects, refreshKey })) {
      return;
    }
    async function fetchProjects() {
      setIsLoading(true);
      const result = await getProjects({ client_id: clientId });
      if (!result.error && result.data) {
        setProjects(result.data);
      }
      setIsLoading(false);
    }
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, refreshKey]);

  const handleCreate = () => {
    onOpenDrawer({ type: 'create-project', clientId });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Briefcase}
            title={t('projects.noProjects')}
            description={t('projects.noProjectsDescription')}
            action={{ label: t('projects.createFirst'), onClick: handleCreate }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t('tabs.projects')} ({projects.length})
        </h3>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('drawer.createProject')}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectWithClient }) {
  const t = useTranslations('clients');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{project.title}</CardTitle>
          <StatusBadge status={project.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {project.start_date && (
          <p className="text-sm text-muted-foreground">
            {format(new Date(project.start_date), 'MMM d, yyyy')}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <ListTodo className="h-4 w-4" />
            {t('projects.tasks')}
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            {t('projects.deliverables')}
          </span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/projects/${project.id}`}>
              <ExternalLink className="mr-1 h-3 w-3" />
              {t('projects.view')}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/projects/${project.id}/edit`}>
              <Pencil className="mr-1 h-3 w-3" />
              {t('projects.edit')}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
