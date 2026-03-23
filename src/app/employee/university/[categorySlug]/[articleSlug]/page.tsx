import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { ArticleContent } from '@/components/shared/article-content';
import { getKbCategoryBySlug } from '@/lib/actions/kb-categories';
import { getKbArticleBySlug } from '@/lib/actions/kb-articles';

interface ArticlePageProps {
  params: Promise<{
    categorySlug: string;
    articleSlug: string;
  }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { categorySlug, articleSlug } = await params;

  const categoryResult = await getKbCategoryBySlug(categorySlug);
  if (categoryResult.error || !categoryResult.data) {
    notFound();
  }

  const category = categoryResult.data as import('@/types').KbCategory;

  const articleResult = await getKbArticleBySlug(articleSlug);
  if (articleResult.error || !articleResult.data) {
    notFound();
  }

  const article = articleResult.data as import('@/types').KbArticle & {
    category: { slug: string };
  };

  // Ensure article belongs to this category
  if (article.category.slug !== categorySlug) {
    notFound();
  }

  // Only show published articles to employees
  if (!article.published) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/employee/university" className="hover:text-foreground">
          DMS University
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/employee/university/${categorySlug}`} className="hover:text-foreground">
          {category.title}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{article.title}</span>
      </div>

      <PageHeader title={article.title} description={article.summary ?? undefined} />

      <div className="max-w-4xl">
        <ArticleContent content={article.content} videoUrls={article.video_urls} />
      </div>
    </div>
  );
}
