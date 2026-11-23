/**
 * Developer / resource blocks: step-by-step instructions, comparison,
 * resource list and downloadable attachment. Each renders semantic HTML with
 * data-* markers the site styles (index.css "Editorial blocks") so the
 * content stays readable without JavaScript and in RSS.
 */

import { useState } from 'react';
import { Node } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { Columns3, FileDown, Library, ListOrdered, Loader2, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { BlockFrame, BlockInput, Segmented, type NodeViewProps } from '../BlockFrame';
import { withBlockView } from '../block-view-context';
import { ATTACHMENT_ACCEPT, formatBytes, uploadAttachment } from '@/services/attachments';

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
const isWebUrl = (url: string) => /^https?:\/\/[^\s]+$/i.test(url.trim());

// ── Step-by-step ─────────────────────────────────────────────────────────

const StepView = ({ node, updateAttributes, deleteNode, getPos, editor }: ReactNodeViewProps) => {
  const pos = typeof getPos === 'function' ? getPos() : undefined;
  const index = typeof pos === 'number' ? editor.state.doc.resolve(pos).index() : 0;
  return (
    <NodeViewWrapper as="li" className="relative list-none rounded-lg border border-border-subtle bg-background p-3 pl-12">
      <span contentEditable={false} className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 font-mono text-[12px] text-accent" aria-hidden="true">
        {index + 1}
      </span>
      <div contentEditable={false} className="mb-2 flex items-start gap-2">
        <BlockInput label={`Step ${index + 1} title`} value={node.attrs.title} onChange={(title) => updateAttributes({ title })} className="flex-1" placeholder="e.g. Install the CLI" />
        <button type="button" onClick={deleteNode} aria-label={`Remove step ${index + 1}`} className="mt-5 rounded-md p-1 text-muted-foreground hover:text-danger-fg">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <NodeViewContent className="min-h-[2rem]" />
    </NodeViewWrapper>
  );
};

export const Step = Node.create({
  name: 'step',
  content: 'block+',
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      title: {
        default: '',
        parseHTML: (el: HTMLElement) => el.querySelector(':scope > [data-step-title]')?.textContent ?? '',
        renderHTML: () => ({}),
      },
    };
  },
  // Before StarterKit's generic <li> rule, which would otherwise claim it.
  parseHTML: () => [{ tag: 'li[data-step]', contentElement: '[data-step-body]', priority: 100 }],
  renderHTML: ({ node }) => [
    'li',
    { 'data-step': '' },
    ...(node.attrs.title ? [['p', { 'data-step-title': '' }, node.attrs.title] as DOMOutputSpec] : []),
    ['div', { 'data-step-body': '' }, 0],
  ],
  addNodeView() {
    return ReactNodeViewRenderer(StepView);
  },
});

const StepsView = (props: NodeViewProps) => {
  const { node, deleteNode, selected, editor, getPos } = props;
  const addStep = () => {
    const pos = typeof getPos === 'function' ? getPos() : undefined;
    if (typeof pos !== 'number') return;
    editor
      .chain()
      .insertContentAt(pos + node.nodeSize - 1, { type: 'step', content: [{ type: 'paragraph' }] })
      .focus()
      .run();
  };
  return (
    <BlockFrame
      label={`Steps · ${node.childCount}`}
      icon={ListOrdered}
      selected={selected}
      onDelete={deleteNode}
      actions={
        <button type="button" onClick={addStep} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] text-fg-2 hover:bg-secondary hover:text-foreground">
          <Plus className="h-3.5 w-3.5" /> Add step
        </button>
      }
    >
      <p contentEditable={false} className="px-3 pt-2 text-[12px] text-muted-foreground">
        Each step can hold text, an image, code or a prompt (use Insert inside the step).
      </p>
      <NodeViewContent<'ol'> as="ol" className="m-0 space-y-2 p-3" />
    </BlockFrame>
  );
};

export const Steps = Node.create({
  name: 'steps',
  group: 'block',
  content: 'step+',
  defining: true,
  draggable: true,
  parseHTML: () => [{ tag: 'ol[data-steps]', priority: 100 }],
  renderHTML: () => ['ol', { 'data-steps': '' }, 0],
  addNodeView() {
    return ReactNodeViewRenderer(withBlockView(StepsView));
  },
});

