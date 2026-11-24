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

/**
 * Projects follow the same rule (mirror of isProjectIndexable in the public
 * site): a case study is indexed once its write-up (tagline, overview,
 * description, long description, impact, contribution, architecture notes and
 * technical decisions) reaches PROJECT_MIN_WORDS. /projects itself
 * is only indexed while at least one project qualifies.
 */
export const PROJECT_MIN_WORDS = 100;

type ProjectWriteUp = {
  tagline?: string;
  overview?: string;
  description?: string;
  long_description?: string;
  impact?: string;
  contribution?: string[];
  technical_decisions?: string[];
  architecture?: { description?: string };
};

export function projectWordCount(project: ProjectWriteUp): number {
  const text = (['tagline', 'overview', 'description', 'long_description', 'impact'] as const).reduce(
    (n, key) => n + words(project[key]),
    0,
  );
  const lists = [...(project.contribution ?? []), ...(project.technical_decisions ?? [])];
  return text + words(project.architecture?.description) + lists.reduce((n, item) => n + words(item), 0);
}

export function isProjectIndexable(project: ProjectWriteUp & { seo_visibility?: SeoVisibility }): boolean {
  if (project.seo_visibility === 'index') return true;
  if (project.seo_visibility === 'noindex') return false;
  return projectWordCount(project) >= PROJECT_MIN_WORDS;
}
