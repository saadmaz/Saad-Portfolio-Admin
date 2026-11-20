import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, Archive, CalendarClock, ChevronDown, ChevronLeft, CloudOff, Eye, ExternalLink, FileClock, Loader2,
  RotateCcw, Save, Send, Trash2, Undo2, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { SITE_URL } from './navConfig';
import { cn } from '@/shared/lib/utils';
import {
  DEFAULT_WPM, SNAPSHOT_FIELDS, STATUS_LABELS, countWords, readingTimeMinutes, slugify, statusOf, zonedWallTimeToUtc,
} from '@/shared/lib/article';
import { analyzeSeo } from '@/shared/lib/seo-analysis';
import { BlogService, ConflictError, PublishValidationError, type Transition } from '@/services/blog-service';
import { AuthorService, SeriesService, SettingsService } from '@/services/blog-collections';
import { SiteApi, rebuildMessage } from '@/services/site-api';
import type { ArticleStatus, Author, BlogPost, BlogPostDoc, BlogSeries, BlogSettings } from '@/types/blog';
import { BlogEditor, type EditorChange } from './blog/editor/BlogEditor';
import { initialEditorContent } from './blog/editor/content';
import { localBackup, useAutosave, type SaveState } from './blog/useAutosave';
import { ImageAssetField } from './blog/ImageAssetField';
import { PreviewDialog } from './blog/PreviewDialog';
import { SocialPreviews } from './blog/previews';
import { PublishPanel } from './blog/panels/PublishPanel';
import { DetailsPanel } from './blog/panels/DetailsPanel';
import { SeoPanel } from './blog/panels/SeoPanel';
import { RelatedPanel, SourcesPanel } from './blog/panels/RelatedSourcesPanels';
import { HistoryPanel } from './blog/panels/HistoryPanel';
import { scheduleFromPost, type ScheduleValue } from './blog/schedule';
import { CharCount, PanelSection } from './blog/ui';

/** Fields the editor owns. featuredOrder is managed from the list page, so it's left out. */
const EDITABLE = SNAPSHOT_FIELDS.filter((f) => f !== 'featuredOrder');
type Draft = Partial<BlogPost>;

const pickEditable = (post: Partial<BlogPost>): Draft => {
  const out: Record<string, unknown> = {};
  for (const f of EDITABLE) if (post[f] !== undefined && post[f] !== null) out[f] = post[f];
  return out as Draft;
};

const NEW_DRAFT: Draft = {
  title: '', subtitle: '', slug: '', excerpt: '', content: '', category: '', tags: [], author: 'Saad Mazhar',
  tableOfContents: true, reactionsEnabled: true, socialShareEnabled: true, unlisted: false, featured: false,
};

const TABS = [
  { id: 'publish', label: 'Publish' },
  { id: 'details', label: 'Details' },
  { id: 'media', label: 'Images' },
  { id: 'seo', label: 'SEO' },
  { id: 'social', label: 'Social' },
  { id: 'related', label: 'Related' },
  { id: 'sources', label: 'Sources' },
  { id: 'history', label: 'History' },
] as const;

/** Borderless textarea that grows with its content, for the title and lede. */
function GrowingTextarea({
  className, onEnter, ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { onEnter?: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      onKeyDown={onEnter ? (e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter(); } } : undefined}
      className={cn('block w-full resize-none overflow-hidden border-none bg-transparent p-0 focus:outline-none', className)}
      {...props}
    />
  );
}
type TabId = (typeof TABS)[number]['id'];

const STATUS_BADGE: Record<ArticleStatus, 'neutral' | 'info' | 'accent' | 'success' | 'warning'> = {
  draft: 'neutral', in_review: 'info', scheduled: 'accent', published: 'success', archived: 'warning',
};

