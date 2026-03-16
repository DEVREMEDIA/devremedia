import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, File } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSalesResources } from '@/lib/actions/sales-resources';
import { ResourceDownloadButton } from '@/components/salesman/resources/resource-download-button';

interface CategoryResourcesPageProps {
  params: Promise<{
    categoryId: string;
  }>;
}

interface CategoryInfo {
  id: string;
  title: string;
  description: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function CategoryResourcesContent({ categoryId }: { categoryId: string }) {
  const t = await getTranslations('salesResources');
  const resourcesResult = await getSalesResources(categoryId);
  const resources = resourcesResult.data ?? [];

  if (resources.length === 0) {
    return (
      <EmptyState icon={File} title={t('noResources')} description={t('noResourcesDescription')} />
    );
  }

  return (
    <div className="space-y-4">
      {resources.map((resource) => (
        <Card key={resource.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{resource.title}</CardTitle>
                  {resource.description && (
                    <CardDescription className="line-clamp-2">
                      {resource.description}
                    </CardDescription>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <span>{resource.file_name}</span>
                    <span>·</span>
                    <span>{formatFileSize(resource.file_size)}</span>
                  </div>
                </div>
              </div>
              <ResourceDownloadButton filePath={resource.file_path} fileName={resource.file_name} />
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export default async function CategoryResourcesPage({ params }: CategoryResourcesPageProps) {
  const { categoryId } = await params;
  const t = await getTranslations('salesResources');

  // Fetch category info inline to avoid double-fetching all categories
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: category } = await supabase
    .from('sales_resource_categories')
    .select('id, title, description')
    .eq('id', categoryId)
    .single();

  if (!category) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/salesman/resources" className="hover:text-foreground">
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
        <CategoryResourcesContent categoryId={categoryId} />
      </Suspense>
    </div>
  );
}
