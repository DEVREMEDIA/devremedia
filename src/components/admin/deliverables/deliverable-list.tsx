'use client';

import { Badge } from '@/components/ui/badge';
import { DELIVERABLE_STATUS_LABELS } from '@/lib/constants';
import type { DeliverableStatus } from '@/lib/constants';
import { FileVideo, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

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

type DeliverableListProps = {
  deliverables: Deliverable[];
  onSelect: (deliverable: Deliverable) => void;
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

export function DeliverableList({ deliverables, onSelect }: DeliverableListProps) {
  const t = useTranslations('deliverables');
  const tc = useTranslations('common');

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return tc('unknownSize');
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Deliverables</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {deliverables.map((deliverable) => (
          <button
            key={deliverable.id}
            onClick={() => onSelect(deliverable)}
            className="text-left rounded-lg border bg-card p-4 hover:bg-accent transition-colors space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <FileVideo className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{deliverable.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Version {deliverable.version}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={getStatusColor(deliverable.status)}>
                {DELIVERABLE_STATUS_LABELS[deliverable.status]}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(deliverable.created_at), 'MMM d, yyyy')}
              </div>
              <span>{formatFileSize(deliverable.file_size)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
