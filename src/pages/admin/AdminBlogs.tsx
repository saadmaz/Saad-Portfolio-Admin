import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, BookOpen, CalendarClock, Eye, EyeOff, Globe,
  Link2, Loader2, MoreHorizontal, Pencil, PlayCircle, Search, Star, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { SITE_URL } from '@/components/admin/navConfig';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BlogService, PublishValidationError, type Transition } from '@/services/blog-service';
import { SiteApi, rebuildMessage } from '@/services/site-api';
import { SNAPSHOT_FIELDS, STATUS_LABELS, statusOf } from '@/shared/lib/article';
import type { ArticleStatus, BlogPost, BlogPostDoc } from '@/types/blog';
import { cn, plural } from '@/shared/lib/utils';

type SortKey = 'newest' | 'oldest' | 'az' | 'updated';
type FilterKey = 'all' | ArticleStatus;

const STATUS_VARIANT: Record<ArticleStatus, 'neutral' | 'info' | 'accent' | 'success' | 'warning'> = {
  draft: 'neutral', in_review: 'info', scheduled: 'accent', published: 'success', archived: 'warning',
};

const safeDate = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const postUrl = (post: BlogPost) => `${SITE_URL}/blog/${post.slug}`;

const contentOf = (post: BlogPostDoc): Partial<BlogPost> => {
  const out: Record<string, unknown> = {};
  for (const f of SNAPSHOT_FIELDS) if (post[f] !== undefined && f !== 'featuredOrder') out[f] = post[f];
  return out;
};

const StatusBadge = ({ post }: { post: BlogPostDoc }) => {
  const status = statusOf(post);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge variant={STATUS_VARIANT[status]} dot>{STATUS_LABELS[status]}</Badge>
      {post.published && post.unlisted && (
        <Badge variant="outline" className="gap-1" title="Only people with the link can see this post">
          <Link2 className="h-3 w-3" aria-hidden="true" /> Unlisted
        </Badge>
      )}
      {post.scheduleError && (
        <Badge variant="danger" className="gap-1" title={post.scheduleError}>
          <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Schedule failed
        </Badge>
      )}
    </span>
  );
};

const Thumb = ({ post }: { post: BlogPostDoc }) => {
  const src = post.cover?.variants?.[0]?.url ?? post.cover?.url ?? post.image;
  return (
    <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-secondary">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
    </span>
  );
};

