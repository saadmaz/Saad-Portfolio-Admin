import { useEffect, useRef, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { Check, Copy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_LABEL = 'Prompt';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    prompt: {
      /** Turn the current block into a prompt block, or back into a paragraph. */
      togglePrompt: () => ReturnType;
    };
  }
}

/* ── Editor view: label field + copy button above the editable prompt text ── */
const PromptView = ({ node, updateAttributes }: ReactNodeViewProps) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    const text = node.textContent;
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
    <NodeViewWrapper
      className="my-4 rounded-xl overflow-hidden not-prose"
      style={{ background: 'hsl(var(--secondary) / 0.6)', border: '1px solid hsl(var(--accent) / 0.25)' }}
    >
      <div
        contentEditable={false}
        className="flex items-center gap-2 px-3 py-2 select-none"
        style={{ borderBottom: '1px solid hsl(var(--border-subtle))' }}
      >
        <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-accent" />
        <input
          value={node.attrs.label}
          onChange={e => updateAttributes({ label: e.target.value })}
          onBlur={e => !e.target.value.trim() && updateAttributes({ label: DEFAULT_LABEL })}
          maxLength={40}
          aria-label="Prompt label"
          placeholder={DEFAULT_LABEL}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-[12px] font-medium uppercase tracking-widest"
          style={{ color: 'hsl(var(--foreground) / 0.60)' }}
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium transition-colors hover:bg-secondary"
          style={{ color: copied ? 'hsl(var(--accent-hover))' : 'hsl(var(--foreground) / 0.60)' }}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <NodeViewContent<'pre'>
        as="pre"
        className="m-0 px-4 py-3 bg-transparent font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words"
        style={{ color: 'hsl(var(--foreground) / 0.85)' }}
      />
    </NodeViewWrapper>
  );
};

/**
 * A copyable prompt block. Stored as
 *   <div data-prompt data-label="…"><pre>…</pre></div>
 * and the portfolio adds its own copy button when rendering it.
 */
export const PromptBlock = Node.create({
  name: 'prompt',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,

  addAttributes() {
    return {
      label: {
        default: DEFAULT_LABEL,
        parseHTML: el => el.getAttribute('data-label') || DEFAULT_LABEL,
        renderHTML: attrs => ({ 'data-label': attrs.label || DEFAULT_LABEL }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-prompt]', contentElement: 'pre', preserveWhitespace: 'full' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-prompt': '' }, HTMLAttributes), ['pre', 0]];
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
    return ReactNodeViewRenderer(PromptView);
  },
});
