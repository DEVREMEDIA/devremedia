'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DetailShell } from '@/components/shared/detail-shell';
import type { SectionTab } from '@/components/shell-v2/section-tabs';
import { StatusBadge } from '@/components/shared/status-badge';
import { MessageThread } from '@/components/shared/message-thread';
import { PROJECT_TYPE_LABELS, PROJECT_STATUS_LABELS } from '@/lib/constants';
import { Calendar, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DeliverablesTab } from '@/components/client/projects/deliverables-tab';
import { ContractsTab } from '@/components/client/projects/contracts-tab';
import type { ProjectWithClient, Deliverable, ContractWithRelations } from '@/types';

/** Οι καρτέλες με τη σειρά τους. Το `page.tsx` επικυρώνει το `?tab=` πάνω σε αυτή. */
export const CLIENT_PROJECT_TABS: readonly string[] = [
  'overview',
  'deliverables',
  'messages',
  'contracts',
];

interface ClientProjectDetailProps {
  project: ProjectWithClient;
  deliverables: Deliverable[];
  contracts: ContractWithRelations[];
  currentUserId: string;
  activeTab: string;
}

export function ClientProjectDetail({
  project,
  deliverables,
  contracts,
  currentUserId,
  activeTab,
}: ClientProjectDetailProps) {
  const t = useTranslations('client.projects');

  const TABS: SectionTab[] = [
    { key: 'overview', label: t('overview') },
    {
      key: 'deliverables',
      label: t('deliverables'),
      ...(deliverables.length > 0 ? { count: deliverables.length } : {}),
    },
    { key: 'messages', label: t('messages') },
    {
      key: 'contracts',
      label: t('contracts'),
      ...(contracts.length > 0 ? { count: contracts.length } : {}),
    },
  ];

  return (
    <div>
      <DetailShell
        backHref="/client/projects"
        backLabel={t('title')}
        title={project.title}
        meta={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={project.status} />
            <span>
              {PROJECT_TYPE_LABELS[project.project_type as keyof typeof PROJECT_TYPE_LABELS] ||
                project.project_type}
            </span>
          </div>
        }
        tabs={{ items: TABS, active: activeTab, basePath: `/client/projects/${project.id}` }}
      >
        {activeTab === 'overview' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('projectDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && (
                <div>
                  <h3 className="font-medium text-sm mb-2">{t('description')}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {project.description}
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-medium text-sm mb-2">{t('status')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS]}
                  </p>
                </div>

                {project.filming_date && (
                  <div>
                    <h3 className="font-medium text-sm mb-2">{t('filmingDate')}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(project.filming_date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                )}

                {project.location && (
                  <div>
                    <h3 className="font-medium text-sm mb-2">{t('location')}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {project.location}
                    </div>
                  </div>
                )}

                {project.budget && (
                  <div>
                    <h3 className="font-medium text-sm mb-2">{t('budget')}</h3>
                    <p className="text-sm text-muted-foreground">{project.budget.toFixed(2)}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  {t('createdOn', {
                    date: new Date(project.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }),
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'deliverables' && <DeliverablesTab deliverables={deliverables} />}

        {activeTab === 'messages' && (
          <Card>
            <CardContent className="p-0">
              <MessageThread projectId={project.id} currentUserId={currentUserId} />
            </CardContent>
          </Card>
        )}

        {activeTab === 'contracts' && <ContractsTab contracts={contracts} />}
      </DetailShell>
    </div>
  );
}
