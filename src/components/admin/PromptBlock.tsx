import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Node } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import { NodeViewContent, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { Check, Copy, Eye, EyeOff, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { PROMPT_LANGUAGES, PROMPT_VARIABLE_RE, promptVariables } from '@/shared/lib/prompts';
import { BlockFrame, BlockInput, Segmented } from './blog/editor/BlockFrame';
import { withBlockView } from './blog/editor/block-view-context';

const DEFAULT_LABEL = 'Prompt';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    prompt: {
      /** Turn the current block into a prompt block, or back into a paragraph. */
      togglePrompt: () => ReturnType;
    };
  }
}

/** Prompt text with [VARIABLES] highlighted, as readers will see it. */
function Highlighted({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(PROMPT_VARIABLE_RE)) {
    parts.push(text.slice(last, m.index));
    parts.push(
      <mark key={m.index} className="rounded bg-accent/15 px-0.5 text-accent">
        {m[0]}
      </mark>,
    );
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

/* ── Editor view ─────────────────────────────────────────────────────────── */
const PromptView = (props: ReactNodeViewProps) => {
  const { node, updateAttributes, deleteNode, selected, editor } = props;
  const a = node.attrs as {
    label: string; description: string; stage: string; language: string;
    usage: string; note: string; variant: string;
  };
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const text = node.textContent;
  const variables = useMemo(() => promptVariables(text), [text]);
  // Stages already used in this article, offered as suggestions.
  const stages = useMemo(() => {
    const set = new Set<string>();
    editor.state.doc.descendants((n) => {
      if (n.type.name === 'prompt' && n.attrs.stage) set.add(n.attrs.stage);
    });
    return [...set];
    // Recomputed when this block changes; good enough for suggestions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, node]);
  const listId = `prompt-stages-${useId()}`;
  const title = a.label === DEFAULT_LABEL ? '' : a.label;

  const copy = async () => {
    if (!text.trim()) { toast.error('Prompt is empty'); return; }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <BlockFrame
      label={title ? `Prompt · ${title}` : 'Prompt'}
      icon={Sparkles}
      selected={selected}
      onDelete={deleteNode}
      view={props}
      actions={
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          aria-pressed={preview}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] text-fg-2 hover:bg-secondary hover:text-foreground"
        >
          {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {preview ? 'Hide preview' : 'Preview'}
        </button>
      }
    >
      <div className="space-y-3 p-3">
        <div className="grid gap-2 sm:grid-cols-2" contentEditable={false}>
          <BlockInput label="Title" value={title} onChange={(v) => updateAttributes({ label: v.trim() ? v : DEFAULT_LABEL })} placeholder="e.g. PRD creation" />
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Stage / category</span>
            <input
              list={listId}
              value={a.stage}
              onChange={(e) => updateAttributes({ stage: e.target.value })}
              placeholder="e.g. Stage 1: Product planning"
              className="h-8 rounded-md border border-border bg-background px-2 text-[13px] text-foreground outline-none focus:border-accent"
            />
            <datalist id={listId}>{stages.map((s) => <option key={s} value={s} />)}</datalist>
          </label>
          <BlockInput label="Short description" value={a.description} onChange={(description) => updateAttributes({ description })} className="sm:col-span-2" placeholder="What this prompt does" />
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Language</span>
            <select
              value={a.language}
              onChange={(e) => updateAttributes({ language: e.target.value })}
              className="h-8 rounded-md border border-border bg-background px-2 text-[13px] text-foreground"
            >
              {PROMPT_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Display style</span>
            <Segmented
              label="Display style"
              value={a.variant}
              onChange={(variant) => updateAttributes({ variant })}
              options={[
                { value: 'card', label: 'Card' },
                { value: 'minimal', label: 'Minimal' },
              ]}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-accent/25 bg-background">
          <div contentEditable={false} className="flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-1.5 text-[11px] text-muted-foreground">
            <span>Prompt text · whitespace and line breaks are kept exactly</span>
            <span className="tabular">{text.length.toLocaleString()} chars</span>
          </div>
          <NodeViewContent<'pre'>
            as="pre"
            className="m-0 min-h-[4rem] whitespace-pre-wrap break-words bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground/90"
          />
        </div>

        <div contentEditable={false} className="flex flex-wrap items-center gap-1.5 text-[12px]">
          <span className="text-muted-foreground">Variables:</span>
          {variables.length ? (
            variables.map((v) => <code key={v} className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">[{v}]</code>)
          ) : (
            <span className="text-muted-foreground">none. Write placeholders like [PROJECT IDEA] and readers can fill them in.</span>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2" contentEditable={false}>
          <BlockInput label="How to use (optional)" value={a.usage} onChange={(usage) => updateAttributes({ usage })} placeholder="Paste into Claude after attaching your PRD" />
          <BlockInput label="Note or warning (optional)" value={a.note} onChange={(note) => updateAttributes({ note })} placeholder="Review generated code before running it" />
        </div>

        {preview && (
          <div contentEditable={false} className={cn('rounded-lg p-3', a.variant === 'minimal' ? 'border-l-2 border-accent/60 pl-4' : 'border border-border-subtle bg-background')}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {a.stage && <p className="text-[11px] uppercase tracking-wider text-accent">{a.stage}</p>}
                <p className="font-medium text-foreground">{title || 'Untitled prompt'}</p>
                {a.description && <p className="text-[13px] text-fg-2">{a.description}</p>}
              </div>
              <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[12px] text-fg-2 hover:text-foreground">
                {copied ? <Check className="h-3.5 w-3.5 text-success-fg" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied to clipboard' : 'Copy prompt'}
              </button>
            </div>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-fg-2">
              <Highlighted text={text} />
            </pre>
            {a.usage && <p className="mt-2 text-[12px] text-fg-2"><span className="text-muted-foreground">How to use:</span> {a.usage}</p>}
            {a.note && <p className="mt-1 text-[12px] text-warning-fg">{a.note}</p>}
          </div>
        )}
      </div>
    </BlockFrame>
  );
};

/** Attribute stored in a data-* attribute on the block (rendered by renderHTML below). */
const dataAttr = (name: string) => ({
  default: '',
  parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`) ?? '',
  renderHTML: () => ({}),
});
/** Attribute stored as the text of a child element. */
const childText = (selector: string) => ({
  default: '',
  parseHTML: (el: HTMLElement) => el.querySelector(selector)?.textContent ?? '',
  renderHTML: () => ({}),
});

/**
 * A copyable prompt block. Stored as
 *   <div data-prompt data-label="Title" data-stage="…" data-language="…" data-variant="minimal">
 *     <p data-prompt-description>…</p>
 *     <pre>…prompt text, whitespace preserved…</pre>
 *     <p data-prompt-usage>…</p>
 *     <p data-prompt-note>…</p>
 *   </div>
 * Older posts only have data-label and the <pre>; they load unchanged.
 * The portfolio renders it as an interactive prompt card (copy, expand,
 * fill-in variables) and includes it in "Copy all" and downloads.
 */
export const PromptBlock = Node.create({
  name: 'prompt',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      label: {
        default: DEFAULT_LABEL,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-label') || DEFAULT_LABEL,
        renderHTML: () => ({}),
      },
      stage: dataAttr('stage'),
      language: dataAttr('language'),
      variant: {
        default: 'card',
        parseHTML: (el: HTMLElement) => (el.getAttribute('data-variant') === 'minimal' ? 'minimal' : 'card'),
        renderHTML: () => ({}),
      },
      description: childText('[data-prompt-description]'),
      usage: childText('[data-prompt-usage]'),
      note: childText('[data-prompt-note]'),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-prompt]', contentElement: 'pre', preserveWhitespace: 'full' }];
  },

  renderHTML({ node }) {
    const a = node.attrs;
    const attrs: Record<string, string> = { 'data-prompt': '', 'data-label': a.label || DEFAULT_LABEL };
    if (a.stage) attrs['data-stage'] = a.stage;
    if (a.language) attrs['data-language'] = a.language;
    if (a.variant === 'minimal') attrs['data-variant'] = 'minimal';
    const p = (key: string, value: string): DOMOutputSpec[] => (value ? [['p', { [key]: '' }, value]] : []);
    return [
      'div',
      attrs,
      ...p('data-prompt-description', a.description),
      ['pre', 0],
      ...p('data-prompt-usage', a.usage),
      ...p('data-prompt-note', a.note),
    ];
  },

  addCommands() {
    return {
      togglePrompt: () => ({ state, tr, dispatch, commands }) => {
        const { $from, $to } = state.selection;
        const range = $from.blockRange($to);
        const multiBlock = !!range
          && range.endIndex - range.startIndex > 1
          && range.parent.canReplaceWith(range.startIndex, range.endIndex, this.type);
        if ($from.parent.type.name === this.name || !range || !multiBlock) {
          return commands.toggleNode(this.name, 'paragraph');
        }
        // Several paragraphs selected (e.g. a pasted prompt): merge them into
        // ONE prompt block, keeping a blank line between paragraphs. Inline
        // marks like `code` are dropped, since a prompt is plain text.
        const parts: string[] = [];
        for (let i = range.startIndex; i < range.endIndex; i++) {
          parts.push(range.parent.child(i).textContent);
        }
        const text = parts.join('\n\n');
        if (dispatch) {
          const node = this.type.create(null, text ? state.schema.text(text) : null);
          tr.replaceWith(range.start, range.end, node);
        }
        return true;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-p': () => this.editor.commands.togglePrompt(),
      // Backspace in an empty prompt turns it back into a paragraph.
      Backspace: () => {
        const { empty, $anchor } = this.editor.state.selection;
        if (!empty || $anchor.parent.type.name !== this.name) return false;
        if ($anchor.parentOffset === 0 && !$anchor.parent.textContent.length) {
          return this.editor.commands.clearNodes();
        }
        return false;
      },
      // Enter on a second blank line at the end leaves the block, like code blocks.
      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.parent.type.name !== this.name) return false;
        const atEnd = $from.parentOffset === $from.parent.nodeSize - 2;
        if (!atEnd || !$from.parent.textContent.endsWith('\n\n')) return false;
        return editor
          .chain()
          .command(({ tr }) => { tr.delete($from.pos - 2, $from.pos); return true; })
          .exitCode()
          .run();
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(withBlockView(PromptView));
  },
});
