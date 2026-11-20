import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, Archive, BookOpenText, CalendarClock, ChevronDown, Clock, CloudOff, Eye, ExternalLink, FileClock,
  History, Image as ImageIcon, Link2, Loader2, Quote, RotateCcw, Rocket, Save, Search, Send, Settings2,
  Share2, Trash2, Undo2, Wand2,
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
import FormHeader from './FormHeader';
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
import { SeoPanel, SeoScore } from './blog/panels/SeoPanel';
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
  { id: 'publish', label: 'Publish', icon: Rocket },
  { id: 'details', label: 'Details', icon: Settings2 },
  { id: 'media', label: 'Images', icon: ImageIcon },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'related', label: 'Related', icon: Link2 },
  { id: 'sources', label: 'Sources', icon: Quote },
  { id: 'history', label: 'History', icon: History },
] as const;

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');

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
      className={cn('flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-border-subtle bg-card/60 px-3 text-[12px] tabular', m.tone)}
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
    <div ref={rootRef} className="relative isolate animate-in fade-in pb-24 duration-300 [--editor-top:72px]">
      {/* Ambient ember glow behind the canvas. */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-[8%] -z-10 h-[420px] w-[70%] rounded-full bg-accent/[0.06] blur-[120px]" />

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div
        ref={headerRef}
        className="sticky top-0 z-30 -mx-4 mb-6 border-b border-border-subtle/70 bg-background/70 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:-mx-8 md:px-8"
      >
        <FormHeader
          backTo="/blogs"
          title={draft.title?.trim() || (postId ? 'Untitled post' : 'New post')}
          subtitle={postId ? `Blog · ${STATUS_LABELS[status]}` : 'Blog · New'}
          badge={
            <span className="flex items-center gap-2">
              <Badge variant={STATUS_BADGE[status]} dot>{STATUS_LABELS[status]}</Badge>
              {pendingLive && <Badge variant="warning">Unpublished changes</Badge>}
            </span>
          }
          actions={
            <>
              <SaveIndicator state={autosave.state} at={autosave.lastSavedAt} live={live} />
              <span className="mx-1 hidden h-6 w-px bg-border-subtle sm:block" aria-hidden="true" />
              <Button type="button" variant="ghost" size="xs" onClick={() => setPreviewOpen(true)} disabled={!postId && !draft.title?.trim()}>
                <Eye aria-hidden="true" /> Preview
              </Button>
              <Button type="button" variant="outline" size="xs" onClick={manualSave} loading={busy === 'save'} disabled={!!busy}>
                <Save aria-hidden="true" /> Save
              </Button>
              <div className="flex items-center rounded-full shadow-ember">
                <Button
                  type="button"
                  size="xs"
                  className="rounded-r-none pr-3.5"
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
                      className="rounded-l-none border-l border-accent-foreground/15 px-2"
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
            </>
          }
        />
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
        <article className="relative min-w-0 rounded-2xl border border-border-subtle bg-card shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04),0_30px_60px_-30px_rgb(0_0_0/0.7)]">
          <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

          <header className="mx-auto max-w-[780px] px-5 pb-2 pt-9 sm:px-10 sm:pt-14">
            {/* URL */}
            <div className="group flex w-fit max-w-full items-center rounded-full border border-border-subtle bg-background/50 py-1 pl-3 pr-1 font-mono text-[12px] transition-colors focus-within:border-accent/50 hover:border-border">
              <label htmlFor="slug" className="shrink-0 text-muted-foreground">
                <span className="hidden sm:inline">{SITE_HOST}</span>/blog/
              </label>
              <input
                id="slug"
                value={draft.slug ?? ''}
                onChange={(e) => {
                  setSlugTouched(true);
                  update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') });
                }}
                placeholder="url-slug"
                size={Math.max(10, (draft.slug ?? '').length + 1)}
                className="min-w-0 max-w-[420px] border-none bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              <button
                type="button"
                title="Generate the URL from the title"
                onClick={() => { setSlugTouched(true); update({ slug: slugify(draft.title) }); }}
                className="ml-1 flex h-6 shrink-0 items-center gap-1 rounded-full px-2 font-sans text-[11.5px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Wand2 className="h-3 w-3" aria-hidden="true" /> From title
              </button>
            </div>
            {slugChangedWhileLive && (
              <p className="mt-2.5 flex gap-1.5 text-[12px] text-warning-fg">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                This article is live at /blog/{server?.publishedSlug ?? server?.slug}. Changing the URL adds a permanent (301) redirect from the old one when you update.
              </p>
            )}

            <GrowingTextarea
              value={draft.title ?? ''}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
              onEnter={() => document.getElementById('post-subtitle')?.focus()}
              placeholder="Post title"
              aria-label="Title"
              className="mt-7 text-[32px] font-semibold leading-[1.12] tracking-[-0.035em] text-foreground placeholder:text-foreground/20 sm:text-[42px]"
            />
            <GrowingTextarea
              id="post-subtitle"
              value={draft.subtitle ?? ''}
              onChange={(e) => update({ subtitle: e.target.value.replace(/\n/g, ' ') })}
              onEnter={() => document.getElementById('excerpt')?.focus()}
              placeholder="Add a subtitle…"
              aria-label="Subtitle"
              className="mt-3 text-[18px] leading-relaxed tracking-[-0.01em] text-fg-2 placeholder:text-foreground/20 sm:text-[20px]"
            />

            {/* Excerpt */}
            <div className="mt-7 rounded-xl border border-border-subtle bg-background/40 transition-colors focus-within:border-accent/40">
              <div className="flex items-center justify-between gap-2 px-4 pt-3">
                <label htmlFor="excerpt" className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  <BookOpenText className="h-3.5 w-3.5" aria-hidden="true" />
                  Excerpt<span className="text-accent">*</span>
                </label>
                <CharCount value={draft.excerpt ?? ''} max={300} min={10} />
              </div>
              <GrowingTextarea
                id="excerpt"
                value={draft.excerpt ?? ''}
                onChange={(e) => update({ excerpt: e.target.value })}
                placeholder="A one or two sentence summary for listings, feeds and search."
                className="min-h-[52px] px-4 pb-3 pt-1.5 text-[14px] leading-relaxed text-foreground/90 placeholder:text-muted-foreground/70"
              />
            </div>
          </header>

          <BlogEditor key={editorKey} content={editorContent} onChange={onEditorChange} />

          <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-b-2xl border-t border-border-subtle bg-background/30 px-5 py-3 text-[12px] text-muted-foreground sm:px-6">
            <span className="flex items-center gap-3 tabular">
              <span><span className="text-foreground">{wordCount.toLocaleString()}</span> words</span>
              <span className="h-3 w-px bg-border" aria-hidden="true" />
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" /> {draft.readingTimeMinutes ?? 1} min read</span>
            </span>
            <span>Autosaves {live ? 'privately ' : ''}a few seconds after you stop typing</span>
          </footer>
        </article>

        {/* ── Settings panels ─────────────────────────────────── */}
        <aside className="min-w-0 xl:sticky xl:top-[calc(var(--editor-top)+16px)] xl:self-start">
          <div className="rounded-2xl border border-border-subtle bg-card shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)]">
            <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
              <div>
                <p className="label text-[11px]">Post settings</p>
                <p className="mt-1 text-[13px] text-fg-2">{TABS.find((t) => t.id === tab)?.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setTab('seo')}
                title="SEO completeness"
                className="flex items-center gap-2 rounded-full border border-border-subtle py-1 pl-3 pr-1 text-[12px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              >
                SEO
                <SeoScore score={seo.score} size={28} />
              </button>
            </div>
            <div role="tablist" aria-label="Post settings" className="mx-3 grid grid-cols-4 gap-1 rounded-xl border border-border-subtle bg-background/50 p-1">
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
                    'relative flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11.5px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    tab === t.id
                      ? 'bg-secondary text-foreground shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.06),0_1px_2px_rgb(0_0_0/0.3)]'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                  )}
                >
                  <t.icon className={cn('h-4 w-4', tab === t.id && 'text-accent')} aria-hidden="true" />
                  {t.label}
                  {t.id === 'seo' && hasSeoProblems && <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" aria-label="has problems" />}
                </button>
              ))}
            </div>
            <div
              key={tab}
              id={`panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab}`}
              className="animate-in fade-in slide-in-from-bottom-1 max-h-none overflow-y-auto px-4 pb-5 pt-5 duration-200 xl:max-h-[calc(100vh-var(--editor-top)-200px)]"
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
