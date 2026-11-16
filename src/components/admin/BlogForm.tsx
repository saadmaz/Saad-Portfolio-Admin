import React, { useEffect, useState, useCallback, useRef, KeyboardEvent } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Save, Trash2, Send, Eye,
  Bold, Italic, Heading2, Heading3,
  List, ListOrdered, Code, Minus, Link as LinkIcon,
  Undo, Redo, Quote, Image as ImageIcon, Tag as TagIcon,
  Search, Globe, Link2, Copy, Check,
  X, Loader2, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import FormHeader from './FormHeader';
import { BlogService } from '@/services/blog-service';
import { uploadImage } from '@/services/storage';
import { toast } from 'sonner';
import ImageUpload from './ImageUpload';
import { PromptBlock } from './PromptBlock';
import { cn } from '@/shared/lib/utils';
import { SITE_URL } from './navConfig';

/* ── Schema ──────────────────────────────────────────────────────── */
const blogSchema = z.object({
  title:               z.string().min(5,  'Title must be at least 5 characters'),
  slug:                z.string().min(3,  'Slug required')
                         .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  excerpt:             z.string().min(10, 'Excerpt required').max(300, 'Max 300 characters'),
  metaDescription:     z.string().max(160, 'Max 160 characters').optional().or(z.literal('')),
  keywords:            z.string().optional().or(z.literal('')),
  category:            z.string().min(1,  'Category required'),
  tags:                z.array(z.string()).default([]),
  author:              z.string().min(2,  'Author required'),
  image:               z.string().optional().or(z.literal('')),
  published:           z.boolean().default(false),
  unlisted:            z.boolean().default(false),
  scheduledDate:       z.string().optional().or(z.literal('')),
});

type BlogFormValues = z.infer<typeof blogSchema>;

/* ── Helpers ──────────────────────────────────────────────────────── */
const toSlug = (s: string) =>
  s.toLowerCase().trim()
   .replace(/[^\w\s-]/g, '')
   .replace(/[\s_]+/g, '-')
   .replace(/^-+|-+$/g, '');

/* ── Shared label style ──────────────────────────────────────────── */
const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="block text-[12px] font-medium uppercase tracking-widest mb-1.5"
        style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
    {children}
  </span>
);

/* ── Field wrapper ───────────────────────────────────────────────── */
const Field = ({ children, error }: { children: React.ReactNode; error?: string }) => (
  <div className="space-y-1">
    {children}
    {error && <p className="text-xs text-danger mt-1">{error}</p>}
  </div>
);

/* ── Styled native input ─────────────────────────────────────────── */
const StyledInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => (
  <input
    ref={ref}
    {...props}
    className={cn(
      'w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-all duration-150',
      props.className,
    )}
    style={{
      background: 'hsl(var(--secondary))',
      border:     '1px solid hsl(var(--border))',
      color:      'hsl(var(--foreground) / 0.85)',
      ...props.style,
    }}
    onFocus={e => { e.currentTarget.style.borderColor = 'hsl(var(--accent) / 0.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--accent) / 0.08)'; }}
    onBlur={e  => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; e.currentTarget.style.boxShadow = 'none'; }}
  />
));
StyledInput.displayName = 'StyledInput';

/* ── Styled textarea ─────────────────────────────────────────────── */
const StyledTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>((props, ref) => (
  <textarea
    ref={ref}
    {...props}
    className={cn('w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-all duration-150 resize-none', props.className)}
    style={{
      background: 'hsl(var(--secondary))',
      border:     '1px solid hsl(var(--border))',
      color:      'hsl(var(--foreground) / 0.85)',
      ...props.style,
    }}
    onFocus={e => { e.currentTarget.style.borderColor = 'hsl(var(--accent) / 0.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--accent) / 0.08)'; }}
    onBlur={e  => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; e.currentTarget.style.boxShadow = 'none'; }}
  />
));
StyledTextarea.displayName = 'StyledTextarea';

/* ── Section card ────────────────────────────────────────────────── */
const SectionCard = ({
  title,
  icon: Icon,
  children,
}: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) => (
  <div className="overflow-hidden rounded-xl border border-border-subtle bg-card">
    <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
      <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
    </div>
    <div className="p-4 space-y-4">{children}</div>
  </div>
);

