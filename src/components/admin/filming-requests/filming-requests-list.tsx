'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { format } from 'date-fns';
import { Video, ChevronRight } from 'lucide-react';
import { PROJECT_TYPE_LABELS } from '@/lib/constants';
import type { FilmingRequest } from '@/types';
import { useTranslations } from 'next-intl';

interface FilmingRequestsListProps {
  requests: FilmingRequest[];
}

export function FilmingRequestsList({ requests }: FilmingRequestsListProps) {
  const t = useTranslations('filmingRequests');

  const columns: ColumnDef<FilmingRequest>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: t('list.title'),
        cell: ({ row }) => (
          <Link
            href={`/admin/filming-requests/${row.original.id}`}
            className="flex items-center gap-2 font-semibold hover:underline"
          >
            <span className="truncate">{row.original.title}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: t('list.status'),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'contact',
        header: t('list.contact'),
        accessorFn: (row) => row.contact_name ?? '',
        cell: ({ row }) =>
          row.original.contact_name ? (
            <span>
              {row.original.contact_name}
              {row.original.contact_email ? ` (${row.original.contact_email})` : ''}
            </span>
          ) : null,
      },
      {
        accessorKey: 'project_type',
        header: t('projectType'),
        cell: ({ row }) =>
          row.original.project_type
            ? PROJECT_TYPE_LABELS[row.original.project_type as keyof typeof PROJECT_TYPE_LABELS]
            : t('notSpecified'),
      },
      {
        accessorKey: 'created_at',
        header: t('list.created'),
        cell: ({ row }) => format(new Date(row.original.created_at), 'MMM d, yyyy'),
        meta: { numeric: true, align: 'left' },
      },
    ],
    [t],
  );

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState icon={Video} title={t('noRequests')} description={t('noSubmittedRequests')} />
        </CardContent>
      </Card>
    );
  }

  return <DataTable columns={columns} data={requests} />;
}