// ── Comparison ───────────────────────────────────────────────────────────

interface ComparisonColumn {
  title: string;
  tone: 'neutral' | 'pro' | 'con';
  items: string[];
}

const ComparisonView = ({ node, updateAttributes, deleteNode, selected }: NodeViewProps) => {
  const columns = node.attrs.columns as ComparisonColumn[];
  const set = (next: ComparisonColumn[]) => updateAttributes({ columns: next });
  const patch = (i: number, p: Partial<ComparisonColumn>) => set(columns.map((c, k) => (k === i ? { ...c, ...p } : c)));
  return (
    <BlockFrame
      label="Comparison"
      icon={Columns3}
      selected={selected}
      onDelete={deleteNode}
      actions={
        columns.length < 4 ? (
          <button type="button" onClick={() => set([...columns, { title: '', tone: 'neutral', items: [] }])} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] text-fg-2 hover:bg-secondary hover:text-foreground">
            <Plus className="h-3.5 w-3.5" /> Column
          </button>
        ) : null
      }
    >
      <div className="space-y-3 p-3" contentEditable={false}>
        <BlockInput label="Heading (optional)" value={node.attrs.heading} onChange={(heading) => updateAttributes({ heading })} placeholder="e.g. REST vs GraphQL" />
        <div className={`grid gap-3 ${columns.length > 2 ? 'lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {columns.map((c, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border-subtle bg-background p-2.5">
              <div className="flex items-end gap-2">
                <BlockInput label={`Column ${i + 1}`} value={c.title} onChange={(title) => patch(i, { title })} className="flex-1" placeholder="e.g. Next.js" />
                {columns.length > 2 && (
                  <button type="button" onClick={() => set(columns.filter((_, k) => k !== i))} aria-label={`Remove column ${i + 1}`} className="mb-1 rounded p-1 text-muted-foreground hover:text-danger-fg">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Segmented
                label="Column style"
                value={c.tone}
                onChange={(tone) => patch(i, { tone })}
                options={[
                  { value: 'neutral', label: 'Neutral' },
                  { value: 'pro', label: 'Pros' },
                  { value: 'con', label: 'Cons' },
                ]}
              />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Points (one per line)</span>
                <textarea
                  rows={5}
                  value={c.items.join('\n')}
                  onChange={(e) => patch(i, { items: e.target.value.split('\n') })}
                  className="rounded-md border border-border bg-background p-2 text-[13px] text-foreground outline-none focus:border-accent"
                />
              </label>
            </div>
          ))}
        </div>
      </div>
    </BlockFrame>
  );
};

export const Comparison = Node.create({
  name: 'comparison',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      heading: {
        default: '',
        parseHTML: (el: HTMLElement) => el.querySelector(':scope > [data-comparison-heading]')?.textContent ?? '',
        renderHTML: () => ({}),
      },
      columns: {
        default: [
          { title: '', tone: 'neutral', items: [] },
          { title: '', tone: 'neutral', items: [] },
        ] as ComparisonColumn[],
        parseHTML: (el: HTMLElement) =>
          [...el.querySelectorAll('[data-comparison-col]')].map((col) => ({
            title: col.querySelector('[data-comparison-title]')?.textContent ?? '',
            tone: (['pro', 'con'].includes(col.getAttribute('data-tone') ?? '') ? col.getAttribute('data-tone') : 'neutral') as ComparisonColumn['tone'],
            items: [...col.querySelectorAll('li')].map((li) => li.textContent ?? ''),
          })),
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML: () => [{ tag: 'div[data-comparison]' }],
  renderHTML: ({ node }) => {
    const cols = (node.attrs.columns as ComparisonColumn[]).map((c) => ({ ...c, items: c.items.map((i) => i.trim()).filter(Boolean) }));
    return [
      'div',
      { 'data-comparison': '', 'data-count': String(cols.length) },
      ...(node.attrs.heading ? [['p', { 'data-comparison-heading': '' }, node.attrs.heading] as DOMOutputSpec] : []),
      [
        'div',
        { 'data-comparison-grid': '' },
        ...cols.map(
          (c): DOMOutputSpec => [
            'div',
            { 'data-comparison-col': '', 'data-tone': c.tone },
            ['p', { 'data-comparison-title': '' }, c.title],
            ['ul', {}, ...c.items.map((i): DOMOutputSpec => ['li', {}, i])],
          ],
        ),
      ],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(withBlockView(ComparisonView));
  },
});

// ── Resource list ────────────────────────────────────────────────────────

interface Resource {
  title: string;
  url: string;
  description: string;
  category: string;
}

const emptyResource: Resource = { title: '', url: '', description: '', category: '' };

const ResourcesView = ({ node, updateAttributes, deleteNode, selected }: NodeViewProps) => {
  const items = node.attrs.items as Resource[];
  const set = (next: Resource[]) => updateAttributes({ items: next });
  const patch = (i: number, p: Partial<Resource>) => set(items.map((r, k) => (k === i ? { ...r, ...p } : r)));
  return (
    <BlockFrame
      label={`Resources · ${items.length}`}
      icon={Library}
      selected={selected}
      onDelete={deleteNode}
      actions={
        <button type="button" onClick={() => set([...items, { ...emptyResource }])} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] text-fg-2 hover:bg-secondary hover:text-foreground">
          <Plus className="h-3.5 w-3.5" /> Resource
        </button>
      }
    >
      <div className="space-y-3 p-3" contentEditable={false}>
        <BlockInput label="Heading (optional)" value={node.attrs.heading} onChange={(heading) => updateAttributes({ heading })} placeholder="e.g. Further reading" />
        {items.map((r, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-border-subtle bg-background p-2.5 sm:grid-cols-2">
            <BlockInput label="Title" value={r.title} onChange={(title) => patch(i, { title })} />
            <div className="flex items-end gap-2">
              <BlockInput label="URL" type="url" value={r.url} onChange={(url) => patch(i, { url })} className="flex-1" placeholder="https://" />
              <button type="button" onClick={() => set(items.filter((_, k) => k !== i))} aria-label={`Remove resource ${i + 1}`} className="mb-1 rounded p-1 text-muted-foreground hover:text-danger-fg">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <BlockInput label="Description" value={r.description} onChange={(description) => patch(i, { description })} />
            <BlockInput label="Category (optional)" value={r.category} onChange={(category) => patch(i, { category })} placeholder="Docs, Tool, Course…" />
            {r.url && !isWebUrl(r.url) && <p className="text-[12px] text-danger-fg sm:col-span-2">Use a full https:// link; this one won't be shown as a link.</p>}
          </div>
        ))}
        {!items.length && <p className="text-center text-[13px] text-muted-foreground">Add links to docs, tools or courses.</p>}
      </div>
    </BlockFrame>
  );
};

export const Resources = Node.create({
  name: 'resources',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      heading: {
        default: '',
        parseHTML: (el: HTMLElement) => el.querySelector(':scope > [data-resources-heading]')?.textContent ?? '',
        renderHTML: () => ({}),
      },
      items: {
        default: [] as Resource[],
        parseHTML: (el: HTMLElement) =>
          [...el.querySelectorAll('li')].map((li) => ({
            title: li.querySelector('[data-resource-title]')?.textContent ?? '',
            url: li.querySelector('a')?.getAttribute('href') ?? '',
            description: li.querySelector('[data-resource-desc]')?.textContent ?? '',
            category: li.querySelector('[data-category]')?.getAttribute('data-category') ?? '',
          })),
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML: () => [{ tag: 'div[data-resources]' }],
  renderHTML: ({ node }) => {
    const items = (node.attrs.items as Resource[]).filter((r) => r.title.trim());
    const entry = (r: Resource): DOMOutputSpec => {
      const inner: DOMOutputSpec[] = [
        ['span', { 'data-resource-title': '' }, r.title],
        ...(r.description ? [['span', { 'data-resource-desc': '' }, r.description] as DOMOutputSpec] : []),
        ['span', { 'data-resource-meta': '', ...(r.category ? { 'data-category': r.category } : {}) }, [r.category, isWebUrl(r.url) ? hostOf(r.url) : ''].filter(Boolean).join(' · ')],
      ];
      // Only real web links become links; anything else renders as plain text.
      return ['li', {}, isWebUrl(r.url) ? ['a', { href: r.url.trim(), rel: 'noopener noreferrer', target: '_blank' }, ...inner] : ['span', {}, ...inner]];
    };
    return [
      'div',
      { 'data-resources': '' },
      ...(node.attrs.heading ? [['p', { 'data-resources-heading': '' }, node.attrs.heading] as DOMOutputSpec] : []),
      ['ul', {}, ...items.map(entry)],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(withBlockView(ResourcesView));
  },
});

// ── Downloadable attachment ──────────────────────────────────────────────

const AttachmentView = ({ node, updateAttributes, deleteNode, selected }: NodeViewProps) => {
  const [progress, setProgress] = useState<number | null>(null);
  const a = node.attrs as { url: string; name: string; size: number; ext: string; description: string };
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setProgress(0);
    try {
      const up = await uploadAttachment(file, setProgress);
      updateAttributes({ url: up.url, name: up.name, size: up.size, ext: up.ext });
      toast.success('File attached');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setProgress(null);
    }
  };
  return (
    <BlockFrame label="Download" icon={FileDown} selected={selected} onDelete={deleteNode}>
      <div className="space-y-3 p-3" contentEditable={false}>
        {a.url ? (
          <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-background p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 font-mono text-[11px] uppercase text-accent">{a.ext}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] text-foreground">{a.name}</p>
              <p className="text-[12px] text-muted-foreground">{formatBytes(a.size)}</p>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">PDF, Markdown, TXT, CSV or ZIP · up to 25 MB.</p>
        )}
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-[12px] text-fg-2 hover:text-foreground">
          {progress !== null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {progress !== null ? `Uploading ${progress}%` : a.url ? 'Replace file' : 'Upload file'}
          <input type="file" accept={ATTACHMENT_ACCEPT} className="sr-only" disabled={progress !== null} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; pick(f); }} />
        </label>
        <BlockInput label="Description (optional)" value={a.description} onChange={(description) => updateAttributes({ description })} placeholder="e.g. All 20 prompts as a printable PDF" />
      </div>
    </BlockFrame>
  );
};

export const Attachment = Node.create({
  name: 'attachment',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    const none = { renderHTML: () => ({}) };
    return {
      url: { default: '', parseHTML: (el: HTMLElement) => el.querySelector('a')?.getAttribute('href') ?? '', ...none },
      name: { default: '', parseHTML: (el: HTMLElement) => el.querySelector('[data-attachment-name]')?.textContent ?? '', ...none },
      size: { default: 0, parseHTML: (el: HTMLElement) => Number(el.getAttribute('data-size')) || 0, ...none },
      ext: { default: '', parseHTML: (el: HTMLElement) => el.getAttribute('data-ext') ?? '', ...none },
      description: { default: '', parseHTML: (el: HTMLElement) => el.querySelector('[data-attachment-desc]')?.textContent ?? '', ...none },
    };
  },
  parseHTML: () => [{ tag: 'div[data-attachment]' }],
  renderHTML: ({ node }) => {
    const a = node.attrs as { url: string; name: string; size: number; ext: string; description: string };
    if (!a.url) return ['div', { 'data-attachment': '', 'data-empty': '' }];
    return [
      'div',
      { 'data-attachment': '', 'data-ext': a.ext, 'data-size': String(a.size) },
      [
        'a',
        { href: a.url, download: a.name, rel: 'noopener', 'data-attachment-link': '' },
        ['span', { 'data-attachment-name': '' }, a.name],
        ['span', { 'data-attachment-meta': '' }, `${a.ext.toUpperCase()} · ${formatBytes(a.size)}`],
      ],
      ...(a.description ? [['p', { 'data-attachment-desc': '' }, a.description] as DOMOutputSpec] : []),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(withBlockView(AttachmentView));
  },
});
