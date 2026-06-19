'use client';

import { VideoUpload } from '@/components/admin/deliverables/video-upload';
import { DeliverableList } from '@/components/admin/deliverables/deliverable-list';
import { useRouter } from 'next/navigation';
import type { Deliverable } from '@/types/index';

interface EmployeeDeliverablesProps {
  projectId: string;
  deliverables: Deliverable[];
  clientName?: string;
  projectName?: string;
}

export function EmployeeDeliverables({
  projectId,
  deliverables,
  clientName,
  projectName,
}: EmployeeDeliverablesProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <VideoUpload
          projectId={projectId}
          onUploadComplete={() => router.refresh()}
          clientName={clientName}
          projectName={projectName}
        />
      </div>

      <DeliverableList
        deliverables={deliverables}
        canDelete={false}
        onRefresh={() => router.refresh()}
      />
    </div>
  );
}
