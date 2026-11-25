import { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { Download, Search, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import { cn, toJsDate } from '@/shared/lib/utils';
import { subscribersCsv, type Subscriber } from '@/shared/lib/subscribers';
import type { FirestoreLikeTimestamp } from '@/types';

const STATUS_STYLE: Record<Subscriber['status'], string> = {
  active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  unsubscribed: 'bg-muted text-muted-foreground',
};
const SERIES_LABEL: Record<string, string> = { founder: 'Founder notes', cse: 'Engineering' };

const dateOf = (v: unknown) => {
  if (!v) return '';
  const d = toJsDate(v as FirestoreLikeTimestamp);
  return d.getTime() ? format(d, 'yyyy-MM-dd') : '';
};

/** Newsletter subscribers collected by /api/subscribe (double opt-in). */
const AdminSubscribers = () => {
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'all' | Subscriber['status']>('all');
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState<Subscriber | null>(null);

  useEffect(() => {
    getDocs(collection(db, 'subscribers'))
      .then((snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Subscriber, 'id'>) }))))
      .catch(() => toast.error('Could not load subscribers. Are the Firestore rules deployed?'))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { all: rows.length, active: 0, pending: 0, unsubscribed: 0 };
    rows.forEach((r) => c[r.status]++);
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (status === 'all' || r.status === status) && (!q || r.email.includes(q)))
      .sort((a, b) => toJsDate(b.created_at as FirestoreLikeTimestamp).getTime() - toJsDate(a.created_at as FirestoreLikeTimestamp).getTime());
  }, [rows, status, query]);

  const exportCsv = () => {
    const blob = new Blob([subscribersCsv(rows, dateOf)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `subscribers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await deleteDoc(doc(db, 'subscribers', toDelete.id));
      setRows((r) => r.filter((x) => x.id !== toDelete.id));
      toast.success('Subscriber removed');
    } catch {
      toast.error('Could not remove subscriber');
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscribers"
        subtitle={`${counts.active} active · ${counts.pending} awaiting confirmation · ${counts.unsubscribed} unsubscribed`}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!counts.active}>
            <Download className="h-4 w-4" /> Export active (CSV)
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search email" className="h-8 w-56 pl-8 text-[13px]" />
        </div>
        {(['all', 'active', 'pending', 'unsubscribed'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              'rounded-full border px-3 py-1 text-[13px] capitalize transition-colors',
              status === s ? 'border-accent bg-secondary font-medium text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {s} <span className="text-muted-foreground">{counts[s]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-40 w-full animate-pulse rounded-xl border border-border-subtle bg-card" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No subscribers yet" description="Sign-ups from the site's newsletter forms appear here once confirmed or pending." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-[13px]">
            <thead className="bg-secondary text-left text-[12px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Series</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Signed up</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="group border-t border-border">
                  <td className="px-3 py-2 font-medium text-foreground">{r.email}</td>
                  <td className="px-3 py-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', STATUS_STYLE[r.status])}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{(r.topics ?? []).map((t) => SERIES_LABEL[t] ?? t).join(', ')}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.source ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{dateOf(r.created_at) || '—'}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setToDelete(r)}
                      aria-label={`Remove ${r.email}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-danger-fg hover:bg-danger-subtle md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No subscribers match.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Remove subscriber?"
        description={toDelete ? `${toDelete.email} will be permanently deleted from the list.` : ''}
        confirmLabel="Remove"
        onConfirm={remove}
      />
    </div>
  );
};

export default AdminSubscribers;
