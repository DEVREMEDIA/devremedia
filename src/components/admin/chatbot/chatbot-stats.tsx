'use client';

import { MessageSquare, MessagesSquare, CalendarDays, TrendingUp } from 'lucide-react';
import { StatGrid } from '@/components/shared/stat-grid';
import { StatCard } from '@/components/shared/stat-card';
import { useTranslations } from 'next-intl';

type ChatbotStatsProps = {
  totalConversations: number;
  todayConversations: number;
  totalMessages: number;
  avgMsgsPerConv: number;
};

export function ChatbotStats({
  totalConversations,
  todayConversations,
  totalMessages,
  avgMsgsPerConv,
}: ChatbotStatsProps) {
  const t = useTranslations('chatbot');

  const stats = [
    { title: t('totalConversations'), value: totalConversations, icon: MessageSquare },
    { title: t('today'), value: todayConversations, icon: CalendarDays },
    { title: t('totalMessages'), value: totalMessages, icon: MessagesSquare },
    { title: t('avgMsgsPerConv'), value: avgMsgsPerConv, icon: TrendingUp },
  ];

  return (
    <StatGrid columns={4}>
      {stats.map((stat) => (
        <StatCard key={stat.title} label={stat.title} value={stat.value} icon={stat.icon} />
      ))}
    </StatGrid>
  );
}
