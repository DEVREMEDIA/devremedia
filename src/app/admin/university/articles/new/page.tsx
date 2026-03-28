import { PageHeader } from '@/components/shared/page-header';
import { ArticleForm } from '@/components/admin/university/article-form';
import { getKbCategories } from '@/lib/actions/kb-categories';
import { redirect } from 'next/navigation';

export default async function NewArticlePage() {
  const categoriesResult = await getKbCategories();

  if (categoriesResult.error) {
    redirect('/admin/university');
  }

  const categories = categoriesResult.data ?? [];

  if (categories.length === 0) {
    redirect('/admin/university');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New Article" description="Create a new knowledge base article" />

      <ArticleForm categories={categories} />
    </div>
  );
}
