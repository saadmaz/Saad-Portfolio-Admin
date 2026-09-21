import React, { useEffect, useState, useCallback, useRef, KeyboardEvent } from 'react';
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
  ArrowLeft, Save, Trash2, Send, Eye,
  Bold, Italic, Heading2, Heading3,
  List, ListOrdered, Code, Minus, Link as LinkIcon,
  Undo, Redo, Quote, Image as ImageIcon, Tag as TagIcon,
  Search, Calendar, Globe, ToggleLeft, FileText,
  X, Loader2,
} from 'lucide-react';
import { BlogService } from '@/services/blog-service';
import { uploadImage } from '@/services/storage';
import { toast } from 'sonner';
import ImageUpload from './ImageUpload';
import { cn } from '@/shared/lib/utils';

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
  <span className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5"
        style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
    {children}
  </span>
);

/* ── Field wrapper ───────────────────────────────────────────────── */
const Field = ({ children, error }: { children: React.ReactNode; error?: string }) => (
  <div className="space-y-1">
    {children}
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
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
      background: 'var(--admin-surface-md)',
      border:     '1px solid var(--admin-surface-xl)',
      color:      'hsl(var(--foreground) / 0.85)',
      ...props.style,
    }}
    onFocus={e => { e.currentTarget.style.borderColor = 'hsl(var(--accent) / 0.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--accent) / 0.08)'; }}
    onBlur={e  => { e.currentTarget.style.borderColor = 'var(--admin-surface-xl)'; e.currentTarget.style.boxShadow = 'none'; }}
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
      background: 'var(--admin-surface-md)',
      border:     '1px solid var(--admin-surface-xl)',
      color:      'hsl(var(--foreground) / 0.85)',
      ...props.style,
    }}
    onFocus={e => { e.currentTarget.style.borderColor = 'hsl(var(--accent) / 0.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--accent) / 0.08)'; }}
    onBlur={e  => { e.currentTarget.style.borderColor = 'var(--admin-surface-xl)'; e.currentTarget.style.boxShadow = 'none'; }}
  />
));
StyledTextarea.displayName = 'StyledTextarea';

/* ── Toggle switch ───────────────────────────────────────────────── */
const Toggle = ({
  checked,
  onChange,
  label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-[13px] font-medium" style={{ color: 'hsl(var(--foreground) / 0.65)' }}>{label}</span>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 flex-shrink-0"
      style={{ background: checked ? 'hsl(var(--accent))' : 'var(--admin-border-lg)' }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(3px)' }}
      />
    </button>
  </div>
);

/* ── Section card ────────────────────────────────────────────────── */
const SectionCard = ({
  title,
  icon: Icon,
  children,
}: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) => (
  <div
    className="rounded-xl overflow-hidden"
    style={{ background: 'hsl(var(--card))', border: '1px solid var(--admin-border-sm)' }}
  >
    <div
      className="flex items-center gap-2 px-4 py-3"
      style={{ borderBottom: '1px solid var(--admin-border-sm)' }}
    >
      <Icon className="w-3.5 h-3.5 text-emerald-400" />
      <span className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
        {title}
      </span>
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
      active ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/[0.06]',
    )}
    style={{ color: active ? 'hsl(var(--accent-bright))' : 'hsl(var(--foreground) / 0.60)' }}
  >
    {children}
  </button>
);

