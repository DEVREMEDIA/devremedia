'use client';

import { FileVideo, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { VideoUpload } from '@/components/admin/deliverables/video-upload';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Deliverable } from '@/types/index';
import { formatFileSize } from '@/lib/format';

interface EmployeeDeliverablesProps {
  projectId: string;
  deliverables: Deliverable[];
}

export function EmployeeDeliverables({ projectId, deliverables }: EmployeeDeliverablesProps) {
  const t = useTranslations('deliverables');
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <VideoUpload projectId={projectId} onUploadComplete={() => router.refresh()} />
      </div>

      {deliverables.length === 0 ? (
        <EmptyState
          icon={FileVideo}
          title={t('noDeliverablesYet')}
          description={t('uploadVideoFiles')}
        />
      ) : (
        <div className="space-y-4">
          {deliverables.map((deliverable) => (
            <Card key={deliverable.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <FileVideo className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h4 className="font-semibold truncate">{deliverable.title}</h4>
                        {deliverable.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {deliverable.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileVideo className="h-3 w-3" />
                          {deliverable.file_type}
                        </span>
                        <span>{formatFileSize(deliverable.file_size)}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(deliverable.created_at).toLocaleDateString()}
                        </span>
                        <span>Version {(deliverable as { version?: number }).version || 1}</span>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={deliverable.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
