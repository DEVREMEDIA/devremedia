'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DELIVERABLE_STATUS_LABELS } from '@/lib/constants';
import type { DeliverableStatus } from '@/lib/constants';
import { ExternalLink, FileVideo, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { deleteDeliverable } from '@/lib/actions/deliverables';
import { toast } from 'sonner';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

interface Deliverable {
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
}

interface DeliverableListProps {
  deliverables: Deliverable[];
  onSelect: (deliverable: Deliverable) => void;
  onRefresh?: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  pending_review: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  approved: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  revision_requested: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  final: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
};

export function DeliverableList({ deliverables, onRefresh }: DeliverableListProps) {
  const t = useTranslations('deliverables');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
                  <Badge variant="outline" className={STATUS_COLOR[deliverable.status] ?? ''}>
                    {DELIVERABLE_STATUS_LABELS[deliverable.status]}
                  </Badge>
                </div>
                {deliverable.description && (
                  <p className="text-sm text-muted-foreground mt-1">{deliverable.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => setDeleteId(deliverable.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(deliverable.created_at), 'dd/MM/yyyy')}
                </span>
                <span>v{deliverable.version}</span>
              </div>

              {isExternalLink(deliverable.file_path) && (
                <Button variant="outline" size="sm" asChild>
                  <a href={deliverable.file_path} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    {t('watchVideo')}
                  </a>
                </Button>
              )}
            </div>
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
    </>
  );
}
