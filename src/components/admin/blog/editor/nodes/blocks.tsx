/**
 * Structured text and layout blocks. Each renders plain semantic HTML with
 * data-* markers that the public site styles and enhances; nothing here
 * stores arbitrary markup except the Custom HTML block, which the site
 * sanitises with a strict allow-list before display.
 */

import { Node } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import { NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react';
import { BookMarked, Code2, Columns2, ListTree, Megaphone, Quote } from 'lucide-react';
import { BlockFrame, BlockInput, Segmented, type NodeViewProps } from '../BlockFrame';
import { withBlockView } from '../block-view-context';
import { CALLOUT_VARIANTS, sanitizeCustomHtml } from '../block-config';

// ── Callout / info / warning boxes ───────────────────────────────────────

const CalloutView = ({ node, updateAttributes, deleteNode, selected }: NodeViewProps) => (
  <BlockFrame label="Callout" icon={Megaphone} selected={selected} onDelete={deleteNode}>
    <div className={`callout-edit space-y-2 border-l-[3px] p-3 callout-${node.attrs.variant}`}>
      <div className="flex flex-wrap items-end gap-3" contentEditable={false}>
        <Segmented label="Callout style" value={node.attrs.variant} onChange={(variant) => updateAttributes({ variant })} options={[...CALLOUT_VARIANTS]} />
        <BlockInput label="Title (optional)" value={node.attrs.heading} onChange={(heading) => updateAttributes({ heading })} className="min-w-[200px] flex-1" />
      </div>
      <NodeViewContent className="min-h-[2rem]" />
    </div>
  </BlockFrame>
);

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  draggable: true,

  addAttributes() {
    return { variant: { default: 'info' }, heading: { default: '' } };
  },

  parseHTML() {
    return [
      {
        tag: 'aside[data-callout]',
        contentElement: '[data-callout-body]',
        getAttrs: (el) => ({
          variant: (el as HTMLElement).dataset.callout || 'info',
          heading: (el as HTMLElement).querySelector('[data-callout-title]')?.textContent ?? '',
        }),
      },
    ];
  },

  renderHTML({ node }) {
    const { variant, heading } = node.attrs;
    return [
      'aside',
      { 'data-callout': variant, role: 'note' },
      ...(heading ? [['p', { 'data-callout-title': '' }, heading] as DOMOutputSpec] : []),
      ['div', { 'data-callout-body': '' }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(withBlockView(CalloutView));
  },
});

// ── Pull quote ───────────────────────────────────────────────────────────

const PullQuoteView = ({ node, updateAttributes, deleteNode, selected }: NodeViewProps) => (
  <BlockFrame label="Pull quote" icon={Quote} selected={selected} onDelete={deleteNode}>
    <div className="space-y-3 p-4 text-center">
      <NodeViewContent<'p'> as="p" className="text-xl font-light leading-snug text-foreground" />
      <div className="mx-auto max-w-xs">
        <BlockInput label="Attribution" value={node.attrs.attribution} onChange={(attribution) => updateAttributes({ attribution })} placeholder="Who said it" />
      </div>
    </div>
  </BlockFrame>
);

export const PullQuote = Node.create({
  name: 'pullQuote',
  group: 'block',
  content: 'inline*',
  defining: true,
  draggable: true,

  addAttributes() {
    return { attribution: { default: '' } };
  },

  parseHTML() {
    return [
      {
        tag: 'blockquote[data-pull-quote]',
        contentElement: 'p',
        priority: 100, // before the regular blockquote rule
        getAttrs: (el) => ({ attribution: (el as HTMLElement).querySelector('cite')?.textContent ?? '' }),
      },
    ];
  },

  renderHTML({ node }) {
    return ['blockquote', { 'data-pull-quote': '' }, ['p', {}, 0], ['cite', {}, node.attrs.attribution ?? '']];
  },

  addNodeView() {
    return ReactNodeViewRenderer(withBlockView(PullQuoteView));
  },
});

// ── Two columns ──────────────────────────────────────────────────────────

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  defining: true,
  isolating: true,
  parseHTML: () => [{ tag: 'div[data-column]' }],
  renderHTML: () => ['div', { 'data-column': '' }, 0],
});

