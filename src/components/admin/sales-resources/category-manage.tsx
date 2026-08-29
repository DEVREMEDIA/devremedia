'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  createSalesResourceCategorySchema,
  type CreateSalesResourceCategoryInput,
} from '@/lib/schemas/sales-resource';
import {
  createSalesResourceCategory,
  updateSalesResourceCategory,
  deleteSalesResourceCategory,
} from '@/lib/actions/sales-resources';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

interface Category {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface CategoryManageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSuccess: () => void;
}

export function CategoryManage({ open, onOpenChange, categories, onSuccess }: CategoryManageProps) {
  const t = useTranslations('salesResources');
  const tc = useTranslations('common');
  const tToast = useTranslations('toast');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateSalesResourceCategoryInput>({
    resolver: zodResolver(createSalesResourceCategorySchema),
    defaultValues: {
      title: '',
      description: '',
      sort_order: 0,
    },
  });

  const handleNewCategory = () => {
    setEditingCategory(null);
    form.reset({
      title: '',
      description: '',
      sort_order: 0,
    });
    setFormOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      title: category.title,
      description: category.description ?? '',
      sort_order: category.sort_order,
    });
    setFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    setIsDeleting(true);
    const result = await deleteSalesResourceCategory(deletingId);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(tToast('deleteSuccess'));
    setDeleteDialogOpen(false);
    setDeletingId(null);
    onSuccess();
  };

  const onSubmit = async (data: CreateSalesResourceCategoryInput) => {
    setIsSubmitting(true);

    const result = editingCategory
      ? await updateSalesResourceCategory(editingCategory.id, data)
      : await createSalesResourceCategory(data);

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editingCategory ? tToast('updateSuccess') : tToast('createSuccess'));
    setFormOpen(false);
    form.reset();
    onSuccess();
  };

  const columns: ColumnDef<Category>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: tc('title'),
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      },
      {
        accessorKey: 'description',
        header: tc('description'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.description ?? '-'}</span>
        ),
      },
      {
        accessorKey: 'sort_order',
        header: t('sortOrder'),
        meta: { numeric: true },
      },
      {
        id: 'actions',
        header: tc('actions'),
        meta: { align: 'right' },
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleEditCategory(row.original)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t, tc, handleEditCategory, handleDeleteClick],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('manageCategories')}</DialogTitle>
            <DialogDescription>{t('manageCategoriesDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button onClick={handleNewCategory} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('newCategory')}
            </Button>

            <DataTable
              columns={columns}
              data={categories}
              emptyState={
                <span className="text-muted-foreground">{t('noCategoriesCreateOne')}</span>
              }
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? t('editCategory') : t('newCategory')}</DialogTitle>
            <DialogDescription>
              {editingCategory ? t('updateCategoryDetails') : t('createCategoryDescription')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tc('title')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('titlePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('descriptionOptional')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('categoryDescriptionPlaceholder')}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sortOrder')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        value={field.value as number}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>{t('sortOrderHint')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                  disabled={isSubmitting}
                >
                  {tc('cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span>{tc('saving')}</span>
                    </div>
                  ) : editingCategory ? (
                    tc('update')
                  ) : (
                    tc('create')
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('deleteCategoryTitle')}
        description={t('deleteCategoryWithResourcesConfirm')}
        confirmLabel={tc('delete')}
        onConfirm={handleDeleteConfirm}
        destructive
        loading={isDeleting}
      />
    </>
  );
}
