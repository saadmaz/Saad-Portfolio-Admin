import { useEffect, useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { History, Search } from 'lucide-react';
import { toast } from 'sonner';
import { CommonService } from '@/shared/services/common-service';
import type { ActivityLog } from '@/types';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import { cn, plural, toJsDate } from '@/shared/lib/utils';

type ActionFilter = 'ALL' | 'CREATE' | 'UPDATE' | 'DELETE';

const FILTERS: { key: ActionFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'CREATE', label: 'Created' },
  { key: 'UPDATE', label: 'Updated' },
  { key: 'DELETE', label: 'Deleted' },
];

const verb: Record<string, string> = { CREATE: 'Added', UPDATE: 'Updated', DELETE: 'Deleted' };
const dot: Record<string, string> = {
  CREATE: 'bg-[hsl(var(--status-create))]',
  UPDATE: 'bg-[hsl(var(--status-update))]',
  DELETE: 'bg-[hsl(var(--status-delete))]',
};

const dayLabel = (d: Date) => {
  const date = format(d, 'EEE d MMM');
  if (isToday(d)) return `Today · ${date}`;
  if (isYesterday(d)) return `Yesterday · ${date}`;
  return format(d, 'EEEE · d MMM yyyy');
};

const AdminLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ActionFilter>('ALL');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await CommonService.getActivityLogs();
        setLogs([...data].sort((a, b) => toJsDate(b.timestamp).getTime() - toJsDate(a.timestamp).getTime()));
      } catch {
        toast.error('Failed to load activity logs');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const groups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = logs.filter((log) => {
      if (filter !== 'ALL' && log.action?.toUpperCase() !== filter) return false;
      return !q || [log.adminEmail, log.action, log.entityType, log.details].some((v) => v?.toLowerCase().includes(q));
    });
    const byDay = new Map<string, { label: string; items: ActivityLog[] }>();
    for (const log of filtered) {
      const d = toJsDate(log.timestamp);
      const key = format(d, 'yyyy-MM-dd');
      if (!byDay.has(key)) byDay.set(key, { label: dayLabel(d), items: [] });
      byDay.get(key)!.items.push(log);
    }
    return [...byDay.values()];
  }, [logs, filter, searchQuery]);

  return (
    <div className="space-y-6">
      <PageHeader title="Activity" subtitle={`${plural(logs.length, 'change')} to the site, newest first`} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 font-mono text-[12px] uppercase tracking-[0.06em] transition-colors',
                filter === f.key
                  ? 'border-transparent bg-accent-subtle text-accent'
                  : 'border-border text-fg-2 hover:border-border-strong hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search activity…"
            aria-label="Search activity"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground hover:border-border-strong focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 animate-pulse rounded-2xl border border-border-subtle bg-card" />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={History}
          title={logs.length ? 'No matching activity' : 'No activity yet'}
          description={logs.length ? 'Try a different search or filter.' : 'Every change you make to the site is recorded here.'}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-card">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="label border-b border-border-subtle bg-secondary/50 px-5 py-2.5">{group.label}</h2>
              <ul className="divide-y divide-border-subtle">
                {group.items.map((log) => {
                  const action = log.action?.toUpperCase();
                  return (
                    <li key={log.id} className="flex items-start gap-3.5 px-5 py-4 sm:items-center">
                      <span className={cn('mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full sm:mt-0', dot[action] ?? 'bg-muted-foreground')} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-fg-2">
                          {verb[action] ?? log.action} <span className="text-foreground">{log.entityType}</span>
                        </p>
                        {log.details && <p className="mt-0.5 line-clamp-2 font-mono text-[13px] text-muted-foreground">{log.details}</p>}
                        <p className="mt-1 font-mono text-[13px] text-muted-foreground sm:hidden">
                          {format(toJsDate(log.timestamp), 'HH:mm')} · {log.adminEmail?.split('@')[0]}
                        </p>
                      </div>
                      <span className="hidden shrink-0 rounded-full border border-border px-2.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.06em] text-fg-2 md:inline">
                        {log.entityType}
                      </span>
                      <span className="hidden w-32 shrink-0 text-right font-mono text-[13px] text-muted-foreground sm:inline">
                        {format(toJsDate(log.timestamp), 'HH:mm')} · {log.adminEmail?.split('@')[0]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminLogs;
