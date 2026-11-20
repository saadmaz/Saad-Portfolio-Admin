import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Layers, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import RowActions from '@/components/admin/RowActions';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { ROW_CARD, ROW_META, ROW_TITLE, SKELETON } from '@/components/admin/listStyles';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { EditorSheet } from '@/components/admin/blog/EditorSheet';
import { ImageAssetField } from '@/components/admin/blog/ImageAssetField';
import { Switch, TextAreaField, TextField } from '@/components/admin/blog/ui';
import { SITE_URL } from '@/components/admin/navConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SeriesService } from '@/services/blog-collections';
import { BlogService } from '@/services/blog-service';
import { SLUG_RE, STATUS_LABELS, slugify, statusOf } from '@/shared/lib/article';
import { cn, plural } from '@/shared/lib/utils';
import type { BlogPostDoc, BlogSeries } from '@/types/blog';

/**
 * A post joins a series through its `seriesId` (set here or in the post's
 * Details tab); the series' `postIds` holds the reading order.
 */
const AdminSeries = () => {
  const [series, setSeries] = useState<BlogSeries[]>([]);
  const [posts, setPosts] = useState<BlogPostDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<BlogSeries> | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BlogSeries | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([SeriesService.getAll(), BlogService.getAll()]);
      setSeries(s);
      setPosts(p);
    } catch {
      toast.error('Failed to load series');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const membersOf = useCallback(
    (s: Partial<BlogSeries>) => {
      const inSeries = posts.filter((p) => p.seriesId && p.seriesId === s.id);
      const ordered = (s.postIds ?? []).filter((id) => inSeries.some((p) => p.id === id));
      const rest = inSeries.filter((p) => !ordered.includes(p.id)).sort((a, b) => (a.publishedAt ?? a.date).localeCompare(b.publishedAt ?? b.date));
      return [...ordered, ...rest.map((p) => p.id)];
    },
    [posts],
  );

  const open = (s: Partial<BlogSeries>) => {
    setEditing(s);
    setOrder(s.id ? membersOf(s) : []);
  };
  const add = useCallback(() => open({ published: true, postIds: [] }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useCreateIntent(add);

  const e = editing ?? {};
  const patch = (p: Partial<BlogSeries>) => setEditing((x) => ({ ...x, ...p }));
  const byId = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const available = posts.filter((p) => !order.includes(p.id) && statusOf(p) !== 'archived');
  const slugTaken = !!e.slug && series.some((s) => s.slug === e.slug && s.id !== e.id);
  const invalid = !e.title?.trim() || !SLUG_RE.test(e.slug ?? '') || slugTaken;

  const save = async () => {
    if (!editing || invalid) return;
    setSaving(true);
    try {
      const id = await SeriesService.save({ ...editing, postIds: order });
      // Membership lives on the posts: add new members, release removed ones.
      const before = posts.filter((p) => p.seriesId === id).map((p) => p.id);
      await Promise.all([
        ...order.filter((pid) => !before.includes(pid)).map((pid) => BlogService.patch(pid, { seriesId: id })),
        ...before.filter((pid) => !order.includes(pid)).map((pid) => BlogService.patch(pid, { seriesId: undefined })),
      ]);
      toast.success('Series saved');
      setEditing(null);
      load();
    } catch {
      toast.error('Could not save the series');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await Promise.all(posts.filter((p) => p.seriesId === deleteTarget.id).map((p) => BlogService.patch(p.id, { seriesId: undefined })));
      await SeriesService.delete(deleteTarget.id);
      toast.success('Series deleted; its articles stay published.');
      load();
    } catch {
      toast.error('Could not delete the series');
    } finally {
      setDeleteTarget(null);
    }
  };

  const move = (i: number, d: -1 | 1) => {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setOrder(next);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Series" subtitle={`${plural(series.length, 'series', 'series')} · grouped, ordered articles`} actions={<Button onClick={add}><Plus aria-hidden="true" /> New series</Button>} />
      <div className="grid gap-3">
        {loading ? (
          [1, 2].map((i) => <div key={i} className={cn(SKELETON, 'h-[78px]')} />)
        ) : series.length === 0 ? (
          <EmptyState icon={Layers} title="No series yet" description="Group related articles into a series. Readers get a progress bar, the full list of parts, and previous/next links." action={{ label: 'New series', onClick: add }} />
        ) : (
          series.map((s) => {
            const count = membersOf(s).length;
            return (
              <Card key={s.id} className={ROW_CARD}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-4">
                    {s.cover?.url ? <img src={s.cover.url} alt="" className="h-11 w-16 rounded-lg object-cover" /> : <span className="flex h-11 w-16 items-center justify-center rounded-lg bg-secondary"><Layers className="h-5 w-5 text-muted-foreground" /></span>}
                    <div className="min-w-0">
                      <h3 className={cn(ROW_TITLE, 'flex items-center gap-2 truncate')}>{s.title} {!s.published && <Badge variant="neutral">Hidden</Badge>}</h3>
                      <p className={ROW_META}>{plural(count, 'article')} · /blog/series/{s.slug}</p>
                    </div>
                  </div>
                  <RowActions label={`series ${s.title}`} href={s.published ? `${SITE_URL}/blog/series/${s.slug}` : undefined} onEdit={() => open(s)} onDelete={() => setDeleteTarget(s)} />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <EditorSheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={e.id ? 'Edit series' : 'New series'} onSave={save} saving={saving} disabled={invalid}>
        <TextField label="Title" required value={e.title ?? ''} onChange={(title) => patch(e.id ? { title } : { title, slug: slugify(title) })} />
        <TextField label="URL slug" required value={e.slug ?? ''} onChange={(slug) => patch({ slug: slugify(slug) })} hint={`/blog/series/${e.slug || 'slug'}`} error={slugTaken ? 'Another series uses this slug' : undefined} />
        <TextAreaField label="Description" value={e.description ?? ''} onChange={(description) => patch({ description })} max={300} />
        <ImageAssetField label="Cover image" purpose="cover" folder="blog/series" nameHint={e.slug} value={e.cover} onChange={(cover) => patch({ cover: cover ?? undefined })} />
        <Switch checked={e.published !== false} onChange={(published) => patch({ published })} label="Visible on the site" description="Hidden series keep their articles but show no series page or navigation." />
        <div className="space-y-2">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Articles, in reading order</span>
          {order.length === 0 && <p className="text-[13px] text-muted-foreground">No articles yet.</p>}
          <ol className="space-y-1.5">
            {order.map((pid, i) => {
              const p = byId.get(pid);
              return (
                <li key={pid} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-secondary/50 px-2.5 py-1.5">
                  <span className="tabular w-5 text-[12px] text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{p?.title ?? 'Deleted post'}</span>
                  {p && <Badge variant="neutral">{STATUS_LABELS[statusOf(p)]}</Badge>}
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={i === order.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove from series" onClick={() => setOrder(order.filter((x) => x !== pid))}><X /></Button>
                </li>
              );
            })}
          </ol>
          <select
            aria-label="Add an article"
            value=""
            onChange={(ev) => ev.target.value && setOrder([...order, ev.target.value])}
            className="h-9 w-full rounded-lg border border-border bg-secondary px-2 text-[13px] text-foreground"
          >
            <option value="">+ Add an article…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>{p.title}{p.seriesId && p.seriesId !== e.id ? ' (moves from another series)' : ''}</option>
            ))}
          </select>
          <p className="text-[12px] text-muted-foreground">Only published parts appear on the site; drafts take their place when they go live.</p>
        </div>
      </EditorSheet>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Delete series?" description="The series page and navigation are removed. The articles themselves are not deleted." confirmLabel="Delete series" onConfirm={remove} />
    </div>
  );
};

export default AdminSeries;
