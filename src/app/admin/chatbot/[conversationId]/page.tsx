import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
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
  const [conversation, t] = await Promise.all([
    getChatConversation(conversationId),
    getTranslations('chatbot'),
  ]);

  if (!conversation) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title={t('conversationDetail')}
        subtitle={`${t('table.session')}: ${conversation.session_id.slice(0, 12)}...`}
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
