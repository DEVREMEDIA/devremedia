'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/data-table';
import { deleteKnowledgeEntry } from '@/lib/actions/chatbot';
import { toast } from 'sonner';

type KnowledgeEntry = {
  id: string;
  category: string;
  title: string;
  content: string;
  content_en: string | null;
  content_el: string | null;
};

type KnowledgeTableProps = {
  entries: KnowledgeEntry[];
};

export function KnowledgeTable({ entries }: KnowledgeTableProps) {
  const router = useRouter();
  const t = useTranslations('chatbot');

  const handleDelete = React.useCallback(
    async (id: string) => {
      const result = await deleteKnowledgeEntry(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t('entryDeleted'));
        router.refresh();
      }
    },
    [router, t],
  );

  const columns: ColumnDef<KnowledgeEntry>[] = React.useMemo(
    () => [
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <Badge variant="secondary" className="capitalize">
            {row.original.category.replace(/_/g, ' ')}
          </Badge>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      },
      {
        id: 'preview',
        header: 'Content Preview',
        cell: ({ row }) => (
          <span className="block max-w-[300px] truncate text-sm text-muted-foreground">
            {row.original.content_en || row.original.content}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
        enableSorting: false,
        meta: { width: 'w-[50px]' },
      },
    ],
    [handleDelete],
  );

  return (
    <DataTable
      columns={columns}
      data={entries}
      mobileHiddenColumns={['preview']}
      emptyState={
        <span className="text-muted-foreground">
          No knowledge entries. Click &quot;Seed Knowledge Base&quot; to populate with default
          content.
        </span>
      }
    />
  );
}
