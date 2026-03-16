'use client';

import { MessageSquare, MessagesSquare, CalendarDays, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
