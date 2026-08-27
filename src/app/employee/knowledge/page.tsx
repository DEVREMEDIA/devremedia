import { Suspense } from 'react';
import { BookOpen } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeading } from '@/components/shared/page-heading';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { getKbCategories } from '@/lib/actions/kb-categories';
import { UniversityBrowse } from '@/components/employee/university/university-browse';

async function UniversityContent() {
  const t = await getTranslations('employee.knowledge');
  const categoriesResult = await getKbCategories();
  const categories = categoriesResult.data ?? [];

  if (categories.length === 0) {
    return (
      <EmptyState icon={BookOpen} title={t('emptyTitle')} description={t('emptyDescription')} />
    );
  }

  return <UniversityBrowse categories={categories} />;
}

export default async function EmployeeUniversityPage() {
  const tUniversity = await getTranslations('university');
  const t = await getTranslations('employee.knowledge');

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title={tUniversity('title')} subtitle={t('subtitle')} />

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
