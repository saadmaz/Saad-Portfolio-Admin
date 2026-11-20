import { describe, expect, it } from 'vitest';
import { analyzeSeo, truncate } from './seo-analysis';
import { diffHtml, diffTokens } from './diff';

const longText = (words: number) => `<h2>Intro</h2><p>${'word '.repeat(words)}<a href="/blog/other">link</a></p>`;

describe('analyzeSeo', () => {
  it('scores a complete article highly', () => {
    const { score, checks } = analyzeSeo({
      title: 'How we cut our cloud bill in half without downtime',
      slug: 'cut-cloud-bill',
      excerpt: 'A step-by-step account of the changes that halved our infrastructure costs, and the ones that did not work.',
      content: longText(400),
      cover: { url: 'c.jpg', alt: 'Graph', width: 1600, height: 900 },
    });
    expect(checks.filter((c) => c.status === 'fail')).toEqual([]);
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('flags missing pieces and structural problems', () => {
    const { checks } = analyzeSeo({
      title: '',
      slug: '',
      content: '<h1>Dup</h1><p>short</p><img src="x">',
      cover: { url: 'c.jpg' },
      canonicalUrl: 'not-a-url',
      noIndex: true,
    });
    const byId = Object.fromEntries(checks.map((c) => [c.id, c.status]));
    expect(byId).toMatchObject({
      title: 'fail',
      description: 'fail',
      slug: 'fail',
      cover: 'fail',
      headings: 'warn',
      alt: 'fail',
      canonical: 'fail',
      indexing: 'warn',
    });
  });

  it('warns when the title will be truncated in results', () => {
    const { checks } = analyzeSeo({ title: 'x'.repeat(70) });
    expect(checks.find((c) => c.id === 'title')?.status).toBe('warn');
  });
});

describe('truncate', () => {
  it('cuts at a word boundary with an ellipsis', () => {
    expect(truncate('one two three four', 12)).toEqual({ text: 'one two…', truncated: true });
    expect(truncate('short', 12)).toEqual({ text: 'short', truncated: false });
  });
});

describe('diff', () => {
  it('finds insertions and deletions', () => {
    expect(diffTokens(['a', 'b', 'c'], ['a', 'x', 'c'])).toEqual([
      { type: 'eq', text: 'a' },
      { type: 'del', text: 'b' },
      { type: 'add', text: 'x' },
      { type: 'eq', text: 'c' },
    ]);
  });

  it('reports edited paragraphs with word-level changes', () => {
    const out = diffHtml('<p>Hello big world</p><p>Same</p>', '<p>Hello small world</p><p>Same</p><p>New</p>');
    expect(out.map((b) => b.type)).toEqual(['change', 'eq', 'add']);
    expect(out[0].words).toEqual([
      { type: 'eq', text: 'Hello' },
      { type: 'del', text: 'big' },
      { type: 'add', text: 'small' },
      { type: 'eq', text: 'world' },
    ]);
  });
});
