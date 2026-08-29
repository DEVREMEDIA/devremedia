'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { deleteKbArticle } from '@/lib/actions/kb-articles';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  sort_order: number;
  category: {
    title: string;
    slug: string;
  };
}

interface Category {
  id: string;
  title: string;
  slug: string;
}

interface ArticleListProps {
  articles: Article[];
  categories: Category[];
  onDelete: () => void;
}

export function ArticleList({ articles, categories, onDelete }: ArticleListProps) {
  const router = useRouter();
  const t = useTranslations('university');
  const tc = useTranslations('common');
  const tToast = useTranslations('toast');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredArticles =
    selectedCategory === 'all'
      ? articles
      : articles.filter((a) => a.category.slug === selectedCategory);

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    setIsDeleting(true);
    const result = await deleteKbArticle(deletingId);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(tToast('deleteSuccess'));
    setDeleteDialogOpen(false);
    setDeletingId(null);
    onDelete();
  };

  const handleEdit = (articleId: string) => {
    router.push(`/admin/university/articles/${articleId}/edit`);
  };

  const columns: ColumnDef<Article>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: tc('title'),
        cell: ({ row }) => (
          <Link
            href={`/admin/university/articles/${row.original.id}`}
            className="font-medium hover:underline hover:text-primary"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        id: 'category',
        header: t('category'),
        accessorFn: (row) => row.category.title,
      },
      {
        id: 'status',
        header: tc('status'),
        cell: ({ row }) => (
          <Badge variant={row.original.published ? 'default' : 'secondary'} className="gap-1">
            {row.original.published ? (
              <>
                <Eye className="h-3 w-3" />
                {t('published')}
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3" />
                {t('draft')}
              </>
            )}
          </Badge>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/admin/university/articles/${row.original.id}`)}
              title={t('viewArticle')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original.id)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t, tc, router, handleEdit, handleDeleteClick],
  );

  if (articles.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={t('noArticles')}
        description={t('noArticlesDescription')}
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('filterByCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCategories')}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.slug}>
                    {category.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredArticles}
          emptyState={<span className="text-muted-foreground">{t('noArticlesInCategory')}</span>}
        />
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('deleteArticleTitle')}
        description={`${t('deleteArticleConfirm')} ${tc('deleteConfirmation')}`}
        confirmLabel={tc('delete')}
        onConfirm={handleDeleteConfirm}
        destructive
        loading={isDeleting}
      />
    </>
  );
}
