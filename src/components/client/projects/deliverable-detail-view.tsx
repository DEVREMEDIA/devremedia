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

/** Convert video URLs to embeddable format for YouTube, Vimeo, Google Drive, Loom */
function getEmbedUrl(url: string): string | null {
  const trimmed = url.trim();

  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;

  const loomMatch = trimmed.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;

  return null;
}

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

        {/* Video Player — iframe embed for YouTube/Vimeo/Drive/Loom, native player for direct files */}
        {resolvedVideoSrc ? (
          getEmbedUrl(resolvedVideoSrc) ? (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={getEmbedUrl(resolvedVideoSrc)!}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <VideoPlayer
              src={resolvedVideoSrc}
              annotations={annotations}
              onTimeClick={onTimeClick}
            />
          )
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
