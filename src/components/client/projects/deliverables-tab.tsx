'use client';

import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { useTranslations } from 'next-intl';
import { FileVideo } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  updateDeliverableStatus,
  getAnnotations,
  resolveAnnotation,
} from '@/lib/actions/deliverables';
import { createClient } from '@/lib/supabase/client';
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
      fetchVideoUrl();
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

  const fetchVideoUrl = async () => {
    if (!selectedDeliverable?.file_path) {
      setVideoUrl(selectedDeliverable?.file_url ?? null);
      return;
    }
    try {
      const supabase = createClient();
      const { data } = supabase.storage
        .from('deliverables')
        .getPublicUrl(selectedDeliverable.file_path);
      setVideoUrl(data.publicUrl);
    } catch {
      setVideoUrl(selectedDeliverable?.file_url ?? null);
    }
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
    if (deliverable.file_path) {
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
      } catch {
        toast.error(t('failedToDownload'));
      }
    } else if (deliverable.file_url) {
      window.open(deliverable.file_url, '_blank');
    }
  };

  const handleReview = async (deliverableId: string, status: 'approved' | 'revision_requested') => {
    if (status === 'revision_requested' && !revisionNotes.trim()) {
      toast.error(t('provideRevisionNotes'));
      return;
    }

    setLoading(true);
    const result = await updateDeliverableStatus(deliverableId, status);

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
            onSelect={setSelectedDeliverable}
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
