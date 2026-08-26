import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeading } from '@/components/shared/page-heading';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="space-y-6">
      <PageHeading
        title="Conversation Detail"
        subtitle={`Session: ${conversation.session_id.slice(0, 12)}...`}
      >
        <Link href="/admin/chatbot">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </PageHeading>

      <ConversationDetail conversation={conversation as ChatConversationWithMessages} />
    </div>
  );
}
