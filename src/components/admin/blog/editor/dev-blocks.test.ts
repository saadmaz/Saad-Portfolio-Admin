import { describe, expect, it, vi } from 'vitest';
import { generateHTML, generateJSON } from '@tiptap/core';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));
vi.mock('@/services/storage', () => ({ uploadImageWithPath: vi.fn() }));

import { editorExtensions } from './extensions';
import { promptVariables } from '@/shared/lib/prompts';
import { validateAttachment, formatBytes } from '@/services/attachments';

const ext = editorExtensions();
const roundTrip = (html: string) => generateHTML(generateJSON(html, ext), ext);
const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html').body;

describe('prompt block', () => {
  const full =
    '<div data-prompt="" data-label="PRD Creation" data-stage="Stage 1: Planning" data-language="markdown" data-variant="minimal">' +
    '<p data-prompt-description="">Turns an idea into a PRD</p>' +
    '<pre>You are a PM.\n\n  - Idea: [PROJECT IDEA]\n  - Stack: [TECH STACK]\n\n```ts\nconst x = 1;\n```</pre>' +
    '<p data-prompt-usage="">Paste into Claude</p><p data-prompt-note="">Review before use</p></div>';

  it('round-trips every field and keeps whitespace exactly', () => {
    const el = parse(roundTrip(full)).querySelector('[data-prompt]')!;
    expect(el.getAttribute('data-label')).toBe('PRD Creation');
    expect(el.getAttribute('data-stage')).toBe('Stage 1: Planning');
    expect(el.getAttribute('data-language')).toBe('markdown');
    expect(el.getAttribute('data-variant')).toBe('minimal');
    expect(el.querySelector('[data-prompt-description]')?.textContent).toBe('Turns an idea into a PRD');
    expect(el.querySelector('pre')?.textContent).toBe(
      'You are a PM.\n\n  - Idea: [PROJECT IDEA]\n  - Stack: [TECH STACK]\n\n```ts\nconst x = 1;\n```',
    );
    expect(el.querySelector('[data-prompt-usage]')?.textContent).toBe('Paste into Claude');
    expect(el.querySelector('[data-prompt-note]')?.textContent).toBe('Review before use');
  });

  it('loads prompts from older posts unchanged (label + pre only)', () => {
    const el = parse(roundTrip('<div data-prompt="" data-label="Try this"><pre>Line 1\n  Line 2</pre></div>')).querySelector('[data-prompt]')!;
    expect(el.getAttribute('data-label')).toBe('Try this');
    expect(el.querySelector('pre')?.textContent).toBe('Line 1\n  Line 2');
    expect(el.hasAttribute('data-stage')).toBe(false);
    expect(el.querySelector('[data-prompt-description], [data-prompt-usage], [data-prompt-note]')).toBeNull();
  });

  it('omits empty optional fields', () => {
    const el = parse(roundTrip('<div data-prompt=""><pre>x</pre></div>')).querySelector('[data-prompt]')!;
    expect(el.getAttribute('data-label')).toBe('Prompt');
    expect(el.children).toHaveLength(1);
  });
});

describe('promptVariables', () => {
  it.each([
    ['Build [PROJECT IDEA] with [TECH STACK] then [PROJECT IDEA] again', ['PROJECT IDEA', 'TECH STACK']],
    ['Fix [ERROR MESSAGE] in [TASK / FEATURE] using [API NAME]', ['ERROR MESSAGE', 'TASK / FEATURE', 'API NAME']],
    ['- [ ] todo, - [x] done, [link](https://x.y), [lowercase], [A]', []],
  ])('%s', (text, vars) => expect(promptVariables(text)).toEqual(vars));
});

describe('code block options', () => {
  it('keeps language, wrap and line numbers', () => {
    const pre = parse(roundTrip('<pre data-wrap="" data-line-numbers=""><code class="language-ts">let a = 1;\n\tlet b;</code></pre>')).querySelector('pre')!;
    expect(pre.hasAttribute('data-wrap')).toBe(true);
    expect(pre.hasAttribute('data-line-numbers')).toBe(true);
    expect(pre.querySelector('code')?.className).toContain('language-ts');
    expect(pre.textContent).toBe('let a = 1;\n\tlet b;');
  });

  it('plain code blocks have no options', () => {
    const pre = parse(roundTrip('<pre><code>x</code></pre>')).querySelector('pre')!;
    expect(pre.hasAttribute('data-wrap') || pre.hasAttribute('data-line-numbers')).toBe(false);
  });
});

