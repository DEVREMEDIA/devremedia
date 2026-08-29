'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useLocale, useTranslations } from 'next-intl';
import { ChatWindow } from './chat-window';

function getSessionId(): string {
  const KEY = 'devre-chat-session-id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY, id);
  }
  return id;
}

function resetSessionId(): string {
  const KEY = 'devre-chat-session-id';
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem(KEY, id);
  return id;
}

/** Inner component — only mounted once sessionId is available */
function ChatWidgetInner({ sessionId: initialSessionId }: { sessionId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState(initialSessionId);
  const locale = useLocale();
  const t = useTranslations('chatbot');

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: {
          sessionId,
          language: locale,
          pageUrl: typeof window !== 'undefined' ? window.location.pathname : '/',
        },
      }),
    [sessionId, locale],
  );

  const chatHelpers = useChat({ transport });
  const { messages, sendMessage, setMessages, status, error } = chatHelpers;
  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!inputValue.trim() || isLoading) return;
      sendMessage({ text: inputValue });
      setInputValue('');
    },
    [inputValue, isLoading, sendMessage],
  );

  const handleQuickAction = useCallback(
    (message: string) => {
      sendMessage({ text: message });
    },
    [sendMessage],
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInputValue('');
    const newId = resetSessionId();
    setSessionId(newId);
  }, [setMessages]);

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[380px] h-[min(70vh,560px)]">
          <ChatWindow
            messages={messages}
            input={inputValue}
            isLoading={isLoading}
            language={locale}
            error={error}
            onInputChange={setInputValue}
            onSubmit={handleSubmit}
            onQuickAction={handleQuickAction}
            onClose={() => setIsOpen(false)}
            onNewChat={handleNewChat}
          />
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-4 sm:right-6 z-50 h-14 w-14 rounded-full bg-gold-500 text-black flex items-center justify-center shadow-lg shadow-gold-500/20 hover:bg-gold-400 hover:shadow-gold-500/30 hover:scale-105 active:scale-95 transition-all duration-200 animate-glow-pulse"
        aria-label={isOpen ? t('closeChat') : t('openChat')}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </button>
    </>
  );
}

/** Outer component — waits for sessionId before mounting chat */
export function ChatWidget() {
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  if (!sessionId) return null;

  return <ChatWidgetInner sessionId={sessionId} />;
}
