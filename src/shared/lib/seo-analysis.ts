/**
 * Editorial SEO checks for the post editor: the completeness score, the
 * checklist, and the warnings on the search/social previews. Limits follow
 * what Google and the major networks display today (titles ~60 chars,
 * descriptions ~155-160, social cards 1200×630).
 */

import type { BlogPost, ImageAsset } from '@/types/blog';
import { countWords, stripHtml } from './article';

export const SITE_TITLE_SUFFIX = ' - Saad Mazhar';
export const LIMITS = {
  title: { min: 30, max: 60 },
  description: { min: 70, max: 160 },
  slug: { max: 60 },
  words: { min: 300 },
  social: { width: 1200, height: 630 },
} as const;

export type CheckStatus = 'pass' | 'warn' | 'fail';
export interface SeoCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail?: string;
}

/** Cuts text at a word boundary to fit `max` characters, adding an ellipsis. */
export function truncate(text: string, max: number): { text: string; truncated: boolean } {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return { text: clean, truncated: false };
  const cut = clean.slice(0, max - 1);
  const atWord = cut.slice(0, Math.max(cut.lastIndexOf(' '), Math.floor(max * 0.6)));
  return { text: `${atWord.trimEnd()}…`, truncated: true };
}

/** Headings, images and links found in the editor's HTML. */
export function contentOutline(html: string) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  return {
    headings: [...doc.querySelectorAll('h1, h2, h3, h4')].map((h) => ({ level: Number(h.tagName[1]), text: h.textContent?.trim() ?? '' })),
    imagesWithoutAlt: [...doc.querySelectorAll('img')].filter((img) => !img.getAttribute('alt')?.trim()).length,
    links: [...doc.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') ?? ''),
  };
}

const imageBigEnough = (img: ImageAsset | null | undefined) =>
  !!img?.width && !!img.height && img.width >= LIMITS.social.width && img.height >= LIMITS.social.height;

export function analyzeSeo(post: Partial<BlogPost>, siteHost = 'saadmaz.com'): { score: number; checks: SeoCheck[] } {
  const checks: SeoCheck[] = [];
  const add = (id: string, label: string, status: CheckStatus, detail?: string) => checks.push({ id, label, status, detail });

  const title = (post.seoTitle || post.title || '').trim();
  const shown = title.length + SITE_TITLE_SUFFIX.length;
  if (!title) add('title', 'Search title', 'fail', 'Add a title.');
  else if (shown > LIMITS.title.max) add('title', 'Search title', 'warn', `${shown} characters with the site name; Google shows about ${LIMITS.title.max}. Set a shorter SEO title.`);
  else if (title.length < LIMITS.title.min - SITE_TITLE_SUFFIX.length) add('title', 'Search title', 'warn', 'Quite short; a more descriptive title usually earns more clicks.');
  else add('title', 'Search title', 'pass', `${shown}/${LIMITS.title.max} characters`);

  const description = (post.metaDescription || post.excerpt || '').trim();
  if (!description) add('description', 'Meta description', 'fail', 'Add an excerpt or SEO description.');
  else if (description.length > LIMITS.description.max) add('description', 'Meta description', 'warn', `${description.length} characters; Google truncates after about ${LIMITS.description.max}.`);
  else if (description.length < LIMITS.description.min) add('description', 'Meta description', 'warn', `${description.length} characters; aim for ${LIMITS.description.min}–${LIMITS.description.max}.`);
  else add('description', 'Meta description', 'pass', `${description.length}/${LIMITS.description.max} characters`);
  if (!post.metaDescription?.trim() && post.excerpt) checks[checks.length - 1].detail += ' (using the excerpt)';

  const slug = post.slug ?? '';
  if (!slug) add('slug', 'URL slug', 'fail', 'Add a slug.');
  else if (slug.length > LIMITS.slug.max) add('slug', 'URL slug', 'warn', 'Long URLs get cut off in results; keep it under 60 characters.');
  else add('slug', 'URL slug', 'pass');

  const cover = post.cover?.url ? post.cover : post.image ? { url: post.image } : null;
  if (!cover) add('cover', 'Featured image', 'warn', 'Articles with an image get richer results and social cards.');
  else if (!cover.alt?.trim()) add('cover', 'Featured image', 'fail', 'Add alt text to the featured image.');
  else add('cover', 'Featured image', 'pass');

  if (!post.articleType) add('type', 'Article type', 'warn', 'Pick a type so the blog shows its label and readers can filter by it.');
  else add('type', 'Article type', 'pass');

  const social = post.socialImage?.url ? post.socialImage : cover;
  if (!social) add('social', 'Social image', 'warn', 'Without one, the site’s generated card is used.');
  else if ((social.width || social.height) && !imageBigEnough(social)) add('social', 'Social image', 'warn', `Use at least ${LIMITS.social.width}×${LIMITS.social.height} for large cards.`);
  else add('social', 'Social image', 'pass');

  const words = countWords(stripHtml(post.content));
  if (words < LIMITS.words.min) add('length', 'Article length', 'warn', `${words} words; in-depth articles (${LIMITS.words.min}+) tend to rank better.`);
  else add('length', 'Article length', 'pass', `${words.toLocaleString()} words`);

  const outline = contentOutline(post.content ?? '');
  const levels = outline.headings.map((h) => h.level);
  if (levels.includes(1)) add('headings', 'Heading structure', 'warn', 'The title is already the page’s H1; use H2 for sections.');
  else if (!levels.includes(2) && words >= LIMITS.words.min) add('headings', 'Heading structure', 'warn', 'Break long articles into sections with H2 headings.');
  else if (levels.some((l, i) => i > 0 && l > levels[i - 1] + 1)) add('headings', 'Heading structure', 'warn', 'A heading level is skipped (e.g. H2 → H4).');
  else add('headings', 'Heading structure', 'pass');

  if (outline.imagesWithoutAlt) add('alt', 'Image alt text', 'fail', `${outline.imagesWithoutAlt} image(s) in the article have no alt text.`);
  else add('alt', 'Image alt text', 'pass');

  const internal = outline.links.some((h) => h.startsWith('/') || h.includes(siteHost));
  add('links', 'Internal links', internal ? 'pass' : 'warn', internal ? undefined : 'Link to at least one related page on the site.');

  if (post.canonicalUrl && !/^https:\/\/[^\s]+$/i.test(post.canonicalUrl)) add('canonical', 'Canonical URL', 'fail', 'Must be a full https:// URL.');
  else if (post.canonicalUrl) add('canonical', 'Canonical URL', 'warn', 'Search engines will credit the other URL, not this page.');

  if (post.noIndex) add('indexing', 'Indexing', 'warn', 'Hidden from search engines (no-index).');

  const weights: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0 };
  const score = Math.round((checks.reduce((sum, c) => sum + weights[c.status], 0) / checks.length) * 100);
  return { score, checks };
}