function SaveIndicator({ state, at, live }: { state: SaveState; at: Date | null; live: boolean }) {
  const time = at?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dot = (tone: string, pulse = false) => (
    <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
      {pulse && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', tone)} />}
      <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', tone)} />
    </span>
  );
  const map: Record<SaveState, { icon: React.ReactNode; text: string; tone: string }> = {
    idle: { icon: dot('bg-muted-foreground/60'), text: live ? 'No pending changes' : 'All changes saved', tone: 'text-muted-foreground' },
    dirty: { icon: dot('bg-warning'), text: 'Unsaved changes', tone: 'text-fg-2' },
    saving: { icon: <Loader2 className="h-3 w-3 animate-spin" />, text: 'Saving…', tone: 'text-fg-2' },
    saved: { icon: dot('bg-success'), text: live ? `Saved privately${time ? ` · ${time}` : ''}` : `Saved${time ? ` · ${time}` : ''}`, tone: 'text-fg-2' },
    error: { icon: <AlertTriangle className="h-3 w-3" />, text: 'Couldn’t save, retrying', tone: 'text-danger-fg' },
    offline: { icon: <CloudOff className="h-3 w-3" />, text: 'Offline: saved on this device', tone: 'text-warning-fg' },
    conflict: { icon: dot('bg-danger', true), text: 'Edited elsewhere', tone: 'text-danger-fg' },
  };
  const m = map[state];
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn('mr-2 hidden items-center gap-2 whitespace-nowrap text-[12px] tabular md:flex', m.tone)}
    >
      {m.icon}
      {m.text}
    </span>
  );
}

