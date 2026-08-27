'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Client } from '@/types/index';
import type { ClientDrawerMode, ProjectWithClient, InvoiceWithRelations } from '@/types/relations';
import { DetailShell } from '@/components/shared/detail-shell';
import type { SectionTab } from '@/components/shell-v2/section-tabs';
import { StatusBadge } from '@/components/shared/status-badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ClientOverviewTab } from '@/components/admin/clients/client-overview-tab';
import { ClientProjectsTab } from '@/components/admin/clients/client-projects-tab';
import { ClientInvoicesTab } from '@/components/admin/clients/client-invoices-tab';
import { ClientContractsTab } from '@/components/admin/clients/client-contracts-tab';
import { ClientAgreementTab } from '@/components/admin/clients/client-agreement-tab';
import { ClientActivityTab } from '@/components/admin/clients/client-activity-tab';
import { ClientDrawer } from '@/components/admin/clients/client-drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Trash, Mail } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { deleteClient } from '@/lib/actions/clients';
import { inviteClient } from '@/lib/actions/auth';
import { toast } from 'sonner';

/** Οι καρτέλες με τη σειρά τους. Το `page.tsx` επικυρώνει το `?tab=` πάνω σε αυτή. */
export const CLIENT_TABS: readonly string[] = [
  'overview',
  'projects',
  'invoices',
  'contracts',
  'agreement',
  'activity',
];

interface ClientDetailProps {
  client: Client;
  stats: {
    totalProjects: number;
    totalInvoiced: number;
    totalPaid: number;
  };
  initialProjects: ProjectWithClient[];
  initialInvoices: InvoiceWithRelations[];
  activeTab: string;
}

export function ClientDetail({
  client,
  stats,
  initialProjects,
  initialInvoices,
  activeTab,
}: ClientDetailProps) {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const router = useRouter();

  // Shell state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<ClientDrawerMode | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenDrawer = (mode: ClientDrawerMode) => {
    setDrawerMode(mode);
    setDrawerOpen(true);
  };

  const handleDrawerSuccess = () => {
    setRefreshKey((k) => k + 1);
    router.refresh();
  };

  const handleInvite = async () => {
    setIsInviting(true);
    try {
      const result = await inviteClient(client.email, client.contact_name);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t('inviteSent'));
        router.refresh();
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteClient(client.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t('clientDeleted'));
        router.push('/admin/clients');
        router.refresh();
      }
    } catch {
      toast.error(t('deleteFailed'));
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const TABS: SectionTab[] = [
    { key: 'overview', label: t('tabs.overview') },
    { key: 'projects', label: t('tabs.projects') },
    { key: 'invoices', label: t('tabs.invoices') },
    { key: 'contracts', label: t('tabs.contracts') },
    { key: 'agreement', label: t('tabs.agreement') },
    { key: 'activity', label: t('tabs.activity') },
  ];

  return (
    <DetailShell
      backHref="/admin/clients"
      backLabel={t('title')}
      title={client.contact_name}
      meta={
        <span className="flex flex-wrap items-center gap-3">
          <span>{client.company_name || t('clientDetails')}</span>
          <StatusBadge status={client.status} />
        </span>
      }
      actions={
        <>
          <Button variant="outline" asChild>
            <Link href={`/admin/clients/${client.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              {tc('edit')}
            </Link>
          </Button>
          {!client.user_id && (
            <Button variant="outline" onClick={handleInvite} disabled={isInviting}>
              <Mail className="mr-2 h-4 w-4" />
              {t('inviteToPortal')}
            </Button>
          )}
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash className="mr-2 h-4 w-4" />
            {tc('delete')}
          </Button>
        </>
      }
      tabs={{ items: TABS, active: activeTab, basePath: `/admin/clients/${client.id}` }}
    >
      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <UserAvatar name={client.contact_name} src={client.avatar_url} className="h-20 w-20" />
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{client.contact_name}</h2>
                {client.company_name && (
                  <p className="text-muted-foreground">{client.company_name}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {t('created')} {format(new Date(client.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'overview' && (
        <ClientOverviewTab
          client={client}
          stats={stats}
          onViewAllActivity={() => router.push(`/admin/clients/${client.id}?tab=activity`)}
        />
      )}

      {activeTab === 'projects' && (
        <ClientProjectsTab
          clientId={client.id}
          refreshKey={refreshKey}
          onOpenDrawer={handleOpenDrawer}
          initialProjects={initialProjects}
        />
      )}

      {activeTab === 'invoices' && (
        <ClientInvoicesTab
          clientId={client.id}
          refreshKey={refreshKey}
          onOpenDrawer={handleOpenDrawer}
          initialInvoices={initialInvoices}
        />
      )}

      {activeTab === 'contracts' && (
        <ClientContractsTab clientId={client.id} refreshKey={refreshKey} />
      )}

      {activeTab === 'agreement' && (
        <ClientAgreementTab
          clientId={client.id}
          refreshKey={refreshKey}
          onSaved={handleDrawerSuccess}
        />
      )}

      {activeTab === 'activity' && (
        <ClientActivityTab clientId={client.id} refreshKey={refreshKey} />
      )}

      {/* Drawer */}
      <ClientDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        client={client}
        onSuccess={handleDrawerSuccess}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title={t('deleteClient')}
        description={t('deleteConfirm')}
        confirmLabel={tc('delete')}
        loading={isDeleting}
        destructive
      />
    </DetailShell>
  );
}
