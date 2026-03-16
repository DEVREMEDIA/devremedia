'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { format } from 'date-fns';
import { Download, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import type { Deliverable } from '@/types';

type DeliverableWithExtras = Deliverable & {
  file_url?: string;
  version_number?: number;
};

interface DeliverableCardProps {
  deliverable: DeliverableWithExtras;
  onSelect: (deliverable: DeliverableWithExtras) => void;
  onApprove: (deliverable: DeliverableWithExtras) => void;
  onRequestRevision: (deliverable: DeliverableWithExtras) => void;
  onDownload: (deliverable: DeliverableWithExtras) => void;
}

export function DeliverableCard({
  deliverable,
  onSelect,
  onApprove,
  onRequestRevision,
  onDownload,
}: DeliverableCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {deliverable.title}
              <span className="text-sm font-normal text-muted-foreground">
                v{deliverable.version_number || deliverable.version}
              </span>
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={deliverable.status} />
              <span className="text-xs text-muted-foreground">
                Uploaded {format(new Date(deliverable.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {deliverable.description && (
          <p className="text-sm text-muted-foreground">{deliverable.description}</p>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={() => onSelect(deliverable)} className="gap-2">
            <Eye className="h-4 w-4" />
            Review
          </Button>

          {deliverable.status === 'pending_review' && (
            <>
              <Button variant="outline" onClick={() => onApprove(deliverable)} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => onRequestRevision(deliverable)}
                className="gap-2"
              >
                <AlertCircle className="h-4 w-4" />
                Request Revision
              </Button>
            </>
          )}

          <Button variant="ghost" onClick={() => onDownload(deliverable)} className="gap-2 ml-auto">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
