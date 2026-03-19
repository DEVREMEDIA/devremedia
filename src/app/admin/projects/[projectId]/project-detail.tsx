'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ProjectWithClient, Contract } from '@/types';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { MessageThread } from '@/components/shared/message-thread';
import { ContractsTab } from './contracts-tab';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Edit,
  Trash,
  Building2,
  Calendar,
  FileText,
  CheckSquare,
  Package,
  MessageSquare,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { deleteProject } from '@/lib/actions/projects';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { PROJECT_TYPE_LABELS, PROJECT_STATUS_LABELS, PRIORITY_LABELS } from '@/lib/constants';
import { useTranslations } from 'next-intl';

interface ProjectDetailProps {
  project: ProjectWithClient;
  contracts: Contract[];
}

export function ProjectDetail({ project, contracts }: ProjectDetailProps) {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value);
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'overview') {
        params.delete('tab');
      } else {
        params.set('tab', value);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteProject(project.id);

    if (!result.error) {
      toast.success(t('projectDeleted'));
      router.push('/admin/projects');
      router.refresh();
    } else {
      toast.error(result.error);
      setIsDeleting(false);
    }
  };

  const daysUntilDeadline = project.deadline
    ? differenceInDays(new Date(project.deadline), new Date())
    : null;

  const progress = (() => {
    if (!project.start_date || !project.deadline) return 0;
    const total = differenceInDays(new Date(project.deadline), new Date(project.start_date));
    const elapsed = differenceInDays(new Date(), new Date(project.start_date));
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  })();

  return (
    <div className="space-y-6">
      <PageHeader title={project.title}>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {tc('back')}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/projects/${project.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              {tc('edit')}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash className="h-4 w-4 mr-2" />
            {tc('delete')}
          </Button>
        </div>
      </PageHeader>

      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href={`/admin/clients/${project.client_id}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Building2 className="h-4 w-4" />
          <span className="font-medium">
            {project.client?.company_name || project.client?.contact_name}
          </span>
        </Link>
        <StatusBadge status={project.status} />
        <StatusBadge status={project.priority} />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
            <TabsTrigger value="tasks">{t('tasks')}</TabsTrigger>
            <TabsTrigger value="deliverables">{t('deliverables')}</TabsTrigger>
            <TabsTrigger value="messages">{tc('messages')}</TabsTrigger>
            <TabsTrigger value="contracts">{t('contracts')}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('projectType')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {PROJECT_TYPE_LABELS[project.project_type]}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('projectStatus')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{PROJECT_STATUS_LABELS[project.status]}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {tc('priority')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{PRIORITY_LABELS[project.priority]}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('budget')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {project.budget
                    ? new Intl.NumberFormat('el-GR', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(project.budget)
                    : '-'}
                </div>
              </CardContent>
            </Card>
          </div>

          {project.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {tc('description')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{project.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {tc('timeline')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    {t('startDate')}
                  </div>
                  <div className="text-lg">
                    {project.start_date
                      ? format(new Date(project.start_date), 'MMM d, yyyy')
                      : tc('notSet')}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    {t('endDate')}
                  </div>
                  <div className="text-lg">
                    {project.deadline
                      ? format(new Date(project.deadline), 'MMM d, yyyy')
                      : tc('notSet')}
                  </div>
                  {daysUntilDeadline !== null && (
                    <div
                      className={`text-sm mt-1 ${
                        daysUntilDeadline < 0
                          ? 'text-destructive'
                          : daysUntilDeadline <= 7
                            ? 'text-amber-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {daysUntilDeadline < 0
                        ? `${Math.abs(daysUntilDeadline)} ${tc('daysOverdue')}`
                        : `${daysUntilDeadline} ${tc('daysRemaining')}`}
                    </div>
                  )}
                </div>
              </div>

              {project.start_date && project.deadline && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{tc('progress')}</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {project.client && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {tc('clientInformation')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">{tc('company')}</div>
                  <div className="text-lg">{project.client.company_name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">{tc('contact')}</div>
                  <div className="text-lg">{project.client.contact_name}</div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${project.client.email}`} className="hover:text-foreground">
                    {project.client.email}
                  </a>
                </div>
                {project.client.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${project.client.phone}`} className="hover:text-foreground">
                      {project.client.phone}
                    </a>
                  </div>
                )}
                {project.client.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-1" />
                    <span>{project.client.address}</span>
                  </div>
                )}
                <Button asChild variant="outline" size="sm" className="w-full mt-4">
                  <Link href={`/admin/clients/${project.client_id}`}>{tc('viewDetails')}</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          <EmptyState
            icon={CheckSquare}
            title={tc('noTasksYet')}
            description={tc('noTasksDescription')}
          />
        </TabsContent>

        <TabsContent value="deliverables">
          <EmptyState
            icon={Package}
            title={tc('noDeliverablesYet')}
            description={tc('noDeliverablesDescription')}
          />
        </TabsContent>

        <TabsContent value="messages">
          {currentUserId ? (
            <MessageThread projectId={project.id} currentUserId={currentUserId} />
          ) : (
            <EmptyState icon={MessageSquare} title={tc('loading')} description={tc('pleaseWait')} />
          )}
        </TabsContent>

        <TabsContent value="contracts">
          <ContractsTab project={project} contracts={contracts} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('deleteProject')}
        description={tc('confirmDeleteMessage')}
        confirmLabel={t('deleteProject')}
        onConfirm={handleDelete}
        destructive
        loading={isDeleting}
      />
    </div>
  );
}
