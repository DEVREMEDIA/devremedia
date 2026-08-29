'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

const ChatWidget = dynamic(() => import('./chat-widget').then((m) => m.ChatWidget), { ssr: false });

export function ChatWidgetLazy() {
  const t = useTranslations('chatbot');
  const [activated, setActivated] = useState(false);
  const activate = useCallback(() => setActivated(true), []);

  if (activated) return <ChatWidget />;

  return (
    <button
      onClick={activate}
      className="fixed bottom-6 right-4 sm:right-6 z-50 h-14 w-14 rounded-full bg-gold-500 text-black flex items-center justify-center shadow-lg shadow-gold-500/20 hover:bg-gold-400 hover:shadow-gold-500/30 hover:scale-105 active:scale-95 transition-all duration-200 animate-glow-pulse"
      aria-label={t('openChat')}
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}
