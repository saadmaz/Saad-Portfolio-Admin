import { describe, expect, it, vi } from 'vitest';
import { generateHTML, generateJSON, type JSONContent } from '@tiptap/core';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));
vi.mock('@/services/storage', () => ({ uploadImageWithPath: vi.fn() }));

import { editorExtensions } from './extensions';
import { convertPrompts, findPromptCandidates, promptTitle, tidyHeading } from './convert-prompts';

const ext = editorExtensions();
const json = (html: string) => generateJSON(html, ext) as JSONContent;
const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html').body;
const convertAll = (doc: JSONContent) =>
  convertPrompts(doc, findPromptCandidates(doc).filter((c) => c.suggested));

describe('headings → titles and stages', () => {
  it.each([
    ['01. Product Requirements Document (PRD)', 'Product Requirements Document (PRD)'],
    ['Prompt 01: Product Requirements Document (PRD)', 'Product Requirements Document (PRD)'],
    ['#3 – Database Design', 'Database Design'],
    ['Feature Development', 'Feature Development'],
  ])('%s', (h, t) => expect(promptTitle(h)).toBe(t));

  it('tidies all-caps headings, keeping acronyms', () => {
    expect(tidyHeading('STAGE 1: PRODUCT PLANNING AND ARCHITECTURE')).toBe('Stage 1: Product Planning and Architecture');
    expect(tidyHeading('STAGE 3: UI/UX AND API DESIGN')).toBe('Stage 3: UI/UX and API Design');
    expect(tidyHeading('Stage 2: Project setup')).toBe('Stage 2: Project setup');
  });
});

describe('code-block prompts (the "20 AI Prompts" layout)', () => {
  const html =
    '<h2>Before you start</h2><pre><code>my-project/\n├── docs/\n└── src/</code></pre>' +
    '<h1>Stage 1: Plan and design</h1><h3>01. Product Requirements Document (PRD)</h3><p>Why it matters.</p>' +
    '<pre><code>Act as a senior Product Manager.\n\nMy project idea: [PROJECT IDEA]</code></pre>' +
    '<h3>02. Design System and UX</h3><pre><code class="language-plaintext">Using PRD.md, create DESIGN.md.</code></pre>' +
    '<h3>Config example</h3><pre><code class="language-json">{"a": 1}</code></pre>';

  it('suggests prompts but not the folder tree, and never real code', () => {
    const c = findPromptCandidates(json(html));
    expect(c.map((x) => [x.title, x.stage, x.suggested])).toEqual([
      ['Before you start', '', false],
      ['Product Requirements Document (PRD)', 'Stage 1: Plan and design', true],
      ['Design System and UX', 'Stage 1: Plan and design', true],
    ]);
  });

  it('converts to prompt blocks with exact text, title and stage', () => {
    const out = parse(generateHTML(convertAll(json(html)), ext));
    const prompts = [...out.querySelectorAll('[data-prompt]')];
    expect(prompts.map((p) => [p.getAttribute('data-label'), p.getAttribute('data-stage')])).toEqual([
      ['Product Requirements Document (PRD)', 'Stage 1: Plan and design'],
      ['Design System and UX', 'Stage 1: Plan and design'],
    ]);
    expect(prompts[0].querySelector('pre')?.textContent).toBe('Act as a senior Product Manager.\n\nMy project idea: [PROJECT IDEA]');
    // The folder tree and JSON stay code blocks; the surrounding text is untouched.
    expect(out.querySelectorAll('pre > code')).toHaveLength(2);
    expect(out.querySelector('h3 + p')?.textContent).toBe('Why it matters.');
  });
});

describe('"Copy-ready prompt" layout', () => {
  it('uses the section heading as title and removes the redundant sub-heading', () => {
    const html =
      '<h2>STAGE 1: PRODUCT PLANNING</h2><h2>Prompt 01: PRD</h2><p>Purpose.</p>' +
      '<h3>Copy-ready prompt</h3><pre><code class="language-plaintext">You are a PM.</code></pre>';
    const out = parse(generateHTML(convertAll(json(html)), ext));
    expect(out.querySelector('[data-prompt]')?.getAttribute('data-label')).toBe('PRD');
    expect(out.querySelector('[data-prompt]')?.getAttribute('data-stage')).toBe('Stage 1: Product Planning');
    expect(out.textContent).not.toContain('Copy-ready prompt');
  });
});

describe('inline-code prompts (pasted from chat apps)', () => {
  const code = (s: string) => `<code>${s}</code>`;
  const html =
    `<p>${code('DAVID BOEHM — PERSONAL BRAND &amp; PORTFOLIO WEBSITE')}</p>` +
    `<p>${code('You are acting as a senior product designer.')}</p><hr>` +
    `<h2>${code('1. Goals')}</h2><ul><li><p>${code('Fast')}</p><ul><li><p>${code('Really fast')}</p></li></ul></li></ul>` +
    `<ol><li><p>${code('Plan')}</p></li><li><p>${code('Build')}</p></li></ol>` +
    `<p>Some normal text after.</p><p>Use ${code('PRD.md')} as the source.</p>`;

  it('turns the run into one prompt, keeping structure as Markdown', () => {
    const c = findPromptCandidates(json(html));
    expect(c).toHaveLength(1);
    expect(c[0].title).toBe('David Boehm — Personal Brand & Portfolio Website');
    expect(c[0].suggested).toBe(true);
    expect(c[0].text).toBe(
      'DAVID BOEHM — PERSONAL BRAND & PORTFOLIO WEBSITE\n\nYou are acting as a senior product designer.\n\n---\n\n## 1. Goals\n\n- Fast\n  - Really fast\n\n1. Plan\n2. Build',
    );
    const out = parse(generateHTML(convertAll(json(html)), ext));
    expect(out.querySelectorAll('[data-prompt]')).toHaveLength(1);
    // Ordinary text, and a sentence with a little inline code, are left alone.
    expect([...out.querySelectorAll('p')].map((p) => p.textContent)).toContain('Use PRD.md as the source.');
    expect(out.textContent).toContain('Some normal text after.');
  });
});

describe('safety', () => {
  it('only converts the chosen candidates', () => {
    const doc = json('<h3>A</h3><pre><code>You are A.</code></pre><h3>B</h3><pre><code>You are B.</code></pre>');
    const [a] = findPromptCandidates(doc);
    const out = parse(generateHTML(convertPrompts(doc, [{ index: a.index, title: 'Custom', stage: 'Stage 9' }]), ext));
    expect(out.querySelector('[data-prompt]')?.getAttribute('data-label')).toBe('Custom');
    expect(out.querySelectorAll('pre > code')).toHaveLength(1);
  });

  it('ignores stale picks and leaves documents without candidates unchanged', () => {
    const doc = json('<p>Hello</p>');
    expect(convertPrompts(doc, [{ index: 5, title: 'x', stage: '' }])).toEqual(doc);
  });
});
