'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Client } from '@/types/index';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ClientContractsTab } from '@/components/admin/clients/client-contracts-tab';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Pencil,
  Trash,
  Mail,
  Phone,
  MapPin,
  FileText,
  Briefcase,
  Receipt,
  Activity,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { deleteClient } from '@/lib/actions/clients';
import { toast } from 'sonner';

type ContractItem = {
  id: string;
  title: string;
  status: string;
  project: { title: string } | null;
  created_at: string;
  signed_at: string | null;
};

interface ClientDetailProps {
  client: Client;
  contracts: ContractItem[];
  stats: {
    totalProjects: number;
    totalInvoiced: number;
    totalPaid: number;
  };
}

export function ClientDetail({ client, contracts, stats }: ClientDetailProps) {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash className="mr-2 h-4 w-4" />
          {tc('delete')}
        </Button>
      </PageHeader>

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

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="overview">{t('quickStats')}</TabsTrigger>
            <TabsTrigger value="projects">{t('totalProjects')}</TabsTrigger>
            <TabsTrigger value="invoices">{t('totalInvoiced')}</TabsTrigger>
            <TabsTrigger value="contracts">{tc('status')}</TabsTrigger>
            <TabsTrigger value="activity">{t('activity')}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('contactInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{tc('email')}</p>
                    <a
                      href={`mailto:${client.email}`}
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      {client.email}
                    </a>
                  </div>
                </div>

                {client.phone && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{tc('phone')}</p>
                        <a
                          href={`tel:${client.phone}`}
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          {client.phone}
                        </a>
                      </div>
                    </div>
                  </>
                )}

                {client.address && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{t('address')}</p>
                        <p className="text-sm text-muted-foreground">{client.address}</p>
                      </div>
                    </div>
                  </>
                )}

                {client.vat_number && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{t('taxId')}</p>
                        <p className="text-sm text-muted-foreground">{client.vat_number}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {client.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('clientNotes')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {client.notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>{t('quickStats')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('totalProjects')}</span>
                    <span className="text-2xl font-bold">{stats.totalProjects}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('totalInvoiced')}</span>
                    <span className="text-2xl font-bold">
                      {stats.totalInvoiced.toLocaleString(undefined, {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('totalPaid')}</span>
                    <span className="text-2xl font-bold">
                      {stats.totalPaid.toLocaleString(undefined, {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={Briefcase}
                title={t('noClients')}
                description={t('noClientsDescription')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={Receipt}
                title={t('noClients')}
                description={t('noClientsDescription')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <ClientContractsTab clientId={client.id} contracts={contracts} />
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={Activity}
                title={t('activity')}
                description={t('noClientsDescription')}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
