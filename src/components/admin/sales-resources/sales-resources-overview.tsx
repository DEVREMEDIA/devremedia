'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Settings, FolderOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ResourceList } from './resource-list';
import { ResourceUploadForm } from './resource-upload-form';
import { CategoryManage } from './category-manage';

interface Category {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface Resource {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  category: {
    title: string;
  };
}

interface SalesResourcesOverviewProps {
  categories: Category[];
  resources: Resource[];
}

export function SalesResourcesOverview({ categories, resources }: SalesResourcesOverviewProps) {
  const router = useRouter();
  const t = useTranslations('salesResources');
  const [uploadFormOpen, setUploadFormOpen] = useState(false);
  const [categoryManageOpen, setCategoryManageOpen] = useState(false);

  const handleSuccess = () => {
    router.refresh();
  };

  const handleUploadClick = () => {
    if (categories.length === 0) {
      setCategoryManageOpen(true);
    } else {
      setUploadFormOpen(true);
    }
  };

  if (categories.length === 0) {
    return (
      <>
        <EmptyState
          icon={FolderOpen}
          title={t('noCategoriesYet')}
          description={t('createFirstCategoryDescription')}
          action={{
            label: t('manageCategories'),
            onClick: () => setCategoryManageOpen(true),
          }}
        />

        <CategoryManage
          open={categoryManageOpen}
          onOpenChange={setCategoryManageOpen}
          categories={categories}
          onSuccess={handleSuccess}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCategoryManageOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            {t('manageCategories')}
          </Button>
          <Button onClick={handleUploadClick}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addResource')}
          </Button>
        </div>
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={t('noResourcesYet')}
          description={t('uploadFirstResourceDescription')}
          action={{
            label: t('uploadResourceLabel'),
            onClick: handleUploadClick,
          }}
        />
      ) : (
        <ResourceList resources={resources} categories={categories} onDelete={handleSuccess} />
      )}

      <ResourceUploadForm
        open={uploadFormOpen}
        onOpenChange={setUploadFormOpen}
        categories={categories}
        onSuccess={handleSuccess}
      />

      <CategoryManage
        open={categoryManageOpen}
        onOpenChange={setCategoryManageOpen}
        categories={categories}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
