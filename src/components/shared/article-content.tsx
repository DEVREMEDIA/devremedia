'use client';

import { sanitizeHtml } from '@/lib/sanitize';
import { parseSections } from '@/lib/article-sections';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Helper to extract video ID from YouTube URL
function getYouTubeEmbedUrl(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

// Helper to extract video ID from Vimeo URL
function getVimeoEmbedUrl(url: string): string | null {
  const regExp = /vimeo.com\/(\d+)/;
  const match = url.match(regExp);
  if (match) {
    return `https://player.vimeo.com/video/${match[1]}`;
  }
  return null;
}

interface ArticleContentProps {
  content: string;
  videoUrls?: string[];
}

export function ArticleContent({ content, videoUrls }: ArticleContentProps) {
  const sections = parseSections(content);

  return (
    <>
      {sections ? (
        <Accordion type="multiple" defaultValue={[sections[0]?.id]} className="space-y-2">
          {sections.map((section, index) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="border rounded-lg px-0 overflow-hidden"
            >
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3 text-left">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-base">{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-0">
                <div className="ml-10">
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.content) }}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        /* Legacy HTML content fallback */
        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
        />
      )}

      {videoUrls && videoUrls.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Videos</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {videoUrls.map((url, index) => {
              const youtubeUrl = getYouTubeEmbedUrl(url);
              const vimeoUrl = getVimeoEmbedUrl(url);
              const embedUrl = youtubeUrl || vimeoUrl;

              if (!embedUrl) return null;

              return (
                <div key={index} className="aspect-video">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full rounded-lg"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
