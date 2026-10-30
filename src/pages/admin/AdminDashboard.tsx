import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  ArrowRight, BadgeCheck, BookOpen, CheckCircle2, Code2, ImageIcon, Inbox, PenLine,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CommonService } from '@/shared/services/common-service';
import { cn, plural, toJsDate } from '@/shared/lib/utils';
import { createActions } from '@/components/admin/navConfig';
import { useAdminOverview } from '@/components/admin/useAdminOverview';
import type { ActivityLog } from '@/types';

/* ── Helpers ───────────────────────────────────────────────────── */

const DAY = 24 * 60 * 60 * 1000;

const parseDate = (value: unknown): Date | null => {
  if (!value) return null;
  const d = typeof value === 'object' && value !== null && 'toDate' in value
    ? (value as { toDate: () => Date }).toDate()
    : new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "2h", "3d", "1w" for tight meta columns. */
const shortAgo = (date: Date) => {
  const diff = Date.now() - date.getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.round(days / 7);
  if (weeks < 9) return `${weeks}w`;
  return format(date, 'MMM yyyy');
};

/** Cumulative count at the end of each of the last `months` months. Null when no item has a date. */
const growthSeries = (dates: (Date | null)[], months = 12): number[] | null => {
  const known = dates.filter((d): d is Date => d !== null);
  if (known.length < 2) return null;
  const undated = dates.length - known.length;
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const end = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i) + 1, 1);
    return undated + known.filter((d) => d < end).length;
  });
};

const countSince = (dates: (Date | null)[], days: number) =>
  dates.filter((d) => d && Date.now() - d.getTime() <= days * DAY).length;

const actionVerb: Record<string, string> = { CREATE: 'Added', UPDATE: 'Updated', DELETE: 'Deleted' };
const actionDot: Record<string, string> = {
  CREATE: 'bg-[hsl(var(--status-create))]',
  UPDATE: 'bg-[hsl(var(--status-update))]',
  DELETE: 'bg-[hsl(var(--status-delete))]',
};

/* ── Pieces ────────────────────────────────────────────────────── */

