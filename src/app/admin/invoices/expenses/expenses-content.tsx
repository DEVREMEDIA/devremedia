'use client';

import * as React from 'react';
import { DataTable } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExpenseForm } from '@/components/admin/invoices/expense-form';
import { QuarterlyExport } from '@/components/admin/invoices/quarterly-export';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Plus, Trash2, FileDown } from 'lucide-react';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '@/lib/constants';
import { deleteExpense } from '@/lib/actions/expenses';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Expense, Project } from '@/types';
import { useTranslations } from 'next-intl';
import { formatEur as formatCurrency } from '@/lib/format';

interface ExpensesContentProps {
  expenses: Expense[];
  projects: Project[];
}

export function ExpensesContent({ expenses: initialExpenses, projects }: ExpensesContentProps) {
  const router = useRouter();
  const t = useTranslations('invoices');
  const tc = useTranslations('common');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');
  const [expenseDialogOpen, setExpenseDialogOpen] = React.useState(false);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const filteredExpenses = React.useMemo(() => {
    let filtered = initialExpenses;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((expense) => expense.category === categoryFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter((expense) => new Date(expense.date) >= new Date(dateFrom));
    }

    if (dateTo) {
      filtered = filtered.filter((expense) => new Date(expense.date) <= new Date(dateTo));
    }

    return filtered;
  }, [initialExpenses, categoryFilter, dateFrom, dateTo]);

  const totalExpenses = React.useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  const handleDelete = async () => {
    if (!deletingId) return;

    setIsDeleting(true);
    const result = await deleteExpense(deletingId);
    setIsDeleting(false);

    if (result.error) {
      toast.error(tc('failedToDelete'), { description: result.error });
    } else {
      toast.success(t('expenseDeleted'));
      setDeleteDialogOpen(false);
      setDeletingId(null);
      router.refresh();
    }
  };

  const getProjectName = (projectId?: string | null) => {
    if (!projectId) return '-';
    const project = projects.find((p) => p.id === projectId);
    return project ? project.title : '-';
  };

  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: 'category',
      header: t('expenseCategory'),
      cell: ({ row }) =>
        EXPENSE_CATEGORY_LABELS[row.original.category as keyof typeof EXPENSE_CATEGORY_LABELS] ||
        row.original.category,
    },
    {
      accessorKey: 'description',
      header: tc('description'),
      cell: ({ row }) => row.original.description || '-',
    },
    {
      accessorKey: 'amount',
      header: t('expenseAmount'),
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: 'date',
      header: t('expenseDate'),
      cell: ({ row }) => format(new Date(row.original.date), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'project_id',
      header: tc('project'),
      cell: ({ row }) => getProjectName(row.original.project_id),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const expense = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  setDeletingId(expense.id);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {tc('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
            <FileDown className="mr-2 h-4 w-4" />
            {t('quarterlyExport')}
          </Button>
          <Button onClick={() => setExpenseDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('addExpense')}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-end gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder={tc('filterByCategory')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc('allCategories')}</SelectItem>
              {EXPENSE_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {EXPENSE_CATEGORY_LABELS[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder="From date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full lg:w-[180px]"
          />
          <Input
            type="date"
            placeholder="To date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full lg:w-[180px]"
          />

          {(categoryFilter !== 'all' || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              onClick={() => {
                setCategoryFilter('all');
                setDateFrom('');
                setDateTo('');
              }}
            >
              {tc('clearFilters')}
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('expenses')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalExpenses)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredExpenses.length} {t('expenses').toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <DataTable
          columns={columns}
          data={filteredExpenses}
          searchKey="description"
          searchPlaceholder={tc('searchPlaceholder', { item: t('expenses').toLowerCase() })}
          mobileHiddenColumns={['description', 'project_id']}
        />
      </div>

      <ExpenseForm
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        projects={projects}
        onSuccess={() => {
          setExpenseDialogOpen(false);
          router.refresh();
        }}
      />

      <QuarterlyExport open={exportDialogOpen} onOpenChange={setExportDialogOpen} />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={tc('deleteItem', { item: t('expenses').toLowerCase() })}
        description={tc('deleteConfirmation')}
        confirmLabel={tc('delete')}
        onConfirm={handleDelete}
        destructive
        loading={isDeleting}
      />
    </>
  );
}
