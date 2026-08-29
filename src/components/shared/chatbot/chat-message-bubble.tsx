'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChatMessageBubbleProps = {
  role: 'user' | 'assistant';
  content: string;
  onSuggestionClick?: (suggestion: string) => void;
  isLatest?: boolean;
};

/** Parse suggestions from assistant message */
function parseSuggestions(text: string): { message: string; suggestions: string[] } {
  const marker = '[SUGGESTIONS]';
  const idx = text.indexOf(marker);
  if (idx === -1) return { message: text.trim(), suggestions: [] };

  const message = text.slice(0, idx).trim();
  const suggestionsRaw = text.slice(idx + marker.length).trim();
  const suggestions = suggestionsRaw
    .split('\n')
    .map((s) => s.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter((s) => s.length > 0 && s.length < 60);

  return { message, suggestions: suggestions.slice(0, 3) };
}

/** Simple markdown-like rendering for assistant messages */
function renderContent(text: string, isUser: boolean) {
  if (isUser) return text;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag
          key={`list-${elements.length}`}
          className={cn(
            'text-sm space-y-0.5 my-1',
            listType === 'ul' ? 'list-disc pl-4' : 'list-decimal pl-4',
          )}
        >
          {listItems.map((item, i) => (
            <li key={i}>{formatInline(item)}</li>
          ))}
        </Tag>,
      );
      listItems = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ulMatch = line.match(/^[-•*]\s+(.+)/);
    const olMatch = line.match(/^\d+[.)]\s+(.+)/);

    if (ulMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(ulMatch[1]);
    } else if (olMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(olMatch[1]);
    } else {
      flushList();
      if (line.trim()) {
        elements.push(
          <span key={`line-${i}`}>
            {formatInline(line)}
            {i < lines.length - 1 ? '\n' : ''}
          </span>,
        );
      } else if (i < lines.length - 1) {
        elements.push(<span key={`br-${i}`} className="block h-2" />);
      }
    }
  }
  flushList();

  return elements;
}

/** Format inline markdown: **bold**, *italic*, `code`, [links](url) */
function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      parts.push(
        <em key={match.index} className="italic">
          {match[4]}
        </em>,
      );
    } else if (match[5]) {
      parts.push(
        <code
          key={match.index}
          className="px-1 py-0.5 rounded bg-white/10 text-gold-400 text-xs font-mono"
        >
          {match[6]}
        </code>,
      );
    } else if (match[7]) {
      parts.push(
        <a
          key={match.index}
          href={match[9]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-400 underline underline-offset-2 hover:text-gold-300"
        >
          {match[8]}
        </a>,
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : parts;
}

export function ChatMessageBubble({
  role,
  content,
  onSuggestionClick,
  isLatest,
}: ChatMessageBubbleProps) {
  const tc = useTranslations('common');
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse suggestions from assistant messages
  const { message, suggestions } = isUser
    ? { message: content, suggestions: [] }
    : parseSuggestions(content);

  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <div className="flex group max-w-[85%]">
        <div className="flex flex-col gap-1">
          <div
            className={cn(
              'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
              isUser
                ? 'bg-gold-500 text-black rounded-br-sm'
                : 'bg-white/[0.06] text-zinc-200 border border-white/[0.06] rounded-bl-sm',
            )}
          >
            {renderContent(message, isUser)}
          </div>

          {/* Copy button */}
          {!isUser && (
            <div className="flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-0.5 rounded text-zinc-500 hover:text-zinc-300 focus-visible:opacity-100 transition-colors"
                aria-label={copied ? tc('copied') : tc('copyToClipboard')}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-3 w-3" aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Suggestion chips — only for the latest assistant message */}
      {!isUser && isLatest && suggestions.length > 0 && onSuggestionClick && (
        <div className="flex flex-col gap-1.5 mt-2.5 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSuggestionClick(suggestion)}
              className="w-full text-left px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-300 text-[13px] hover:bg-gold-500/10 hover:border-gold-500/20 hover:text-white transition-all duration-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
