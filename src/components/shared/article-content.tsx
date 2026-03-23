'use client';

import { sanitizeHtml } from '@/lib/sanitize';
import { parseSections } from '@/lib/article-sections';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

/** Try to get an embeddable URL from any video link */
function getEmbedUrl(url: string): { type: 'iframe' | 'video' | 'link'; src: string } {
  const trimmed = url.trim();

  // YouTube standard
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch) {
    return { type: 'iframe', src: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  // Google Drive
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return { type: 'iframe', src: `https://drive.google.com/file/d/${driveMatch[1]}/preview` };
  }

  // Loom
  const loomMatch = trimmed.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return { type: 'iframe', src: `https://www.loom.com/embed/${loomMatch[1]}` };
  }

  // Direct video file
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(trimmed)) {
    return { type: 'video', src: trimmed };
  }

  // Fallback - try as iframe (works for many embeddable URLs)
  return { type: 'link', src: trimmed };
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
              const embed = getEmbedUrl(url);

              if (embed.type === 'iframe') {
                return (
                  <div key={index} className="aspect-video rounded-lg overflow-hidden border">
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
                  <div key={index} className="aspect-video rounded-lg overflow-hidden border">
                    <video
                      src={embed.src}
                      controls
                      className="w-full h-full object-contain bg-black"
                    />
                  </div>
                );
              }

              // Fallback: show as clickable link
              return (
                <a
                  key={index}
                  href={embed.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <span className="text-2xl">🎬</span>
                  <span className="text-sm text-primary underline truncate">{embed.src}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
