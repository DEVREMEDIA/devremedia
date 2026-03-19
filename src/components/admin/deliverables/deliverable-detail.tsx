'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { AnnotationList } from '@/components/shared/annotation-list';

const VideoPlayer = dynamic(
  () => import('@/components/shared/video-player').then((mod) => mod.VideoPlayer),
  { ssr: false },
);
import { AddAnnotationDialog } from '@/components/shared/add-annotation-dialog';
import { ApprovalActions } from '@/components/admin/deliverables/approval-actions';
import { VersionHistory } from '@/components/admin/deliverables/version-history';
import {
  getAnnotations,
  resolveAnnotation,
  getDeliverablesByProject,
} from '@/lib/actions/deliverables';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowLeft, Download, Plus, Loader2 } from 'lucide-react';
import type { VideoAnnotation } from '@/types';
import type { DeliverableStatus } from '@/lib/constants';

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

type DeliverableDetailProps = {
  deliverable: Deliverable;
  projectId: string;
  onBack: () => void;
};

export function DeliverableDetail({ deliverable, projectId, onBack }: DeliverableDetailProps) {
  const t = useTranslations('deliverables');
  const tToast = useTranslations('toast');
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>([]);
  const [versionHistory, setVersionHistory] = useState<Deliverable[]>([]);
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(true);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isAnnotationDialogOpen, setIsAnnotationDialogOpen] = useState(false);
  const [selectedTimestamp, setSelectedTimestamp] = useState(0);

  const fetchAnnotations = async () => {
    setIsLoadingAnnotations(true);
    const result = await getAnnotations(deliverable.id);

    if (result.error) {
      toast.error(t('failedToLoadAnnotations'));
    } else {
      setAnnotations(result.data ?? []);
    }

    setIsLoadingAnnotations(false);
  };

  const fetchVersionHistory = async () => {
    setIsLoadingVersions(true);
    const result = await getDeliverablesByProject(projectId);

    if (result.error) {
      toast.error(tToast('genericError'));
    } else {
      const allDeliverables = (result.data as unknown as Deliverable[]) ?? [];
      setVersionHistory(allDeliverables);
    }

    setIsLoadingVersions(false);
  };

  const fetchVideoUrl = async () => {
    try {
      const supabase = createClient();
      const { data: signedUrlData } = await supabase.storage
        .from('deliverables')
        .createSignedUrl(deliverable.file_path, 3600); // 1 hour expiry

      if (signedUrlData?.signedUrl) {
        setVideoUrl(signedUrlData.signedUrl);
      }
    } catch (error: unknown) {
      console.error('Failed to get video URL:', error);
      toast.error(tToast('genericError'));
    }
  };

  useEffect(() => {
    fetchAnnotations();
    fetchVersionHistory();
    fetchVideoUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverable.id]);

  const handleAnnotationClick = () => {
    // Video player will handle seeking to timestamp (annotation parameter unused intentionally)
  };

  const handleTimeClick = (seconds: number) => {
    setSelectedTimestamp(seconds);
    setIsAnnotationDialogOpen(true);
  };

  const handleResolve = async (annotationId: string) => {
    const result = await resolveAnnotation(annotationId);

    if (result.error) {
      toast.error(t('failedToUpdateAnnotation'));
    } else {
      toast.success(t('annotationUpdated'));
      fetchAnnotations();
    }
  };

  const handleDownload = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('deliverables')
        .download(deliverable.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = deliverable.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t('downloadStarted'));
    } catch (error: unknown) {
      console.error('Download error:', error);
      toast.error(t('failedToDownload'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{deliverable.title}</h2>
            <p className="text-sm text-muted-foreground">Version {deliverable.version}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Video & Annotations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          {videoUrl ? (
            <VideoPlayer
              src={videoUrl}
              annotations={annotations}
              onTimeClick={handleTimeClick}
              onAnnotationClick={handleAnnotationClick}
            />
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Annotations Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Annotations & Feedback</h3>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedTimestamp(0);
                  setIsAnnotationDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Annotation
              </Button>
            </div>

            {isLoadingAnnotations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <AnnotationList
                annotations={annotations}
                onAnnotationClick={handleAnnotationClick}
                onResolve={handleResolve}
              />
            )}
          </div>
        </div>

        {/* Right Column - Approval & Version History */}
        <div className="space-y-6">
          {/* Approval Actions */}
          <div className="rounded-lg border bg-card p-6">
            <ApprovalActions
              deliverable={deliverable}
              onStatusChange={() => {
                onBack();
              }}
            />
          </div>

          {/* Version History */}
          <div className="rounded-lg border bg-card p-6">
            {isLoadingVersions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <VersionHistory deliverables={versionHistory} currentId={deliverable.id} />
            )}
          </div>
        </div>
      </div>

      {/* Add Annotation Dialog */}
      <AddAnnotationDialog
        open={isAnnotationDialogOpen}
        onOpenChange={setIsAnnotationDialogOpen}
        timestamp={selectedTimestamp}
        deliverableId={deliverable.id}
        onCreated={fetchAnnotations}
      />
    </div>
  );
}
