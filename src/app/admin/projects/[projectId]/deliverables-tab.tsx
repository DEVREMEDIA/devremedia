'use client';

import { useState, useEffect } from 'react';
import { VideoUpload } from '@/components/admin/deliverables/video-upload';
import { DeliverableList } from '@/components/admin/deliverables/deliverable-list';
import { DeliverableDetail } from '@/components/admin/deliverables/deliverable-detail';
import { getDeliverablesByProject } from '@/lib/actions/deliverables';
import { Loader2 } from 'lucide-react';
import type { DeliverableStatus } from '@/lib/constants';
import { useTranslations } from 'next-intl';

type Deliverable = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  version: number;
  status: DeliverableStatus;
  download_count: number;
  expires_at: string | null;
  uploaded_by: string | null;
  created_at: string;
};

type DeliverablesTabProps = {
  projectId: string;
};

export function DeliverablesTab({ projectId }: DeliverablesTabProps) {
  const t = useTranslations('deliverables');
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
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
        setDeliverables((result.data as unknown as Deliverable[]) ?? []);
      }

      setIsLoading(false);
    };

    fetchDeliverables();
  }, [projectId, refreshCounter]);

  const handleUploadComplete = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  const handleDeliverableSelect = (deliverable: Deliverable) => {
    setSelectedDeliverable(deliverable);
  };

  const handleBack = () => {
    setSelectedDeliverable(null);
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

  if (selectedDeliverable) {
    return (
      <DeliverableDetail
        deliverable={selectedDeliverable}
        projectId={projectId}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="space-y-6">
      <VideoUpload projectId={projectId} onUploadComplete={handleUploadComplete} />
      <DeliverableList deliverables={deliverables} onSelect={handleDeliverableSelect} />
    </div>
  );
}
