'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Circle, Clock, Eye, MessageSquare, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { addAnnotationReply, markAnnotationSeen } from '@/lib/actions/deliverables';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import type { AnnotationSeenEntry, VideoAnnotation } from '@/types';

type AnnotationListProps = {
  annotations: VideoAnnotation[];
  onAnnotationClick: (annotation: VideoAnnotation) => void;
  onResolve: (id: string) => void;
  onReplyAdded?: () => void;
};

const formatTimestamp = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function SeenByIndicator({
  seenBy,
  currentUserId,
}: {
  seenBy: AnnotationSeenEntry[];
  currentUserId: string | null;
}) {
  const t = useTranslations('deliverables');
  const others = seenBy.filter((s) => s.user_id !== currentUserId);
  if (others.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      {others.map((s) => (
        <span
          key={s.user_id}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
          title={formatDate(s.seen_at)}
        >
          <Eye className="h-3 w-3" />
          {t('seenBy', { name: s.name ?? '?' })}
        </span>
      ))}
    </div>
  );
}

function ReplyThread({
  annotation,
  replies,
  currentUserId,
  onReplyAdded,
}: {
  annotation: VideoAnnotation;
  replies: VideoAnnotation[];
  currentUserId: string | null;
  onReplyAdded?: () => void;
}) {
  const t = useTranslations('deliverables');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;
    if (!annotation.deliverable_id) return;

    setIsSubmitting(true);
    try {
      const result = await addAnnotationReply(
        annotation.id,
        replyContent.trim(),
        annotation.deliverable_id,
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        setReplyContent('');
        setShowReplyInput(false);
        onReplyAdded?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      {replies.map((reply) => (
        <div key={reply.id} className="ml-8 pl-3 border-l-2 border-muted space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {reply.author_name ? (
              <span className="text-xs font-medium">{reply.author_name}</span>
            ) : null}
            <span className="text-xs text-muted-foreground">{formatDate(reply.created_at)}</span>
          </div>
          <p className="text-sm">{reply.content}</p>
          <SeenByIndicator seenBy={reply.seen_by ?? []} currentUserId={currentUserId} />
        </div>
      ))}

      {!annotation.resolved && (
        <div className="ml-8">
          {showReplyInput ? (
            <div className="space-y-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={t('replyPlaceholder')}
                rows={2}
                disabled={isSubmitting}
                className="text-sm"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmitReply}
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  <Send className="h-3 w-3 mr-1" />
                  {t('sendReply')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowReplyInput(false);
                    setReplyContent('');
                  }}
                  disabled={isSubmitting}
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowReplyInput(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="h-3 w-3" />
              {t('reply')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AnnotationList({
  annotations,
  onAnnotationClick,
  onResolve,
  onReplyAdded,
}: AnnotationListProps) {
  const t = useTranslations('deliverables');
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  // Fire-and-forget: mark all visible annotations as seen by the current user.
  useEffect(() => {
    if (!currentUserId || annotations.length === 0) return;
    for (const annotation of annotations) {
      markAnnotationSeen(annotation.id).catch(() => {
        // Best-effort; do not surface errors to the user
      });
    }
  }, [currentUserId, annotations]);

  const topLevel = annotations.filter((a) => !a.parent_id);
  const repliesByParent = annotations.reduce<Record<string, VideoAnnotation[]>>((acc, a) => {
    if (!a.parent_id) return acc;
    if (!acc[a.parent_id]) acc[a.parent_id] = [];
    acc[a.parent_id].push(a);
    return acc;
  }, {});

  const sortedTopLevel = [...topLevel].sort((a, b) => {
    if (a.timestamp_seconds === null && b.timestamp_seconds === null) return 0;
    if (a.timestamp_seconds === null) return -1;
    if (b.timestamp_seconds === null) return 1;
    return a.timestamp_seconds - b.timestamp_seconds;
  });

  if (topLevel.length === 0) {
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
      {sortedTopLevel.map((annotation) => (
        <div
          key={annotation.id}
          className={cn(
            'rounded-lg border p-4 space-y-3 transition-colors',
            annotation.resolved
              ? 'bg-muted/30 opacity-75'
              : 'bg-card hover:bg-accent/50 cursor-pointer',
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
                  <CheckCircle2 className="h-5 w-5 text-tone-positive" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                )}
              </button>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {annotation.timestamp_seconds !== null ? (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimestamp(annotation.timestamp_seconds)}
                    </Badge>
                  ) : null}
                  {annotation.author_name ? (
                    <span className="text-xs text-muted-foreground">{annotation.author_name}</span>
                  ) : null}
                  {annotation.resolved && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-tone-positive-bg text-tone-positive border-tone-positive/20"
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
                <SeenByIndicator seenBy={annotation.seen_by ?? []} currentUserId={currentUserId} />
              </div>
            </div>
          </div>

          {/* Threaded replies */}
          <div onClick={(e) => e.stopPropagation()}>
            <ReplyThread
              annotation={annotation}
              replies={repliesByParent[annotation.id] ?? []}
              currentUserId={currentUserId}
              onReplyAdded={onReplyAdded}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
