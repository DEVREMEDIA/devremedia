import { Suspense, type ComponentProps } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { getKbCategories } from '@/lib/actions/kb-categories';
import { getKbArticles } from '@/lib/actions/kb-articles';
import { UniversityOverview } from '@/components/admin/university/university-overview';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

type OverviewProps = ComponentProps<typeof UniversityOverview>;

async function UniversityContent() {
  const [categoriesResult, articlesResult] = await Promise.all([
    getKbCategories(),
    getKbArticles(),
  ]);

  const categories = categoriesResult.data ?? [];
  const articles = (articlesResult.data as OverviewProps['articles']) ?? [];

  return (
    <UniversityOverview
      categories={categories as OverviewProps['categories']}
      articles={articles}
    />
  );
}

export default function UniversityPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="DMS University"
        description="Manage knowledge base categories and articles"
      />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
        <UniversityContent />
      </Suspense>
    </div>
  );
}