const AdminBlogs = () => {
  const [blogs, setBlogs] = useState<BlogPostDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [deleteTarget, setDeleteTarget] = useState<BlogPostDoc | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [runningScheduler, setRunningScheduler] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      setBlogs(await BlogService.getAll());
    } catch {
      toast.error('Failed to load blog posts');
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: blogs.length, draft: 0, in_review: 0, scheduled: 0, published: 0, archived: 0 };
    blogs.forEach((b) => (c[statusOf(b)] += 1));
    return c;
  }, [blogs]);

  const featured = useMemo(
    () => blogs.filter((b) => b.featured && b.published && !b.unlisted).sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999)),
    [blogs],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = blogs.filter((b) => {
      if (filterStatus !== 'all' && statusOf(b) !== filterStatus) return false;
      return !q || [b.title, b.excerpt, b.slug, b.category, ...(b.tags ?? [])].some((v) => v?.toLowerCase().includes(q));
    });
    const time = (b: BlogPostDoc) => safeDate(b.publishedAt ?? b.date)?.getTime() ?? 0;
    if (sortKey === 'newest') result.sort((a, b) => time(b) - time(a));
    else if (sortKey === 'oldest') result.sort((a, b) => time(a) - time(b));
    else if (sortKey === 'updated') result.sort((a, b) => (b.editedAt ?? '').localeCompare(a.editedAt ?? ''));
    else result.sort((a, b) => a.title.localeCompare(b.title));
    return result;
  }, [blogs, searchQuery, filterStatus, sortKey]);

  const refreshSite = (reason: string) =>
    SiteApi.rebuild(reason).then((r) => toast.message(rebuildMessage(r))).catch(() => undefined);

  const transition = async (post: BlogPostDoc, action: Transition) => {
    setBusyId(post.id);
    try {
      const saved = await BlogService.transition(post.id, action, contentOf(post), post.revision ?? 0);
      setBlogs((prev) => prev.map((b) => (b.id === post.id ? saved : b)));
      toast.success(action === 'publish' ? `“${post.title}” published` : `“${post.title}”: ${STATUS_LABELS[statusOf(saved)].toLowerCase()}`);
      if (action === 'publish' || action === 'unpublish' || action === 'archive') refreshSite(`${action}: ${post.title}`);
    } catch (err) {
      if (err instanceof PublishValidationError) {
        toast.error(`Can't publish yet: ${err.issues[0]}${err.issues.length > 1 ? ` (+${err.issues.length - 1} more)` : ''}. Open the post to fix it.`);
      } else {
        toast.error(err instanceof Error ? err.message : 'Could not update the post');
        load();
      }
    } finally {
      setBusyId(null);
    }
  };

  const saveFeatured = async (ordered: BlogPostDoc[], unfeature: string[] = []) => {
    const ids = ordered.map((p) => p.id);
    setBlogs((prev) =>
      prev.map((b) =>
        ids.includes(b.id) ? { ...b, featured: true, featuredOrder: ids.indexOf(b.id) + 1 } : unfeature.includes(b.id) ? { ...b, featured: false } : b,
      ),
    );
    try {
      await BlogService.setFeatured(ids, unfeature);
      refreshSite('featured articles changed');
    } catch {
      toast.error('Could not save featured order');
      load();
    }
  };
  const toggleFeatured = (post: BlogPostDoc) =>
    post.featured ? saveFeatured(featured.filter((p) => p.id !== post.id), [post.id]) : saveFeatured([...featured, post]);
  const moveFeatured = (i: number, d: -1 | 1) => {
    const next = [...featured];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    saveFeatured(next);
  };

  const runScheduler = async () => {
    setRunningScheduler(true);
    try {
      const r = await SiteApi.runScheduler();
      const parts = [
        r.published.length && `${plural(r.published.length, 'post')} published`,
        r.rejected.length && `${r.rejected.length} sent back to draft (incomplete)`,
        r.failed.length && `${r.failed.length} failed, will retry`,
      ].filter(Boolean);
      toast.success(parts.length ? parts.join(' · ') : 'Nothing was due.');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reach the scheduler');
    } finally {
      setRunningScheduler(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await BlogService.delete(deleteTarget.id);
      setBlogs((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      toast.success(`“${deleteTarget.title}” deleted`);
      if (deleteTarget.published) refreshSite(`delete: ${deleteTarget.title}`);
    } catch {
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleCopyLink = async (post: BlogPostDoc) => {
    try {
      await navigator.clipboard.writeText(postUrl(post));
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const filterPills: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'published', label: 'Published' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'in_review', label: 'In review' },
    { key: 'draft', label: 'Drafts' },
    { key: 'archived', label: 'Archived' },
  ];
  const sortLabels: Record<SortKey, string> = { newest: 'Newest', oldest: 'Oldest', updated: 'Recently edited', az: 'A–Z' };

  const RowMenu = ({ post }: { post: BlogPostDoc }) => {
    const status = statusOf(post);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${post.title}`} disabled={busyId === post.id}>
            {busyId === post.id ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => navigate(`/blogs/${post.id}`)} className="gap-2.5">
            <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Edit
          </DropdownMenuItem>
          {status === 'published' ? (
            <DropdownMenuItem onSelect={() => transition(post, 'unpublish')} className="gap-2.5">
              <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Unpublish
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => transition(post, 'publish')} className="gap-2.5">
              <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Publish now
            </DropdownMenuItem>
          )}
          {post.published && !post.unlisted && (
            <DropdownMenuItem onSelect={() => toggleFeatured(post)} className="gap-2.5">
              <Star className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {post.featured ? 'Remove from featured' : 'Feature'}
            </DropdownMenuItem>
          )}
          {status !== 'archived' && (
            <DropdownMenuItem onSelect={() => transition(post, 'archive')} className="gap-2.5">
              <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Archive
            </DropdownMenuItem>
          )}
          {post.published && (
            <DropdownMenuItem onSelect={() => handleCopyLink(post)} className="gap-2.5">
              <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Copy link
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDeleteTarget(post)} className="gap-2.5 text-danger-fg focus:text-danger-fg">
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const dateCell = (post: BlogPostDoc) => {
    if (statusOf(post) === 'scheduled' && post.scheduledAt)
      return (
        <span className="inline-flex items-center gap-1 text-accent">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> {format(new Date(post.scheduledAt), 'd MMM, HH:mm')}
        </span>
      );
    const d = safeDate(post.publishedAt ?? post.date);
    return d ? format(d, 'd MMM yyyy') : '·';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog posts"
        subtitle={`${plural(counts.all, 'post')} · ${counts.published} published · ${counts.scheduled} scheduled · ${plural(counts.draft + counts.in_review, 'draft')}`}
        actions={
          <>
            {counts.scheduled > 0 && (
              <Button variant="outline" onClick={runScheduler} loading={runningScheduler} title="Publish any scheduled posts that are due now">
                <PlayCircle aria-hidden="true" /> Run scheduler
              </Button>
            )}
            <Button onClick={() => navigate('/blogs/new')}>
              Write post <ArrowUpRight aria-hidden="true" />
            </Button>
          </>
        }
      />

      {featured.length > 0 && (
        <section aria-labelledby="featured-heading" className="rounded-2xl border border-border-subtle bg-card p-4">
          <h2 id="featured-heading" className="label mb-3 flex items-center gap-2 text-[11px] text-fg-2">
            <Star className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> Featured on the homepage and blog, in this order
          </h2>
          <ol className="space-y-1.5">
            {featured.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2">
                <span className="tabular w-4 text-[12px] text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{p.title}</span>
                <Button variant="ghost" size="icon-sm" aria-label={`Move ${p.title} up`} disabled={i === 0} onClick={() => moveFeatured(i, -1)}><ArrowUp /></Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Move ${p.title} down`} disabled={i === featured.length - 1} onClick={() => moveFeatured(i, 1)}><ArrowDown /></Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${p.title} from featured`} onClick={() => toggleFeatured(p)}><Star className="fill-accent text-accent" /></Button>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search posts…"
            aria-label="Search posts"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground hover:border-border-strong focus:border-accent focus:outline-none"
          />
        </div>
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-1 rounded-xl border border-border bg-card p-1">
            {filterPills.map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => setFilterStatus(pill.key)}
                aria-pressed={filterStatus === pill.key}
                className={cn('whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors', filterStatus === pill.key ? 'bg-secondary text-foreground' : 'text-fg-2 hover:text-foreground')}
              >
                {pill.label} <span className="tabular">{counts[pill.key]}</span>
              </button>
            ))}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 self-start rounded-xl lg:ml-auto lg:self-auto">
              <ArrowUpDown aria-hidden="true" /> {sortLabels[sortKey]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(sortLabels) as SortKey[]).map((k) => (
              <DropdownMenuItem key={k} onSelect={() => setSortKey(k)}>{sortLabels[k]}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? (
        <div className="h-80 animate-pulse rounded-2xl border border-border-subtle bg-card" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={blogs.length ? 'No posts match' : 'No posts yet'}
          description={blogs.length ? 'Try a different search or filter.' : 'Posts you write here appear on /blog on your site.'}
          action={blogs.length ? undefined : { label: 'Write your first post', onClick: () => navigate('/blogs/new') }}
          secondaryAction={blogs.length ? { label: 'Clear filters', onClick: () => { setSearchQuery(''); setFilterStatus('all'); } } : undefined}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border-subtle bg-card md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="label py-3.5 pl-5 font-medium">Post</th>
                  <th className="label hidden py-3.5 font-medium lg:table-cell">Category</th>
                  <th className="label py-3.5 font-medium">Status</th>
                  <th className="label hidden py-3.5 font-medium xl:table-cell">Date</th>
                  <th className="w-28 py-3.5 pr-4"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => (
                  <tr key={post.id} className="group border-b border-border-subtle transition-colors last:border-0 hover:bg-secondary/30">
                    <td className="py-3.5 pl-5 pr-4">
                      <Link to={`/blogs/${post.id}`} className="flex items-center gap-3.5">
                        <Thumb post={post} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 truncate text-foreground group-hover:underline group-hover:decoration-border-strong group-hover:underline-offset-4">
                            {post.featured && post.published && <Star className="h-3.5 w-3.5 shrink-0 fill-accent text-accent" aria-label="Featured" />}
                            {post.title}
                          </span>
                          <span className="block truncate font-mono text-[13px] text-muted-foreground">/blog/{post.slug}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden py-3.5 pr-4 lg:table-cell">
                      {post.category ? <Badge variant="outline" className="uppercase tracking-[0.06em]">{post.category}</Badge> : <span className="text-muted-foreground">·</span>}
                    </td>
                    <td className="py-3.5 pr-4"><StatusBadge post={post} /></td>
                    <td className="hidden py-3.5 pr-4 font-mono text-[13px] text-muted-foreground xl:table-cell">{dateCell(post)}</td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center justify-end gap-0.5">
                        {post.published && (
                          <Button asChild variant="ghost" size="icon-sm" aria-label={`View ${post.title} on site`}>
                            <a href={postUrl(post)} target="_blank" rel="noopener noreferrer"><Eye /></a>
                          </Button>
                        )}
                        <Button asChild variant="ghost" size="icon-sm" aria-label={`Edit ${post.title}`}>
                          <Link to={`/blogs/${post.id}`}><Pencil /></Link>
                        </Button>
                        <RowMenu post={post} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-card md:hidden">
            {filtered.map((post) => (
              <li key={post.id} className="flex items-center gap-3.5 py-3.5 pl-4 pr-2">
                <Link to={`/blogs/${post.id}`} className="flex min-w-0 flex-1 items-center gap-3.5">
                  <Thumb post={post} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-foreground">{post.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge post={post} />
                      <span className="font-mono text-[13px] text-muted-foreground">{dateCell(post)}</span>
                    </span>
                  </span>
                </Link>
                <RowMenu post={post} />
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this post?"
        description={deleteTarget ? `“${deleteTarget.title}”${deleteTarget.published ? ' is live and' : ''} will be permanently deleted with its revision history.` : undefined}
        confirmLabel="Delete post"
        requireText={deleteTarget?.published ? 'DELETE' : undefined}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default AdminBlogs;
