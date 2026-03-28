'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  BookOpen,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { CategoryForm } from './category-form';
import { deleteKbCategory } from '@/lib/actions/kb-categories';
import { deleteKbArticle } from '@/lib/actions/kb-articles';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  sort_order: number;
  parent_id: string | null;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  sort_order: number;
  category_id: string;
  category: {
    title: string;
    slug: string;
  };
}

interface UniversityOverviewProps {
  categories: Category[];
  articles: Article[];
}

export function UniversityOverview({ categories, articles }: UniversityOverviewProps) {
  const router = useRouter();
  const t = useTranslations('university');
  const tc = useTranslations('common');
  const tToast = useTranslations('toast');

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Delete state
  const [deleteType, setDeleteType] = useState<'category' | 'article' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Article counts per category
  const articleCountMap = new Map<string, number>();
  for (const article of articles) {
    const count = articleCountMap.get(article.category_id) ?? 0;
    articleCountMap.set(article.category_id, count + 1);
  }

  // Filtered articles
  const filteredArticles = selectedCategoryId
    ? articles.filter((a) => a.category_id === selectedCategoryId)
    : articles;

  // Handlers
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormOpen(true);
  };

  const handleCategoryFormClose = () => {
    setCategoryFormOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteClick = (type: 'category' | 'article', id: string) => {
    setDeleteType(type);
    setDeletingId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId || !deleteType) return;

    setIsDeleting(true);
    const result =
      deleteType === 'category'
        ? await deleteKbCategory(deletingId)
        : await deleteKbArticle(deletingId);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(tToast('deleteSuccess'));
    setDeleteType(null);
    setDeletingId(null);
    if (deleteType === 'category' && deletingId === selectedCategoryId) {
      setSelectedCategoryId(null);
    }
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Categories section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Categories
          </h2>
          <Button variant="outline" size="sm" onClick={() => setCategoryFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Category
          </Button>
        </div>

        {categories.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={t('noCategories')}
            description="Create your first category to organize articles"
            action={{
              label: t('addCategory'),
              onClick: () => setCategoryFormOpen(true),
            }}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => {
              const count = articleCountMap.get(category.id) ?? 0;
              const isSelected = selectedCategoryId === category.id;

              return (
                <Card
                  key={category.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md group',
                    isSelected && 'ring-2 ring-primary shadow-md',
                  )}
                  onClick={() => setSelectedCategoryId(isSelected ? null : category.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary shrink-0" />
                          <h3 className="font-semibold text-sm truncate">{category.title}</h3>
                        </div>
                        {category.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                            {category.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {count} {count === 1 ? 'article' : 'articles'}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCategory(category);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick('category', category.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Articles section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {selectedCategoryId
              ? `Articles — ${categories.find((c) => c.id === selectedCategoryId)?.title}`
              : 'All Articles'}
            <span className="ml-2 text-xs font-normal">({filteredArticles.length})</span>
          </h2>
          <Button size="sm" onClick={() => router.push('/admin/university/articles/new')}>
            <Plus className="h-4 w-4 mr-1" />
            New Article
          </Button>
        </div>

        {filteredArticles.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={selectedCategoryId ? t('noArticlesInCategory') : t('noArticles')}
            description={
              selectedCategoryId
                ? 'No articles in this category yet'
                : 'Create your first knowledge base article to get started'
            }
            action={{
              label: t('addArticle'),
              onClick: () => router.push('/admin/university/articles/new'),
            }}
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  {!selectedCategoryId && <TableHead>Category</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/university/articles/${article.id}`}
                        className="hover:underline hover:text-primary"
                      >
                        {article.title}
                      </Link>
                    </TableCell>
                    {!selectedCategoryId && (
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {article.category.title}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge
                        variant={article.published ? 'default' : 'secondary'}
                        className="gap-1"
                      >
                        {article.published ? (
                          <>
                            <Eye className="h-3 w-3" />
                            Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" />
                            Draft
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{article.sort_order}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/university/articles/${article.id}`)}
                          title={t('viewArticle')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/admin/university/articles/${article.id}/edit`)
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick('article', article.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Category Form Dialog */}
      <CategoryForm
        open={categoryFormOpen}
        onOpenChange={handleCategoryFormClose}
        category={editingCategory}
        categories={categories}
        onSuccess={() => router.refresh()}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteType}
        onOpenChange={() => {
          setDeleteType(null);
          setDeletingId(null);
        }}
        title={deleteType === 'category' ? t('deleteCategoryTitle') : t('deleteArticleTitle')}
        description={
          deleteType === 'category'
            ? 'Are you sure? All articles in this category will also be deleted.'
            : 'Are you sure you want to delete this article? This action cannot be undone.'
        }
        confirmLabel={tc('delete')}
        onConfirm={handleDeleteConfirm}
        destructive
        loading={isDeleting}
      />
    </div>
  );
}
