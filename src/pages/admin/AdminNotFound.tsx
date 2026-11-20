import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownRight, FileQuestion, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import { SKELETON } from '@/components/admin/listStyles';
import { Button } from '@/components/ui/button';
import { NotFoundService } from '@/services/blog-collections';
import { RedirectService } from '@/services/blog-service';
import { normalizePath } from '@/shared/lib/article';
import { cn, plural } from '@/shared/lib/utils';
import type { NotFoundEntry } from '@/types/blog';

const topReferrers = (refs?: Record<string, number>) =>
  Object.entries(refs ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([host, n]) => `${host.replace(/_/g, '.')} (${n})`)
    .join(', ');

/**
 * Missing pages visitors actually hit, most frequent first. Recorded by the
 * site's 404 page (path without query string, referrer host, counts; no IPs).
 */
const AdminNotFound = () => {
  const [items, setItems] = useState<NotFoundEntry[]>([]);
  const [redirected, setRedirected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [entries, redirects] = await Promise.all([NotFoundService.top(), RedirectService.getAll()]);
      setItems(entries);
      setRedirected(new Set(redirects.map((r) => normalizePath(r.from))));
    } catch {
      toast.error('Failed to load the 404 log');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const dismiss = async (e: NotFoundEntry) => {
    setItems((prev) => prev.filter((x) => x.id !== e.id));
    await NotFoundService.dismiss(e.id).catch(() => {
      toast.error('Could not dismiss');
      load();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="404 monitor" subtitle={`${plural(items.length, 'missing path')} requested · fix the frequent ones with a redirect`} />
      {loading ? (
        <div className={cn(SKELETON, 'h-40')} />
      ) : items.length === 0 ? (
        <EmptyState icon={FileQuestion} title="No missing pages recorded" description="When visitors land on a page that doesn't exist, it shows up here with how often it happens and where they came from." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="label py-3 pl-4 font-medium">Path</th>
                <th className="label py-3 font-medium">Hits</th>
                <th className="label py-3 font-medium">Last seen</th>
                <th className="label py-3 font-medium">Top referrers</th>
                <th className="py-3 pr-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-b border-border-subtle last:border-0">
                  <td className="py-3 pl-4 pr-3 font-mono text-[13px] text-foreground [overflow-wrap:anywhere]">{e.path}</td>
                  <td className="tabular py-3 pr-3">{e.count}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{e.lastSeen ? formatDistanceToNow(new Date(e.lastSeen), { addSuffix: true }) : '·'}</td>
                  <td className="py-3 pr-3 text-[13px] text-muted-foreground">{topReferrers(e.referrers) || '·'}</td>
                  <td className="py-3 pr-4">
                    <div className="flex justify-end gap-1">
                      {redirected.has(normalizePath(e.path)) ? (
                        <span className="px-2 text-[12px] text-success-fg">Redirected</span>
                      ) : (
                        <Button size="xs" variant="outline" onClick={() => navigate(`/redirects?from=${encodeURIComponent(e.path)}`)}>
                          <CornerDownRight aria-hidden="true" /> Redirect
                        </Button>
                      )}
                      <Button size="icon-sm" variant="ghost" aria-label={`Dismiss ${e.path}`} onClick={() => dismiss(e)}><Trash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminNotFound;