describe('step-by-step', () => {
  it('round-trips titles and rich step bodies (text, code, prompts)', () => {
    const html =
      '<ol data-steps=""><li data-step=""><p data-step-title="">Install</p><div data-step-body=""><p>Run it</p><pre><code>npm i</code></pre></div></li>' +
      '<li data-step=""><p data-step-title="">Prompt</p><div data-step-body=""><div data-prompt="" data-label="Ask"><pre>Do [TASK / FEATURE]</pre></div></div></li></ol>';
    const ol = parse(roundTrip(html)).querySelector('ol[data-steps]')!;
    const steps = ol.querySelectorAll(':scope > li[data-step]');
    expect(steps).toHaveLength(2);
    expect(steps[0].querySelector('[data-step-title]')?.textContent).toBe('Install');
    expect(steps[0].querySelector('[data-step-body] pre code')?.textContent).toBe('npm i');
    expect(steps[1].querySelector('[data-step-body] [data-prompt] pre')?.textContent).toBe('Do [TASK / FEATURE]');
  });

  it('does not swallow ordinary numbered lists', () => {
    const out = parse(roundTrip('<ol><li><p>a</p></li></ol>'));
    expect(out.querySelector('ol[data-steps]')).toBeNull();
    expect(out.querySelector('ol li')?.textContent).toBe('a');
  });
});

describe('comparison', () => {
  it('round-trips columns, tones and points (blank lines dropped)', () => {
    const html =
      '<div data-comparison=""><p data-comparison-heading="">REST vs GraphQL</p><div data-comparison-grid="">' +
      '<div data-comparison-col="" data-tone="pro"><p data-comparison-title="">REST</p><ul><li>Simple</li><li>Cacheable</li></ul></div>' +
      '<div data-comparison-col="" data-tone="con"><p data-comparison-title="">GraphQL</p><ul><li>Complex</li></ul></div></div></div>';
    const el = parse(roundTrip(html)).querySelector('[data-comparison]')!;
    expect(el.querySelector('[data-comparison-heading]')?.textContent).toBe('REST vs GraphQL');
    const cols = el.querySelectorAll('[data-comparison-col]');
    expect([...cols].map((c) => c.getAttribute('data-tone'))).toEqual(['pro', 'con']);
    expect([...cols[0].querySelectorAll('li')].map((l) => l.textContent)).toEqual(['Simple', 'Cacheable']);
  });
});

describe('resources', () => {
  it('links only real web URLs, opening safely in a new tab', () => {
    const html =
      '<div data-resources=""><ul>' +
      '<li><a href="https://react.dev"><span data-resource-title="">React docs</span><span data-resource-desc="">Official</span><span data-resource-meta="" data-category="Docs">Docs</span></a></li>' +
      '<li><a href="javascript:alert(1)"><span data-resource-title="">Evil</span></a></li></ul></div>';
    const items = parse(roundTrip(html)).querySelectorAll('[data-resources] li');
    expect(items).toHaveLength(2);
    const good = items[0].querySelector('a')!;
    expect(good.getAttribute('href')).toBe('https://react.dev');
    expect(good.getAttribute('rel')).toBe('noopener noreferrer');
    expect(good.getAttribute('target')).toBe('_blank');
    expect(items[0].querySelector('[data-resource-meta]')?.textContent).toBe('Docs · react.dev');
    expect(items[1].querySelector('a')).toBeNull();
  });
});

describe('attachments', () => {
  it('round-trips a file download', () => {
    const html =
      '<div data-attachment="" data-ext="pdf" data-size="2048"><a href="https://cdn/x.pdf" download="Prompts.pdf"><span data-attachment-name="">Prompts.pdf</span><span data-attachment-meta="">PDF · 2.0 KB</span></a><p data-attachment-desc="">All prompts</p></div>';
    const el = parse(roundTrip(html)).querySelector('[data-attachment]')!;
    expect(el.querySelector('a')?.getAttribute('href')).toBe('https://cdn/x.pdf');
    expect(el.querySelector('a')?.getAttribute('download')).toBe('Prompts.pdf');
    expect(el.getAttribute('data-size')).toBe('2048');
    expect(el.querySelector('[data-attachment-desc]')?.textContent).toBe('All prompts');
  });

  it.each([
    [{ name: 'guide.pdf', size: 1000 }, null],
    [{ name: 'notes.MD', size: 10 }, null],
    [{ name: 'data.csv', size: 10 }, null],
    [{ name: 'pack.zip', size: 10 }, null],
    [{ name: 'setup.exe', size: 10 }, 'PDF'],
    [{ name: 'page.html', size: 10 }, 'PDF'],
    [{ name: 'invoice.exe.pdf', size: 10 }, 'disguised'],
    [{ name: 'big.pdf', size: 26 * 1024 * 1024 }, '25 MB'],
    [{ name: 'empty.txt', size: 0 }, 'empty'],
  ])('validates %o', (file, expected) => {
    const result = validateAttachment(file);
    if (expected === null) expect(result).toBeNull();
    else expect(result).toContain(expected);
  });

  it('formats sizes', () => {
    expect([formatBytes(500), formatBytes(2048), formatBytes(5 * 1024 * 1024)]).toEqual(['500 B', '2.0 KB', '5.0 MB']);
  });
});