const Sparkline = ({ points }: { points: number[] }) => {
  const w = 98;
  const h = 22;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${((i / (points.length - 1)) * w).toFixed(1)},${(h - 1 - ((p - min) / span) * (h - 2)).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="shrink-0 overflow-visible" aria-hidden="true">
      <path d={d} stroke="hsl(var(--accent))" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

interface KpiProps {
  label: string;
  icon: LucideIcon;
  value: number | undefined;
  note: string;
  tone?: 'live' | 'muted' | 'accent';
  to: string;
  highlight?: boolean;
  series?: number[] | null;
}

const Kpi = ({ label, icon: Icon, value, note, tone = 'muted', to, highlight, series }: KpiProps) => (
  <Link
    to={to}
    className={cn(
      'group flex flex-col gap-3.5 rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:p-5',
      highlight
        ? 'border-accent bg-background hover:bg-card'
        : 'border-border-subtle bg-card hover:border-border',
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="label truncate">{label}</span>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-fg-2">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </div>
    <div className="flex items-end justify-between gap-3">
      {value === undefined ? (
        <span className="h-11 w-14 animate-pulse rounded-lg bg-secondary" />
      ) : (
        <span className="text-[36px] font-medium leading-none tracking-[-0.035em] text-foreground tabular md:text-[44px]">{value}</span>
      )}
      {series && <span className="hidden sm:block"><Sparkline points={series} /></span>}
    </div>
    <span
      className={cn(
        'truncate font-mono text-[13px]',
        tone === 'live' && 'text-success-fg',
        tone === 'accent' && 'text-accent',
        tone === 'muted' && 'text-muted-foreground',
      )}
    >
      {value === undefined ? ' ' : note}
    </span>
  </Link>
);

interface AttentionItem {
  key: string;
  icon: LucideIcon;
  title: string;
  meta: string;
  cta: string;
  to: string;
  accent?: boolean;
}

const Panel = ({ title, aside, children, className }: {
  title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string;
}) => (
  <section className={cn('rounded-2xl border border-border-subtle bg-card p-5', className)}>
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-h2 text-foreground">{title}</h2>
      {aside}
    </div>
    {children}
  </section>
);

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const { data, isLoading } = useAdminOverview();
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => CommonService.getActivityLogs(),
    select: (all: ActivityLog[]) =>
      [...all].sort((a, b) => toJsDate(b.timestamp).getTime() - toJsDate(a.timestamp).getTime()),
  });

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 18 ? 'Good afternoon,' : 'Good evening,';
  const lastChange = logs[0] ? toJsDate(logs[0].timestamp) : null;

  const stats = useMemo(() => {
    if (!data) return null;
    const { projects, blogs, certificates, messages } = data;

    const projectDates = projects.map((p) => parseDate(p.date));
    const blogDates = blogs.map((b) => parseDate(b.publishedAt || b.date));
    const certDates = certificates.map((c) => parseDate(c.issue_date));

    const unread = messages
      .filter((m) => !m.read)
      .map((m) => ({ m, at: toJsDate(m.created_at) }))
      .sort((a, b) => a.at.getTime() - b.at.getTime());
    const drafts = blogs.filter((b) => !b.published);
    const missingAlt = projects.filter((p) => (p.heroImage || p.image) && !p.altText?.trim());
    const missingCred = certificates.filter((c) => !c.credential_url?.trim());

    const attention: AttentionItem[] = [];
    if (unread.length) {
      const oldest = unread[0];
      attention.push({
        key: 'unread', icon: Inbox, accent: true,
        title: plural(unread.length, 'unread message'),
        meta: `Oldest from ${oldest.m.name} · ${formatDistanceToNowStrict(oldest.at, { addSuffix: true })}`,
        cta: 'Open inbox', to: '/messages',
      });
    }
    if (drafts.length) {
      attention.push({
        key: 'drafts', icon: PenLine,
        title: `${plural(drafts.length, 'blog draft')} waiting`,
        meta: drafts.slice(0, 2).map((b) => `“${b.title.length > 28 ? `${b.title.slice(0, 28)}…` : b.title}”`).join(', '),
        cta: 'Review', to: drafts.length === 1 ? `/blogs/${drafts[0].id}` : '/blogs',
      });
    }
    if (missingAlt.length) {
      attention.push({
        key: 'alt', icon: ImageIcon,
        title: `${plural(missingAlt.length, 'project')} missing alt text`,
        meta: missingAlt.slice(0, 3).map((p) => p.title).join(', '),
        cta: 'Fix', to: missingAlt.length === 1 ? `/projects/${missingAlt[0].id}` : '/projects',
      });
    }
    if (missingCred.length) {
      const issuers = [...new Set(missingCred.map((c) => c.issuer).filter(Boolean))];
      attention.push({
        key: 'cred', icon: BadgeCheck,
        title: `${plural(missingCred.length, 'certificate')} without a credential URL`,
        meta: issuers.length ? `${issuers.slice(0, 2).join(', ')}${issuers.length > 2 ? ` +${issuers.length - 2}` : ''}` : 'Visitors can’t verify them',
        cta: 'Add links', to: '/certificates',
      });
    }

    const newProjects = countSince(projectDates, 30);
    const newCerts = countSince(certDates, 30);
    const issuers = new Set(certificates.map((c) => c.issuer).filter(Boolean)).size;

    return {
      attention,
      projects: {
        note: newProjects ? `+${newProjects} this month` : `${projects.filter((p) => p.featured).length} featured`,
        tone: newProjects ? 'live' : 'muted',
        series: growthSeries(projectDates),
      },
      blogs: {
        note: drafts.length ? `${plural(drafts.length, 'draft')} waiting` : `${blogs.length - drafts.length} published`,
        tone: 'muted',
        series: growthSeries(blogDates),
      },
      certs: {
        note: newCerts ? `+${newCerts} this month` : plural(issuers, 'issuer'),
        tone: newCerts ? 'live' : 'muted',
        series: growthSeries(certDates),
      },
      unread: {
        count: unread.length,
        note: unread.length ? `Oldest: ${formatDistanceToNowStrict(unread[0].at)} ago` : 'Inbox zero',
      },
    } as const;
  }, [data]);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-[30px] font-medium leading-[1.05] tracking-[-0.035em] text-foreground md:text-[44px]">
          {greeting} <span className="soft">Saad</span>
        </h1>
        <p className="meta mt-2.5">
          {format(now, 'EEEE, d MMMM')}
          {lastChange && <> · Last change {formatDistanceToNowStrict(lastChange, { addSuffix: true })}</>}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi
          label="Projects" icon={Code2} to="/projects"
          value={data?.counts.projects}
          note={stats?.projects.note ?? ''} tone={stats?.projects.tone} series={stats?.projects.series}
        />
        <Kpi
          label="Blog posts" icon={BookOpen} to="/blogs"
          value={data?.counts.blogs}
          note={stats?.blogs.note ?? ''} tone={stats?.blogs.tone} series={stats?.blogs.series}
        />
        <Kpi
          label="Certificates" icon={BadgeCheck} to="/certificates"
          value={data?.counts.certificates}
          note={stats?.certs.note ?? ''} tone={stats?.certs.tone} series={stats?.certs.series}
        />
        <Kpi
          label="Unread" icon={Inbox} to="/messages"
          value={data?.counts.unread}
          note={stats?.unread.note ?? ''}
          tone={stats?.unread.count ? 'accent' : 'live'}
          highlight={!!stats?.unread.count}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Needs attention */}
        <Panel
          title="Needs attention"
          aside={stats && <span className="font-mono text-[13px] text-muted-foreground">{plural(stats.attention.length, 'item')}</span>}
          className="self-start"
        >
          {isLoading || !stats ? (
            <div className="space-y-3 pt-1">
              {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary" />)}
            </div>
          ) : stats.attention.length === 0 ? (
            <div className="flex items-center gap-3 border-t border-border-subtle pt-5 text-sm text-fg-2">
              <CheckCircle2 className="h-5 w-5 text-success-fg" aria-hidden="true" />
              All clear. Nothing is waiting on you.
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle border-t border-border-subtle">
              {stats.attention.map((item) => (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    className="group -mx-2 flex items-center gap-3.5 rounded-xl px-2 py-4 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        item.accent ? 'bg-accent-subtle text-accent' : 'bg-secondary text-fg-2',
                      )}
                    >
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">{item.title}</span>
                      <span className="block truncate font-mono text-[13px] text-muted-foreground">{item.meta}</span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-foreground transition-colors group-hover:border-border-strong sm:inline-flex">
                      {item.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground sm:hidden" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          {/* Quick create */}
          <Panel title="Quick create" className="hidden md:block">
            <div className="grid grid-cols-2 gap-2">
              {createActions.slice(0, 6).map((action) => (
                <Link
                  key={action.path}
                  to={action.path}
                  className="flex flex-col gap-3 rounded-xl bg-secondary/70 p-3.5 text-sm text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <action.icon className="h-4 w-4 text-fg-2" aria-hidden="true" />
                  {action.noun}
                </Link>
              ))}
            </div>
          </Panel>

          {/* Activity */}
          <Panel
            title="Activity"
            aside={
              <Link to="/logs" className="flex items-center gap-1 text-sm text-fg-2 transition-colors hover:text-foreground">
                View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          >
            {logsLoading ? (
              <div className="space-y-3 pt-1">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-5 animate-pulse rounded bg-secondary" />)}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Changes you make will show up here.</p>
            ) : (
              <ul className="space-y-4 pt-1">
                {logs.slice(0, 5).map((log) => (
                  <li key={log.id} className="flex items-center gap-3 text-sm">
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', actionDot[log.action] ?? 'bg-muted-foreground')} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-fg-2">
                      {actionVerb[log.action] ?? log.action}{' '}
                      <span className="text-foreground">{log.entityType}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[13px] text-muted-foreground">{shortAgo(toJsDate(log.timestamp))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
