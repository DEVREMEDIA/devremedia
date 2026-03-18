'use client';

import * as React from 'react';
import { Upload, FileVideo, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { FileUploadDropzone } from '@/components/shared/file-upload-dropzone';
import { EmptyState } from '@/components/shared/empty-state';
import { createDeliverable } from '@/lib/actions/deliverables';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Deliverable } from '@/types/index';

interface EmployeeDeliverablesProps {
  projectId: string;
  deliverables: Deliverable[];
}

export function EmployeeDeliverables({ projectId, deliverables }: EmployeeDeliverablesProps) {
  const t = useTranslations('deliverables');
  const tToast = useTranslations('toast');
  const [isUploading, setIsUploading] = React.useState(false);
  const [showUpload, setShowUpload] = React.useState(false);
  const router = useRouter();

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setIsUploading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error(tToast('unauthorized'));
        return;
      }

      // Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('deliverables')
        .upload(filePath, file);

      if (uploadError) {
        toast.error(tToast('uploadError'));
        console.error(uploadError);
        return;
      }

      // Create deliverable record
      const result = await createDeliverable({
        project_id: projectId,
        title: file.name,
        description: null,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        status: 'pending_review',
        expires_at: null,
      });

      if (result.error) {
        toast.error(tToast('createError'));
        // Clean up uploaded file
        await supabase.storage.from('deliverables').remove([filePath]);
        return;
      }

      toast.success(tToast('uploadSuccess'));
      setShowUpload(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(tToast('uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowUpload(!showUpload)}>
          <Upload />
          {t('uploadDeliverable')}
        </Button>
      </div>

      {/* Upload dropzone */}
      {showUpload && (
        <Card>
          <CardContent className="pt-6">
            <FileUploadDropzone
              accept={{
                'video/mp4': ['.mp4'],
                'video/quicktime': ['.mov'],
                'video/x-msvideo': ['.avi'],
              }}
              maxSize={5 * 1024 * 1024 * 1024} // 5GB
              onFilesSelected={handleFilesSelected}
              disabled={isUploading}
            />
          </CardContent>
        </Card>
      )}

      {/* Deliverables list */}
      {deliverables.length === 0 ? (
        <EmptyState
          icon={FileVideo}
          title={t('noDeliverablesYet')}
          description={t('uploadVideoFiles')}
          action={{
            label: t('uploadNow'),
            onClick: () => setShowUpload(true),
          }}
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
