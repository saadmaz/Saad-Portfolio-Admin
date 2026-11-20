import { describe, expect, it, vi } from 'vitest';
import { generateHTML, generateJSON } from '@tiptap/core';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));
vi.mock('@/services/storage', () => ({ uploadImageWithPath: vi.fn() }));

import { editorExtensions } from './extensions';
import { parseEmbedUrl } from './embeds';
import { chartFromText, chartToText } from './chart-data';

const ext = editorExtensions();
/** HTML → editor document → HTML, as happens when a post is loaded and saved. */
const roundTrip = (html: string) => generateHTML(generateJSON(html, ext), ext);
const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html').body;

describe('editor serialisation', () => {
  it('upgrades legacy <img> posts to figures without losing the image', () => {
    const out = parse(roundTrip('<p>Intro</p><img src="https://cdn/a.jpg" alt="A chart">'));
    const fig = out.querySelector('figure[data-figure]');
    expect(fig?.querySelector('img')?.getAttribute('src')).toBe('https://cdn/a.jpg');
    expect(fig?.querySelector('img')?.getAttribute('alt')).toBe('A chart');
    expect(fig?.getAttribute('data-width')).toBe('100');
  });

  it('keeps legacy content from the old editor (headings, lists, quotes, code, prompts)', () => {
    const legacy =
      '<h2>Title</h2><p><strong>b</strong> <em>i</em> <a href="https://x.com">l</a></p><ul><li><p>one</p></li></ul>' +
      '<blockquote><p>q</p></blockquote><pre><code>x = 1</code></pre><div data-prompt="" data-label="Try"><pre>Do it</pre></div>';
    const out = parse(roundTrip(legacy));
    expect(out.querySelector('h2')?.textContent).toBe('Title');
    expect(out.querySelector('a')?.getAttribute('href')).toBe('https://x.com');
    expect(out.querySelector('ul li')?.textContent).toBe('one');
    expect(out.querySelector('blockquote')?.textContent).toBe('q');
    expect(out.querySelector('pre code')?.textContent).toBe('x = 1');
    expect(out.querySelector('[data-prompt]')?.getAttribute('data-label')).toBe('Try');
  });

  it('round-trips a figure with size, position, caption and credit', () => {
    const html =
      '<figure data-figure="" data-width="50" data-align="right"><img src="https://cdn/a.webp" alt="Alt" width="1280" height="720" srcset="https://cdn/a-640.webp 640w, https://cdn/a.webp 1280w">' +
      '<figcaption><span data-caption="">Cap</span><span data-credit=""><a href="https://src.com">Jane</a></span></figcaption></figure>';
    const fig = parse(roundTrip(html)).querySelector('figure')!;
    expect(fig.dataset).toMatchObject({ width: '50', align: 'right' });
    expect(fig.querySelector('img')?.getAttribute('width')).toBe('1280');
    expect(fig.querySelector('img')?.getAttribute('srcset')).toContain('640w');
    expect(fig.querySelector('[data-caption]')?.textContent).toBe('Cap');
    expect(fig.querySelector('[data-credit] a')?.getAttribute('href')).toBe('https://src.com');
  });

  it('round-trips callouts, pull quotes, columns and media+text', () => {
    const html =
      '<aside data-callout="warning"><p data-callout-title="">Heads up</p><div data-callout-body=""><p>Body</p></div></aside>' +
      '<blockquote data-pull-quote=""><p>Big idea</p><cite>Ada</cite></blockquote>' +
      '<div data-columns=""><div data-column=""><p>L</p></div><div data-column=""><p>R</p></div></div>' +
      '<div data-media-text="" data-side="right"><figure><img src="m.jpg" alt="M"></figure><div data-media-text-body=""><p>Side</p></div></div>';
    const out = parse(roundTrip(html));
    expect(out.querySelector('[data-callout]')?.getAttribute('data-callout')).toBe('warning');
    expect(out.querySelector('[data-callout-title]')?.textContent).toBe('Heads up');
    expect(out.querySelector('[data-callout-body] p')?.textContent).toBe('Body');
    expect(out.querySelector('[data-pull-quote] p')?.textContent).toBe('Big idea');
    expect(out.querySelector('[data-pull-quote] cite')?.textContent).toBe('Ada');
    expect(out.querySelectorAll('[data-column]')).toHaveLength(2);
    expect(out.querySelector('[data-media-text]')?.getAttribute('data-side')).toBe('right');
    expect(out.querySelector('[data-media-text-body] p')?.textContent).toBe('Side');
  });

  it('round-trips galleries and carousels with alt text and captions', () => {
    const html =
      '<div data-gallery="" data-layout="carousel" data-columns="3"><figure><img src="1.jpg" alt="One"><figcaption>C1</figcaption></figure><figure><img src="2.jpg" alt="Two"></figure></div>';
    const g = parse(roundTrip(html)).querySelector('[data-gallery]')!;
    expect(g.getAttribute('data-layout')).toBe('carousel');
    expect([...g.querySelectorAll('img')].map((i) => i.getAttribute('alt'))).toEqual(['One', 'Two']);
    expect(g.querySelector('figcaption')?.textContent).toBe('C1');
  });

  it('only stores trusted embeds, as provider + id with a link fallback', () => {
    const ok = parse(roundTrip('<figure data-embed="" data-provider="youtube" data-embed-id="dQw4w9WgXcQ" data-title="Talk"></figure>'));
    expect(ok.querySelector('[data-embed]')?.getAttribute('data-embed-id')).toBe('dQw4w9WgXcQ');
    expect(ok.querySelector('[data-embed] a')?.getAttribute('href')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const bad = parse(roundTrip('<figure data-embed="" data-provider="evil" data-embed-id="https://evil.com"></figure>'));
    expect(bad.querySelector('[data-embed]')?.getAttribute('data-provider')).toBe('');
    expect(bad.querySelector('iframe, a')).toBeNull();
  });

  it('stores charts as JSON plus an accessible table', () => {
    const data = JSON.stringify({ labels: ['Q1', 'Q2'], series: [{ name: 'Rev', values: [1, 2] }] });
    const html = `<figure data-chart='${data}' data-chart-type="line"><table></table><figcaption><span data-chart-title="">Growth</span></figcaption></figure>`;
    const fig = parse(roundTrip(html)).querySelector('[data-chart]')!;
    expect(JSON.parse(fig.getAttribute('data-chart')!)).toEqual(JSON.parse(data));
    expect(fig.getAttribute('data-chart-type')).toBe('line');
    expect([...fig.querySelectorAll('tbody th')].map((t) => t.textContent)).toEqual(['Q1', 'Q2']);
    expect(fig.querySelector('[data-chart-title]')?.textContent).toBe('Growth');
  });

  it('keeps custom HTML in a data attribute (never as live markup)', () => {
    const out = parse(roundTrip('<div data-html-block="" data-html="<b>hi</b><script>x</script>"></div>'));
    const block = out.querySelector('[data-html-block]')!;
    expect(block.getAttribute('data-html')).toBe('<b>hi</b><script>x</script>');
    expect(block.children).toHaveLength(0);
  });

  it('keeps tables, code languages, dividers, alignment and TOC/sources placeholders', () => {
    const html =
      '<table><tbody><tr><th><p>H</p></th></tr><tr><td><p>C</p></td></tr></tbody></table>' +
      '<pre><code class="language-ts">let a</code></pre><hr data-variant="dots"><hr>' +
      '<p style="text-align: center">mid</p><div data-toc=""></div><div data-sources=""></div><h4>Small</h4>';
    const out = parse(roundTrip(html));
    expect(out.querySelector('th')?.textContent).toBe('H');
    expect(out.querySelector('pre code')?.className).toContain('language-ts');
    expect([...out.querySelectorAll('hr')].map((h) => h.getAttribute('data-variant'))).toEqual(['dots', null]);
    expect(out.querySelector('p[style]')?.getAttribute('style')).toContain('text-align: center');
    expect(out.querySelector('[data-toc]')).not.toBeNull();
    expect(out.querySelector('[data-sources]')).not.toBeNull();
    expect(out.querySelector('h4')?.textContent).toBe('Small');
  });
});

describe('parseEmbedUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'youtube', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'],
    ['https://vimeo.com/76979871', 'vimeo', '76979871'],
    ['https://www.loom.com/share/0123456789abcdef0123456789abcdef', 'loom', '0123456789abcdef0123456789abcdef'],
    ['https://codepen.io/someone/pen/AbCdE12', 'codepen', 'someone/AbCdE12'],
  ])('%s', (url, provider, id) => expect(parseEmbedUrl(url)).toEqual({ provider, id }));

  it.each(['https://evil.com/watch?v=dQw4w9WgXcQ', 'javascript:alert(1)', 'https://youtube.com/watch?v=short', 'not a url'])(
    'rejects %s',
    (url) => expect(parseEmbedUrl(url)).toBeNull(),
  );
});

describe('chart data', () => {
  it('parses comma or tab separated rows with units', () => {
    expect(chartFromText('Q, Rev, Cost\nQ1, $120, 80%\nQ2\t150\t95')).toEqual({
      labels: ['Q1', 'Q2'],
      series: [
        { name: 'Rev', values: [120, 150] },
        { name: 'Cost', values: [80, 95] },
      ],
    });
  });

  it('reports bad cells', () => {
    expect(chartFromText('Q, Rev\nQ1, lots')).toEqual({ error: expect.stringContaining('Row 2') });
    expect(chartFromText('Q, Rev')).toEqual({ error: expect.any(String) });
  });

  it('round-trips through the text format', () => {
    const data = { labels: ['A', 'B'], series: [{ name: 'S', values: [1, 2] }] };
    expect(chartFromText(chartToText(data))).toEqual(data);
  });
});
