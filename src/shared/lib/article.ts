/**
 * Article logic for the CMS.
 *
 * readingTimeMinutes, slugify, publishBlockers and planSlugRedirect mirror
 * the public site's src/lib/article-core.js exactly (same rules, same test
 * vectors in article.test.ts), so the value the CMS stores is the value the
 * site would compute. Change them in both repos together.
 */

import type { ArticleStatus, ArticleTypeOption, BlogPost } from '@/types/blog';

export const DEFAULT_WPM = 225;

export const ARTICLE_TYPES: ArticleTypeOption[] = [
  { id: 'opinion', label: 'Opinion' },
  { id: 'industry-analysis', label: 'Industry Analysis' },
  { id: 'technology', label: 'Technology' },
  { id: 'tutorials', label: 'Tutorials' },
  { id: 'business-startups', label: 'Business & Startups' },
  { id: 'news-updates', label: 'News & Updates' },
  { id: 'research', label: 'Research' },
];

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
};

// ── Text ──────────────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

export function stripHtml(html: string | undefined | null): string {
  return String(html ?? '')
    .replace(/<(script|style|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (_m, e: string) => {
      if (e[0] === '#') {
        const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : ' ';
      }
      return ENTITIES[e.toLowerCase()] ?? ' ';
    })
    .replace(/\]\([^)]*\)/g, ' ')
    .replace(/[#*_`>~[\]|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(text: string | undefined | null): number {
  const matches = String(text ?? '').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu);
  return matches ? matches.length : 0;
}

export function readingTimeMinutes(html: string | undefined | null, wpm = DEFAULT_WPM): number {
  const speed = Number(wpm) > 0 ? Number(wpm) : DEFAULT_WPM;
  return Math.max(1, Math.round(countWords(stripHtml(html)) / speed));
}

