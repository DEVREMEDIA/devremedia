'use client';

import { useState } from 'react';
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
import { StatusBadge } from '@/components/shared/status-badge';
import { ExternalLink, FileVideo, Calendar, Trash2, Pencil, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { deleteDeliverable, updateDeliverable } from '@/lib/actions/deliverables';
import { updateDeliverableSchema } from '@/lib/schemas/deliverable';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import type { Deliverable } from '@/types';

interface DeliverableListProps {
  deliverables: Deliverable[];
  onSelect?: (deliverable: Deliverable) => void;
  onRefresh?: () => void;
}

// status isn't a field this dialog edits — it moves through the approval
// actions instead. The visible form validates only what it shows.
const editDeliverableSchema = updateDeliverableSchema.omit({
  status: true,
  file_type: true,
});
type EditDeliverableValues = z.input<typeof editDeliverableSchema>;

export function DeliverableList({ deliverables, onSelect, onRefresh }: DeliverableListProps) {
  const t = useTranslations('deliverables');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDeliverable, setEditDeliverable] = useState<Deliverable | null>(null);

  const form = useForm<EditDeliverableValues>({
    resolver: zodResolver(editDeliverableSchema),
    defaultValues: { title: '', description: '', file_path: '' },
  });

  const openEditDialog = (d: Deliverable) => {
    setEditDeliverable(d);
    form.reset({
      title: d.title,
      description: d.description ?? '',
      file_path: d.file_path,
    });
  };

  const handleEdit = async (values: EditDeliverableValues) => {
    if (!editDeliverable) return;

    const updates: Record<string, string> = { title: values.title?.trim() ?? '' };
    if (values.description) updates.description = values.description.trim();
    if (values.file_path && values.file_path !== editDeliverable.file_path) {
      updates.file_path = values.file_path;
    }

    const result = await updateDeliverable(editDeliverable.id, updates);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('deliverableUpdated'));
      onRefresh?.();
      setEditDeliverable(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const result = await deleteDeliverable(deleteId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('deliverableDeleted'));
      onRefresh?.();
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  const isExternalLink = (path: string) =>
    path.startsWith('http://') || path.startsWith('https://');

  const getEmbedUrl = (url: string): string | null => {
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;

    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

    return null;
  };

  if (deliverables.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <FileVideo className="h-12 w-12 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('noDeliverablesYet')}</p>
            <p className="text-sm text-muted-foreground">{t('uploadFirstVideo')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {deliverables.map((deliverable) => (
          <div key={deliverable.id} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-sm">{deliverable.title}</h4>
                  <StatusBadge status={deliverable.status} />
                </div>
                {deliverable.description && (
                  <p className="text-sm text-muted-foreground mt-1">{deliverable.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onSelect && (
                  <Button variant="outline" size="sm" onClick={() => onSelect(deliverable)}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    {t('review')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => openEditDialog(deliverable)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteId(deliverable.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(deliverable.created_at), 'dd/MM/yyyy')}
                </span>
                <span>v{deliverable.version}</span>
              </div>

              {isExternalLink(deliverable.file_path) && !getEmbedUrl(deliverable.file_path) && (
                <Button variant="outline" size="sm" asChild>
                  <a href={deliverable.file_path} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    {t('watchVideo')}
                  </a>
                </Button>
              )}
            </div>

            {/* Embedded player — Google Drive / YouTube / Vimeo */}
            {isExternalLink(deliverable.file_path) && getEmbedUrl(deliverable.file_path) && (
              <div className="max-w-md">
                <div className="aspect-video rounded-md overflow-hidden bg-muted">
                  <iframe
                    src={getEmbedUrl(deliverable.file_path)!}
                    className="w-full h-full border-0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('deleteDeliverable')}
        description={t('deleteDeliverableConfirm')}
        confirmLabel={t('delete')}
        onConfirm={handleDelete}
        loading={isDeleting}
        destructive
      />

      <FormDialog
        open={!!editDeliverable}
        onOpenChange={(open) => !open && setEditDeliverable(null)}
        title={t('editDeliverable')}
        onSubmit={form.handleSubmit(handleEdit)}
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
                <FormLabel>{t('title')}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} />
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
                <FormLabel>{t('description')}</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} value={field.value ?? ''} />
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
                <FormLabel>{t('videoUrl')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder="https://drive.google.com/..."
                  />
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
