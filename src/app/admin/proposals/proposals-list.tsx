'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/shared/data-table';
import { ToneChip } from '@/components/shared/tone-chip';
import { statusTone } from '@/lib/status-tone';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, FileText } from 'lucide-react';
import type { ProposalWithRelations } from '@/types/index';

interface Props {
  proposals: ProposalWithRelations[];
}

export function ProposalsList({ proposals }: Props) {
  const t = useTranslations('proposals');
  const ts = useTranslations('proposals.status');
  const tp = useTranslations('proposalPackages');
  const tc = useTranslations('common');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        p.client_name.toLowerCase().includes(q) ||
        (p.client?.company_name?.toLowerCase().includes(q) ?? false) ||
        (p.lead?.company_name?.toLowerCase().includes(q) ?? false);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [proposals, search, statusFilter]);

  const columns: ColumnDef<ProposalWithRelations>[] = useMemo(
    () => [
      {
        accessorKey: 'client_name',
        header: t('list.client'),
        cell: ({ row }) => (
          <Link
            href={`/admin/proposals/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.client_name}
          </Link>
        ),
      },
      {
        id: 'linked',
        header: t('list.linkedTo'),
        accessorFn: (row) =>
          row.client?.company_name ||
          row.client?.contact_name ||
          row.lead?.company_name ||
          row.lead?.contact_name ||
          '—',
      },
      {
        accessorKey: 'status',
        header: t('list.status'),
        cell: ({ row }) => (
          <ToneChip tone={statusTone(row.original.status)}>{ts(row.original.status)}</ToneChip>
        ),
      },
      {
        id: 'packages',
        header: t('list.packages'),
        accessorFn: (row) => row.selected_packages.length,
        meta: { numeric: true },
      },
      {
        accessorKey: 'created_at',
        header: t('list.created'),
        cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString('el-GR'),
        meta: { numeric: true, align: 'left' },
      },
      {
        accessorKey: 'valid_until',
        header: t('list.validUntil'),
        cell: ({ row }) =>
          row.original.valid_until
            ? new Date(row.original.valid_until).toLocaleDateString('el-GR')
            : '—',
        meta: { numeric: true, align: 'left' },
      },
    ],
    [t, ts],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Link href="/admin/proposal-packages">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1" />
            {tp('title')}
          </Button>
        </Link>
        <Link href="/admin/proposals/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t('list.addProposal')}
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tc('search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc('all')}</SelectItem>
                <SelectItem value="draft">{ts('draft')}</SelectItem>
                <SelectItem value="sent">{ts('sent')}</SelectItem>
                <SelectItem value="accepted">{ts('accepted')}</SelectItem>
                <SelectItem value="rejected">{ts('rejected')}</SelectItem>
                <SelectItem value="expired">{ts('expired')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            emptyState={<span className="text-muted-foreground">{t('list.empty')}</span>}
          />
        </CardContent>
      </Card>
    </div>
  );
}
