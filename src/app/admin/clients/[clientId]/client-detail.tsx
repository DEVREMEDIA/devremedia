'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Client } from '@/types/index';
import type { ClientDrawerMode, ProjectWithClient, InvoiceWithRelations } from '@/types/relations';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ClientOverviewTab } from '@/components/admin/clients/client-overview-tab';
import { ClientProjectsTab } from '@/components/admin/clients/client-projects-tab';
import { ClientInvoicesTab } from '@/components/admin/clients/client-invoices-tab';
import { ClientContractsTab } from '@/components/admin/clients/client-contracts-tab';
import { ClientActivityTab } from '@/components/admin/clients/client-activity-tab';
import { ClientDrawer } from '@/components/admin/clients/client-drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Trash, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { deleteClient } from '@/lib/actions/clients';
import { inviteClient } from '@/lib/actions/auth';
import { toast } from 'sonner';

interface ClientDetailProps {
  client: Client;
  stats: {
    totalProjects: number;
    totalInvoiced: number;
    totalPaid: number;
  };
  initialProjects: ProjectWithClient[];
  initialInvoices: InvoiceWithRelations[];
}

export function ClientDetail({
  client,
  stats,
  initialProjects,
  initialInvoices,
}: ClientDetailProps) {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const router = useRouter();

  // Shell state
  const [activeTab, setActiveTab] = useState('overview');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={client.contact_name}
        description={client.company_name || t('clientDetails')}
      >
        <Button variant="outline" asChild>
          <Link href="/admin/clients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tc('back')}
          </Link>
        </Button>
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
      </PageHeader>

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
                <StatusBadge status={client.status} />
                <span className="text-sm text-muted-foreground">
                  {t('created')} {format(new Date(client.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
            <TabsTrigger value="projects">{t('tabs.projects')}</TabsTrigger>
            <TabsTrigger value="invoices">{t('tabs.invoices')}</TabsTrigger>
            <TabsTrigger value="contracts">{t('tabs.contracts')}</TabsTrigger>
            <TabsTrigger value="activity">{t('tabs.activity')}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <ClientOverviewTab
            client={client}
            stats={stats}
            onViewAllActivity={() => setActiveTab('activity')}
          />
        </TabsContent>

        <TabsContent value="projects">
          <ClientProjectsTab
            clientId={client.id}
            refreshKey={refreshKey}
            onOpenDrawer={handleOpenDrawer}
            initialProjects={initialProjects}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <ClientInvoicesTab
            clientId={client.id}
            refreshKey={refreshKey}
            onOpenDrawer={handleOpenDrawer}
            initialInvoices={initialInvoices}
          />
        </TabsContent>

        <TabsContent value="contracts">
          <ClientContractsTab clientId={client.id} refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="activity">
          <ClientActivityTab clientId={client.id} refreshKey={refreshKey} />
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
