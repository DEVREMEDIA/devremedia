/**
 * Article sections — structured content for KB articles.
 *
 * Content is stored as a JSON string in the `content` column.
 * Legacy articles store raw HTML. This module detects the format
 * and provides helpers for both paths.
 */

export interface ArticleSection {
  id: string;
  title: string;
  content: string; // HTML from TipTap
}

interface SectionsWrapper {
  sections: ArticleSection[];
}

/** Generate a short unique ID for a section */
export function sectionId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Parse sections from content (string or object). Returns null for legacy HTML. */
export function parseSections(content: unknown): ArticleSection[] | null {
  try {
    // If content is already an object (e.g. Supabase auto-parsed)
    if (typeof content === 'object' && content !== null) {
      const obj = content as Record<string, unknown>;
      if (Array.isArray(obj.sections)) {
        return obj.sections as ArticleSection[];
      }
      return null;
    }

    // If content is a string, try to parse as JSON
    if (typeof content !== 'string') return null;
    const trimmed = content.trim();
    if (!trimmed.startsWith('{')) return null;

    const parsed = JSON.parse(trimmed) as SectionsWrapper;
    if (Array.isArray(parsed?.sections)) {
      return parsed.sections;
    }
    return null;
  } catch {
    return null;
  }
}

/** Check if content contains structured sections */
export function isSectionsContent(content: unknown): boolean {
  return parseSections(content) !== null;
}

/** Serialize sections array to content string */
export function serializeSections(sections: ArticleSection[]): string {
  const wrapper: SectionsWrapper = { sections };
  return JSON.stringify(wrapper);
}

/** Create an empty section */
export function createEmptySection(): ArticleSection {
  return {
    id: sectionId(),
    title: '',
    content: '',
  };
}
