import { notFound } from 'next/navigation';
import { ConversationDetail } from '@/components/admin/chatbot/conversation-detail';
import { getChatConversation } from '@/lib/queries/chatbot';
import type { ChatConversationWithMessages } from '@/types/index';

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const conversation = await getChatConversation(conversationId);

  if (!conversation) {
    notFound();
  }

  return <ConversationDetail conversation={conversation as ChatConversationWithMessages} />;
}
