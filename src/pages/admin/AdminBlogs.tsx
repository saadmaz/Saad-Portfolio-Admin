import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpDown, ArrowUpRight, BookOpen, Eye, EyeOff, Globe, MoreHorizontal, Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { SITE_URL } from '@/components/admin/navConfig';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BlogService } from '@/services/blog-service';
import type { BlogPost } from '@/types';
import { cn, plural } from '@/shared/lib/utils';

type SortKey = 'newest' | 'oldest' | 'az';
type FilterKey = 'all' | 'published' | 'scheduled' | 'draft';

const statusOf = (post: BlogPost): Exclude<FilterKey, 'all'> => {
  if (post.published) return 'published';
  if (post.scheduledDate && new Date(post.scheduledDate).getTime() > Date.now()) return 'scheduled';
  return 'draft';
};

const safeDate = (value?: string) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const StatusBadge = ({ post }: { post: BlogPost }) => {
  const status = statusOf(post);
  if (status === 'published') return <Badge variant="success" dot>Published</Badge>;
  if (status === 'scheduled') return <Badge variant="accent" dot>Scheduled</Badge>;
  return <Badge variant="neutral" dot>Draft</Badge>;
};

const Thumb = ({ post }: { post: BlogPost }) => (
  <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-secondary">
    {post.image ? (
      <img src={post.image} alt="" className="h-full w-full object-cover" loading="lazy" />
    ) : (
      <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    )}
  </span>
);

const AdminBlogs = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setBlogs(await BlogService.getAll());
      } catch {
        toast.error('Failed to load blog posts');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const counts = useMemo(() => {
    const c = { all: blogs.length, published: 0, scheduled: 0, draft: 0 };
    blogs.forEach((b) => { c[statusOf(b)] += 1; });
    return c;
  }, [blogs]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = blogs.filter((b) => {
      if (filterStatus !== 'all' && statusOf(b) !== filterStatus) return false;
      return !q || [b.title, b.excerpt, b.slug, b.category].some((v) => v?.toLowerCase().includes(q));
    });
    const time = (b: BlogPost) => safeDate(b.date)?.getTime() ?? 0;
    if (sortKey === 'newest') result.sort((a, b) => time(b) - time(a));
    else if (sortKey === 'oldest') result.sort((a, b) => time(a) - time(b));
    else result.sort((a, b) => a.title.localeCompare(b.title));
    return result;
  }, [blogs, searchQuery, filterStatus, sortKey]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await BlogService.delete(deleteTarget.id);
      setBlogs((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      toast.success(`“${deleteTarget.title}” deleted`);
    } catch {
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    const newState = !post.published;
    setTogglingId(post.id);
    try {
      await BlogService.update(post.id, { published: newState });
      setBlogs((prev) => prev.map((b) => (b.id === post.id ? { ...b, published: newState } : b)));
      toast.success(newState ? `“${post.title}” published` : `“${post.title}” moved to drafts`);
    } catch {
      toast.error('Failed to update post status');
    } finally {
      setTogglingId(null);
    }
  };

  const filterPills: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'published', label: 'Published' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'draft', label: 'Drafts' },
  ];
  const sortLabels: Record<SortKey, string> = { newest: 'Newest', oldest: 'Oldest', az: 'A–Z' };

  const RowMenu = ({ post }: { post: BlogPost }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${post.title}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => navigate(`/blogs/${post.id}`)} className="gap-2.5">
          <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem disabled={togglingId === post.id} onSelect={() => handleTogglePublish(post)} className="gap-2.5">
          {post.published
            ? <><EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Move to drafts</>
            : <><Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Publish</>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setDeleteTarget(post)} className="gap-2.5 text-danger-fg focus:text-danger-fg">
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog posts"
        subtitle={`${plural(counts.all, 'post')} · ${counts.published} published · ${counts.scheduled} scheduled · ${plural(counts.draft, 'draft')}`}
        actions={
          <Button onClick={() => navigate('/blogs/new')}>
            Write post <ArrowUpRight aria-hidden="true" />
          </Button>
        }
      />

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
                className={cn(
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors',
                  filterStatus === pill.key ? 'bg-secondary text-foreground' : 'text-fg-2 hover:text-foreground',
                )}
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
                {filtered.map((post) => {
                  const date = safeDate(post.date);
                  return (
                    <tr key={post.id} className="group border-b border-border-subtle transition-colors last:border-0 hover:bg-secondary/30">
                      <td className="py-3.5 pl-5 pr-4">
                        <Link to={`/blogs/${post.id}`} className="flex items-center gap-3.5">
                          <Thumb post={post} />
                          <span className="min-w-0">
                            <span className="block truncate text-foreground group-hover:underline group-hover:decoration-border-strong group-hover:underline-offset-4">{post.title}</span>
                            <span className="block truncate font-mono text-[13px] text-muted-foreground">/blog/{post.slug}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="hidden py-3.5 pr-4 lg:table-cell">
                        {post.category ? <Badge variant="outline" className="uppercase tracking-[0.06em]">{post.category}</Badge> : <span className="text-muted-foreground">·</span>}
                      </td>
                      <td className="py-3.5 pr-4"><StatusBadge post={post} /></td>
                      <td className="hidden py-3.5 pr-4 font-mono text-[13px] text-muted-foreground xl:table-cell">
                        {date ? format(date, 'd MMM yyyy') : '·'}
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button asChild variant="ghost" size="icon-sm" aria-label={`View ${post.title} on site`}>
                            <a href={`${SITE_URL}/blog/${post.slug}`} target="_blank" rel="noopener noreferrer"><Eye /></a>
                          </Button>
                          <Button asChild variant="ghost" size="icon-sm" aria-label={`Edit ${post.title}`}>
                            <Link to={`/blogs/${post.id}`}><Pencil /></Link>
                          </Button>
                          <RowMenu post={post} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-card md:hidden">
            {filtered.map((post) => {
              const date = safeDate(post.date);
              return (
                <li key={post.id} className="flex items-center gap-3.5 py-3.5 pl-4 pr-2">
                  <Link to={`/blogs/${post.id}`} className="flex min-w-0 flex-1 items-center gap-3.5">
                    <Thumb post={post} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] text-foreground">{post.title}</span>
                      <span className="mt-1 flex items-center gap-2">
                        <StatusBadge post={post} />
                        {date && <span className="font-mono text-[13px] text-muted-foreground">{format(date, 'd MMM')}</span>}
                      </span>
                    </span>
                  </Link>
                  <RowMenu post={post} />
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this post?"
        description={deleteTarget ? `“${deleteTarget.title}” will be removed from your site. This can’t be undone.` : undefined}
        confirmLabel="Delete post"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default AdminBlogs;
