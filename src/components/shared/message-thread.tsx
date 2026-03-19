'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageBubble } from '@/components/shared/message-bubble';
import { MessageInput } from '@/components/shared/message-input';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Card } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { getMessagesByProject, markMessagesAsRead } from '@/lib/actions/messages';
import { useRealtimeMessages } from '@/hooks/use-realtime-messages';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface MessageThreadProps {
  projectId: string;
  currentUserId: string;
  className?: string;
}

interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  content: string;
  attachments: { file_path: string; file_name: string; file_type: string; file_size: number }[];
  read_by: string[];
  created_at: string;
  sender: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function MessageThread({ projectId, currentUserId, className }: MessageThreadProps) {
  const t = useTranslations('messages');
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Use realtime hook
  const { messages, isConnected } = useRealtimeMessages(projectId, initialMessages);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      setError(null);

      const result = await getMessagesByProject(projectId);

      if (result.error) {
        setError(result.error);
      } else {
        setInitialMessages((result.data as unknown as Message[]) ?? []);
      }

      setIsLoading(false);
    };

    fetchMessages();
  }, [projectId]);

  // Mark messages as read when thread opens
  useEffect(() => {
    const markAsRead = async () => {
      await markMessagesAsRead(projectId);
    };

    markAsRead();
  }, [projectId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleMessageSent = () => {
    // Messages will be added via realtime subscription
    // Just scroll to bottom
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  if (isLoading) {
    return (
      <Card className={cn('flex items-center justify-center min-h-[500px]', className)}>
        <LoadingSpinner size="lg" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('flex items-center justify-center min-h-[500px]', className)}>
        <div className="text-center">
          <p className="text-destructive font-medium">{t('failedToLoad')}</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('flex flex-col h-[700px]', className)}>
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">{t('title')}</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {messages.length === 1
              ? t('messageCount', { count: messages.length })
              : t('messagesCount', { count: messages.length })}
          </span>
          {isConnected && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span>{t('live')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              icon={MessageSquare}
              title={t('noMessages')}
              description={t('noMessagesDescription')}
            />
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                id={message.id}
                content={message.content}
                createdAt={message.created_at}
                isRead={(message.read_by ?? []).length > 0}
                isOwn={message.sender_id === currentUserId}
                sender={message.sender}
                attachments={message.attachments}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <MessageInput
        projectId={projectId}
        onMessageSent={handleMessageSent}
        className="flex-shrink-0"
      />
    </Card>
  );
}
