'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ProjectWithClient } from '@/types';
import { DataTable } from '@/components/shared/data-table';
import { DataTableColumnHeader } from '@/components/shared/data-table-column-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { PROJECT_TYPE_LABELS } from '@/lib/constants';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Trash, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteProject } from '@/lib/actions/projects';
import { getNextInvoiceNumber } from '@/lib/actions/invoices';
import { toast } from 'sonner';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { CreateInvoiceDrawer } from '@/components/admin/invoices/create-invoice-drawer';
import { useTranslations } from 'next-intl';

interface ProjectListProps {
  projects: ProjectWithClient[];
}

export function ProjectList({ projects }: ProjectListProps) {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [invoiceDrawerOpen, setInvoiceDrawerOpen] = useState(false);
  const [invoiceProject, setInvoiceProject] = useState<ProjectWithClient | null>(null);
  const [nextInvoiceNum, setNextInvoiceNum] = useState('');

  const handleDelete = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    const result = await deleteProject(projectToDelete);

    if (!result.error) {
      toast.success(t('projectDeleted'));
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setIsDeleting(false);
  };

  const handleOpenInvoiceDrawer = async (project: ProjectWithClient) => {
    if (!project.client_id) {
      toast.error(t('noClientForInvoice'));
      return;
    }
    const num = await getNextInvoiceNumber();
    setNextInvoiceNum(num);
    setInvoiceProject(project);
    setInvoiceDrawerOpen(true);
  };

  const columns: ColumnDef<ProjectWithClient>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('projectName')} />,
      cell: ({ row }) => (
        <Link href={`/admin/projects/${row.original.id}`} className="font-medium hover:underline">
          {row.original.title}
        </Link>
      ),
    },
    {
      accessorKey: 'client',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('client')} />,
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.client?.company_name || row.original.client?.contact_name || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'project_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('projectType')} />,
      cell: ({ row }) => (
        <div className="text-sm">{PROJECT_TYPE_LABELS[row.original.project_type]}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('projectStatus')} />,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => <DataTableColumnHeader column={column} title={tc('priority')} />,
      cell: ({ row }) => <StatusBadge status={row.original.priority} />,
    },
    {
      accessorKey: 'deadline',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('endDate')} />,
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.deadline ? format(new Date(row.original.deadline), 'MMM d, yyyy') : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'budget',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('budget')} />,
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.budget
            ? new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(row.original.budget)
            : '-'}
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">{tc('actions')}</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/projects/${row.original.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  {tc('view')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/projects/${row.original.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  {tc('edit')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenInvoiceDrawer(row.original)}>
                <FileText className="h-4 w-4 mr-2" />
                {t('createInvoice')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setProjectToDelete(row.original.id);
                  setDeleteDialogOpen(true);
                }}
                className="text-destructive"
              >
                <Trash className="h-4 w-4 mr-2" />
                {tc('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={projects}
        searchKey="title"
        searchPlaceholder={tc('searchPlaceholder', { item: t('title').toLowerCase() })}
        mobileHiddenColumns={['project_type', 'priority', 'deadline', 'budget']}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('deleteProject')}
        description={tc('confirmDeleteMessage')}
        confirmLabel={tc('delete')}
        onConfirm={handleDelete}
        destructive
        loading={isDeleting}
      />

      {invoiceProject && (
        <CreateInvoiceDrawer
          open={invoiceDrawerOpen}
          onOpenChange={setInvoiceDrawerOpen}
          clientId={invoiceProject.client_id}
          projects={[
            {
              id: invoiceProject.id,
              title: invoiceProject.title,
              client_id: invoiceProject.client_id,
            },
          ]}
          nextInvoiceNumber={nextInvoiceNum}
          onSuccess={() => {
            setInvoiceDrawerOpen(false);
            setInvoiceProject(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
