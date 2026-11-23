import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, BarChart3, Bold, BookMarked, Code, Code2, Columns2,
  GalleryHorizontal, Image as ImageIcon, Indent, Italic, Link as LinkIcon, List, ListOrdered, ListTree,
  Megaphone, Minus, MoreHorizontal, Outdent, PlaySquare, Plus, Quote, Redo, Sparkles, Strikethrough,
  Table as TableIcon, TextQuote, Underline, Undo, Heading2, Pilcrow, Columns3, Library, FileDown,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/shared/lib/utils';
import { CODE_LANGUAGES, editorExtensions } from './extensions';
import { CALLOUT_VARIANTS } from './block-config';

export interface EditorChange {
  html: string;
  json: string;
  text: string;
}

const Btn = ({ onClick, active, label, disabled, children }: { onClick: () => void; active?: boolean; label: string; disabled?: boolean; children: React.ReactNode }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()} // keep the editor selection
    onClick={onClick}
    className={cn(
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-150 disabled:opacity-30 [&_svg]:h-[15px] [&_svg]:w-[15px]',
      active ? 'bg-secondary text-accent' : 'text-fg-2 hover:bg-secondary hover:text-foreground',
    )}
  >
    {children}
  </button>
);

const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-border-subtle" aria-hidden="true" />;

/** Every block the Insert menu can add, as editor content, in the groups authors think in. */
const INSERTS: { group: string; items: { label: string; icon: React.ComponentType<{ className?: string }>; content: Record<string, unknown> }[] }[] = [
  {
    group: 'Writing',
    items: [
      { label: 'Heading', icon: Heading2, content: { type: 'heading', attrs: { level: 2 } } },
      { label: 'Paragraph', icon: Pilcrow, content: { type: 'paragraph' } },
      { label: 'Quote', icon: Quote, content: { type: 'blockquote', content: [{ type: 'paragraph' }] } },
      { label: 'Pull quote', icon: TextQuote, content: { type: 'pullQuote' } },
      { label: 'Divider (line)', icon: Minus, content: { type: 'divider', attrs: { variant: 'line' } } },
      { label: 'Divider (dots)', icon: MoreHorizontal, content: { type: 'divider', attrs: { variant: 'dots' } } },
      { label: 'Table', icon: TableIcon, content: { type: '__table' } },
      {
        label: 'Two columns',
        icon: Columns2,
        content: { type: 'columns', content: [{ type: 'column', content: [{ type: 'paragraph' }] }, { type: 'column', content: [{ type: 'paragraph' }] }] },
      },
    ],
  },
  {
    group: 'Media',
    items: [
      { label: 'Image', icon: ImageIcon, content: { type: 'figure' } },
      { label: 'Image gallery', icon: GalleryHorizontal, content: { type: 'gallery', attrs: { layout: 'grid' } } },
      { label: 'Image carousel', icon: GalleryHorizontal, content: { type: 'gallery', attrs: { layout: 'carousel' } } },
      { label: 'Image + text', icon: Columns2, content: { type: 'mediaText', content: [{ type: 'paragraph' }] } },
      { label: 'Video or embed', icon: PlaySquare, content: { type: 'embed' } },
      { label: 'Chart', icon: BarChart3, content: { type: 'chart' } },
    ],
  },
  {
    group: 'Developer resources',
    items: [
      { label: 'Prompt block', icon: Sparkles, content: { type: 'prompt' } },
      { label: 'Code block', icon: Code2, content: { type: 'codeBlock' } },
      {
        label: 'Step-by-step',
        icon: ListOrdered,
        content: { type: 'steps', content: [{ type: 'step', content: [{ type: 'paragraph' }] }, { type: 'step', content: [{ type: 'paragraph' }] }] },
      },
      { label: 'Resource list', icon: Library, content: { type: 'resources' } },
      { label: 'Downloadable file', icon: FileDown, content: { type: 'attachment' } },
      { label: 'Custom HTML', icon: Code2, content: { type: 'htmlBlock' } },
    ],
  },
  {
    group: 'Information',
    items: [
      ...CALLOUT_VARIANTS.map((v) => ({
        label: `${v.label} callout`,
        icon: Megaphone,
        content: { type: 'callout', attrs: { variant: v.value }, content: [{ type: 'paragraph' }] },
      })),
      { label: 'Comparison', icon: Columns3, content: { type: 'comparison' } },
      { label: 'Table of contents', icon: ListTree, content: { type: 'tocBlock' } },
      { label: 'Sources & references', icon: BookMarked, content: { type: 'sourcesBlock' } },
    ],
  },
];

