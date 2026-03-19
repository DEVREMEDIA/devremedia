'use client';

import { useState, useEffect } from 'react';
import { VideoUpload } from '@/components/admin/deliverables/video-upload';
import { DeliverableList } from '@/components/admin/deliverables/deliverable-list';
import { getDeliverablesByProject } from '@/lib/actions/deliverables';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Deliverable } from '@/types';

interface DeliverablesTabProps {
  projectId: string;
}

export function DeliverablesTab({ projectId }: DeliverablesTabProps) {
  const t = useTranslations('deliverables');
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    const fetchDeliverables = async () => {
      setIsLoading(true);
      setError(null);

      const result = await getDeliverablesByProject(projectId);

      if (result.error) {
        setError(result.error);
      } else {
        setDeliverables(result.data ?? []);
      }

      setIsLoading(false);
    };

    fetchDeliverables();
  }, [projectId, refreshCounter]);

  const handleRefresh = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-destructive">{t('loadError')}</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('title')}</h3>
        <VideoUpload projectId={projectId} onUploadComplete={handleRefresh} />
      </div>
      <DeliverableList deliverables={deliverables} onSelect={() => {}} onRefresh={handleRefresh} />
    </div>
  );
}
