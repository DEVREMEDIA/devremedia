import { Suspense, type ComponentProps } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { getSalesResourceCategories, getSalesResources } from '@/lib/actions/sales-resources';
import { SalesResourcesOverview } from '@/components/admin/sales-resources/sales-resources-overview';

type OverviewProps = ComponentProps<typeof SalesResourcesOverview>;

async function SalesResourcesContent() {
  const [categoriesResult, resourcesResult] = await Promise.all([
    getSalesResourceCategories(),
    getSalesResources(),
  ]);

  const categories = (categoriesResult.data as OverviewProps['categories']) ?? [];
  const resources = (resourcesResult.data as unknown as OverviewProps['resources']) ?? [];

  return <SalesResourcesOverview categories={categories} resources={resources} />;
}

export default function SalesResourcesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Sales Resources" description="Manage sales materials and resources" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
        <SalesResourcesContent />
      </Suspense>
    </div>
  );
}