/* ── Rich-text toolbar button ────────────────────────────────────── */
const ToolbarBtn = ({
  onClick, active, title, children,
}: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={cn(
      'p-1.5 rounded-md transition-all flex items-center justify-center',
      active ? 'bg-accent/20 text-accent' : 'hover:bg-secondary',
    )}
    style={{ color: active ? 'hsl(var(--accent-hover))' : 'hsl(var(--foreground) / 0.60)' }}
  >
    {children}
  </button>
);

/* ── Divider ─────────────────────────────────────────────────────── */
const ToolbarDivider = () => (
  <div className="w-px h-4 mx-0.5 flex-shrink-0" style={{ background: 'hsl(var(--border))' }} />
);

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
const BlogForm = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const isEditMode   = !!id && id !== 'new';

  const [isLoading,          setIsLoading]          = useState(false);
  const [contentError,       setContentError]        = useState('');
  const [tagInput,           setTagInput]            = useState('');
  const [publishMode,        setPublishMode]         = useState<'draft' | 'publish' | 'schedule'>('draft');
  const [showDeleteModal,    setShowDeleteModal]      = useState(false);
  const [excerptLen,         setExcerptLen]          = useState(0);
  const [metaLen,            setMetaLen]             = useState(0);
  const [isInlineUploading,  setIsInlineUploading]   = useState(false);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<BlogFormValues>({
    resolver: zodResolver(blogSchema),
    defaultValues: {
      author: 'Saad Mazhar',
      published: false,
      unlisted: false,
      tags: [],
      category: 'Tech',
    },
  });

  const titleValue    = watch('title');
  const slugValue     = watch('slug');
  const tags          = watch('tags') ?? [];
  const schedDate     = watch('scheduledDate');
  const excerptValue  = watch('excerpt') ?? '';
  const metaValue     = watch('metaDescription') ?? '';
  const isUnlisted    = watch('unlisted') ?? false;
  const postUrl       = `${SITE_URL}/blog/${slugValue || 'your-slug'}`;
  const [linkCopied,  setLinkCopied] = useState(false);

  const copyPostLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setLinkCopied(true);
      toast.success('Link copied');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  /* ── TipTap editor ─────────────────────────────────────────────── */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading:       { levels: [2, 3] },
        bulletList:    { HTMLAttributes: { class: 'list-disc pl-5 space-y-1' } },
        orderedList:   { HTMLAttributes: { class: 'list-decimal pl-5 space-y-1' } },
        code:          { HTMLAttributes: { class: 'bg-surface-3 rounded px-1.5 py-0.5 font-mono text-sm text-accent' } },
        codeBlock:     { HTMLAttributes: { class: 'bg-black/40 rounded-xl p-4 font-mono text-sm border border-border my-3' } },
        blockquote:    { HTMLAttributes: { class: 'border-l-4 border-accent/50 pl-4 text-muted-foreground my-3 italic' } },
        horizontalRule:{ HTMLAttributes: { class: 'border-border my-5' } },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-accent underline underline-offset-4 hover:text-accent-hover', target: '_blank' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-xl max-w-full my-4 border border-border' },
      }),
      PromptBlock,
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === 'prompt'
            ? 'Write or paste the prompt readers can copy…'
            : 'Start writing your post here. Use the toolbar above for formatting…',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none min-h-[400px] focus:outline-none px-5 py-4 leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      if (editor.getText().length >= 50) setContentError('');
    },
  });

  /* ── Auto-slug from title (new posts only) ─────────────────────── */
  useEffect(() => {
    if (!isEditMode && titleValue && !slugValue) {
      setValue('slug', toSlug(titleValue));
    }
    // slugValue/setValue intentionally excluded: this is a one-way
    // mirror (title -> slug) that must not re-run just because the
    // slug itself changed, or a manually-edited slug would get
    // clobbered on the next render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleValue, isEditMode]);

  /* Update char counters */
  useEffect(() => { setExcerptLen(excerptValue.length); }, [excerptValue]);
  useEffect(() => { setMetaLen(metaValue.length); }, [metaValue]);

  /* ── Load post for edit ────────────────────────────────────────── */
  const loadPost = useCallback(async () => {
    try {
      setIsLoading(true);
      const post = await BlogService.getById(id!);
      if (!post) return;
      reset({
        title:              post.title,
        slug:               post.slug,
        excerpt:            post.excerpt,
        metaDescription:    post.metaDescription ?? '',
        keywords:           post.keywords ?? '',
        category:           post.category,
        tags:               post.tags ?? [],
        author:             post.author,
        image:              post.image ?? '',
        published:          post.published,
        unlisted:           post.unlisted ?? false,
        scheduledDate:      post.scheduledDate ?? '',
      });
      if (editor && post.content) editor.commands.setContent(post.content);
      if (post.published) setPublishMode('publish');
      else if (post.scheduledDate) setPublishMode('schedule');
      else setPublishMode('draft');
    } catch {
      toast.error('Failed to load blog post');
    } finally {
      setIsLoading(false);
    }
  }, [id, reset, editor]);

  useEffect(() => {
    if (isEditMode && editor) loadPost();
  }, [isEditMode, editor, loadPost]);

  /* ── Submit ────────────────────────────────────────────────────── */
  const onSubmit = async (data: BlogFormValues, forcePublish?: boolean) => {
    const text = editor?.getText() ?? '';
    if (text.length < 50) { setContentError('Content must be at least 50 characters'); return; }
    setContentError('');

    const isPublished = forcePublish !== undefined
      ? forcePublish
      : publishMode === 'publish';

    try {
      setIsLoading(true);
      const payload = {
        ...data,
        content:   editor!.getHTML(),
        published: isPublished,
        ...(isPublished && !isEditMode ? { publishedAt: new Date().toISOString() } : {}),
      };
      if (isEditMode) {
        await BlogService.update(id!, payload);
        toast.success('Post updated');
      } else {
        await BlogService.create({ ...payload, date: new Date().toISOString() });
        toast.success('Post created');
      }
      navigate('/blogs');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setIsLoading(true);
      await BlogService.delete(id!);
      toast.success('Post deleted');
      navigate('/blogs');
    } catch {
      toast.error('Delete failed');
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
    }
  };

  /* ── Link handler ──────────────────────────────────────────────── */
  const handleSetLink = () => {
    const url = window.prompt('Enter URL:');
    if (!url) return;
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  /* ── Image insert ──────────────────────────────────────────────── */
  const handleInsertImage = () => {
    inlineImageInputRef.current?.click();
  };

  const handleInlineImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB'); return; }

    setIsInlineUploading(true);
    try {
      const url = await uploadImage(file, 'uploads');
      editor?.chain().focus().setImage({ src: url }).run();
      toast.success('Image inserted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsInlineUploading(false);
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = '';
    }
  };

  /* ── Tag management ────────────────────────────────────────────── */
  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) setValue('tags', [...tags, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setValue('tags', tags.filter(t => t !== tag));

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
    if (e.key === 'Backspace' && !tagInput && tags.length) removeTag(tags[tags.length - 1]);
  };

  /* ── Preview ───────────────────────────────────────────────────── */
  const handlePreview = () => {
    const slug = slugValue || 'preview';
    window.open(`/blog/${slug}`, '_blank');
  };

  /* ═══════════════════ RENDER ═══════════════════════════════════ */
  return (
    <form onSubmit={handleSubmit(d => onSubmit(d, false))} className="space-y-0 animate-in fade-in duration-300 pb-20">

      {/* ── Top bar ────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 py-4 mb-6"
        style={{ background: 'hsl(var(--background))' }}
      >
        <FormHeader
          backTo="/blogs"
          title={isEditMode ? 'Edit post' : 'New post'}
          subtitle={isEditMode ? 'Blog · Editing' : 'Blog · New'}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreview}
              >
                <Eye aria-hidden="true" /> Preview
              </Button>

              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <Save aria-hidden="true" /> Save draft
              </Button>

              <Button
                type="button"
                onClick={handleSubmit(d => onSubmit(d, publishMode === 'publish'))}
                size="sm"
                loading={isLoading}
              >
                <Send aria-hidden="true" />
                {isEditMode ? 'Update' : publishMode === 'publish' ? (isUnlisted ? 'Publish unlisted' : 'Publish') : 'Save'}
              </Button>

              {isEditMode && (
                <Button
                  type="button"
                  variant="destructive-ghost"
                  size="icon-sm"
                  onClick={() => setShowDeleteModal(true)}
                  aria-label="Delete post"
                  className="h-9 w-9"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              )}
            </>
          }
        />
      </div>

      {/* ── Main grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* ══ Left column - content ══════════════════════════════ */}
        <div className="xl:col-span-3 space-y-5">

          {/* Title + slug + excerpt */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border-subtle))' }}
          >
            <div className="p-5 space-y-4">
              {/* Title */}
              <Field error={errors.title?.message}>
                <input
                  {...register('title')}
                  placeholder="Post title…"
                  className="w-full bg-transparent border-none text-[22px] font-medium placeholder:opacity-20 focus:outline-none leading-snug"
                  style={{ color: 'hsl(var(--foreground) / 0.92)', letterSpacing: '-0.02em' }}
                />
              </Field>

              {/* Slug */}
              <div
                className="flex items-center gap-2 pt-3"
                style={{ borderTop: '1px solid hsl(var(--border-subtle))' }}
              >
                <span className="text-[12px] font-medium flex-shrink-0" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
                  /blog/
                </span>
                <input
                  {...register('slug')}
                  placeholder="url-slug"
                  className="flex-1 bg-transparent border-none text-[12px] font-mono focus:outline-none"
                  style={{ color: 'hsl(var(--foreground) / 0.55)' }}
                />
                {errors.slug && <p className="text-xs text-danger flex-shrink-0">{errors.slug.message}</p>}
              </div>
            </div>

            {/* Excerpt */}
            <div
              className="px-5 pb-5"
              style={{ borderTop: '1px solid hsl(var(--border-subtle))' }}
            >
              <div className="flex items-center justify-between pt-4 mb-2">
                <Label>Excerpt</Label>
                <span className="text-[12px]" style={{ color: excerptLen > 280 ? 'hsl(var(--destructive))' : 'hsl(var(--foreground) / 0.60)' }}>
                  {excerptLen}/300
                </span>
              </div>
              <StyledTextarea
                {...register('excerpt', {
                  onChange: e => setExcerptLen(e.target.value.length),
                })}
                rows={2}
                placeholder="A compelling summary displayed on the blog archive page…"
              />
              {errors.excerpt && <p className="text-xs text-danger mt-1">{errors.excerpt.message}</p>}
            </div>
          </div>

          {/* Rich text editor */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border-subtle))' }}
          >
            {/* Toolbar */}
            {editor && (
              <div
                className="flex flex-wrap items-center gap-0.5 p-2"
                style={{ borderBottom: '1px solid hsl(var(--border-subtle))' }}
              >
                <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
                  <Bold className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
                  <Italic className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarDivider />
                <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
                  <Heading2 className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
                  <Heading3 className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarDivider />
                <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
                  <List className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
                  <ListOrdered className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarDivider />
                <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote Block">
                  <Quote className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline Code">
                  <Code className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block">
                  <span className="text-[12px] font-medium font-mono leading-none px-0.5">{'{ }'}</span>
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().togglePrompt().run()} active={editor.isActive('prompt')} title="Copyable Prompt (Ctrl+Alt+P)">
                  <Sparkles className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarDivider />
                <ToolbarBtn onClick={handleSetLink} active={editor.isActive('link')} title="Insert Link">
                  <LinkIcon className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <ToolbarBtn onClick={isInlineUploading ? () => {} : handleInsertImage} active={false} title="Insert Image">
                  {isInlineUploading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <ImageIcon className="w-3.5 h-3.5" />}
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider">
                  <Minus className="w-3.5 h-3.5" />
                </ToolbarBtn>
                <div className="ml-auto flex items-center gap-0.5">
                  <ToolbarDivider />
                  <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo">
                    <Undo className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                  <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo">
                    <Redo className="w-3.5 h-3.5" />
                  </ToolbarBtn>
                </div>
              </div>
            )}
            <EditorContent editor={editor} className="[&_.ProseMirror]:outline-none" />
            {contentError && (
              <p className="text-xs text-danger px-5 pb-4">{contentError}</p>
            )}
            <input
              type="file"
              ref={inlineImageInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleInlineImageFile}
            />
          </div>

        </div>

        {/* ══ Right sidebar ══════════════════════════════════════ */}
        <div className="space-y-4">

          {/* ── Publish settings ── */}
          <SectionCard title="Publishing" icon={Globe}>
            {/* Publish mode selector */}
            <div
              className="grid grid-cols-3 gap-1 p-1 rounded-lg"
              style={{ background: 'hsl(var(--secondary) / 0.6)' }}
            >
              {(['draft', 'publish', 'schedule'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setPublishMode(mode);
                    setValue('published', mode === 'publish');
                  }}
                  className="py-1.5 rounded-md text-[12px] font-medium capitalize transition-all"
                  style={{
                    background:   publishMode === mode ? 'hsl(var(--accent))' : 'transparent',
                    color:        publishMode === mode ? 'hsl(var(--accent-foreground))' : 'hsl(var(--foreground) / 0.60)',
                    boxShadow:    publishMode === mode ? '0 2px 8px hsl(var(--accent) / 0.25)' : 'none',
                  }}
                >
                  {mode === 'publish' ? 'Live' : mode === 'schedule' ? 'Schedule' : 'Draft'}
                </button>
              ))}
            </div>

            {/* Schedule date */}
            {publishMode === 'schedule' && (
              <Field error={errors.scheduledDate?.message}>
                <Label>Publish Date</Label>
                <StyledInput
                  type="datetime-local"
                  {...register('scheduledDate')}
                  style={{ colorScheme: 'dark' }}
                />
              </Field>
            )}

            {/* Visibility */}
            <div>
              <Label>Visibility</Label>
              <div role="radiogroup" aria-label="Visibility" className="space-y-1.5">
                {([
                  { value: false, icon: Globe, title: 'Public',   desc: 'Listed on /blog, the homepage and in search.' },
                  { value: true,  icon: Link2, title: 'Unlisted', desc: 'Only people with the link can read it.' },
                ] as const).map(opt => {
                  const active = isUnlisted === opt.value;
                  return (
                    <button
                      key={opt.title}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setValue('unlisted', opt.value, { shouldDirty: true })}
                      className="w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                      style={{
                        background: active ? 'hsl(var(--accent) / 0.08)' : 'hsl(var(--secondary) / 0.6)',
                        border: `1px solid ${active ? 'hsl(var(--accent) / 0.45)' : 'hsl(var(--border-subtle))'}`,
                      }}
                    >
                      <opt.icon
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                        style={{ color: active ? 'hsl(var(--accent))' : 'hsl(var(--foreground) / 0.50)' }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                          {opt.title}
                        </span>
                        <span className="block text-[12px] leading-snug" style={{ color: 'hsl(var(--foreground) / 0.55)' }}>
                          {opt.desc}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="mt-1 w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ border: `1.5px solid ${active ? 'hsl(var(--accent))' : 'hsl(var(--foreground) / 0.30)'}` }}
                      >
                        {active && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--accent))' }} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Share link for unlisted posts */}
            {isUnlisted && (
              <div>
                <Label>Share link</Label>
                <div
                  className="flex items-center gap-1 rounded-lg pl-3 pr-1 py-1"
                  style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}
                >
                  <span className="flex-1 min-w-0 truncate font-mono text-[12px]" style={{ color: 'hsl(var(--foreground) / 0.75)' }} title={postUrl}>
                    {postUrl.replace(/^https?:\/\/(www\.)?/, '')}
                  </span>
                  <button
                    type="button"
                    onClick={copyPostLink}
                    aria-label={linkCopied ? 'Link copied' : 'Copy link'}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium transition-colors hover:bg-background/60"
                    style={{ color: linkCopied ? 'hsl(var(--accent))' : 'hsl(var(--foreground) / 0.70)' }}
                  >
                    {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {linkCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[12px] mt-1.5" style={{ color: 'hsl(var(--foreground) / 0.55)' }}>
                  {publishMode === 'publish'
                    ? 'Hidden from your blog list, homepage, sitemap and search engines.'
                    : 'The link works once the post is live.'}
                </p>
              </div>
            )}

            {/* Status indicator */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'hsl(var(--secondary) / 0.6)', border: '1px solid hsl(var(--border-subtle))' }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: publishMode === 'publish' ? 'hsl(var(--accent))'
                    : publishMode === 'schedule' ? 'hsl(var(--warning))'
                    : 'hsl(var(--foreground) / 0.60)',
                }}
              />
              <span className="text-[12px] font-medium" style={{ color: 'hsl(var(--foreground) / 0.55)' }}>
                {publishMode === 'publish' ? (isUnlisted ? 'Live, but only for people with the link' : 'Will go live immediately')
                  : publishMode === 'schedule' ? (schedDate ? `Scheduled for ${new Date(schedDate).toLocaleDateString()}` : 'Pick a date above')
                  : 'Saved as draft'}
              </span>
            </div>
          </SectionCard>

          {/* ── Featured image ── */}
          <SectionCard title="Featured image" icon={ImageIcon}>
            <ImageUpload
              value={watch('image')}
              onChange={url => setValue('image', url)}
              label="Cover Image"
            />
          </SectionCard>

          {/* ── SEO ── */}
          <SectionCard title="SEO & search" icon={Search}>
            <Field error={errors.metaDescription?.message}>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Meta Description</Label>
                <span className="text-[12px]" style={{ color: metaLen > 150 ? 'hsl(var(--destructive))' : 'hsl(var(--foreground) / 0.60)' }}>
                  {metaLen}/160
                </span>
              </div>
              <StyledTextarea
                {...register('metaDescription', { onChange: e => setMetaLen(e.target.value.length) })}
                rows={3}
                placeholder="Brief summary for search engine results…"
              />
            </Field>

            <Field error={errors.keywords?.message}>
              <Label>Keywords</Label>
              <StyledInput
                {...register('keywords')}
                placeholder="react, typescript, web dev"
              />
              <p className="text-[12px] mt-1" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
                Comma-separated primary &amp; secondary keywords
              </p>
            </Field>
          </SectionCard>

          {/* ── Organisation ── */}
          <SectionCard title="Organization" icon={TagIcon}>
            <Field error={errors.category?.message}>
              <Label>Category</Label>
              <StyledInput {...register('category')} placeholder="Tech" />
            </Field>

            {/* Tag chip input */}
            <div>
              <Label>Tags</Label>
              <div
                className="flex flex-wrap items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg"
                style={{ background: 'hsl(var(--secondary))', border: '1px solid hsl(var(--border))' }}
              >
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-medium"
                    style={{ background: 'hsl(var(--accent) / 0.12)', color: 'hsl(var(--accent-hover))', border: '1px solid hsl(var(--accent) / 0.20)' }}
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="opacity-60 hover:opacity-100">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => tagInput && addTag(tagInput)}
                  placeholder={tags.length ? '' : 'Add tags, press Enter'}
                  className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-[12px]"
                  style={{ color: 'hsl(var(--foreground) / 0.75)', minWidth: 80 }}
                />
              </div>
              <p className="text-[12px] mt-1" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
                Press Enter or comma to add
              </p>
            </div>

            <Field error={errors.author?.message}>
              <Label>Author</Label>
              <StyledInput {...register('author')} />
            </Field>
          </SectionCard>

        </div>
      </div>

      <ConfirmDialog
        open={showDeleteModal}
        onOpenChange={o => !isLoading && setShowDeleteModal(o)}
        title="Delete post?"
        description="This post will be permanently deleted and can’t be recovered."
        confirmLabel="Delete post"
        isLoading={isLoading}
        onConfirm={onDelete}
      />
    </form>
  );
};

export default BlogForm;
