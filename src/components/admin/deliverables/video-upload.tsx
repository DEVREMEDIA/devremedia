'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormDialog } from '@/components/shared/form-dialog';
import { createDeliverable } from '@/lib/actions/deliverables';
import { createDeliverableSchema } from '@/lib/schemas/deliverable';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Link as LinkIcon } from 'lucide-react';

interface VideoUploadProps {
  projectId: string;
  onUploadComplete: () => void;
  clientName?: string;
  projectName?: string;
}

// project_id and file_type aren't fields the user edits here — the first is
// fixed by the parent, the second is always 'external_link' for this dialog.
// file_size doesn't apply to a link either. The visible form validates only
// what it shows.
const videoUploadSchema = createDeliverableSchema.omit({
  project_id: true,
  file_size: true,
  file_type: true,
});
type VideoUploadValues = z.input<typeof videoUploadSchema>;

export function VideoUpload({
  projectId,
  onUploadComplete,
  clientName,
  projectName,
}: VideoUploadProps) {
  const t = useTranslations('deliverables');
  const [open, setOpen] = useState(false);

  const suggestedTitle = clientName && projectName ? `${clientName} — ${projectName}` : '';

  const form = useForm<VideoUploadValues>({
    resolver: zodResolver(videoUploadSchema),
    defaultValues: {
      title: suggestedTitle,
      description: '',
      file_path: '',
    },
  });

  useEffect(() => {
    if (open && !form.getValues('title')) form.setValue('title', suggestedTitle);
  }, [open, suggestedTitle, form]);

  const handleSubmit = async (values: VideoUploadValues) => {
    const result = await createDeliverable({
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      project_id: projectId,
      file_path: values.file_path.trim(),
      file_type: 'external_link',
    });

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(t('deliverableAdded'));
    form.reset({ title: '', description: '', file_path: '' });
    setOpen(false);
    onUploadComplete();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        {t('addDeliverable')}
      </Button>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('addDeliverable')}
        description={t('addDeliverableDescription')}
        onSubmit={form.handleSubmit(handleSubmit)}
        submitLabel={form.formState.isSubmitting ? t('saving') : t('save')}
        cancelLabel={t('cancel')}
        submitting={form.formState.isSubmitting}
      >
        <Form {...form}>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('videoTitle')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('enterVideoTitle')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('descriptionOptional')}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder={t('enterDescription')}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="file_path"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Link (Google Drive, YouTube, κλπ.)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="https://drive.google.com/..." className="pl-9" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      </FormDialog>
    </>
  );
}
