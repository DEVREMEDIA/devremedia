'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateDeliverableStatus } from '@/lib/actions/deliverables';
import { DELIVERABLE_STATUS_LABELS } from '@/lib/constants';
import type { DeliverableStatus } from '@/lib/constants';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { CheckCircle2, XCircle, Award } from 'lucide-react';

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

type ApprovalActionsProps = {
  deliverable: Deliverable;
  onStatusChange: () => void;
};

const getStatusColor = (status: DeliverableStatus) => {
  switch (status) {
    case 'pending_review':
      return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    case 'approved':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    case 'revision_requested':
      return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
    case 'final':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    default:
      return '';
  }
};

export function ApprovalActions({ deliverable, onStatusChange }: ApprovalActionsProps) {
  const tToast = useTranslations('toast');
  const t = useTranslations('deliverables');
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [revisionComment, setRevisionComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStatusUpdate = async (newStatus: DeliverableStatus) => {
    setIsSubmitting(true);

    try {
      const result = await updateDeliverableStatus(deliverable.id, newStatus);

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(t('statusUpdatedTo', { status: DELIVERABLE_STATUS_LABELS[newStatus] }));
      onStatusChange();
    } catch (error) {
      console.error('Status update error:', error);
      toast.error(error instanceof Error ? error.message : t('statusUpdateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionComment.trim()) {
      toast.error(tToast('validationError'));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateDeliverableStatus(deliverable.id, 'revision_requested');

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(t('revisionRequested'));
      setRevisionComment('');
      setIsRevisionDialogOpen(false);
      onStatusChange();
    } catch (error) {
      console.error('Revision request error:', error);
      toast.error(error instanceof Error ? error.message : t('revisionRequestFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">{t('currentStatus')}</h3>
        <Badge variant="outline" className={getStatusColor(deliverable.status)}>
          {DELIVERABLE_STATUS_LABELS[deliverable.status]}
        </Badge>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">{t('actions')}</h3>

        {deliverable.status === 'pending_review' && (
          <div className="space-y-2">
            <Button
              onClick={() => handleStatusUpdate('approved')}
              disabled={isSubmitting}
              className="w-full"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t('approve')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsRevisionDialogOpen(true)}
              disabled={isSubmitting}
              className="w-full"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t('requestRevision')}
            </Button>
          </div>
        )}

        {deliverable.status === 'revision_requested' && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">{t('waitingForRevision')}</p>
          </div>
        )}

        {deliverable.status === 'approved' && (
          <Button
            onClick={() => handleStatusUpdate('final')}
            disabled={isSubmitting}
            className="w-full"
          >
            <Award className="h-4 w-4 mr-2" />
            {t('markAsFinal')}
          </Button>
        )}

        {deliverable.status === 'final' && (
          <div className="rounded-lg border bg-blue-500/10 border-blue-500/20 p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {t('finalApprovedVersion')}
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('requestRevision')}</DialogTitle>
            <DialogDescription>{t('provideRevisionFeedback')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="revision-comment">{t('revisionComments')}</Label>
            <Textarea
              id="revision-comment"
              value={revisionComment}
              onChange={(e) => setRevisionComment(e.target.value)}
              placeholder={t('describeChangesNeeded')}
              rows={5}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRevisionDialogOpen(false)}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRequestRevision}
              disabled={isSubmitting || !revisionComment.trim()}
            >
              {isSubmitting ? t('requesting') : t('requestRevision')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
