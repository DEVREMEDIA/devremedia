'use client';

import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { useTranslations } from 'next-intl';
import { FileVideo } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  updateDeliverableStatus,
  requestRevisionWithNote,
  getAnnotations,
  resolveAnnotation,
} from '@/lib/actions/deliverables';
import { createClient } from '@/lib/supabase/client';
import { resolveDeliverableVideoUrl } from '@/lib/deliverable-video';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DeliverableCard } from './deliverable-card';
import { DeliverableDetailView } from './deliverable-detail-view';
import { DeliverableReviewDialog } from './deliverable-review-dialog';
import type { Deliverable, VideoAnnotation } from '@/types';

type DeliverableWithExtras = Deliverable & {
  file_url?: string;
  version_number?: number;
};

interface DeliverablesTabProps {
  deliverables: DeliverableWithExtras[];
}

export function DeliverablesTab({ deliverables }: DeliverablesTabProps) {
  const router = useRouter();
  const t = useTranslations('deliverables');
  const [selectedDeliverable, setSelectedDeliverable] = useState<DeliverableWithExtras | null>(
    null,
  );
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewType, setReviewType] = useState<'approved' | 'revision_requested'>('approved');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [reviewingDeliverableId, setReviewingDeliverableId] = useState<string | null>(null);

  // Annotation state
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>([]);
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isAnnotationDialogOpen, setIsAnnotationDialogOpen] = useState(false);
  const [selectedTimestamp, setSelectedTimestamp] = useState(0);

  useEffect(() => {
    if (selectedDeliverable) {
      fetchAnnotations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeliverable?.id]);

  const fetchAnnotations = async () => {
    if (!selectedDeliverable) return;
    setIsLoadingAnnotations(true);
    const result = await getAnnotations(selectedDeliverable.id);
    if (result.error) {
      toast.error(t('failedToLoadAnnotations'));
    } else {
      setAnnotations(result.data ?? []);
    }
    setIsLoadingAnnotations(false);
  };

  // Video URL is derived synchronously from the already-loaded deliverable —
  // no second round-trip when a deliverable is selected (Phase 1).
  const handleSelect = (deliverable: DeliverableWithExtras) => {
    const supabase = createClient();
    setVideoUrl(
      resolveDeliverableVideoUrl(
        deliverable,
        (path) => supabase.storage.from('deliverables').getPublicUrl(path).data.publicUrl,
      ),
    );
    setSelectedDeliverable(deliverable);
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

  const handleTimeClick = (seconds: number) => {
    setSelectedTimestamp(seconds);
    setIsAnnotationDialogOpen(true);
  };

  const handleDownload = async (deliverable: DeliverableWithExtras) => {
    const path = deliverable.file_path;
    const externalUrl = deliverable.file_url;

    // External URL (Google Drive, YouTube, etc.) — open directly
    if (path?.startsWith('http://') || path?.startsWith('https://')) {
      window.open(path, '_blank');
      return;
    }

    if (externalUrl) {
      window.open(externalUrl, '_blank');
      return;
    }

    // Supabase Storage file — use signed URL for private bucket
    if (path) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.storage
          .from('deliverables')
          .createSignedUrl(path, 3600, { download: deliverable.title });
        if (error) throw error;
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
          toast.success(t('downloadStarted'));
        }
      } catch {
        toast.error(t('failedToDownload'));
      }
    }
  };

  const handleReview = async (deliverableId: string, status: 'approved' | 'revision_requested') => {
    if (status === 'revision_requested' && !revisionNotes.trim()) {
      toast.error(t('provideRevisionNotes'));
      return;
    }

    setLoading(true);

    const result =
      status === 'revision_requested'
        ? await requestRevisionWithNote(deliverableId, revisionNotes)
        : await updateDeliverableStatus(deliverableId, status);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        status === 'approved' ? 'Deliverable approved successfully' : 'Revision request submitted',
      );
      setReviewDialogOpen(false);
      setRevisionNotes('');
      router.refresh();
    }
    setLoading(false);
  };

  const openReviewDialog = (
    deliverable: DeliverableWithExtras,
    type: 'approved' | 'revision_requested',
  ) => {
    setReviewingDeliverableId(deliverable.id);
    setReviewType(type);
    setReviewDialogOpen(true);
  };

  const handleBackToList = () => {
    setSelectedDeliverable(null);
    setAnnotations([]);
    setVideoUrl(null);
  };

  if (deliverables.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={FileVideo}
            title={t('noDeliverables')}
            description={t('deliverablesWillAppear')}
          />
        </CardContent>
      </Card>
    );
  }

  if (selectedDeliverable) {
    return (
      <>
        <DeliverableDetailView
          deliverable={selectedDeliverable}
          videoUrl={videoUrl}
          annotations={annotations}
          isLoadingAnnotations={isLoadingAnnotations}
          isAnnotationDialogOpen={isAnnotationDialogOpen}
          selectedTimestamp={selectedTimestamp}
          onBack={handleBackToList}
          onDownload={handleDownload}
          onApprove={(d) => openReviewDialog(d, 'approved')}
          onRequestRevision={(d) => openReviewDialog(d, 'revision_requested')}
          onResolveAnnotation={handleResolve}
          onTimeClick={handleTimeClick}
          onAnnotationDialogOpenChange={setIsAnnotationDialogOpen}
          onAddAnnotationClick={() => {
            setSelectedTimestamp(0);
            setIsAnnotationDialogOpen(true);
          }}
          onAnnotationCreated={fetchAnnotations}
          onReplyAdded={fetchAnnotations}
        />
        <DeliverableReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          reviewType={reviewType}
          revisionNotes={revisionNotes}
          onRevisionNotesChange={setRevisionNotes}
          loading={loading}
          onSubmit={() => selectedDeliverable && handleReview(selectedDeliverable.id, reviewType)}
          notesId="revision-notes"
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {deliverables.map((deliverable) => (
          <DeliverableCard
            key={deliverable.id}
            deliverable={deliverable}
            onSelect={handleSelect}
            onApprove={(d) => openReviewDialog(d, 'approved')}
            onRequestRevision={(d) => openReviewDialog(d, 'revision_requested')}
            onDownload={handleDownload}
          />
        ))}
      </div>

      <DeliverableReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        reviewType={reviewType}
        revisionNotes={revisionNotes}
        onRevisionNotesChange={setRevisionNotes}
        loading={loading}
        onSubmit={() => {
          if (reviewingDeliverableId) {
            handleReview(reviewingDeliverableId, reviewType);
          }
        }}
        notesId="revision-notes-list"
      />
    </>
  );
}
