import Page from '@/app/admin/chatbot/[conversationId]/page';

/** Ίδια σελίδα, μέσα στο νέο κέλυφος. */
export default function AdminV2ChatbotConversationIdPage(props: Parameters<typeof Page>[0]) {
  return <Page {...props} />;
}
