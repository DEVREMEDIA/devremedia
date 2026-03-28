import { Suspense } from 'react';
import { BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { getKbCategories } from '@/lib/actions/kb-categories';
import { UniversityBrowse } from '@/components/employee/university/university-browse';

async function UniversityContent() {
  const categoriesResult = await getKbCategories();
  const categories = categoriesResult.data ?? [];

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No content available"
        description="The knowledge base is being set up. Check back soon!"
      />
    );
  }

  return <UniversityBrowse categories={categories} />;
}

export default function EmployeeUniversityPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="DMS University"
        description="Browse knowledge base articles and learn about DMS"
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
