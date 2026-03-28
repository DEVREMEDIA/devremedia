import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, FileText } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getKbCategoryBySlug } from '@/lib/actions/kb-categories';
import { getPublishedArticlesByCategory } from '@/lib/actions/kb-articles';

interface CategoryPageProps {
  params: Promise<{
    categorySlug: string;
  }>;
}

async function CategoryContent({
  categorySlug,
  categoryId,
}: {
  categorySlug: string;
  categoryId: string;
}) {
  const t = await getTranslations('university');
  const articlesResult = await getPublishedArticlesByCategory(categoryId);
  const articles = articlesResult.data ?? [];

  if (articles.length === 0) {
    return (
      <EmptyState icon={FileText} title={t('noArticles')} description={t('noArticlesCheckBack')} />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {articles.map((article) => (
        <Link key={article.id} href={`/employee/university/${categorySlug}/${article.slug}`}>
          <Card className="h-full transition-colors hover:bg-accent/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg flex-1">{article.title}</CardTitle>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
              {article.summary && (
                <CardDescription className="line-clamp-2">{article.summary}</CardDescription>
              )}
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categorySlug } = await params;
  const t = await getTranslations('university');
  const categoryResult = await getKbCategoryBySlug(categorySlug);

  if (categoryResult.error || !categoryResult.data) {
    notFound();
  }

  const category = categoryResult.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/employee/university" className="hover:text-foreground">
          {t('title')}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{category.title}</span>
      </div>

      <PageHeader title={category.title} description={category.description ?? undefined} />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
        <CategoryContent categorySlug={categorySlug} categoryId={category.id} />
      </Suspense>
    </div>
  );
}
