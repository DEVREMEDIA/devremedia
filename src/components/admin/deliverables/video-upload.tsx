'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createDeliverable } from '@/lib/actions/deliverables';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Link as LinkIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface VideoUploadProps {
  projectId: string;
  onUploadComplete: () => void;
}

export function VideoUpload({ projectId, onUploadComplete }: VideoUploadProps) {
  const t = useTranslations('deliverables');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !url.trim()) {
      toast.error(t('fillRequiredFields'));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createDeliverable({
        title: title.trim(),
        description: description.trim() || undefined,
        project_id: projectId,
        file_path: url.trim(),
        file_type: 'external_link',
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(t('deliverableAdded'));
      setTitle('');
      setDescription('');
      setUrl('');
      setOpen(false);
      onUploadComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('failedToAdd'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('addDeliverable')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addDeliverable')}</DialogTitle>
          <DialogDescription>{t('addDeliverableDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="deliverable-title">{t('videoTitle')}</Label>
            <Input
              id="deliverable-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('enterVideoTitle')}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliverable-description">{t('descriptionOptional')}</Label>
            <Textarea
              id="deliverable-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('enterDescription')}
              rows={3}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliverable-url">Link (Google Drive, YouTube, κλπ.)</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="deliverable-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="pl-9"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim() || !url.trim()}>
            {isSubmitting ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
