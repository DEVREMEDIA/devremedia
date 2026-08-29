'use client';

import { useState } from 'react';
import { FormDialog } from '@/components/shared/form-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { createAnnotation } from '@/lib/actions/deliverables';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

type AddAnnotationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timestamp: number;
  deliverableId: string;
  onCreated: () => void;
};

const formatTimestamp = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function AddAnnotationDialog({
  open,
  onOpenChange,
  timestamp,
  deliverableId,
  onCreated,
}: AddAnnotationDialogProps) {
  const t = useTranslations('deliverables');
  const tCommon = useTranslations('common');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error(t('pleaseEnterAnnotation'));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createAnnotation({
        deliverable_id: deliverableId,
        timestamp_seconds: timestamp,
        content: content.trim(),
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(t('annotationAdded'));
      setContent('');
      onOpenChange(false);
      onCreated();
    } catch (error) {
      console.error('Create annotation error:', error);
      toast.error(error instanceof Error ? error.message : t('failedToCreateAnnotation'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      if (!newOpen) {
        setContent('');
      }
      onOpenChange(newOpen);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t('addAnnotation')}
      onSubmit={handleSubmit}
      submitLabel={isSubmitting ? t('adding') : t('addAnnotation')}
      cancelLabel={tCommon('cancel')}
      submitting={isSubmitting}
    >
      <div className="flex items-center gap-2">
        <Label>{t('timestamp')}:</Label>
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          {formatTimestamp(timestamp)}
        </Badge>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">{t('annotationText')}</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('enterAnnotation')}
          rows={4}
          disabled={isSubmitting}
        />
      </div>
    </FormDialog>
  );
}
