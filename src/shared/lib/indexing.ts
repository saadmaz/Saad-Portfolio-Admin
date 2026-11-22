/**
 * Which event pages search engines index. Mirrors src/lib/indexing.js in the
 * public site (that copy decides what the site actually serves): change both
 * together.
 *
 * Under "auto" an event is indexed once its write-up (description +
 * highlights) reaches EVENT_MIN_WORDS; shorter pages stay on the site but are
 * kept out of search results and the sitemap.
 */

export type SeoVisibility = 'auto' | 'index' | 'noindex';

export const EVENT_MIN_WORDS = 100;

const words = (s?: string) => String(s ?? '').split(/\s+/).filter(Boolean).length;

export function eventWordCount(event: { description?: string; highlights?: string[] }): number {
  return words(event.description) + (event.highlights ?? []).reduce((n, h) => n + words(h), 0);
}

export function isEventIndexable(event: {
  description?: string;
  highlights?: string[];
  seo_visibility?: SeoVisibility;
}): boolean {
  if (event.seo_visibility === 'index') return true;
  if (event.seo_visibility === 'noindex') return false;
  return eventWordCount(event) >= EVENT_MIN_WORDS;
}
