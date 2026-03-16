'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';

interface DeliverableReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewType: 'approved' | 'revision_requested';
  revisionNotes: string;
  onRevisionNotesChange: (value: string) => void;
  loading: boolean;
  onSubmit: () => void;
  notesId?: string;
}

export function DeliverableReviewDialog({
  open,
  onOpenChange,
  reviewType,
  revisionNotes,
  onRevisionNotesChange,
  loading,
  onSubmit,
  notesId = 'revision-notes',
}: DeliverableReviewDialogProps) {
  const t = useTranslations('deliverables');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {reviewType === 'approved' ? 'Approve Deliverable' : 'Request Revision'}
          </DialogTitle>
          <DialogDescription>
            {reviewType === 'approved'
              ? 'Confirm that you approve this deliverable.'
              : 'Provide details about the revisions needed.'}
          </DialogDescription>
        </DialogHeader>

        {reviewType === 'revision_requested' && (
          <div className="space-y-2">
            <Label htmlFor={notesId}>Revision Notes *</Label>
            <Textarea
              id={notesId}
              value={revisionNotes}
              onChange={(e) => onRevisionNotesChange(e.target.value)}
              placeholder={t('describeChanges')}
              rows={4}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? 'Submitting...' : reviewType === 'approved' ? 'Approve' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
