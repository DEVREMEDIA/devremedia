'use client';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import dynamic from 'next/dynamic';
import { AnnotationList } from '@/components/shared/annotation-list';
import { AddAnnotationDialog } from '@/components/shared/add-annotation-dialog';
import { Download, CheckCircle, AlertCircle, ArrowLeft, Plus, Loader2 } from 'lucide-react';
import type { Deliverable, VideoAnnotation } from '@/types';

const VideoPlayer = dynamic(
  () => import('@/components/shared/video-player').then((mod) => mod.VideoPlayer),
  { ssr: false },
);

type DeliverableWithExtras = Deliverable & {
  file_url?: string;
  version_number?: number;
};

interface DeliverableDetailViewProps {
  deliverable: DeliverableWithExtras;
  videoUrl: string | null;
  annotations: VideoAnnotation[];
  isLoadingAnnotations: boolean;
  isAnnotationDialogOpen: boolean;
  selectedTimestamp: number;
  onBack: () => void;
  onDownload: (deliverable: DeliverableWithExtras) => void;
  onApprove: (deliverable: DeliverableWithExtras) => void;
  onRequestRevision: (deliverable: DeliverableWithExtras) => void;
  onResolveAnnotation: (annotationId: string) => void;
  onTimeClick: (seconds: number) => void;
  onAnnotationDialogOpenChange: (open: boolean) => void;
  onAddAnnotationClick: () => void;
  onAnnotationCreated: () => void;
}

export function DeliverableDetailView({
  deliverable,
  videoUrl,
  annotations,
  isLoadingAnnotations,
  isAnnotationDialogOpen,
  selectedTimestamp,
  onBack,
  onDownload,
  onApprove,
  onRequestRevision,
  onResolveAnnotation,
  onTimeClick,
  onAnnotationDialogOpenChange,
  onAddAnnotationClick,
  onAnnotationCreated,
}: DeliverableDetailViewProps) {
  const resolvedVideoSrc = videoUrl ?? deliverable.file_url;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{deliverable.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={deliverable.status} />
                <span className="text-sm text-muted-foreground">
                  v{deliverable.version_number || deliverable.version}
                </span>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => onDownload(deliverable)}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        {/* Video Player with Annotations */}
        {resolvedVideoSrc ? (
          <VideoPlayer src={resolvedVideoSrc} annotations={annotations} onTimeClick={onTimeClick} />
        ) : (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Review Actions */}
        {deliverable.status === 'pending_review' && (
          <div className="flex items-center gap-2">
            <Button onClick={() => onApprove(deliverable)} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => onRequestRevision(deliverable)}
              className="gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              Request Revision
            </Button>
          </div>
        )}

        {/* Annotations Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Annotations &amp; Feedback</h3>
            <Button size="sm" onClick={onAddAnnotationClick}>
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
              onResolve={onResolveAnnotation}
              onAnnotationClick={(annotation) => {
                if (annotation.timestamp_seconds) {
                  onTimeClick(annotation.timestamp_seconds);
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Add Annotation Dialog */}
      <AddAnnotationDialog
        open={isAnnotationDialogOpen}
        onOpenChange={onAnnotationDialogOpenChange}
        timestamp={selectedTimestamp}
        deliverableId={deliverable.id}
        onCreated={onAnnotationCreated}
      />
    </>
  );
}
