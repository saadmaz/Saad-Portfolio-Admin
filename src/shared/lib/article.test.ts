import { describe, expect, it } from 'vitest';
import {
  isMeaningfulChange,
  planSlugRedirect,
  publishBlockers,
  readingTimeMinutes,
  redirectProblem,
  slugify,
  snapshotOf,
  statusOf,
  suggestRelated,
  utcToZonedWallTime,
  zonedWallTimeToUtc,
} from './article';

/**
 * Same vectors as the public site's src/lib/article-core.test.ts
 * (READING_VECTORS). If one side changes, both must.
 */
const READING_VECTORS: [string, string, number, number][] = [
  ['empty', '', 225, 1],
  ['tags are not words', `<p class="x" data-y="z">${'word '.repeat(450)}</p>`, 225, 2],
  ['markdown syntax ignored', `## Heading\n\n**bold** _it_ [link](https://x.y) ${'w '.repeat(220)}`, 225, 1],
  ['entities decoded, not counted', `<p>${'a&nbsp;b '.repeat(300)}</p>`, 200, 3],
  ['scripts dropped', `<script>${'x '.repeat(5000)}</script><p>${'w '.repeat(680)}</p>`, 225, 3],
  ['custom wpm', `<p>${'w '.repeat(1000)}</p>`, 250, 4],
];

describe('readingTimeMinutes (shared vectors)', () => {
  it.each(READING_VECTORS)('%s', (_label, html, wpm, minutes) => {
    expect(readingTimeMinutes(html, wpm)).toBe(minutes);
  });
});

describe('slugify', () => {
  it.each([
    ['48th Big Debate!', '48th-big-debate'],
    ['Café & Crème', 'cafe-and-creme'],
    ['  --Already--Slugged-- ', 'already-slugged'],
  ])('%s → %s', (input, out) => expect(slugify(input)).toBe(out));
});

describe('statusOf', () => {
  it('derives a status for legacy posts', () => {
    expect(statusOf({ published: true })).toBe('published');
    expect(statusOf({ published: false })).toBe('draft');
    expect(statusOf({ published: false, scheduledDate: '2999-01-01T00:00' })).toBe('scheduled');
    expect(statusOf({ status: 'archived', published: false })).toBe('archived');
  });
});

describe('publishBlockers', () => {
  const ready = { title: 'A good title', slug: 'a-good-title', excerpt: 'A proper excerpt.', content: `<p>${'word '.repeat(20)}</p>` };
  it('passes a complete post', () => expect(publishBlockers(ready)).toEqual([]));
  it('requires alt text on the cover', () => {
    expect(publishBlockers({ ...ready, cover: { url: 'x' } })).toEqual(['Cover image needs alt text']);
  });
});

describe('isMeaningfulChange', () => {
  const base = { title: 'T', content: '<p>a</p>', excerpt: 'e', tags: ['x'] };
  it('ignores metadata-only edits', () => {
    expect(isMeaningfulChange(base, { ...base, tags: ['y'] })).toBe(false);
  });
  it('detects content, title and cover changes', () => {
    expect(isMeaningfulChange(base, { ...base, content: '<p>b</p>' })).toBe(true);
    expect(isMeaningfulChange(base, { ...base, title: 'T2' })).toBe(true);
    expect(isMeaningfulChange(base, { ...base, cover: { url: 'new.jpg' } })).toBe(true);
  });
});

describe('snapshotOf', () => {
  it('keeps content fields only', () => {
    expect(snapshotOf({ title: 'T', published: true, revision: 2 } as never)).toEqual({ title: 'T' });
  });
});

describe('redirects', () => {
  it('collapses chains and avoids loops when slugs change back', () => {
    const plan = planSlugRedirect([{ id: 'r1', from: '/blog/a', to: '/blog/b' }], '/blog/b', '/blog/a');
    expect(plan.remove).toEqual(['r1']);
    expect(plan.create).toEqual({ from: '/blog/b', to: '/blog/a', statusCode: 301 });
  });

  it('rejects self, duplicate and looping manual redirects', () => {
    const existing = [{ id: '1', from: '/b', to: '/c' }, { id: '2', from: '/c', to: '/a' }];
    expect(redirectProblem(existing, '/x', '/x')).toMatch(/itself/);
    expect(redirectProblem(existing, '/b', '/z')).toMatch(/already/);
    expect(redirectProblem(existing, '/a', '/b')).toMatch(/loop/);
    expect(redirectProblem(existing, '/old', '/new')).toBeNull();
    expect(redirectProblem(existing, '/old', 'https://elsewhere.com/x')).toBeNull();
    // Editing an existing rule doesn't collide with itself.
    expect(redirectProblem(existing, '/b', '/d', '1')).toBeNull();
  });
});

describe('suggestRelated', () => {
  it('ranks live posts by shared category and tags', () => {
    const post = { id: 'p', category: 'AI', tags: ['llm'] };
    const out = suggestRelated(post, [
      { id: 'a', category: 'AI', published: true },
      { id: 'b', category: 'AI', tags: ['llm'], published: true },
      { id: 'c', category: 'AI', tags: ['llm'], published: false },
      { id: 'd', category: 'Food', published: true },
    ]);
    expect(out.map((p) => p.id)).toEqual(['b', 'a']);
  });
});

describe('time zones', () => {
  it('converts wall-clock time in a zone to UTC', () => {
    expect(zonedWallTimeToUtc('2026-06-01T09:00', 'Asia/Colombo')).toBe('2026-06-01T03:30:00.000Z');
    expect(zonedWallTimeToUtc('2026-01-15T09:00', 'Europe/London')).toBe('2026-01-15T09:00:00.000Z');
    // Summer time (BST, UTC+1).
    expect(zonedWallTimeToUtc('2026-07-15T09:00', 'Europe/London')).toBe('2026-07-15T08:00:00.000Z');
    expect(zonedWallTimeToUtc('nonsense', 'UTC')).toBeNull();
  });

  it('round-trips UTC back to wall-clock time', () => {
    expect(utcToZonedWallTime('2026-06-01T03:30:00.000Z', 'Asia/Colombo')).toBe('2026-06-01T09:00');
    expect(utcToZonedWallTime('2026-07-15T08:00:00.000Z', 'America/New_York')).toBe('2026-07-15T04:00');
  });
});
