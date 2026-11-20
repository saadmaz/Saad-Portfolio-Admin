import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Search, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { suggestRelated } from '@/shared/lib/article';
import type { ArticleSource, BlogPost, BlogPostDoc } from '@/types/blog';
import { PanelSection, TextField } from '../ui';

function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const next = [...list];
  [next[i], next[i + d]] = [next[i + d], next[i]];
  return next;
}

const RowButtons = ({ i, len, onMove, onRemove, label }: { i: number; len: number; onMove: (d: -1 | 1) => void; onRemove: () => void; label: string }) => (
  <span className="flex shrink-0 items-center">
    <button type="button" aria-label={`Move ${label} up`} disabled={i === 0} onClick={() => onMove(-1)} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
    <button type="button" aria-label={`Move ${label} down`} disabled={i === len - 1} onClick={() => onMove(1)} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
    <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="rounded p-1 text-muted-foreground hover:text-danger-fg"><X className="h-3.5 w-3.5" /></button>
  </span>
);

/** Manual picks (shown first, in this order) plus automatic suggestions. */
export function RelatedPanel({
  post,
  update,
  allPosts,
}: {
  post: Partial<BlogPost> & { id?: string };
  update: (p: Partial<BlogPost>) => void;
  allPosts: BlogPostDoc[];
}) {
  const [q, setQ] = useState('');
  const ids = post.relatedPostIds ?? [];
  const byId = useMemo(() => new Map(allPosts.map((p) => [p.id, p])), [allPosts]);
  const candidates = allPosts.filter((p) => p.id !== post.id && p.published && !p.unlisted);
  const results = q.trim()
    ? candidates.filter((p) => !ids.includes(p.id) && p.title.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : [];
  const suggestions = useMemo(
    () => suggestRelated(post, candidates).filter((p) => !ids.includes(p.id)).slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [post.category, post.tags, post.articleType, post.seriesId, post.title, ids.join(), candidates.length],
  );
  const set = (next: string[]) => update({ relatedPostIds: next });

  return (
    <div className="space-y-6">
      <PanelSection title="Chosen articles">
        <p className="text-[12px] text-muted-foreground">Shown first under “Keep reading”, in this order. Up to 3 appear; automatic matches fill any gaps.</p>
        {ids.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[12px] text-muted-foreground">None chosen: related articles are picked automatically.</p>
        ) : (
          <ol className="space-y-1.5">
            {ids.map((id, i) => {
              const p = byId.get(id);
              return (
                <li key={id} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-secondary/50 px-2.5 py-1.5">
                  <span className="tabular w-4 text-[12px] text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                    {p?.title ?? 'Deleted post'}
                    {p && !p.published && <span className="ml-1 text-[11px] text-warning-fg">(not live, skipped)</span>}
                  </span>
                  <RowButtons i={i} len={ids.length} label="article" onMove={(d) => set(move(ids, i, d))} onRemove={() => set(ids.filter((x) => x !== id))} />
                </li>
              );
            })}
          </ol>
        )}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search published articles…" aria-label="Search published articles" className="h-9 w-full rounded-lg border border-border bg-secondary pl-8 pr-2 text-[13px] text-foreground outline-none focus:border-accent" />
        </div>
        {results.length > 0 && (
          <ul className="space-y-1">
            {results.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => (set([...ids, p.id]), setQ(''))} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-fg-2 hover:bg-secondary hover:text-foreground">
                  <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> <span className="truncate">{p.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>

      <PanelSection title="Suggestions">
        {suggestions.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">Add a category and tags to get suggestions.</p>
        ) : (
          <ul className="space-y-1">
            {suggestions.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-fg-2">{p.title}</span>
                <Button type="button" size="xs" variant="ghost" onClick={() => set([...ids, p.id])}>Add</Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[12px] text-muted-foreground">Based on shared category, tags, article type, series and title words.</p>
      </PanelSection>
    </div>
  );
}

const emptySource: ArticleSource = { title: '', url: '', publisher: '', note: '' };

export function SourcesPanel({ post, update }: { post: Partial<BlogPost>; update: (p: Partial<BlogPost>) => void }) {
  const sources = post.sources ?? [];
  const set = (next: ArticleSource[]) => update({ sources: next });
  const patch = (i: number, p: Partial<ArticleSource>) => set(sources.map((s, k) => (k === i ? { ...s, ...p } : s)));
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-muted-foreground">
        Listed as numbered references at the end of the article, or wherever you insert a “Sources & references” block.
      </p>
      {sources.map((s, i) => (
        <fieldset key={i} className="space-y-2 rounded-lg border border-border-subtle p-3">
          <legend className="flex w-full items-center justify-between px-1">
            <span className="label text-[11px] text-fg-2">Source {i + 1}</span>
          </legend>
          <div className="flex justify-end -mt-2">
            <RowButtons i={i} len={sources.length} label={`source ${i + 1}`} onMove={(d) => set(move(sources, i, d))} onRemove={() => set(sources.filter((_, k) => k !== i))} />
          </div>
          <TextField label="Title" required value={s.title} onChange={(title) => patch(i, { title })} placeholder="Report or article title" error={!s.title.trim() ? 'Add a title (empty sources are skipped)' : undefined} />
          <TextField label="URL" type="url" value={s.url ?? ''} onChange={(url) => patch(i, { url })} placeholder="https://" error={s.url && !/^https?:\/\//i.test(s.url) ? 'Must start with https://' : undefined} />
          <TextField label="Publisher" value={s.publisher ?? ''} onChange={(publisher) => patch(i, { publisher })} placeholder="e.g. McKinsey, 2025" />
          <TextField label="Note" value={s.note ?? ''} onChange={(note) => patch(i, { note })} />
        </fieldset>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => set([...sources, { ...emptySource }])}>
        <Plus aria-hidden="true" /> Add source
      </Button>
    </div>
  );
}
