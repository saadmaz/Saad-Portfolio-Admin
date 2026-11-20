import { useCallback, useEffect, useMemo, useState } from 'react';
import { GitCompare, History, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/shared/lib/utils';
import { diffHtml } from '@/shared/lib/diff';
import { BlogService } from '@/services/blog-service';
import type { BlogPost, Revision } from '@/types/blog';

const FIELD_LABELS: Partial<Record<keyof BlogPost, string>> = {
  title: 'Title', subtitle: 'Subtitle', slug: 'Slug', excerpt: 'Excerpt', category: 'Category', articleType: 'Type',
  tags: 'Tags', seoTitle: 'SEO title', metaDescription: 'SEO description', canonicalUrl: 'Canonical', noIndex: 'No-index',
  unlisted: 'Unlisted', featured: 'Featured', authorId: 'Author', seriesId: 'Series', cover: 'Cover image',
  socialImage: 'Social image', sources: 'Sources', relatedPostIds: 'Related',
};

const show = (v: unknown) =>
  v === undefined || v === null || v === '' ? '—' : typeof v === 'object' ? ((v as { url?: string }).url ?? JSON.stringify(v)) : String(v);

function RevisionDiff({ before, after }: { before: Partial<BlogPost>; after: Partial<BlogPost> }) {
  const fields = (Object.keys(FIELD_LABELS) as (keyof BlogPost)[]).filter((f) => JSON.stringify(before[f] ?? null) !== JSON.stringify(after[f] ?? null));
  const blocks = useMemo(() => diffHtml(before.content ?? '', after.content ?? ''), [before.content, after.content]);
  const changed = blocks.filter((b) => b.type !== 'eq');
  return (
    <div className="space-y-5">
      {fields.length > 0 && (
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-1 pr-3 font-medium">Field</th>
              <th className="py-1 pr-3 font-medium">Before</th>
              <th className="py-1 font-medium">After</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f} className="border-t border-border-subtle align-top">
                <td className="py-1.5 pr-3 text-muted-foreground">{FIELD_LABELS[f]}</td>
                <td className="py-1.5 pr-3 text-danger-fg line-through decoration-danger-fg/40 [overflow-wrap:anywhere]">{show(before[f])}</td>
                <td className="py-1.5 text-success-fg [overflow-wrap:anywhere]">{show(after[f])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div>
        <p className="label mb-2 text-[11px] text-fg-2">Content · {changed.length} changed block{changed.length === 1 ? '' : 's'}</p>
        {changed.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No content changes.</p>
        ) : (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto rounded-lg border border-border-subtle bg-background p-3 text-[13px] leading-relaxed">
            {blocks.map((b, i) =>
              b.type === 'eq' ? null : (
                <p key={i} className={cn('rounded px-2 py-1', b.type === 'add' && 'bg-success-subtle', b.type === 'del' && 'bg-danger-subtle', b.type === 'change' && 'bg-secondary')}>
                  {b.words.map((w, k) => (
                    <span key={k} className={cn(w.type === 'add' && 'text-success-fg', w.type === 'del' && 'text-danger-fg line-through')}>
                      {w.text}{' '}
                    </span>
                  ))}
                </p>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Revision history: who changed what and when, compare any version with the
 * current editor content, and restore (the current version is kept as a
 * revision first, so restoring is itself undoable).
 */
export function HistoryPanel({
  postId,
  current,
  onRestore,
  refreshKey,
}: {
  postId: string | null;
  current: Partial<BlogPost>;
  onRestore: (snapshot: Partial<BlogPost>) => Promise<void>;
  refreshKey: number;
}) {
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [compare, setCompare] = useState<Revision | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!postId) return;
    BlogService.listRevisions(postId).then(setRevisions).catch(() => {
      setRevisions([]);
      toast.error('Could not load revision history');
    });
  }, [postId]);
  useEffect(load, [load, refreshKey]);

  if (!postId) return <p className="text-[13px] text-muted-foreground">History starts once the post is saved.</p>;
  if (!revisions) return <div className="h-40 animate-pulse rounded-lg bg-secondary" />;

  const restore = async (r: Revision) => {
    setRestoring(r.id);
    try {
      await BlogService.addRevision(postId, current, 'Before restoring an earlier version');
      await onRestore(r.snapshot);
      toast.success('Earlier version restored into the editor. It saves like any other edit.');
      setCompare(null);
      load();
    } catch {
      toast.error('Could not restore this version');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground">Saved on publish, update, schedule, manual saves and every 10 minutes of editing.</p>
      {revisions.length === 0 ? (
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground"><History className="h-4 w-4" aria-hidden="true" /> No revisions yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {revisions.map((r) => (
            <li key={r.id} className="rounded-lg border border-border-subtle bg-secondary/40 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] text-foreground">{r.reason}</p>
                  <p className="tabular text-[12px] text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()} · {r.by}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" size="icon-sm" variant="ghost" aria-label="Compare with current" onClick={() => setCompare(r)}><GitCompare /></Button>
                  <Button type="button" size="icon-sm" variant="ghost" aria-label="Restore this version" disabled={!!restoring} onClick={() => restore(r)}>
                    {restoring === r.id ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Dialog open={!!compare} onOpenChange={(o) => !o && setCompare(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Compare with current</DialogTitle>
            <DialogDescription>
              {compare && `${compare.reason} · ${new Date(compare.createdAt).toLocaleString()}`} → what’s in the editor now.
            </DialogDescription>
          </DialogHeader>
          {compare && <RevisionDiff before={compare.snapshot} after={current} />}
          {compare && (
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => restore(compare)} loading={restoring === compare.id}>
                <RotateCcw aria-hidden="true" /> Restore this version
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