function LinkDialog({ editor, open, onOpenChange }: { editor: Editor; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [href, setHref] = useState('');
  useEffect(() => {
    if (open) setHref(editor.getAttributes('link').href ?? '');
  }, [open, editor]);
  const valid = !href || /^(https?:\/\/|mailto:|\/|#)/i.test(href.trim());
  const apply = () => {
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!href.trim()) chain.unsetLink().run();
    else chain.setLink({ href: href.trim() }).run();
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link</DialogTitle>
          <DialogDescription>Full URL, a site path like /blog/my-post, or #section. Leave empty to remove the link.</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={href}
          onChange={(e) => setHref(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && valid && (e.preventDefault(), apply())}
          placeholder="https://"
          aria-invalid={!valid}
        />
        {!valid && <p className="text-[13px] text-danger-fg">Use https://, mailto:, a /path or #anchor.</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={apply} disabled={!valid}>{href.trim() ? 'Apply' : 'Remove link'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  useEffect(() => {
    const open = () => setLinkOpen(true);
    document.addEventListener('blog-editor:link', open);
    return () => document.removeEventListener('blog-editor:link', open);
  }, []);
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive('heading', { level: 1 }) ? 'h1'
        : e.isActive('heading', { level: 2 }) ? 'h2'
        : e.isActive('heading', { level: 3 }) ? 'h3'
        : e.isActive('heading', { level: 4 }) ? 'h4'
        : 'p',
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      link: e.isActive('link'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      inList: e.isActive('listItem'),
      quote: e.isActive('blockquote'),
      codeBlock: e.isActive('codeBlock'),
      language: (e.getAttributes('codeBlock').language as string) || 'plaintext',
      codeWrap: !!e.getAttributes('codeBlock').wrap,
      codeLines: !!e.getAttributes('codeBlock').lineNumbers,
      table: e.isActive('table'),
      align: (['center', 'right', 'justify'] as const).find((a) => e.isActive({ textAlign: a })) ?? 'left',
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  const insert = (content: Record<string, unknown>) => {
    if (content.type === '__table') chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    else chain().insertContent(content).run();
  };

  type MoreItem = { label: string; icon: React.ComponentType<{ className?: string }>; run: () => void; hint?: string; active?: boolean; disabled?: boolean };
  const more: (MoreItem | 'sep')[] = [
    { label: 'Undo', icon: Undo, hint: 'Ctrl+Z', disabled: !s.canUndo, run: () => chain().undo().run() },
    { label: 'Redo', icon: Redo, hint: 'Ctrl+Y', disabled: !s.canRedo, run: () => chain().redo().run() },
    'sep',
    { label: 'Underline', icon: Underline, hint: 'Ctrl+U', active: s.underline, run: () => chain().toggleUnderline().run() },
    { label: 'Strikethrough', icon: Strikethrough, active: s.strike, run: () => chain().toggleStrike().run() },
    { label: 'Inline code', icon: Code, hint: 'Ctrl+E', active: s.code, run: () => chain().toggleCode().run() },
    'sep',
    { label: 'Align left', icon: AlignLeft, active: s.align === 'left', run: () => chain().setTextAlign('left').run() },
    { label: 'Align center', icon: AlignCenter, active: s.align === 'center', run: () => chain().setTextAlign('center').run() },
    { label: 'Align right', icon: AlignRight, active: s.align === 'right', run: () => chain().setTextAlign('right').run() },
    { label: 'Justify', icon: AlignJustify, active: s.align === 'justify', run: () => chain().setTextAlign('justify').run() },
    'sep',
    { label: 'Indent', icon: Indent, hint: 'Tab', disabled: !s.inList, run: () => chain().sinkListItem('listItem').run() },
    { label: 'Outdent', icon: Outdent, hint: 'Shift+Tab', disabled: !s.inList, run: () => chain().liftListItem('listItem').run() },
  ];
  return (
    <div
      className="sticky top-[var(--editor-top,64px)] z-20 flex items-center gap-0.5 overflow-x-auto border-y border-border-subtle bg-card/95 px-3 py-1.5 backdrop-blur no-scrollbar sm:px-5"
      role="toolbar"
      aria-label="Formatting"
    >
      <select
        aria-label="Text style"
        value={s.block}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'p') chain().setParagraph().run();
          else chain().toggleHeading({ level: Number(v[1]) as 1 | 2 | 3 | 4 }).run();
        }}
        className="h-8 shrink-0 cursor-pointer rounded-md bg-transparent px-2 text-[13px] text-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="p">Paragraph</option>
        <option value="h2">Heading</option>
        <option value="h3">Subheading</option>
        <option value="h4">Small heading</option>
        <option value="h1">Title (H1)</option>
      </select>
      <Sep />
      <Btn label="Bold (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}><Bold /></Btn>
      <Btn label="Italic (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}><Italic /></Btn>
      <Btn label="Link (Ctrl+K)" active={s.link} onClick={() => setLinkOpen(true)}><LinkIcon /></Btn>
      <Sep />
      <Btn label="Bulleted list" active={s.bullet} onClick={() => chain().toggleBulletList().run()}><List /></Btn>
      <Btn label="Numbered list" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered /></Btn>
      <Btn label="Quote" active={s.quote} onClick={() => chain().toggleBlockquote().run()}><Quote /></Btn>
      <Btn label="Code block" active={s.codeBlock} onClick={() => chain().toggleCodeBlock().run()}><Code2 /></Btn>
      {s.codeBlock && (
        <select
          aria-label="Code language"
          value={s.language}
          onChange={(e) => chain().updateAttributes('codeBlock', { language: e.target.value }).run()}
          className="ml-1 h-7 shrink-0 rounded-md border border-border-subtle bg-background px-2 font-mono text-[12px] text-foreground focus:outline-none"
        >
          {CODE_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      )}
      {s.codeBlock && (
        <>
          <button type="button" aria-pressed={s.codeWrap} onMouseDown={(e) => e.preventDefault()} onClick={() => chain().updateAttributes('codeBlock', { wrap: !s.codeWrap }).run()} className={cn('ml-1 h-7 shrink-0 rounded-md px-2 text-[12px]', s.codeWrap ? 'bg-accent/15 text-accent' : 'text-fg-2 hover:bg-secondary')}>
            Wrap lines
          </button>
          <button type="button" aria-pressed={s.codeLines} onMouseDown={(e) => e.preventDefault()} onClick={() => chain().updateAttributes('codeBlock', { lineNumbers: !s.codeLines }).run()} className={cn('h-7 shrink-0 rounded-md px-2 text-[12px]', s.codeLines ? 'bg-accent/15 text-accent' : 'text-fg-2 hover:bg-secondary')}>
            Line numbers
          </button>
        </>
      )}
      {s.table && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="ml-1 flex h-7 shrink-0 items-center gap-1 rounded-md bg-accent/15 px-2 text-[12px] text-accent"><TableIcon className="h-3.5 w-3.5" /> Table</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => chain().addRowBefore().run()}>Add row above</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => chain().addRowAfter().run()}>Add row below</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => chain().addColumnBefore().run()}>Add column left</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => chain().addColumnAfter().run()}>Add column right</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => chain().toggleHeaderRow().run()}>Toggle header row</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => chain().mergeOrSplit().run()}>Merge / split cells</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => chain().deleteRow().run()}>Delete row</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => chain().deleteColumn().run()}>Delete column</DropdownMenuItem>
            <DropdownMenuItem className="text-danger-fg" onSelect={() => chain().deleteTable().run()}>Delete table</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Less common formatting lives here to keep the bar calm. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="More formatting"
            aria-label="More formatting"
            onMouseDown={(e) => e.preventDefault()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-2 transition-colors hover:bg-secondary hover:text-foreground"
          >
            <MoreHorizontal className="h-[15px] w-[15px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          {more.map((m, i) =>
            m === 'sep' ? (
              <DropdownMenuSeparator key={i} />
            ) : (
              <DropdownMenuItem key={m.label} disabled={m.disabled} onSelect={m.run} className="gap-2.5">
                <m.icon className={cn('h-4 w-4', m.active ? 'text-accent' : 'text-muted-foreground')} />
                <span className="flex-1">{m.label}</span>
                {m.hint && <span className="font-mono text-[11px] text-muted-foreground">{m.hint}</span>}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto pl-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-foreground transition-colors hover:bg-secondary"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Insert
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] w-56 overflow-y-auto">
            {INSERTS.map((g, gi) => (
              <div key={g.group}>
                {gi > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="label text-[11px] text-muted-foreground">{g.group}</DropdownMenuLabel>
                {g.items.map((item) => (
                  <DropdownMenuItem key={item.label} onSelect={() => insert(item.content)} className="gap-2.5">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <LinkDialog editor={editor} open={linkOpen} onOpenChange={setLinkOpen} />
    </div>
  );
}

/**
 * The article editor. Reports every change as HTML (what the site renders),
 * JSON (the structured source) and plain text (for validation/counts).
 */
export function BlogEditor({
  content,
  onChange,
  onReady,
  invalid,
}: {
  content: string | Record<string, unknown>;
  onChange: (change: EditorChange) => void;
  onReady?: (editor: Editor) => void;
  invalid?: boolean;
}) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const editor = useEditor({
    extensions: editorExtensions(),
    content,
    editorProps: {
      attributes: {
        class: 'article-editor prose-editor mx-auto min-h-[520px] max-w-[720px] px-5 pb-16 pt-8 focus:outline-none sm:px-12',
        'aria-label': 'Article content',
        role: 'textbox',
        'aria-multiline': 'true',
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
          document.dispatchEvent(new CustomEvent('blog-editor:link'));
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) =>
      onChangeRef.current({ html: e.getHTML(), json: JSON.stringify(e.getJSON()), text: e.getText() }),
  });

  useEffect(() => {
    if (editor) onReady?.(editor);
    // Report once on mount so derived values (reading time, SEO) are right for loaded content.
    if (editor) onChangeRef.current({ html: editor.getHTML(), json: JSON.stringify(editor.getJSON()), text: editor.getText() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return <div className="mx-6 my-6 min-h-[520px] animate-pulse rounded-xl bg-secondary/40" />;
  return (
    <div className={cn('relative', invalid && 'ring-1 ring-danger/60')}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
