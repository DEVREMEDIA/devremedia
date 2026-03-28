import { PageHeader } from '@/components/shared/page-header';
import { ArticleForm } from '@/components/admin/university/article-form';
import { getKbCategories } from '@/lib/actions/kb-categories';
import { getKbArticle } from '@/lib/actions/kb-articles';
import { redirect, notFound } from 'next/navigation';
import type { ComponentProps } from 'react';

type ArticleFormProps = ComponentProps<typeof ArticleForm>;

interface EditArticlePageProps {
  params: Promise<{
    articleId: string;
  }>;
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { articleId } = await params;

  const [categoriesResult, articleResult] = await Promise.all([
    getKbCategories(),
    getKbArticle(articleId),
  ]);

  if (categoriesResult.error) {
    redirect('/admin/university');
  }

  if (articleResult.error) {
    notFound();
  }

  const categories = categoriesResult.data ?? [];
  const article = articleResult.data as ArticleFormProps['article'];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit Article" description="Update knowledge base article" />

      <ArticleForm article={article} categories={categories as ArticleFormProps['categories']} />
    </div>
  );
}
