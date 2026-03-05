'use client';

import { useState, useEffect } from 'react';
import { ProjectWithClient } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { ViewToggle } from '@/components/admin/projects/view-toggle';
import { ProjectBoard } from '@/components/admin/projects/project-board';
import { ProjectList } from '@/components/admin/projects/project-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface ProjectsContentProps {
  projects: ProjectWithClient[];
}

export function ProjectsContent({ projects }: ProjectsContentProps) {
  const t = useTranslations('projects');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedView = localStorage.getItem('projects-view') as 'kanban' | 'list' | null;
    if (savedView) {
      setView(savedView);
    }
    setMounted(true);
  }, []);

  const handleViewChange = (newView: 'kanban' | 'list') => {
    setView(newView);
    localStorage.setItem('projects-view', newView);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')}>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onViewChange={handleViewChange} />
          <Button asChild>
            <Link href="/admin/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              {t('addProject')}
            </Link>
          </Button>
        </div>
      </PageHeader>

      {mounted &&
        (view === 'kanban' ? (
          <ProjectBoard projects={projects} />
        ) : (
          <ProjectList projects={projects} />
        ))}
    </div>
  );
}
