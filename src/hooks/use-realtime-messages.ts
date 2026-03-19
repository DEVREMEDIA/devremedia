'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

interface UseRealtimeMessagesResult {
  messages: Message[];
  isConnected: boolean;
}

export function useRealtimeMessages(
  projectId: string,
  initialMessages: Message[],
): UseRealtimeMessagesResult {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Update messages when initialMessages change
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      channel = supabase
        .channel(`messages:${projectId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `project_id=eq.${projectId}`,
          },
          async (payload: { new: { id: string } }) => {
            // Fetch the full message with sender details
            const { data: raw } = await supabase
              .from('messages')
              .select(
                'id, project_id, sender_id, content, attachments, read_by, created_at, sender:user_profiles!messages_sender_id_user_profiles_fkey(id, display_name, avatar_url)',
              )
              .eq('id', payload.new.id)
              .single();

            if (raw) {
              const newMessage: Message = {
                ...raw,
                attachments: (raw.attachments ?? []) as Message['attachments'],
                read_by: (raw.read_by ?? []) as string[],
                sender: Array.isArray(raw.sender) ? raw.sender[0] : raw.sender,
              };
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMessage.id)) {
                  return prev;
                }
                return [...prev, newMessage];
              });
            }
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `project_id=eq.${projectId}`,
          },
          (payload: { new: Message & { id: string } }) => {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === payload.new.id ? { ...msg, ...payload.new } : msg)),
            );
          },
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
          }
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      setIsConnected(false);
    };
  }, [projectId]);

  return { messages, isConnected };
}