const ColumnsView = ({ deleteNode, selected }: NodeViewProps) => (
  <BlockFrame label="Two columns" icon={Columns2} selected={selected} onDelete={deleteNode}>
    <NodeViewContent className="columns-edit grid gap-3 p-3 sm:grid-cols-2" />
  </BlockFrame>
);

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column column',
  defining: true,
  draggable: true,
  parseHTML: () => [{ tag: 'div[data-columns]' }],
  renderHTML: () => ['div', { 'data-columns': '' }, 0],
  addNodeView() {
    return ReactNodeViewRenderer(withBlockView(ColumnsView));
  },
});

// ── Divider (horizontal rule with a style) ───────────────────────────────

export const Divider = Node.create({
  name: 'divider',
  group: 'block',
  atom: true,
  addAttributes() {
    return { variant: { default: 'line', parseHTML: (el) => (el as HTMLElement).dataset.variant || 'line', renderHTML: () => ({}) } };
  },
  parseHTML: () => [{ tag: 'hr' }],
  renderHTML: ({ node }) => ['hr', node.attrs.variant === 'dots' ? { 'data-variant': 'dots' } : {}],
});

// ── Placeholders the site fills in ───────────────────────────────────────

function placeholder(name: string, attr: string, label: string, note: string, Icon: typeof ListTree) {
  const View = ({ deleteNode, selected }: NodeViewProps) => (
    <BlockFrame label={label} icon={Icon} selected={selected} onDelete={deleteNode}>
      <p className="px-4 py-3 text-[13px] text-muted-foreground" contentEditable={false}>{note}</p>
    </BlockFrame>
  );
  return Node.create({
    name,
    group: 'block',
    atom: true,
    draggable: true,
    parseHTML: () => [{ tag: `div[${attr}]` }],
    renderHTML: () => ['div', { [attr]: '' }],
    addNodeView() {
      return ReactNodeViewRenderer(withBlockView(View));
    },
  });
}

export const TocBlock = placeholder(
  'tocBlock',
  'data-toc',
  'Table of contents',
  'Generated on the site from this article’s H2 and H3 headings, with links that track the reader’s position.',
  ListTree,
);

export const SourcesBlock = placeholder(
  'sourcesBlock',
  'data-sources',
  'Sources & references',
  'Shows the sources listed in the Sources tab here, instead of at the end of the article.',
  BookMarked,
);

// ── Custom HTML (sanitised) ──────────────────────────────────────────────

const HtmlView = ({ node, updateAttributes, deleteNode, selected }: NodeViewProps) => {
  const safe = sanitizeCustomHtml(node.attrs.html);
  const stripped = safe.replace(/\s+/g, '') !== String(node.attrs.html).replace(/\s+/g, '');
  return (
    <BlockFrame label="Custom HTML" icon={Code2} selected={selected} onDelete={deleteNode}>
      <div className="grid gap-3 p-3 lg:grid-cols-2" contentEditable={false}>
        <textarea
          value={node.attrs.html}
          onChange={(e) => updateAttributes({ html: e.target.value })}
          rows={6}
          spellCheck={false}
          aria-label="HTML"
          placeholder="<table>…</table>"
          className="rounded-md border border-border bg-background p-2 font-mono text-[12px] text-foreground outline-none focus:border-accent"
        />
        <div className="space-y-2">
          <div className="prose-preview rounded-md border border-border-subtle bg-background p-3 text-sm" dangerouslySetInnerHTML={{ __html: safe }} />
          {stripped && <p className="text-[12px] text-warning-fg">Scripts, styles, frames, forms and inline attributes are removed on the site.</p>}
        </div>
      </div>
    </BlockFrame>
  );
};

export const HtmlBlock = Node.create({
  name: 'htmlBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { html: { default: '', parseHTML: (el) => (el as HTMLElement).dataset.html ?? '', renderHTML: () => ({}) } };
  },
  parseHTML: () => [{ tag: 'div[data-html-block]' }],
  renderHTML: ({ node }) => ['div', { 'data-html-block': '', 'data-html': node.attrs.html ?? '' }],
  addNodeView() {
    return ReactNodeViewRenderer(withBlockView(HtmlView));
  },
});

