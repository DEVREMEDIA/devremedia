'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Client } from '@/types/index';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, ShieldOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClientColumns } from './columns';
import { CLIENT_STATUSES, CLIENT_STATUS_LABELS } from '@/lib/constants';
import { cleanupOrphanedClients } from '@/lib/actions/clients';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ClientsContentProps {
  clients: Client[];
}

export function ClientsContent({ clients }: ClientsContentProps) {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const columns = useClientColumns();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [portalFilter, setPortalFilter] = useState<string>('all');
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const orphanedCount = useMemo(() => clients.filter((c) => !c.user_id).length, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        search === '' ||
        client.contact_name.toLowerCase().includes(search.toLowerCase()) ||
        client.email.toLowerCase().includes(search.toLowerCase()) ||
        (client.company_name && client.company_name.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

      const matchesPortal =
        portalFilter === 'all' ||
        (portalFilter === 'no_portal' && !client.user_id) ||
        (portalFilter === 'has_portal' && !!client.user_id);

      return matchesSearch && matchesStatus && matchesPortal;
    });
  }, [clients, search, statusFilter, portalFilter]);

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const result = await cleanupOrphanedClients();
      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        const { archived, deleted } = result.data;
        toast.success(t('cleanupSuccess', { archived, deleted }));
        router.refresh();
      }
    } catch {
      toast.error(t('cleanupFailed'));
    } finally {
      setIsCleaning(false);
      setCleanupDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')}>
        <div className="flex items-center gap-2">
          {orphanedCount > 0 && (
            <Button variant="outline" onClick={() => setCleanupDialogOpen(true)}>
              <ShieldOff className="mr-2 h-4 w-4" />
              {t('cleanup')}
              <Badge variant="secondary" className="ml-2">
                {orphanedCount}
              </Badge>
            </Button>
          )}
          <Button asChild>
            <Link href="/admin/clients/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('addClient')}
            </Link>
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row flex-1 gap-3">
          <SearchInput
            placeholder={t('description')}
            value={search}
            onChange={setSearch}
            className="w-full sm:max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={tc('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc('status')}</SelectItem>
              {CLIENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {CLIENT_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={portalFilter} onValueChange={setPortalFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t('portalAccess')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('portalAccess')}</SelectItem>
              <SelectItem value="has_portal">{t('hasPortalAccess')}</SelectItem>
              <SelectItem value="no_portal">{t('noPortalAccess')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredClients}
        mobileHiddenColumns={['company_name', 'email', 'phone', 'created_at', 'portal_access']}
      />

      <ConfirmDialog
        open={cleanupDialogOpen}
        onOpenChange={setCleanupDialogOpen}
        onConfirm={handleCleanup}
        title={t('cleanupTitle')}
        description={t('cleanupDescription', { count: orphanedCount })}
        confirmLabel={t('cleanupConfirm')}
        loading={isCleaning}
        destructive
      />
    </div>
  );
}
