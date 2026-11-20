import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, BarChart3, Bold, BookMarked, Code, Code2, Columns2,
  GalleryHorizontal, Image as ImageIcon, Indent, Italic, Link as LinkIcon, List, ListOrdered, ListTree,
  Megaphone, Minus, MoreHorizontal, Outdent, PlaySquare, Plus, Quote, Redo, Sparkles, Strikethrough,
  Table as TableIcon, TextQuote, Underline, Undo,
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
      'flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40 [&_svg]:h-[15px] [&_svg]:w-[15px]',
      active ? 'bg-accent/15 text-accent' : 'text-fg-2 hover:bg-secondary hover:text-foreground',
    )}
  >
    {children}
  </button>
);

const Sep = () => <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />;

/** Every block the Insert menu can add, as editor content. */
const INSERTS: { group: string; items: { label: string; icon: React.ComponentType<{ className?: string }>; content: Record<string, unknown> }[] }[] = [
  {
    group: 'Media',
    items: [
      { label: 'Image', icon: ImageIcon, content: { type: 'figure' } },
      { label: 'Image gallery', icon: GalleryHorizontal, content: { type: 'gallery', attrs: { layout: 'grid' } } },
      { label: 'Image carousel', icon: GalleryHorizontal, content: { type: 'gallery', attrs: { layout: 'carousel' } } },
      { label: 'Image beside text', icon: Columns2, content: { type: 'mediaText', content: [{ type: 'paragraph' }] } },
      { label: 'Video or embed', icon: PlaySquare, content: { type: 'embed' } },
      { label: 'Chart', icon: BarChart3, content: { type: 'chart' } },
    ],
  },
  {
    group: 'Text',
    items: [
      { label: 'Pull quote', icon: TextQuote, content: { type: 'pullQuote' } },
      ...CALLOUT_VARIANTS.map((v) => ({
        label: `${v.label} box`,
        icon: Megaphone,
        content: { type: 'callout', attrs: { variant: v.value }, content: [{ type: 'paragraph' }] },
      })),
      { label: 'Copyable prompt', icon: Sparkles, content: { type: 'prompt' } },
    ],
  },
  {
    group: 'Layout',
    items: [
      {
        label: 'Two columns',
        icon: Columns2,
        content: { type: 'columns', content: [{ type: 'column', content: [{ type: 'paragraph' }] }, { type: 'column', content: [{ type: 'paragraph' }] }] },
      },
      { label: 'Table', icon: TableIcon, content: { type: '__table' } },
      { label: 'Divider (line)', icon: Minus, content: { type: 'divider', attrs: { variant: 'line' } } },
      { label: 'Divider (dots)', icon: MoreHorizontal, content: { type: 'divider', attrs: { variant: 'dots' } } },
    ],
  },
  {
    group: 'Generated',
    items: [
      { label: 'Table of contents', icon: ListTree, content: { type: 'tocBlock' } },
      { label: 'Sources & references', icon: BookMarked, content: { type: 'sourcesBlock' } },
      { label: 'Custom HTML', icon: Code2, content: { type: 'htmlBlock' } },
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

  return (
    <div className="sticky top-[76px] z-20 flex flex-wrap items-center gap-0.5 border-b border-border-subtle bg-card/95 p-1.5 backdrop-blur" role="toolbar" aria-label="Formatting">
      <Btn label="Undo" onClick={() => chain().undo().run()} disabled={!s.canUndo}><Undo /></Btn>
      <Btn label="Redo" onClick={() => chain().redo().run()} disabled={!s.canRedo}><Redo /></Btn>
      <Sep />
      <select
        aria-label="Text style"
        value={s.block}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'p') chain().setParagraph().run();
          else chain().toggleHeading({ level: Number(v[1]) as 1 | 2 | 3 | 4 }).run();
        }}
        className="h-8 rounded-md border border-border bg-background px-2 text-[13px] text-foreground"
      >
        <option value="p">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="h4">Heading 4</option>
      </select>
      <Sep />
      <Btn label="Bold (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}><Bold /></Btn>
      <Btn label="Italic (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}><Italic /></Btn>
      <Btn label="Underline (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}><Underline /></Btn>
      <Btn label="Strikethrough" active={s.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough /></Btn>
      <Btn label="Inline code" active={s.code} onClick={() => chain().toggleCode().run()}><Code /></Btn>
      <Btn label="Link (Ctrl+K)" active={s.link} onClick={() => setLinkOpen(true)}><LinkIcon /></Btn>
      <Sep />
      <Btn label="Align left" active={s.align === 'left'} onClick={() => chain().setTextAlign('left').run()}><AlignLeft /></Btn>
      <Btn label="Align center" active={s.align === 'center'} onClick={() => chain().setTextAlign('center').run()}><AlignCenter /></Btn>
      <Btn label="Align right" active={s.align === 'right'} onClick={() => chain().setTextAlign('right').run()}><AlignRight /></Btn>
      <Btn label="Justify" active={s.align === 'justify'} onClick={() => chain().setTextAlign('justify').run()}><AlignJustify /></Btn>
      <Sep />
      <Btn label="Bulleted list" active={s.bullet} onClick={() => chain().toggleBulletList().run()}><List /></Btn>
      <Btn label="Numbered list" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered /></Btn>
      <Btn label="Indent (Tab)" disabled={!s.inList} onClick={() => chain().sinkListItem('listItem').run()}><Indent /></Btn>
      <Btn label="Outdent (Shift+Tab)" disabled={!s.inList} onClick={() => chain().liftListItem('listItem').run()}><Outdent /></Btn>
      <Sep />
      <Btn label="Quote" active={s.quote} onClick={() => chain().toggleBlockquote().run()}><Quote /></Btn>
      <Btn label="Code block" active={s.codeBlock} onClick={() => chain().toggleCodeBlock().run()}><Code2 /></Btn>
      {s.codeBlock && (
        <select
          aria-label="Code language"
          value={s.language}
          onChange={(e) => chain().updateAttributes('codeBlock', { language: e.target.value }).run()}
          className="h-8 rounded-md border border-border bg-background px-2 font-mono text-[12px] text-foreground"
        >
          {CODE_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      )}
      {s.table && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex h-8 items-center gap-1 rounded-md bg-accent/15 px-2 text-[12px] text-accent"><TableIcon className="h-3.5 w-3.5" /> Table</button>
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
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="xs" variant="secondary"><Plus aria-hidden="true" /> Insert</Button>
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
        class: 'article-editor prose-editor min-h-[480px] px-6 py-5 focus:outline-none',
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

  if (!editor) return <div className="min-h-[520px] animate-pulse rounded-xl border border-border-subtle bg-card" />;
  return (
    <div className={cn('rounded-xl border bg-card', invalid ? 'border-danger/60' : 'border-border-subtle')}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
