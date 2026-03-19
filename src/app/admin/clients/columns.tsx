'use client';

import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { Client } from '@/types/index';
import { UserAvatar } from '@/components/shared/user-avatar';
import { StatusBadge } from '@/components/shared/status-badge';
import { DataTableColumnHeader } from '@/components/shared/data-table-column-header';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Pencil, Trash, ShieldCheck, ShieldOff } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { deleteClient } from '@/lib/actions/clients';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ActionsMenuProps {
  client: Client;
}

function ActionsMenu({ client }: ActionsMenuProps) {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteClient(client.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t('clientDeleted'));
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">{tc('actions')}</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{tc('actions')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/admin/clients/${client.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              {t('clientDetails')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/clients/${client.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              {tc('edit')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              setDeleteDialogOpen(true);
            }}
          >
            <Trash className="mr-2 h-4 w-4" />
            {tc('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
  );
}

export function useClientColumns(): ColumnDef<Client>[] {
  const t = useTranslations('clients');
  const tc = useTranslations('common');

  return [
    {
      accessorKey: 'avatar',
      header: '',
      cell: ({ row }) => (
        <UserAvatar name={row.original.contact_name} src={row.original.avatar_url} />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'contact_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('contactName')} />,
      cell: ({ row }) => (
        <Link href={`/admin/clients/${row.original.id}`} className="font-medium hover:underline">
          {row.getValue('contact_name')}
        </Link>
      ),
    },
    {
      accessorKey: 'company_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('companyName')} />,
      cell: ({ row }) => {
        const company = row.getValue('company_name') as string | null;
        return <div>{company || '-'}</div>;
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title={tc('email')} />,
      cell: ({ row }) => <div className="text-muted-foreground">{row.getValue('email')}</div>,
    },
    {
      accessorKey: 'phone',
      header: tc('phone'),
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string | null;
        return <div>{phone || '-'}</div>;
      },
      enableSorting: false,
    },
    {
      id: 'portal_access',
      header: t('portalAccess'),
      cell: ({ row }) => {
        const hasAuth = !!row.original.user_id;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {hasAuth ? (
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                ) : (
                  <ShieldOff className="h-4 w-4 text-muted-foreground" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                {hasAuth ? t('hasPortalAccess') : t('noPortalAccess')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: tc('status'),
      cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title={tc('date')} />,
      cell: ({ row }) => {
        const date = row.getValue('created_at') as string;
        return <div>{format(new Date(date), 'MMM d, yyyy')}</div>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => <ActionsMenu client={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