export function slugify(input: string | undefined | null, max = 80): string {
  return String(input ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '');
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ── Status ────────────────────────────────────────────────────────────────

/** Status of any post, including ones written before `status` existed. */
export function statusOf(post: Partial<BlogPost>): ArticleStatus {
  if (post.status) return post.status;
  if (post.published) return 'published';
  const legacy = post.scheduledAt || post.scheduledDate;
  if (legacy && Date.parse(legacy) > Date.now()) return 'scheduled';
  return 'draft';
}

/** Live and visible on the site (scheduled posts aren't, until the scheduler runs). */
export const isLive = (post: Partial<BlogPost>) => post.published === true;

/**
 * Why a post can't go live yet (empty = ready). Same rules the scheduler
 * re-checks server-side before publishing a scheduled post.
 */
export function publishBlockers(post: Partial<BlogPost>): string[] {
  const issues: string[] = [];
  if (String(post.title ?? '').trim().length < 5) issues.push('Title must be at least 5 characters');
  if (!SLUG_RE.test(String(post.slug ?? ''))) issues.push('Slug must be lowercase letters, numbers and hyphens');
  const excerpt = String(post.excerpt ?? '').trim();
  if (excerpt.length < 10 || excerpt.length > 300) issues.push('Excerpt must be 10–300 characters');
  if (stripHtml(post.content).length < 50) issues.push('Content must be at least 50 characters');
  if (post.cover?.url && !String(post.cover.alt ?? '').trim()) issues.push('Cover image needs alt text');
  return issues;
}

/** Fields whose change counts as a meaningful update to a live article ("Last updated"). */
const MEANINGFUL_FIELDS = ['title', 'subtitle', 'excerpt', 'content', 'sources'] as const;

export function isMeaningfulChange(prev: Partial<BlogPost>, next: Partial<BlogPost>): boolean {
  if ((prev.cover?.url ?? prev.image ?? '') !== (next.cover?.url ?? next.image ?? '')) return true;
  return MEANINGFUL_FIELDS.some((f) => JSON.stringify(prev[f] ?? '') !== JSON.stringify(next[f] ?? ''));
}

/** Fields captured in a revision snapshot. Must match api/_lib/scheduler.ts on the site. */
export const SNAPSHOT_FIELDS = [
  'title', 'subtitle', 'slug', 'excerpt', 'content', 'contentJson', 'category', 'articleType', 'tags',
  'authorId', 'author', 'cover', 'socialImage', 'seoTitle', 'metaDescription', 'keywords', 'canonicalUrl',
  'noIndex', 'unlisted', 'sources', 'seriesId', 'relatedPostIds', 'featured', 'featuredOrder',
  'tableOfContents', 'reactionsEnabled', 'socialShareEnabled', 'ctaText', 'ctaUrl', 'readingTimeMinutes',
  'image',
] as const satisfies readonly (keyof BlogPost)[];

export function snapshotOf(post: Partial<BlogPost>): Partial<BlogPost> {
  const snap: Record<string, unknown> = {};
  for (const f of SNAPSHOT_FIELDS) if (post[f] !== undefined) snap[f] = post[f];
  return snap as Partial<BlogPost>;
}

// ── Redirects ─────────────────────────────────────────────────────────────

export function normalizePath(path: string | undefined | null): string {
  let p = String(path ?? '').trim();
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;
  } catch {
    return '';
  }
  p = p.split(/[?#]/)[0];
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p.toLowerCase();
}

export interface RedirectPlan {
  create: { from: string; to: string; statusCode: 301 } | null;
  repoint: { id: string; to: string }[];
  remove: string[];
}

export function planSlugRedirect(
  existing: { id: string; from: string; to: string }[],
  fromPath: string,
  toPath: string,
): RedirectPlan {
  const from = normalizePath(fromPath);
  const to = normalizePath(toPath);
  const plan: RedirectPlan = { create: null, repoint: [], remove: [] };
  if (!from || !to || from === to) return plan;
  for (const r of existing) {
    const rFrom = normalizePath(r.from);
    const rTo = normalizePath(r.to);
    if (rFrom === to) plan.remove.push(r.id);
    else if (rTo === from) plan.repoint.push({ id: r.id, to });
  }
  const already = existing.some((r) => normalizePath(r.from) === from && normalizePath(r.to) === to);
  const conflicting = existing.filter((r) => normalizePath(r.from) === from && normalizePath(r.to) !== to);
  for (const r of conflicting) if (!plan.remove.includes(r.id)) plan.repoint.push({ id: r.id, to });
  if (!already && !conflicting.length) plan.create = { from, to, statusCode: 301 };
  return plan;
}

/**
 * Validates a manual redirect against the existing set: no self-redirects,
 * no duplicates, and no loops (following the chain from `to` never returns
 * to `from`).
 */
export function redirectProblem(
  existing: { id: string; from: string; to: string }[],
  from: string,
  to: string,
  ignoreId?: string,
): string | null {
  const f = normalizePath(from);
  const isExternal = /^https?:\/\//i.test(to.trim());
  const t = isExternal ? to.trim() : normalizePath(to);
  if (!f || f === '/') return 'Enter the old path, e.g. /blog/old-post';
  if (!t) return 'Enter where it should go';
  if (f === t) return 'A page can’t redirect to itself';
  const others = existing.filter((r) => r.id !== ignoreId);
  if (others.some((r) => normalizePath(r.from) === f)) return `There's already a redirect from ${f}`;
  if (!isExternal) {
    const map = new Map(others.map((r) => [normalizePath(r.from), normalizePath(r.to)]));
    let cur: string | undefined = t;
    for (let hops = 0; cur && hops < 20; hops++) {
      if (cur === f) return 'This would create a redirect loop';
      cur = map.get(cur);
    }
  }
  return null;
}

// ── Related ───────────────────────────────────────────────────────────────

const STOP = new Set(
  'the a an and or of to in on for with is are was how why what your you my i we it this that from at by be as'.split(' '),
);
const keywords = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );

/** Same scoring as the site's relatedScore (category, tags, type, series, title words). */
export function relatedScore(a: Partial<BlogPost>, b: Partial<BlogPost>): number {
  let score = 0;
  if (a.category && a.category === b.category) score += 3;
  const tags = new Set((a.tags ?? []).map((t) => t.toLowerCase()));
  for (const t of b.tags ?? []) if (tags.has(t.toLowerCase())) score += 2;
  if (a.articleType && a.articleType === b.articleType) score += 1;
  if (a.seriesId && a.seriesId === b.seriesId) score += 2;
  const words = keywords(`${a.title ?? ''} ${a.excerpt ?? ''}`);
  for (const w of keywords(`${b.title ?? ''} ${b.excerpt ?? ''}`)) if (words.has(w)) score += 0.5;
  return score;
}

/** Automatic suggestions for the related-articles picker, best first. */
export function suggestRelated<T extends Partial<BlogPost> & { id: string }>(post: Partial<BlogPost> & { id?: string }, candidates: T[], limit = 6): T[] {
  return candidates
    .filter((c) => c.id !== post.id && c.published)
    .map((c) => ({ c, s: relatedScore(post, c) }))
    .filter(({ s }) => s > 0)
    .sort((x, y) => y.s - x.s)
    .slice(0, limit)
    .map(({ c }) => c);
}

// ── Time zones ────────────────────────────────────────────────────────────

/** Offset (ms) of `timeZone` from UTC at instant `date`. */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * "2026-06-01T09:00" as wall-clock time in `timeZone` → UTC ISO string.
 * Two passes settle the offset across DST transitions.
 */
export function zonedWallTimeToUtc(local: string, timeZone: string): string | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let guess = wall - zoneOffsetMs(new Date(wall), timeZone);
  guess = wall - zoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess).toISOString();
}

/** UTC ISO → "YYYY-MM-DDTHH:mm" wall-clock time in `timeZone` (for datetime-local inputs). */
export function utcToZonedWallTime(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() + zoneOffsetMs(d, timeZone));
  return local.toISOString().slice(0, 16);
}

export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function formatInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone, dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(iso));
}