/* ── Divider ─────────────────────────────────────────────────────── */
const ToolbarDivider = () => (
  <div className="w-px h-4 mx-0.5 flex-shrink-0" style={{ background: 'var(--admin-surface-xl)' }} />
);

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
const BlogForm = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const isEditMode   = !!id && id !== 'new';

  const [isLoading,          setIsLoading]          = useState(false);
  const [deleteOpen,         setDeleteOpen]          = useState(false);
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

  /* ── TipTap editor ─────────────────────────────────────────────── */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading:       { levels: [2, 3] },
        bulletList:    { HTMLAttributes: { class: 'list-disc pl-5 space-y-1' } },
        orderedList:   { HTMLAttributes: { class: 'list-decimal pl-5 space-y-1' } },
        code:          { HTMLAttributes: { class: 'bg-white/10 rounded px-1.5 py-0.5 font-mono text-sm text-emerald-400' } },
        codeBlock:     { HTMLAttributes: { class: 'bg-black/40 rounded-xl p-4 font-mono text-sm border border-white/10 my-3' } },
        blockquote:    { HTMLAttributes: { class: 'border-l-4 border-emerald-500/50 pl-4 text-white/60 my-3 italic' } },
        horizontalRule:{ HTMLAttributes: { class: 'border-white/10 my-5' } },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-emerald-400 underline underline-offset-4 hover:text-emerald-300', target: '_blank' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-xl max-w-full my-4 border border-white/10' },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your post here. Use the toolbar above for formatting…',
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
  }, [isEditMode, editor]);

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
        className="sticky top-0 z-30 flex flex-wrap items-center gap-3 px-0 py-4 mb-6"
        style={{ background: 'hsl(var(--background))' }}
      >
        <button
          type="button"
          onClick={() => navigate('/blogs')}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          style={{ background: 'var(--admin-surface-md)', border: '1px solid var(--admin-surface-xl)' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--admin-surface-xl)'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--admin-surface-md)'}
        >
          <ArrowLeft className="w-4 h-4" style={{ color: 'hsl(var(--foreground) / 0.60)' }} />
        </button>

        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground) / 0.90)', letterSpacing: '-0.02em' }}>
            {isEditMode ? 'Edit Post' : 'New Blog Post'}
          </h1>
          <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
            {isEditMode ? 'Update content and metadata.' : 'Write something worth reading.'}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreview}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
            style={{ background: 'var(--admin-surface-md)', border: '1px solid var(--admin-surface-xl)', color: 'hsl(var(--foreground) / 0.55)' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--admin-surface-xl)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--admin-surface-md)'}
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--admin-surface-md)', border: '1px solid var(--admin-surface-xl)', color: 'hsl(var(--foreground) / 0.65)' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--admin-surface-xl)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--admin-surface-md)'}
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </button>

          <button
            type="button"
            onClick={handleSubmit(d => onSubmit(d, publishMode === 'publish'))}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-50"
            style={{
              background: 'hsl(var(--accent))',
              color: 'hsl(var(--accent-foreground))',
              boxShadow: '0 0 18px hsl(var(--accent) / 0.28)',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--accent-bright))'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--accent))'}
          >
            <Send className="w-3.5 h-3.5" />
            {isLoading ? 'Saving…' : isEditMode ? 'Update' : publishMode === 'publish' ? 'Publish' : 'Save'}
          </button>

          {isEditMode && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{ color: 'hsl(var(--destructive) / 0.60)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--destructive) / 0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--destructive))'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--destructive) / 0.60)'; }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* ══ Left column - content ══════════════════════════════ */}
        <div className="xl:col-span-3 space-y-5">

          {/* Title + slug + excerpt */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'hsl(var(--card))', border: '1px solid var(--admin-border-sm)' }}
          >
            <div className="p-5 space-y-4">
              {/* Title */}
              <Field error={errors.title?.message}>
                <input
                  {...register('title')}
                  placeholder="Post title…"
                  className="w-full bg-transparent border-none text-[22px] font-bold placeholder:opacity-20 focus:outline-none leading-snug"
                  style={{ color: 'hsl(var(--foreground) / 0.92)', letterSpacing: '-0.02em' }}
                />
              </Field>

              {/* Slug */}
              <div
                className="flex items-center gap-2 pt-3"
                style={{ borderTop: '1px solid var(--admin-surface-lg)' }}
              >
                <span className="text-[11px] font-medium flex-shrink-0" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
                  /blog/
                </span>
                <input
                  {...register('slug')}
                  placeholder="url-slug"
                  className="flex-1 bg-transparent border-none text-[12px] font-mono focus:outline-none"
                  style={{ color: 'hsl(var(--foreground) / 0.55)' }}
                />
                {errors.slug && <p className="text-xs text-red-400 flex-shrink-0">{errors.slug.message}</p>}
              </div>
            </div>

            {/* Excerpt */}
            <div
              className="px-5 pb-5"
              style={{ borderTop: '1px solid var(--admin-surface-lg)' }}
            >
              <div className="flex items-center justify-between pt-4 mb-2">
                <Label>Excerpt</Label>
                <span className="text-[10px]" style={{ color: excerptLen > 280 ? 'hsl(var(--destructive))' : 'hsl(var(--foreground) / 0.60)' }}>
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
              {errors.excerpt && <p className="text-xs text-red-400 mt-1">{errors.excerpt.message}</p>}
            </div>
          </div>

          {/* Rich text editor */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'hsl(var(--card))', border: '1px solid var(--admin-border-sm)' }}
          >
            {/* Toolbar */}
            {editor && (
              <div
                className="flex flex-wrap items-center gap-0.5 p-2"
                style={{ borderBottom: '1px solid var(--admin-border-sm)' }}
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
                  <span className="text-[10px] font-bold font-mono leading-none px-0.5">{'{ }'}</span>
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
              <p className="text-xs text-red-400 px-5 pb-4">{contentError}</p>
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
              style={{ background: 'var(--admin-surface-sm)' }}
            >
              {(['draft', 'publish', 'schedule'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setPublishMode(mode);
                    setValue('published', mode === 'publish');
                  }}
                  className="py-1.5 rounded-md text-[11px] font-semibold capitalize transition-all"
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

            {/* Status indicator */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'var(--admin-surface-sm)', border: '1px solid var(--admin-border-sm)' }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: publishMode === 'publish' ? 'hsl(var(--accent))'
                    : publishMode === 'schedule' ? 'hsl(var(--warning))'
                    : 'hsl(var(--foreground) / 0.60)',
                }}
              />
              <span className="text-[11px] font-medium" style={{ color: 'hsl(var(--foreground) / 0.55)' }}>
                {publishMode === 'publish' ? 'Will go live immediately'
                  : publishMode === 'schedule' ? (schedDate ? `Scheduled for ${new Date(schedDate).toLocaleDateString()}` : 'Pick a date above')
                  : 'Saved as draft'}
              </span>
            </div>
          </SectionCard>

          {/* ── Featured image ── */}
          <SectionCard title="Featured Image" icon={ImageIcon}>
            <ImageUpload
              value={watch('image')}
              onChange={url => setValue('image', url)}
              label="Cover Image"
            />
          </SectionCard>

          {/* ── SEO ── */}
          <SectionCard title="SEO & Search" icon={Search}>
            <Field error={errors.metaDescription?.message}>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Meta Description</Label>
                <span className="text-[10px]" style={{ color: metaLen > 150 ? 'hsl(var(--destructive))' : 'hsl(var(--foreground) / 0.60)' }}>
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
              <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
                Comma-separated primary &amp; secondary keywords
              </p>
            </Field>
          </SectionCard>

          {/* ── Organisation ── */}
          <SectionCard title="Organisation" icon={TagIcon}>
            <Field error={errors.category?.message}>
              <Label>Category</Label>
              <StyledInput {...register('category')} placeholder="Tech" />
            </Field>

            {/* Tag chip input */}
            <div>
              <Label>Tags</Label>
              <div
                className="flex flex-wrap items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg"
                style={{ background: 'var(--admin-surface-md)', border: '1px solid var(--admin-surface-xl)' }}
              >
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
                    style={{ background: 'hsl(var(--accent) / 0.12)', color: 'hsl(var(--accent-bright))', border: '1px solid hsl(var(--accent) / 0.20)' }}
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
              <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
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

      {/* ── Delete modal ───────────────────────────────────────── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'hsl(var(--background) / 0.80)', backdropFilter: 'blur(4px)' }}
          onClick={() => !isLoading && setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: 'hsl(var(--card))', border: '1px solid var(--admin-surface-xl)', boxShadow: 'var(--shadow-xl)' }}
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold mb-1" style={{ color: 'hsl(var(--foreground) / 0.90)' }}>Delete Post?</h3>
              <p className="text-[13px]" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
                This post will be permanently deleted and cannot be recovered.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                style={{ background: 'var(--admin-surface-lg)', color: 'hsl(var(--foreground) / 0.65)', border: '1px solid var(--admin-surface-xl)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={onDelete}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50"
                style={{ background: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))', boxShadow: '0 4px 12px hsl(var(--destructive) / 0.25)' }}
              >
                {isLoading ? 'Deleting…' : 'Delete Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default BlogForm;
