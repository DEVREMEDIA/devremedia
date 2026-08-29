'use client';

import { FormDialog } from '@/components/shared/form-dialog';
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
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={reviewType === 'approved' ? 'Approve Deliverable' : 'Request Revision'}
      description={
        reviewType === 'approved'
          ? 'Confirm that you approve this deliverable.'
          : 'Provide details about the revisions needed.'
      }
      onSubmit={onSubmit}
      submitLabel={loading ? 'Submitting...' : reviewType === 'approved' ? 'Approve' : 'Submit'}
      cancelLabel="Cancel"
      submitting={loading}
    >
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
    </FormDialog>
  );
}
