'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Eye, EyeOff, Calendar, FolderOpen, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ArticleContent } from '@/components/shared/article-content';
import { deleteKbArticle } from '@/lib/actions/kb-articles';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { KbArticle } from '@/types';

interface ArticlePreviewProps {
  article: KbArticle & { category: { title: string; slug: string } };
}

export function ArticlePreview({ article }: ArticlePreviewProps) {
  const router = useRouter();
  const t = useTranslations('university');
  const tc = useTranslations('common');
  const tToast = useTranslations('toast');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteKbArticle(article.id);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(tToast('deleteSuccess'));
    router.push('/admin/university');
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={article.title} description={t('articlePreview')}>
        <Button variant="outline" onClick={() => router.push('/admin/university')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tc('back')}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/university/articles/${article.id}/edit`)}
        >
          <Pencil className="mr-2 h-4 w-4" />
          {tc('edit')}
        </Button>
        <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          {tc('delete')}
        </Button>
      </PageHeader>

      {/* Metadata */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="flex items-center gap-2">
              {article.published ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Badge variant={article.published ? 'default' : 'secondary'}>
                {article.published ? 'Published' : 'Draft'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{article.category.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Sort: {article.sort_order}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{new Date(article.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Article Content */}
      <ArticleContent content={article.content} videoUrls={article.video_urls} />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('deleteArticleTitle')}
        description={t('deleteArticleConfirm')}
        confirmLabel={tc('delete')}
        onConfirm={handleDelete}
        destructive
        loading={isDeleting}
      />
    </div>
  );
}
