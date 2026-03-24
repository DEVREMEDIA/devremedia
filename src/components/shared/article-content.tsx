'use client';

import { useState } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { parseSections, type ArticleSection } from '@/lib/article-sections';
import { ChevronDown, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Try to get an embeddable URL from any video link */
function getEmbedUrl(url: string): { type: 'iframe' | 'video' | 'link'; src: string } {
  const trimmed = url.trim();

  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch) {
    return { type: 'iframe', src: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return { type: 'iframe', src: `https://drive.google.com/file/d/${driveMatch[1]}/preview` };
  }

  const loomMatch = trimmed.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return { type: 'iframe', src: `https://www.loom.com/embed/${loomMatch[1]}` };
  }

  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(trimmed)) {
    return { type: 'video', src: trimmed };
  }

  return { type: 'link', src: trimmed };
}

interface ArticleContentProps {
  content: string;
  videoUrls?: string[];
}

export function ArticleContent({ content, videoUrls }: ArticleContentProps) {
  const sections = parseSections(content);

  if (!sections) {
    // Legacy HTML content
    return (
      <>
        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
        />
        <VideoGrid urls={videoUrls} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sections.map((section, index) => (
          <SectionCard key={section.id} section={section} index={index} />
        ))}
      </div>
      <VideoGrid urls={videoUrls} />
    </>
  );
}

function SectionCard({ section, index }: { section: ArticleSection; index: number }) {
  const [isOpen, setIsOpen] = useState(index === 0);

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/40"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold shadow-sm">
          {index + 1}
        </span>
        <span className="flex-1 font-semibold text-[15px]">{section.title || 'Untitled'}</span>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div className="border-t px-5 py-4">
          <div className="ml-12">
            {section.content ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.content) }}
              />
            ) : (
              <p className="text-sm text-muted-foreground italic">No content</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VideoGrid({ urls }: { urls?: string[] }) {
  if (!urls || urls.length === 0) return null;

  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Play className="h-5 w-5" />
        Videos
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {urls.map((url, index) => {
          const embed = getEmbedUrl(url);

          if (embed.type === 'iframe') {
            return (
              <div key={index} className="aspect-video rounded-xl overflow-hidden border shadow-sm">
                <iframe
                  src={embed.src}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>
            );
          }

          if (embed.type === 'video') {
            return (
              <div key={index} className="aspect-video rounded-xl overflow-hidden border shadow-sm">
                <video src={embed.src} controls className="w-full h-full object-contain bg-black" />
              </div>
            );
          }

          return (
            <a
              key={index}
              href={embed.src}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border p-4 hover:bg-accent/50 transition-colors shadow-sm"
            >
              <Play className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm text-primary underline truncate">{embed.src}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
