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

/** Check if content is structured sections (JSON) or legacy HTML */
export function isSectionsContent(content: string): boolean {
  if (!content.trim().startsWith('{')) return false;
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed?.sections);
  } catch {
    return false;
  }
}

/** Parse sections from content string. Returns null for legacy HTML. */
export function parseSections(content: string): ArticleSection[] | null {
  if (!isSectionsContent(content)) return null;
  const parsed = JSON.parse(content) as SectionsWrapper;
  return parsed.sections;
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
