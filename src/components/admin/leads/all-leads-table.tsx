'use client';

import * as React from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { DataTable } from '@/components/shared/data-table';
import { UserPlus, Search } from 'lucide-react';
import { LEAD_STAGES, LEAD_STAGE_LABELS, LEAD_SOURCE_LABELS } from '@/lib/constants';
import { useTranslations } from 'next-intl';

type LeadRow = {
  id: string;
  contact_name: string;
  email: string;
  company_name: string | null;
  source: string;
  stage: string;
  deal_value: number | null;
  assigned_to: string;
  assigned_user: { display_name: string | null } | null;
  last_contacted_at: string | null;
  created_at: string;
};

type AllLeadsTableProps = {
  leads: LeadRow[];
};

export function AllLeadsTable({ leads }: AllLeadsTableProps) {
  const t = useTranslations('leads');
  const [search, setSearch] = React.useState('');
  const [stageFilter, setStageFilter] = React.useState<string>('all');

  const filtered = leads.filter((lead) => {
    const matchesSearch =
      !search ||
      lead.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      (lead.company_name ?? '').toLowerCase().includes(search.toLowerCase());

    const matchesStage = stageFilter === 'all' || lead.stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  const columns: ColumnDef<LeadRow>[] = React.useMemo(
    () => [
      {
        accessorKey: 'contact_name',
        header: t('contactName'),
        cell: ({ row }) => (
          <>
            <Link href={`/admin/leads/${row.original.id}`} className="font-medium hover:underline">
              {row.original.contact_name}
            </Link>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </>
        ),
      },
      {
        accessorKey: 'company_name',
        header: t('companyName'),
        cell: ({ row }) => row.original.company_name ?? '-',
      },
      {
        accessorKey: 'stage',
        header: t('stage'),
        cell: ({ row }) => <StatusBadge status={row.original.stage} />,
      },
      {
        accessorKey: 'source',
        header: t('source'),
        cell: ({ row }) => (
          <Badge variant="outline">
            {LEAD_SOURCE_LABELS[row.original.source as keyof typeof LEAD_SOURCE_LABELS] ??
              row.original.source}
          </Badge>
        ),
      },
      {
        accessorKey: 'deal_value',
        header: t('dealValue'),
        cell: ({ row }) =>
          row.original.deal_value != null ? `€${row.original.deal_value.toLocaleString()}` : '-',
        meta: { numeric: true },
      },
      {
        accessorKey: 'assigned_to',
        header: t('assignedTo'),
        cell: ({ row }) => row.original.assigned_user?.display_name ?? t('unassigned'),
      },
      {
        accessorKey: 'last_contacted_at',
        header: t('lastContact'),
        cell: ({ row }) =>
          row.original.last_contacted_at
            ? new Date(row.original.last_contacted_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : t('never'),
        meta: { numeric: true, align: 'left' },
      },
    ],
    [t],
  );

  if (leads.length === 0) {
    return (
      <EmptyState icon={UserPlus} title={t('noLeads')} description={t('noLeadsDescription')} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchLeads')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('filterByStage')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStages')}</SelectItem>
            {LEAD_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {LEAD_STAGE_LABELS[stage]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        emptyState={<span className="text-muted-foreground">{t('noMatchingLeads')}</span>}
      />
    </div>
  );
}
