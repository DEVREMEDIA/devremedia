'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ProjectWithClient, Contract } from '@/types';
import { DetailShell } from '@/components/shared/detail-shell';
import type { SectionTab } from '@/components/shell-v2/section-tabs';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { MessageThread } from '@/components/shared/message-thread';
import { ContractsTab } from './contracts-tab';
import { TasksTab } from './tasks-tab';
import { DeliverablesTab } from './deliverables-tab';
import { InvoicesTab } from './invoices-tab';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatGrid } from '@/components/shared/stat-grid';
import { StatCard } from '@/components/shared/stat-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Edit,
  Trash,
  Building2,
  Calendar,
  FileText,
  CheckSquare,
  Package,
  MessageSquare,
  Receipt,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteProject } from '@/lib/actions/projects';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import { PROJECT_TYPE_LABELS, PROJECT_STATUS_LABELS, PRIORITY_LABELS } from '@/lib/constants';
import { useTranslations } from 'next-intl';

interface ProjectDetailProps {
  project: ProjectWithClient;
  contracts: Contract[];
  activeTab: string;
  currentUserId: string | null;
}

export function ProjectDetail({
  project,
  contracts,
  activeTab,
  currentUserId,
}: ProjectDetailProps) {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const TABS: SectionTab[] = [
    { key: 'overview', label: t('overview') },
    { key: 'tasks', label: t('tasks') },
    { key: 'deliverables', label: t('deliverables') },
    { key: 'messages', label: tc('messages') },
    { key: 'invoices', label: t('invoices') },
    { key: 'contracts', label: t('contracts') },
  ];

  return (
    <DetailShell
      backHref="/admin/productions?tab=all"
      backLabel={t('title')}
      title={project.title}
      meta={
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/admin/clients/${project.client_id}`}
            className="flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <Building2 className="h-4 w-4" />
            <span className="font-medium">
              {project.client?.company_name || project.client?.contact_name}
            </span>
          </Link>
          <StatusBadge status={project.status} />
          <StatusBadge status={project.priority} />
        </div>
      }
      actions={
        <>
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
        </>
      }
      tabs={{ items: TABS, active: activeTab, basePath: `/admin/projects/${project.id}` }}
    >
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <StatGrid columns={4}>
            <StatCard label={t('projectType')} value={PROJECT_TYPE_LABELS[project.project_type]} />
            <StatCard label={t('projectStatus')} value={PROJECT_STATUS_LABELS[project.status]} />
            <StatCard label={tc('priority')} value={PRIORITY_LABELS[project.priority]} />
            <StatCard
              label={t('budget')}
              value={
                project.budget
                  ? new Intl.NumberFormat('el-GR', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(project.budget)
                  : '-'
              }
            />
          </StatGrid>

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
                            ? 'text-tone-caution'
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
        </div>
      )}

      {activeTab === 'tasks' && <TasksTab projectId={project.id} />}

      {activeTab === 'deliverables' && (
        <DeliverablesTab
          projectId={project.id}
          projectName={project.title}
          clientName={project.client?.company_name ?? project.client?.contact_name ?? undefined}
        />
      )}

      {activeTab === 'messages' &&
        (currentUserId ? (
          <MessagesWithChannel projectId={project.id} currentUserId={currentUserId} />
        ) : (
          <EmptyState icon={MessageSquare} title={tc('loading')} description={tc('pleaseWait')} />
        ))}

      {activeTab === 'invoices' && (
        <InvoicesTab
          projectId={project.id}
          clientId={project.client_id}
          projectTitle={project.title}
        />
      )}

      {activeTab === 'contracts' && <ContractsTab project={project} contracts={contracts} />}

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
    </DetailShell>
  );
}

function MessagesWithChannel({
  projectId,
  currentUserId,
}: {
  projectId: string;
  currentUserId: string;
}) {
  const tm = useTranslations('messages');
  const [channel, setChannel] = useState<'client' | 'team'>('client');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{tm('conversationWith')}:</span>
        <Select value={channel} onValueChange={(v) => setChannel(v as 'client' | 'team')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="client">{tm('clientChannel')}</SelectItem>
            <SelectItem value="team">{tm('teamChannel')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <MessageThread
        key={channel}
        projectId={projectId}
        currentUserId={currentUserId}
        channel={channel}
      />
    </div>
  );
}
