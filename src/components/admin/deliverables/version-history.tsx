'use client';

import { Badge } from '@/components/ui/badge';
import { DELIVERABLE_STATUS_LABELS } from '@/lib/constants';
import type { DeliverableStatus } from '@/lib/constants';
import { Calendar, FileVideo } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

type VersionHistoryProps = {
  deliverables: Deliverable[];
  currentId?: string;
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

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return 'Unknown';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export function VersionHistory({ deliverables, currentId }: VersionHistoryProps) {
  const sortedDeliverables = [...deliverables].sort((a, b) => b.version - a.version);

  if (deliverables.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <FileVideo className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No version history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Version History</h3>
      <div className="space-y-2">
        {sortedDeliverables.map((deliverable, index) => (
          <div
            key={deliverable.id}
            className={cn(
              'rounded-lg border p-4 space-y-3',
              currentId === deliverable.id ? 'bg-primary/5 border-primary' : 'bg-card',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Version {deliverable.version}</span>
                  {currentId === deliverable.id && (
                    <Badge variant="outline" className="text-xs">
                      Current
                    </Badge>
                  )}
                  {index === 0 && currentId !== deliverable.id && (
                    <Badge variant="outline" className="text-xs">
                      Latest
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className={getStatusColor(deliverable.status)}>
                  {DELIVERABLE_STATUS_LABELS[deliverable.status]}
                </Badge>
              </div>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(deliverable.created_at), 'MMM d, yyyy h:mm a')}
              </div>
              <div>Size: {formatFileSize(deliverable.file_size)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
