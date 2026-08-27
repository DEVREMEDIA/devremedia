import { Suspense } from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { FolderOpen, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { getSalesResourceCategories } from '@/lib/actions/sales-resources';

async function ResourcesContent() {
  const t = await getTranslations('salesResources');
  const categoriesResult = await getSalesResourceCategories();
  const categories = categoriesResult.data ?? [];

  if (categories.length === 0) {
    return <EmptyState icon={FolderOpen} title={t('noResources')} description={t('description')} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <Link key={category.id} href={`/salesman/resources/${category.id}`}>
          <div className="group rounded-xl border bg-card p-5 h-full cursor-pointer transition-all duration-300 lift-on-hover">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
            <h3 className="font-semibold text-base mb-1.5">{category.title}</h3>
            {category.description && (
              <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                {category.description}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function SalesmanResourcesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
        <ResourcesContent />
      </Suspense>
    </div>
  );
}
