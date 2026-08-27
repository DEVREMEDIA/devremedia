'use client';

import { useRef, useEffect, useCallback } from 'react';
import { X, Send, RotateCcw } from 'lucide-react';
import type { UIMessage } from 'ai';
import { ChatMessageBubble } from './chat-message-bubble';
import { ChatWelcomeScreen } from './chat-welcome-screen';
import { ChatTypingIndicator } from './chat-typing-indicator';

type ChatWindowProps = {
  messages: UIMessage[];
  input: string;
  isLoading: boolean;
  language: string;
  error: Error | undefined;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onQuickAction: (message: string) => void;
  onClose: () => void;
  onNewChat: () => void;
};

function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

const MAX_CHARS = 500;

export function ChatWindow({
  messages,
  input,
  isLoading,
  language,
  error,
  onInputChange,
  onSubmit,
  onQuickAction,
  onClose,
  onNewChat,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Auto-resize textarea
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= MAX_CHARS) {
        onInputChange(value);
      }
      // Auto-resize
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    },
    [onInputChange],
  );

  // Shift+Enter for new line, Enter to send
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (input.trim() && !isLoading) {
          const form = e.currentTarget.closest('form');
          if (form) form.requestSubmit();
        }
      }
    },
    [input, isLoading],
  );

  const isGreek = language === 'el';
  const hasMessages = messages.length > 0;
  const charsLeft = MAX_CHARS - input.length;

  return (
    <div
      role="dialog"
      aria-label={isGreek ? 'Συνομιλία με Devre Media' : 'Chat with Devre Media'}
      className="flex flex-col h-full bg-zinc-950 rounded-2xl border border-white/[0.06] shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gold-500/10 via-gold-500/5 to-transparent border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-gold-500 animate-pulse" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Devre Media</span>
        </div>
        <div className="flex items-center gap-1">
          {hasMessages && (
            <button
              onClick={onNewChat}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={isGreek ? 'Νέα συνομιλία' : 'New chat'}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={isGreek ? 'Κλείσιμο συνομιλίας' : 'Close chat'}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        role="log"
        aria-live="polite"
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 scrollbar-thin"
      >
        {!hasMessages ? (
          <ChatWelcomeScreen language={language} onQuickAction={onQuickAction} />
        ) : (
          <>
            {messages.map((msg, idx) => {
              const text = getMessageText(msg);
              if (!text) return null;
              const isLastAssistant =
                msg.role === 'assistant' && !isLoading && idx === messages.length - 1;
              return (
                <ChatMessageBubble
                  key={msg.id}
                  role={msg.role as 'user' | 'assistant'}
                  content={text}
                  isLatest={isLastAssistant}
                  onSuggestionClick={onQuickAction}
                />
              );
            })}
            {isLoading && <ChatTypingIndicator />}
            {error && (
              <div
                role="alert"
                className="text-center text-xs text-red-400 py-2 bg-red-500/5 rounded-lg border border-red-500/10"
              >
                {isGreek
                  ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'
                  : 'Something went wrong. Please try again.'}
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="p-3 border-t border-white/[0.06]">
        <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 focus-within:border-gold-500/30 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={isGreek ? 'Γράψε ένα μήνυμα...' : 'Type a message...'}
            aria-label={isGreek ? 'Μήνυμα' : 'Message'}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none min-h-[20px] max-h-[100px] leading-5"
            rows={1}
            disabled={isLoading}
          />
          <div className="flex items-center gap-1.5 shrink-0">
            {input.length > 0 && (
              <span className={`text-[11px] ${charsLeft < 50 ? 'text-red-400' : 'text-zinc-500'}`}>
                {charsLeft}
              </span>
            )}
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-1.5 rounded-lg bg-gold-500 text-black hover:bg-gold-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label={isGreek ? 'Αποστολή μηνύματος' : 'Send message'}
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1.5 text-center">
          {isGreek
            ? 'Enter αποστολή · Shift+Enter νέα γραμμή'
            : 'Enter to send · Shift+Enter for new line'}
        </p>
      </form>
    </div>
  );
}
