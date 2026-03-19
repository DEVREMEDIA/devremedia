'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { MessageThread } from '@/components/shared/message-thread';
import { PROJECT_TYPE_LABELS, PROJECT_STATUS_LABELS } from '@/lib/constants';
import { Calendar, MapPin, FileText, Video, MessageSquare, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DeliverablesTab } from '@/components/client/projects/deliverables-tab';
import { ContractsTab } from '@/components/client/projects/contracts-tab';
import type { ProjectWithClient, Deliverable, ContractWithRelations } from '@/types';

type ProjectWithExtras = ProjectWithClient & {
  filming_date?: string;
  location?: string;
};

interface ClientProjectDetailProps {
  project: ProjectWithExtras;
  deliverables: Deliverable[];
  contracts: ContractWithRelations[];
  currentUserId: string;
}

export function ClientProjectDetail({
  project,
  deliverables,
  contracts,
  currentUserId,
}: ClientProjectDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('client.projects');
  const tabFromUrl = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value);
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'overview') {
        params.delete('tab');
      } else {
        params.set('tab', value);
      }
      const query = params.toString();
      router.replace(`?${query}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
            {project.title}
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={project.status} />
            <span className="text-sm text-muted-foreground">
              {PROJECT_TYPE_LABELS[project.project_type as keyof typeof PROJECT_TYPE_LABELS] ||
                project.project_type}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="overview">
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('overview')}</span>
            </TabsTrigger>
            <TabsTrigger value="deliverables">
              <Video className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('deliverables')}</span>
              {deliverables.length > 0 && (
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  {deliverables.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('messages')}</span>
            </TabsTrigger>
            <TabsTrigger value="contracts">
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('contracts')}</span>
              {contracts.length > 0 && (
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  {contracts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>

        {/* Deliverables Tab */}
        <TabsContent value="deliverables">
          <DeliverablesTab deliverables={deliverables} />
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card>
            <CardContent className="p-0">
              <MessageThread projectId={project.id} currentUserId={currentUserId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <ContractsTab contracts={contracts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
