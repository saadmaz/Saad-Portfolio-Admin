import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, CircleDashed } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import { SKELETON } from '@/components/admin/listStyles';
import { AnalyticsService } from '@/services/blog-collections';
import { BlogService } from '@/services/blog-service';
import { SiteApi, type SiteStatus } from '@/services/site-api';
import { cn } from '@/shared/lib/utils';
import type { ArticleStats, BlogPostDoc, DailyStats } from '@/types/blog';

const fmtMs = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
};
const avgEngaged = (s?: ArticleStats) => (s?.engagedSamples ? s.engagedMs! / s.engagedSamples : 0);
const completion = (s?: ArticleStats) => (s?.engagedSamples ? Math.round(((s.depth?.d100 ?? 0) / s.engagedSamples) * 100) : null);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-card p-4">
      <p className="label text-[11px] text-muted-foreground">{label}</p>
      <p className="tabular mt-2 text-[28px] font-medium leading-none text-foreground">{value}</p>
      {note && <p className="mt-1.5 text-[12px] text-muted-foreground">{note}</p>}
    </div>
  );
}

/** Daily views as bars: one series, one hue, hover readout, table fallback. */
function ViewsChart({ days }: { days: DailyStats[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const series = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]));
    return Array.from({ length: 30 }, (_, i) => {
      const date = daysAgo(29 - i);
      return { date, views: byDate.get(date)?.views ?? 0, uniques: byDate.get(date)?.uniques ?? 0 };
    });
  }, [days]);
  const max = Math.max(1, ...series.map((d) => d.views));
  const W = 600;
  const H = 160;
  const bw = W / series.length;
  const shown = hover !== null ? series[hover] : null;
  return (
    <figure className="space-y-2">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-foreground">Views per day, last 30 days</span>
        <span className="tabular text-[12px] text-muted-foreground" aria-live="polite">
          {shown ? `${new Date(shown.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}: ${shown.views} views · ${shown.uniques} unique` : `Peak ${max}`}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label="Views per day for the last 30 days" onMouseLeave={() => setHover(null)}>
        {[0.5, 1].map((t) => (
          <line key={t} x1={0} x2={W} y1={H - H * t} y2={H - H * t} stroke="hsl(var(--border-subtle))" strokeWidth={1} />
        ))}
        <line x1={0} x2={W} y1={H} y2={H} stroke="hsl(var(--border))" strokeWidth={1} />
        {series.map((d, i) => {
          const h = (d.views / max) * (H - 4);
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)}>
              {/* Hit target spans the whole column, bigger than the bar. */}
              <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${i * bw + 1},${H} v${-(h - 4)} q0,-4 4,-4 h${bw - 10} q4,0 4,4 v${h - 4} z`}
                  fill="#e5562b"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
            </g>
          );
        })}
        <text x={0} y={H + 14} className="fill-muted-foreground text-[10px]">{series[0].date.slice(5)}</text>
        <text x={W} y={H + 14} textAnchor="end" className="fill-muted-foreground text-[10px]">today</text>
      </svg>
      <details>
        <summary className="cursor-pointer text-[12px] text-muted-foreground">Show as table</summary>
        <table className="mt-2 w-full text-left text-[12px]">
          <thead><tr className="text-muted-foreground"><th className="py-1">Date</th><th>Views</th><th>Unique visitors</th></tr></thead>
          <tbody>
            {series.filter((d) => d.views).map((d) => (
              <tr key={d.date} className="border-t border-border-subtle"><td className="py-1">{d.date}</td><td className="tabular">{d.views}</td><td className="tabular">{d.uniques}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function IntegrationRow({ name, connected, detail, onLabel = 'connected', offLabel = 'not connected' }: { name: string; connected: boolean; detail: string; onLabel?: string; offLabel?: string }) {
  return (
    <li className="flex items-start gap-2.5">
      {connected ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success-fg" aria-hidden="true" /> : <CircleDashed className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      <span>
        <span className="block text-[13px] text-foreground">{name} · {connected ? onLabel : offLabel}</span>
        <span className="block text-[12px] text-muted-foreground">{detail}</span>
      </span>
    </li>
  );
}

const AdminBlogAnalytics = () => {
  const [posts, setPosts] = useState<BlogPostDoc[]>([]);
  const [stats, setStats] = useState<ArticleStats[]>([]);
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [statusError, setStatusError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [days, setDays] = useState<DailyStats[]>([]);

  useEffect(() => {
    Promise.all([BlogService.getAll(), AnalyticsService.getAll()])
      .then(([p, s]) => {
        setPosts(p);
        setStats(s);
        setSelected([...s].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0]?.id ?? null);
      })
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
    SiteApi.status().then(setStatus).catch((e) => setStatusError(e instanceof Error ? e.message : 'Site API unreachable'));
  }, []);

  useEffect(() => {
    if (!selected) return;
    AnalyticsService.daily(selected, daysAgo(29)).then(setDays).catch(() => setDays([]));
  }, [selected]);

  const byId = new Map(stats.map((s) => [s.id, s]));
  const rows = posts
    .filter((p) => p.published || byId.has(p.id))
    .map((p) => ({ post: p, s: byId.get(p.id) }))
    .sort((a, b) => (b.s?.views ?? 0) - (a.s?.views ?? 0));
  const totals = stats.reduce(
    (t, s) => ({ views: t.views + (s.views ?? 0), uniques: t.uniques + (s.uniques ?? 0), ms: t.ms + (s.engagedMs ?? 0), n: t.n + (s.engagedSamples ?? 0) }),
    { views: 0, uniques: 0, ms: 0, n: 0 },
  );
  const referrers = Object.entries(
    stats.reduce<Record<string, number>>((acc, s) => {
      for (const [k, v] of Object.entries(s.referrers ?? {})) acc[k] = (acc[k] ?? 0) + v;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const refTotal = referrers.reduce((n, [, v]) => n + v, 0);
  const selectedPost = posts.find((p) => p.id === selected);

  return (
    <div className="space-y-6">
      <PageHeader title="Article analytics" subtitle="First-party, privacy-friendly counts from the site · no cookies, no personal data" />

      <section className="rounded-2xl border border-border-subtle bg-card p-4">
        <h2 className="label mb-3 text-[11px] text-fg-2">Data sources</h2>
        {statusError ? (
          <p className="text-[13px] text-warning-fg">Couldn’t reach the site’s admin API ({statusError}). Integration status is unknown.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-3">
            <IntegrationRow name="Site analytics (first-party)" connected={!!status?.integrations.analyticsSalt} detail="Views, unique visitors per day, engaged time, scroll depth, referrers. Needs ANALYTICS_SALT on the site." />
            <IntegrationRow name="Google Analytics 4" connected={!!status?.integrations.ga4} onLabel="credentials set" offLabel="not connected" detail="The site already sends GA4 data. Showing it here isn't built yet (the provider slot and env vars are ready; see README), so use the GA4 dashboard." />
            <IntegrationRow name="Google Search Console" connected={!!status?.integrations.searchConsole} onLabel="credentials set" offLabel="not connected" detail="Impressions and queries aren't fetched into the CMS yet (env vars ready; see README). Use Search Console directly." />
          </ul>
        )}
      </section>

      {loading ? (
        <div className={cn(SKELETON, 'h-60')} />
      ) : stats.length === 0 ? (
        <EmptyState icon={BarChart3} title="No article data yet" description="Counts appear after readers visit published articles (and once ANALYTICS_SALT is set on the site). Nothing here is estimated." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Page views" value={totals.views.toLocaleString()} note="All articles, all time" />
            <Tile label="Unique visitors" value={totals.uniques.toLocaleString()} note="Counted per article per day" />
            <Tile label="Avg. engaged time" value={totals.n ? fmtMs(totals.ms / totals.n) : '—'} note="Only while the tab is visible" />
            <Tile label="Articles with data" value={String(stats.length)} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-4 rounded-2xl border border-border-subtle bg-card p-4">
              <h2 className="text-[15px] font-medium text-foreground">{selectedPost?.title ?? 'Select an article'}</h2>
              {selected && <ViewsChart days={days} />}
            </section>
            <section className="rounded-2xl border border-border-subtle bg-card p-4">
              <h2 className="label mb-3 text-[11px] text-fg-2">Traffic sources</h2>
              {referrers.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">No referrer data yet.</p>
              ) : (
                <ul className="space-y-2">
                  {referrers.map(([host, n]) => (
                    <li key={host} className="space-y-1">
                      <div className="flex justify-between text-[13px]">
                        <span className="text-foreground">{host === 'direct' ? 'Direct / unknown' : host === 'internal' ? 'From this site' : host.replace(/_/g, '.')}</span>
                        <span className="tabular text-muted-foreground">{n} · {Math.round((n / refTotal) * 100)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-[#e5562b]" style={{ width: `${(n / referrers[0][1]) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="overflow-x-auto rounded-2xl border border-border-subtle bg-card">
            <table className="w-full min-w-[680px] text-left text-sm">
              <caption className="sr-only">Article performance</caption>
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="label py-3 pl-4 font-medium">Article</th>
                  <th className="label py-3 text-right font-medium">Views</th>
                  <th className="label py-3 text-right font-medium">Unique</th>
                  <th className="label py-3 text-right font-medium">Avg. time</th>
                  <th className="label py-3 pr-4 text-right font-medium" title="Readers who scrolled to the end">Read to end</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ post, s }) => (
                  <tr
                    key={post.id}
                    aria-selected={selected === post.id}
                    className={cn('cursor-pointer border-b border-border-subtle last:border-0 hover:bg-secondary/40', selected === post.id && 'bg-secondary/60')}
                    onClick={() => setSelected(post.id)}
                  >
                    <td className="py-2.5 pl-4 pr-3">
                      <button type="button" className="text-left text-foreground hover:underline" onClick={() => setSelected(post.id)}>{post.title}</button>
                    </td>
                    <td className="tabular py-2.5 text-right">{s?.views?.toLocaleString() ?? '—'}</td>
                    <td className="tabular py-2.5 text-right">{s?.uniques?.toLocaleString() ?? '—'}</td>
                    <td className="tabular py-2.5 text-right">{s?.engagedSamples ? fmtMs(avgEngaged(s)) : '—'}</td>
                    <td className="tabular py-2.5 pr-4 text-right">{completion(s) === null ? '—' : `${completion(s)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
};

export default AdminBlogAnalytics;
