'use client';

import { Badge } from '@/components/ui/badge';
import { DELIVERABLE_STATUS_LABELS } from '@/lib/constants';
import type { DeliverableStatus } from '@/lib/constants';
import { Calendar, FileVideo } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/format';
import { statusTone, type Tone } from '@/lib/status-tone';

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

// Tailwind can't see a dynamically built class name, so the map stays
// static — but it now has 4 rows (tone) instead of 4 (status).
const TONE_BADGE: Record<Tone, string> = {
  critical: 'bg-tone-critical-bg text-tone-critical border-tone-critical',
  caution: 'bg-tone-caution-bg text-tone-caution border-tone-caution',
  positive: 'bg-tone-positive-bg text-tone-positive border-tone-positive',
  neutral: 'bg-tone-neutral-bg text-tone-neutral border-tone-neutral',
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
                <Badge variant="outline" className={TONE_BADGE[statusTone(deliverable.status)]}>
                  {DELIVERABLE_STATUS_LABELS[deliverable.status]}
                </Badge>
              </div>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(deliverable.created_at), 'MMM d, yyyy h:mm a')}
              </div>
              <div>
                Size: {deliverable.file_size ? formatFileSize(deliverable.file_size) : 'Unknown'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
