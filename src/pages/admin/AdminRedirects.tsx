import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, CornerDownRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import SearchInput from '@/components/admin/SearchInput';
import RowActions from '@/components/admin/RowActions';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { SKELETON } from '@/components/admin/listStyles';
import { EditorSheet } from '@/components/admin/blog/EditorSheet';
import { SelectField, TextField } from '@/components/admin/blog/ui';
import { SITE_URL } from '@/components/admin/navConfig';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RedirectService } from '@/services/blog-service';
import { SiteApi, rebuildMessage } from '@/services/site-api';
import { redirectProblem } from '@/shared/lib/article';
import { cn, plural } from '@/shared/lib/utils';
import type { Redirect } from '@/types/blog';

/**
 * Redirects are served as real HTTP 301/302s by the site's edge middleware
 * (from a snapshot taken at build time; saving here queues a rebuild) and
 * honoured client-side immediately for article URLs.
 */
const AdminRedirects = () => {
  const [items, setItems] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Partial<Redirect> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Redirect | null>(null);
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    try {
      setItems(await RedirectService.getAll());
    } catch {
      toast.error('Failed to load redirects');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // Arriving from the 404 monitor with ?from=/missing-path.
  useEffect(() => {
    const from = params.get('from');
    if (from) {
      setEditing({ from, to: '', statusCode: 301, source: 'manual' });
      setParams((p) => { p.delete('from'); return p; }, { replace: true });
    }
  }, [params, setParams]);

  const problem = editing ? redirectProblem(items, editing.from ?? '', editing.to ?? '', editing.id) : null;
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((r) => !s || r.from.includes(s) || r.to.toLowerCase().includes(s)).sort((a, b) => a.from.localeCompare(b.from));
  }, [items, q]);

  const afterChange = () =>
    SiteApi.rebuild('redirects changed').then((r) => toast.message(rebuildMessage(r))).catch(() => undefined);

  const save = async () => {
    if (!editing || problem) return;
    setSaving(true);
    try {
      const data = { from: editing.from!, to: editing.to!, statusCode: editing.statusCode === 302 ? 302 : 301, source: editing.source ?? 'manual' } as const;
      if (editing.id) await RedirectService.update(editing.id, data);
      else await RedirectService.create(data);
      toast.success('Redirect saved');
      setEditing(null);
      load();
      afterChange();
    } catch {
      toast.error('Could not save the redirect');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await RedirectService.delete(deleteTarget.id);
      toast.success('Redirect removed');
      load();
      afterChange();
    } catch {
      toast.error('Could not remove the redirect');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Redirects"
        subtitle={`${plural(items.length, 'redirect')} · created automatically when a live article's URL changes`}
        actions={<Button onClick={() => setEditing({ from: '', to: '', statusCode: 301, source: 'manual' })}><Plus aria-hidden="true" /> Add redirect</Button>}
      />
      <SearchInput value={q} onChange={setQ} placeholder="Search paths…" />

      {loading ? (
        <div className={cn(SKELETON, 'h-40')} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={CornerDownRight} title={items.length ? 'No matches' : 'No redirects yet'} description={items.length ? 'Try another search.' : 'Changing the slug of a published article adds one here automatically. Add your own for moved or retired pages.'} />
      ) : (
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-card">
          {filtered.map((r) => (
            <li key={r.id} className="group flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 font-mono text-[13px]">
                <span className="text-foreground">{r.from}</span>
                <ArrowRight className="mx-2 inline h-3.5 w-3.5 text-muted-foreground" aria-label="redirects to" />
                <span className="text-fg-2 [overflow-wrap:anywhere]">{r.to}</span>
              </span>
              <Badge variant="outline">{r.statusCode === 302 ? '302 temporary' : '301 permanent'}</Badge>
              <Badge variant={r.source === 'auto' ? 'info' : 'neutral'}>{r.source === 'auto' ? 'Automatic' : 'Manual'}</Badge>
              <RowActions label={`redirect from ${r.from}`} href={`${SITE_URL}${r.from}`} onEdit={() => setEditing(r)} onDelete={() => setDeleteTarget(r)} />
            </li>
          ))}
        </ul>
      )}

      <EditorSheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing?.id ? 'Edit redirect' : 'Add redirect'} onSave={save} saving={saving} disabled={!!problem}>
        <TextField label="From (old path)" required value={editing?.from ?? ''} onChange={(from) => setEditing((e) => ({ ...e, from }))} placeholder="/blog/old-post" />
        <TextField label="To (new path or full URL)" required value={editing?.to ?? ''} onChange={(to) => setEditing((e) => ({ ...e, to }))} placeholder="/blog/new-post" />
        <SelectField
          label="Type"
          value={String(editing?.statusCode ?? 301)}
          onChange={(v) => setEditing((e) => ({ ...e, statusCode: v === '302' ? 302 : 301 }))}
          options={[
            { value: '301', label: '301 · Permanent (moves search rankings)' },
            { value: '302', label: '302 · Temporary' },
          ]}
        />
        {problem && editing?.from && editing?.to && <p role="alert" className="text-[13px] text-danger-fg">{problem}</p>}
        <p className="text-[12px] text-muted-foreground">Chains are avoided automatically for article slug changes, and loops are rejected here.</p>
      </EditorSheet>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} title="Remove redirect?" description={deleteTarget ? `${deleteTarget.from} will return “not found” again unless a page exists there.` : undefined} confirmLabel="Remove redirect" onConfirm={remove} />
    </div>
  );
};

export default AdminRedirects;
