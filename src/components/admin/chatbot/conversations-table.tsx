'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DataTable } from '@/components/shared/data-table';
import { deleteChatConversation } from '@/lib/actions/chatbot';
import { toast } from 'sonner';
import type { ChatConversation } from '@/types/index';

type ConversationsTableProps = {
  conversations: ChatConversation[];
};

export function ConversationsTable({ conversations }: ConversationsTableProps) {
  const t = useTranslations('chatbot');
  const tc = useTranslations('common');
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<ChatConversation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const result = await deleteChatConversation(pendingDelete.id);
    setDeleting(false);
    setPendingDelete(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('table.deleted'));
      router.refresh();
    }
  };

  const columns: ColumnDef<ChatConversation>[] = useMemo(
    () => [
      {
        accessorKey: 'session_id',
        header: t('table.session'),
        cell: ({ row }) => (
          <Link href={`/admin/chatbot/${row.original.id}`} className="font-medium hover:underline">
            {`${row.original.session_id.slice(0, 8)}...`}
          </Link>
        ),
        meta: { numeric: true, align: 'left' },
      },
      {
        accessorKey: 'language',
        header: t('table.language'),
        cell: ({ row }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
            {row.original.language === 'el' ? '🇬🇷 EL' : '🇬🇧 EN'}
          </span>
        ),
      },
      {
        accessorKey: 'message_count',
        header: t('table.messages'),
        cell: ({ row }) => row.original.message_count,
        meta: { numeric: true },
      },
      {
        accessorKey: 'updated_at',
        header: t('table.lastActive'),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(row.original.updated_at), { addSuffix: true })}
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
            onClick={() => setPendingDelete(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
        meta: { width: 'w-[50px]' },
      },
    ],
    [t],
  );

  if (conversations.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">{t('table.empty')}</div>;
  }

  return (
    <>
      <DataTable columns={columns} data={conversations} emptyState={t('table.empty')} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={t('table.deleteTitle')}
        description={t('table.deleteConfirm')}
        confirmLabel={tc('delete')}
        onConfirm={handleDelete}
        loading={deleting}
        destructive
      />
    </>
  );
}