const BlogForm = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const initialId = routeId && routeId !== 'new' ? routeId : null;

  const [postId, setPostId] = useState<string | null>(initialId);
  const [loaded, setLoaded] = useState(false);
  const [server, setServer] = useState<BlogPostDoc | null>(null);
  const [draft, setDraft] = useState<Draft>(NEW_DRAFT);
  const [revision, setRevision] = useState(0);
  const [editorContent, setEditorContent] = useState<string | Record<string, unknown>>('');
  const [editorKey, setEditorKey] = useState(0);
  const [text, setText] = useState('');
  const [tab, setTab] = useState<TabId>('publish');
  const [schedule, setSchedule] = useState<ScheduleValue>(() => scheduleFromPost({}));
  const [busy, setBusy] = useState<Transition | 'save' | 'delete' | null>(null);
  const [conflict, setConflict] = useState<BlogPostDoc | null>(null);
  const [recovery, setRecovery] = useState<{ kind: 'local' | 'autosave'; data: Draft; at: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [slugTouched, setSlugTouched] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  const [authors, setAuthors] = useState<Author[]>([]);
  const [series, setSeries] = useState<BlogSeries[]>([]);
  const [settings, setSettings] = useState<BlogSettings>({});
  const [allPosts, setAllPosts] = useState<BlogPostDoc[]>([]);
  const wpm = settings.readingWpm || DEFAULT_WPM;

  const status: ArticleStatus = server ? statusOf(server) : 'draft';
  const live = status === 'published' || status === 'scheduled';
  const update = useCallback((patch: Draft) => setDraft((d) => ({ ...d, ...patch })), []);

  // ── Supporting data ──────────────────────────────────────────────
  useEffect(() => {
    Promise.all([AuthorService.getAll(), SeriesService.getAll(), SettingsService.get(), BlogService.getAll()])
      .then(([a, s, st, posts]) => {
        setAuthors(a);
        setSeries(s);
        setSettings(st);
        setAllPosts(posts);
      })
      .catch(() => toast.error('Some blog settings failed to load; defaults are used.'));
  }, []);

  // ── Load the post (or start a new one) ───────────────────────────
  const autosave = useAutosave({
    postId,
    data: draft,
    live,
    baseRevision: revision,
    enabled: loaded,
    canCreate: !!draft.title?.trim(),
    onCreated: (id, rev) => {
      setPostId(id);
      setRevision(rev);
      setServer({ ...(draft as BlogPostDoc), id, status: 'draft', published: false, revision: rev });
      // Keep the URL in sync without remounting the editor.
      window.history.replaceState(window.history.state, '', `/blogs/${id}`);
    },
    onSaved: setRevision,
    onConflict: setConflict,
  });
  const { markSaved, flush, getRevision } = autosave;
  const postIdRef = useRef(postId);
  useEffect(() => {
    postIdRef.current = postId;
  }, [postId]);

  const loadPost = useCallback(
    async (id: string) => {
      const [post, pending] = await Promise.all([BlogService.getById(id), BlogService.getAutosave(id)]);
      if (!post) {
        toast.error('Post not found');
        navigate('/blogs');
        return;
      }
      const base = pickEditable(post);
      let working = base;
      setRecovery(null);
      if (pending && pending.baseRevision === (post.revision ?? 0)) {
        // Unpublished edits to a live post: load them, and say so.
        working = { ...base, ...pickEditable(pending.data as Draft) };
        for (const [k, v] of Object.entries(pending.data)) if (v === null) delete (working as Record<string, unknown>)[k];
        setRecovery({ kind: 'autosave', data: working, at: pending.savedAt });
      }
      const backup = localBackup.read(id);
      if (backup && backup.at > (pending?.savedAt ?? post.editedAt ?? '') && JSON.stringify(backup.data) !== JSON.stringify(working))
        setRecovery({ kind: 'local', data: backup.data, at: backup.at });

      setServer(post);
      setRevision(post.revision ?? 0);
      setDraft(working);
      setEditorContent(initialEditorContent(working.contentJson, working.content));
      setEditorKey((k) => k + 1);
      setSchedule(scheduleFromPost(post));
      setSlugTouched(!!post.publishedAt);
      markSaved(working);
      setLoaded(true);
    },
    [navigate, markSaved],
  );

  useEffect(() => {
    if (initialId) {
      loadPost(initialId).catch(() => toast.error('Failed to load the post'));
    } else {
      const backup = localBackup.read(null);
      if (backup?.data?.title || backup?.data?.content) setRecovery({ kind: 'local', data: backup.data, at: backup.at });
      markSaved(NEW_DRAFT);
      setLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId]);

  // ── Editor and derived fields ────────────────────────────────────
  const onEditorChange = useCallback(
    ({ html, json, text: plain }: EditorChange) => {
      setText(plain);
      update({ content: html, contentJson: json, readingTimeMinutes: readingTimeMinutes(html, wpm) });
    },
    [update, wpm],
  );

  const setTitle = (title: string) => update(slugTouched ? { title } : { title, slug: slugify(title) });

  const wordCount = useMemo(() => countWords(text), [text]);
  const seo = useMemo(() => analyzeSeo(draft), [draft]);
  const knownTags = useMemo(() => [...new Set(allPosts.flatMap((p) => p.tags ?? []))].sort(), [allPosts]);
  const knownCategories = useMemo(() => [...new Set(allPosts.map((p) => p.category).filter(Boolean))], [allPosts]);
  const slugChangedWhileLive = !!server?.publishedAt && !!draft.slug && draft.slug !== (server.publishedSlug ?? server.slug);
  const pendingLive = live && JSON.stringify(pickEditable(server ?? {})) !== JSON.stringify(pickEditable(draft));

  // ── Actions ──────────────────────────────────────────────────────
  const ensureSaved = useCallback(async (): Promise<string | null> => {
    await flush();
    return postIdRef.current;
  }, [flush]);

  const announceRebuild = (reason: string) =>
    SiteApi.rebuild(reason)
      .then((r) => toast.message(rebuildMessage(r)))
      .catch(() => toast.message('Published. The site API could not be reached to refresh crawler pages; they update on the next deploy.'));

  const runTransition = async (action: Transition) => {
    if (!draft.title?.trim()) {
      toast.error('Add a title first');
      return;
    }
    setBusy(action);
    setIssues([]);
    try {
      const id = await ensureSaved();
      if (!id) throw new Error('The post could not be saved yet. Check your connection.');
      const utc = schedule.local ? zonedWallTimeToUtc(schedule.local, schedule.zone) : null;
      const data: Draft = {
        ...draft,
        image: draft.cover?.url ?? (draft.cover === undefined ? undefined : draft.image),
        author: authors.find((a) => a.id === draft.authorId)?.name ?? draft.author ?? 'Saad Mazhar',
      };
      const saved = await BlogService.transition(id, action, data, getRevision(), {
        scheduledAt: utc ?? undefined,
        scheduledTimezone: schedule.zone,
      });
      setServer(saved);
      setRevision(saved.revision ?? 0);
      autosave.resolveConflict(saved.revision ?? 0, data);
      markSaved(pickEditable(saved));
      setDraft(pickEditable(saved));
      setRecovery(null);
      setHistoryKey((k) => k + 1);
      localBackup.clear(id);
      const messages: Record<Transition, string> = {
        publish: 'Published', update: 'Live article updated', schedule: 'Scheduled', unschedule: 'Schedule cancelled',
        unpublish: 'Unpublished: back to drafts', archive: 'Archived', review: 'Marked as ready for review', draft: 'Moved to drafts',
      };
      toast.success(messages[action]);
      if (['publish', 'update', 'unpublish', 'archive'].includes(action)) announceRebuild(`${action}: ${saved.title}`);
    } catch (err) {
      if (err instanceof PublishValidationError) {
        setIssues(err.issues);
        setTab('publish');
        toast.error('Not ready yet: see the checklist under Publish.');
      } else if (err instanceof ConflictError) {
        setConflict(err.current);
      } else {
        toast.error(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      setBusy(null);
    }
  };
  const manualSave = async () => {
    if (!draft.title?.trim()) {
      toast.error('Add a title to save');
      return;
    }
    setBusy('save');
    try {
      const id = await ensureSaved();
      if (!id) throw new Error('Could not save. Check your connection.');
      await BlogService.addRevision(id, draft, live ? 'Saved changes (not yet live)' : 'Manual save');
      setHistoryKey((k) => k + 1);
      toast.success(live ? 'Saved privately. Click Update to put the changes live.' : 'Saved, with a restore point in History.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(null);
    }
  };

  const discardPending = async () => {
    if (!postId) return;
    await BlogService.discardAutosave(postId).catch(() => undefined);
    localBackup.clear(postId);
    await loadPost(postId);
    toast.success('Unpublished changes discarded');
  };

  const onDelete = async () => {
    if (!postId) return;
    setBusy('delete');
    try {
      await BlogService.delete(postId);
      localBackup.clear(postId);
      toast.success('Post deleted');
      if (server?.published) announceRebuild(`delete: ${server.title}`);
      navigate('/blogs');
    } catch {
      toast.error('Delete failed');
    } finally {
      setBusy(null);
      setDeleteOpen(false);
    }
  };

  const restoreSnapshot = async (snapshot: Draft) => {
    const next = { ...draft, ...pickEditable(snapshot) };
    setDraft(next);
    setEditorContent(initialEditorContent(next.contentJson, next.content));
    setEditorKey((k) => k + 1);
  };

  const resolveConflict = async (keep: 'mine' | 'theirs') => {
    if (!conflict || !postId) return;
    if (keep === 'theirs') {
      setConflict(null);
      await loadPost(postId);
      autosave.resolveConflict(conflict.revision ?? 0, pickEditable(conflict));
      toast.success('Loaded the latest version');
    } else {
      // Keep a copy of the other version before overwriting it.
      await BlogService.addRevision(postId, conflict, 'Overwritten after an edit conflict').catch(() => undefined);
      setRevision(conflict.revision ?? 0);
      setServer(conflict);
      autosave.resolveConflict(conflict.revision ?? 0);
      setConflict(null);
      toast.message('Your version will be saved over it. The other version is kept in History.');
    }
  };

  // ── Primary action for the current status ────────────────────────
  const scheduleUtc = schedule.local ? zonedWallTimeToUtc(schedule.local, schedule.zone) : null;
  const wantsSchedule = !!scheduleUtc && Date.parse(scheduleUtc) > Date.now();
  const primary: { action: Transition; label: string; icon: typeof Send } =
    status === 'published'
      ? { action: 'update', label: 'Update', icon: Send }
      : status === 'scheduled'
        ? { action: 'schedule', label: 'Update schedule', icon: CalendarClock }
        : wantsSchedule
          ? { action: 'schedule', label: 'Schedule', icon: CalendarClock }
          : { action: 'publish', label: draft.unlisted ? 'Publish unlisted' : 'Publish', icon: Send };

  const beforePreview = useCallback(async () => {
    await flush();
  }, [flush]);

  // The toolbar and sidebar stick just below the top bar, whose height changes when its actions wrap.
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const header = headerRef.current;
    const root = rootRef.current;
    if (!header || !root) return;
    const sync = () => root.style.setProperty('--editor-top', `${header.offsetHeight}px`);
    sync();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(sync);
    ro.observe(header);
    return () => ro.disconnect();
  }, [loaded]);

  if (!loaded)
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="h-10 w-1/3 animate-pulse rounded-full bg-card" />
          <div className="h-[640px] animate-pulse rounded-2xl border border-border-subtle bg-card" />
        </div>
        <div className="hidden h-[520px] animate-pulse rounded-2xl border border-border-subtle bg-card xl:block" />
      </div>
    );

  const hasSeoProblems = seo.checks.some((c) => c.status === 'fail');

  return (
    <div ref={rootRef} className="animate-in fade-in pb-24 duration-300 [--editor-top:64px]">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div
        ref={headerRef}
        className="sticky top-0 z-30 -mx-4 mb-6 border-b border-border-subtle bg-background/90 px-4 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-8 md:px-8"
      >
        <div className="flex min-h-[64px] flex-wrap items-center gap-x-3 gap-y-2 py-3">
          <button
            type="button"
            onClick={() => navigate('/blogs')}
            aria-label="Back to posts"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fg-2 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 items-center gap-2 text-[13px]">
            <span className="text-muted-foreground">Blog</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="max-w-[260px] truncate font-medium text-foreground">
              {draft.title?.trim() || (postId ? 'Untitled post' : 'New post')}
            </span>
            <Badge variant={STATUS_BADGE[status]} dot className="ml-1">{STATUS_LABELS[status]}</Badge>
            {pendingLive && <Badge variant="warning">Unpublished changes</Badge>}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <SaveIndicator state={autosave.state} at={autosave.lastSavedAt} live={live} />
            <Button type="button" variant="ghost" size="xs" onClick={() => setPreviewOpen(true)} disabled={!postId && !draft.title?.trim()}>
              <Eye aria-hidden="true" /> <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button type="button" variant="ghost" size="xs" onClick={manualSave} loading={busy === 'save'} disabled={!!busy}>
              <Save aria-hidden="true" /> <span className="hidden sm:inline">Save</span>
            </Button>
            <div className="ml-1 flex items-center">
              <Button
                type="button"
                size="xs"
                className="rounded-r-none"
                onClick={() => runTransition(primary.action)}
                loading={busy === primary.action}
                disabled={!!busy}
              >
                <primary.icon aria-hidden="true" /> {primary.label}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="xs"
                    aria-label="More actions"
                    disabled={!!busy}
                    className="rounded-l-none border-l border-accent-foreground/20 px-2"
                  >
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {status !== 'in_review' && status !== 'published' && status !== 'scheduled' && (
                      <DropdownMenuItem onSelect={() => runTransition('review')} className="gap-2.5"><FileClock className="h-4 w-4" /> Mark ready for review</DropdownMenuItem>
                    )}
                    {status === 'scheduled' && (
                      <DropdownMenuItem onSelect={() => runTransition('unschedule')} className="gap-2.5"><Undo2 className="h-4 w-4" /> Cancel schedule</DropdownMenuItem>
                    )}
                    {status === 'scheduled' && (
                      <DropdownMenuItem onSelect={() => runTransition('publish')} className="gap-2.5"><Send className="h-4 w-4" /> Publish now instead</DropdownMenuItem>
                    )}
                    {status === 'published' && (
                      <DropdownMenuItem onSelect={() => runTransition('unpublish')} className="gap-2.5"><Undo2 className="h-4 w-4" /> Unpublish (back to draft)</DropdownMenuItem>
                    )}
                    {pendingLive && status === 'published' && (
                      <DropdownMenuItem onSelect={discardPending} className="gap-2.5"><RotateCcw className="h-4 w-4" /> Discard unpublished changes</DropdownMenuItem>
                    )}
                    {(status === 'in_review' || status === 'archived') && (
                      <DropdownMenuItem onSelect={() => runTransition('draft')} className="gap-2.5"><Undo2 className="h-4 w-4" /> Move to drafts</DropdownMenuItem>
                    )}
                    {status !== 'archived' && postId && (
                      <DropdownMenuItem onSelect={() => runTransition('archive')} className="gap-2.5"><Archive className="h-4 w-4" /> Archive</DropdownMenuItem>
                    )}
                    {server?.published && (
                      <DropdownMenuItem asChild className="gap-2.5">
                        <a href={`${SITE_URL}/blog/${server.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> View on site</a>
                      </DropdownMenuItem>
                    )}
                    {postId && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="gap-2.5 text-danger-fg focus:text-danger-fg"><Trash2 className="h-4 w-4" /> Delete post</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
          </div>
        </div>
      </div>

      {recovery && (
        <div role="status" className={cn('mb-5 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-[13px]', recovery.kind === 'local' ? 'border-warning/30 bg-warning-subtle/70 text-warning-fg' : 'border-info/30 bg-info-subtle/70 text-info-fg')}>
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            {recovery.kind === 'local'
              ? `Unsaved edits from ${new Date(recovery.at).toLocaleString()} were found on this device.`
              : `Showing unpublished changes autosaved ${new Date(recovery.at).toLocaleString()}. Click Update to put them live.`}
          </span>
          {recovery.kind === 'local' ? (
            <>
              <Button type="button" size="xs" onClick={() => { restoreSnapshot(recovery.data); setRecovery(null); }}>Restore them</Button>
              <Button type="button" size="xs" variant="ghost" onClick={() => { localBackup.clear(postId); setRecovery(null); }}>Discard</Button>
            </>
          ) : (
            <Button type="button" size="xs" variant="ghost" onClick={discardPending}>Discard changes</Button>
          )}
        </div>
      )}

      {issues.length > 0 && (
        <div role="alert" className="mb-5 rounded-2xl border border-danger/30 bg-danger-subtle/70 px-4 py-3 text-[13px] text-danger-fg">
          <p className="font-medium">Fix these before going live:</p>
          <ul className="mt-1 list-disc pl-5">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ── Writing canvas ───────────────────────────────────── */}
        <article className="min-w-0 rounded-xl border border-border-subtle bg-card">
          <header className="mx-auto max-w-[720px] px-5 pb-8 pt-10 sm:px-12 sm:pt-14">
            <GrowingTextarea
              value={draft.title ?? ''}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
              onEnter={() => document.getElementById('post-subtitle')?.focus()}
              placeholder="Post title"
              aria-label="Title"
              className="text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] text-foreground placeholder:text-foreground/20 sm:text-[40px]"
            />
            <GrowingTextarea
              id="post-subtitle"
              value={draft.subtitle ?? ''}
              onChange={(e) => update({ subtitle: e.target.value.replace(/\n/g, ' ') })}
              onEnter={() => document.getElementById('excerpt')?.focus()}
              placeholder="Subtitle (optional)"
              aria-label="Subtitle"
              className="mt-3 text-[18px] leading-relaxed text-fg-2 placeholder:text-foreground/20"
            />

            <dl className="mt-8 space-y-4 border-t border-border-subtle pt-6 text-[13px]">
              <div className="grid gap-1.5 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center sm:gap-4">
                <dt><label htmlFor="slug" className="text-muted-foreground">URL</label></dt>
                <dd className="flex min-w-0 items-center gap-2">
                  <span className="flex h-9 min-w-0 flex-1 items-center rounded-lg border border-border-subtle bg-background/40 px-3 font-mono text-[12.5px] transition-colors focus-within:border-accent/60">
                    <span className="shrink-0 text-muted-foreground">/blog/</span>
                    <input
                      id="slug"
                      value={draft.slug ?? ''}
                      onChange={(e) => {
                        setSlugTouched(true);
                        update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') });
                      }}
                      placeholder="url-slug"
                      className="min-w-0 flex-1 border-none bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                    />
                  </span>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    title="Generate the URL from the title"
                    onClick={() => { setSlugTouched(true); update({ slug: slugify(draft.title) }); }}
                  >
                    <Wand2 aria-hidden="true" /> From title
                  </Button>
                </dd>
              </div>
              {slugChangedWhileLive && (
                <p className="flex gap-1.5 text-[12px] text-warning-fg sm:pl-[104px]">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  This article is live at /blog/{server?.publishedSlug ?? server?.slug}. Changing the URL adds a permanent (301) redirect from the old one when you update.
                </p>
              )}
              <div className="grid gap-1.5 sm:grid-cols-[88px_minmax(0,1fr)] sm:gap-4">
                <dt className="sm:pt-2.5">
                  <label htmlFor="excerpt" className="text-muted-foreground">Excerpt<span className="text-accent"> *</span></label>
                </dt>
                <dd className="min-w-0 space-y-1">
                  <GrowingTextarea
                    id="excerpt"
                    value={draft.excerpt ?? ''}
                    onChange={(e) => update({ excerpt: e.target.value })}
                    placeholder="One or two sentences for listings, feeds and search."
                    className="min-h-[60px] rounded-lg border border-border-subtle bg-background/40 px-3 py-2 text-[13.5px] leading-relaxed text-foreground transition-colors placeholder:text-muted-foreground/70 focus:border-accent/60"
                  />
                  <div className="flex justify-end"><CharCount value={draft.excerpt ?? ''} max={300} min={10} /></div>
                </dd>
              </div>
            </dl>
          </header>

          <BlogEditor key={editorKey} content={editorContent} onChange={onEditorChange} />

          <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border-subtle px-5 py-3 text-[12px] text-muted-foreground sm:px-6">
            <span className="tabular">
              {wordCount.toLocaleString()} words · {draft.readingTimeMinutes ?? 1} min read
            </span>
            <span>Autosaves {live ? 'privately ' : ''}as you write</span>
          </footer>
        </article>

        {/* ── Settings panels ─────────────────────────────────── */}
        <aside className="min-w-0 xl:sticky xl:top-[calc(var(--editor-top)+24px)] xl:self-start">
          <div className="rounded-xl border border-border-subtle bg-card">
            <div role="tablist" aria-label="Post settings" className="grid grid-cols-4 gap-1 border-b border-border-subtle p-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  id={`tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex h-8 items-center justify-center gap-1.5 rounded-md text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    tab === t.id ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                  {t.id === 'seo' && (
                    <span
                      className={cn('tabular text-[11px]', seo.score >= 80 ? 'text-success-fg' : seo.score >= 55 ? 'text-warning-fg' : 'text-danger-fg')}
                      aria-label={`score ${seo.score}${hasSeoProblems ? ', has problems' : ''}`}
                    >
                      {seo.score}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div
              id={`panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab}`}
              className="max-h-none overflow-y-auto p-5 xl:max-h-[calc(100vh-var(--editor-top)-120px)]"
            >
              {tab === 'publish' && <PublishPanel post={{ ...server, ...draft }} status={status} update={update} schedule={schedule} setSchedule={setSchedule} wordCount={wordCount} wpm={wpm} />}
              {tab === 'details' && <DetailsPanel post={draft} update={update} authors={authors} series={series} settings={settings} knownTags={knownTags} knownCategories={knownCategories} />}
              {tab === 'media' && (
                <div className="space-y-8">
                  <ImageAssetField
                    label="Featured image"
                    purpose="cover"
                    folder="blog/covers"
                    nameHint={draft.slug || undefined}
                    value={draft.cover ?? (draft.image ? { url: draft.image } : null)}
                    onChange={(asset) => update({ cover: asset ?? undefined, image: asset?.url ?? undefined })}
                    hint="Shown at the top of the article and on cards. At least 1200×600."
                  />
                  <ImageAssetField
                    label="Social sharing image"
                    purpose="social"
                    folder="blog/social"
                    nameHint={draft.slug ? `${draft.slug}-social` : undefined}
                    value={draft.socialImage}
                    onChange={(asset) => update({ socialImage: asset ?? undefined })}
                    hint="Optional. Used for LinkedIn, X, Facebook and WhatsApp cards instead of the featured image. 1200×630 works everywhere."
                    showCaption={false}
                  />
                </div>
              )}
              {tab === 'seo' && <SeoPanel post={draft} update={update} />}
              {tab === 'social' && (
                <PanelSection title="How it looks when shared">
                  <SocialPreviews post={{ ...draft, publishedAt: server?.publishedAt }} />
                </PanelSection>
              )}
              {tab === 'related' && <RelatedPanel post={{ ...draft, id: postId ?? undefined }} update={update} allPosts={allPosts} />}
              {tab === 'sources' && <SourcesPanel post={draft} update={update} />}
              {tab === 'history' && <HistoryPanel postId={postId} current={draft} onRestore={restoreSnapshot} refreshKey={historyKey} />}
            </div>
          </div>
        </aside>
      </div>

      <PreviewDialog postId={postId} open={previewOpen} onOpenChange={setPreviewOpen} beforeOpen={beforePreview} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => busy !== 'delete' && setDeleteOpen(o)}
        title="Delete post?"
        description={server?.published ? 'This post is live. Deleting it removes it from the site and erases its revision history. This can’t be undone.' : 'The post and its revision history will be permanently deleted.'}
        confirmLabel="Delete post"
        requireText={server?.published ? 'DELETE' : undefined}
        isLoading={busy === 'delete'}
        onConfirm={onDelete}
      />

      <AlertDialog open={!!conflict}>
        <AlertDialogContent className="max-w-[480px]">
          <AlertDialogHeader>
            <AlertDialogTitle>This post changed somewhere else</AlertDialogTitle>
            <AlertDialogDescription>
              {conflict?.editedBy ? `${conflict.editedBy} saved` : 'Someone saved'} a newer version
              {conflict?.editedAt ? ` at ${new Date(conflict.editedAt).toLocaleString()}` : ''} (another tab or device). Autosave is paused so nothing is overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => resolveConflict('theirs')}>Load the newer version</Button>
            <Button onClick={() => resolveConflict('mine')}>Keep my version</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogForm;
