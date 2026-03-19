'use client';

import { UserAvatar } from '@/components/shared/user-avatar';
import { MessageAttachment } from '@/components/shared/message-attachment';
import { ReadReceiptIndicator } from '@/components/shared/read-receipt-indicator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Attachment } from '@/lib/schemas/message';
import { useTranslations } from 'next-intl';

interface MessageBubbleProps {
  id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  isOwn: boolean;
  sender: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  attachments?: Attachment[];
}

export function MessageBubble({
  content,
  createdAt,
  isRead,
  isOwn,
  sender,
  attachments,
}: MessageBubbleProps) {
  const t = useTranslations('messages');
  return (
    <div className={cn('flex gap-3 items-start', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      <UserAvatar
        src={sender?.avatar_url ?? null}
        name={sender?.display_name || t('unknownUser')}
        size="sm"
        className="flex-shrink-0"
      />

      <div className={cn('flex flex-col gap-1 max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {!isOwn && (
            <span className="font-medium">{sender?.display_name || t('unknownUser')}</span>
          )}
          <span>{format(new Date(createdAt), 'MMM d, h:mm a')}</span>
        </div>

        <div
          className={cn(
            'rounded-lg px-4 py-2 shadow-sm',
            isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          )}
        >
          <p className="whitespace-pre-wrap text-sm break-words">{content}</p>
        </div>

        {attachments && attachments.length > 0 && (
          <div className="flex flex-col gap-2 w-full">
            {attachments.map((attachment, index) => (
              <MessageAttachment key={attachment.file_path} attachment={attachment} />
            ))}
          </div>
        )}

        {isOwn && <ReadReceiptIndicator isRead={isRead} />}
      </div>
    </div>
  );
}
