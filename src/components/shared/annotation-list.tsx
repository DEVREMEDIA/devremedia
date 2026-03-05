'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type VideoAnnotation = {
  id: string;
  deliverable_id: string;
  created_by: string | null;
  timestamp_seconds: number;
  content: string;
  resolved: boolean;
  created_at: string;
};

type AnnotationListProps = {
  annotations: VideoAnnotation[];
  onAnnotationClick: (annotation: VideoAnnotation) => void;
  onResolve: (id: string) => void;
};

const formatTimestamp = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function AnnotationList({ annotations, onAnnotationClick, onResolve }: AnnotationListProps) {
  const t = useTranslations('deliverables');
  const sortedAnnotations = [...annotations].sort(
    (a, b) => a.timestamp_seconds - b.timestamp_seconds,
  );

  if (annotations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <Circle className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('annotations')}</p>
            <p className="text-xs text-muted-foreground">{t('clickTimelineToAdd')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedAnnotations.map((annotation) => (
        <div
          key={annotation.id}
          className={cn(
            'rounded-lg border p-4 space-y-3 transition-colors',
            annotation.resolved
              ? 'bg-muted/30 opacity-75'
              : 'bg-card hover:bg-accent cursor-pointer',
          )}
          onClick={() => !annotation.resolved && onAnnotationClick(annotation)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve(annotation.id);
                }}
                className="mt-0.5 shrink-0"
              >
                {annotation.resolved ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                )}
              </button>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTimestamp(annotation.timestamp_seconds)}
                  </Badge>
                  {annotation.resolved && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                    >
                      {t('resolved')}
                    </Badge>
                  )}
                </div>
                <p
                  className={cn(
                    'text-sm',
                    annotation.resolved && 'line-through text-muted-foreground',
                  )}
                >
                  {annotation.content}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
