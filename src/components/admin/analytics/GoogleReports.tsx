import { useEffect, useState, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { SKELETON } from '@/components/admin/listStyles';
import { SiteApi, type Ga4Report, type GscReport } from '@/services/site-api';
import { cn } from '@/shared/lib/utils';

export type Load<T> = { state: 'off' } | { state: 'loading' } | { state: 'ok'; data: T } | { state: 'error'; error: string };

/** Fetches whichever Google reports the site says are configured. */
export function useGoogleReports(enabled: { ga4: boolean; gsc: boolean } | null) {
  const [ga4, setGa4] = useState<Load<Ga4Report>>({ state: 'off' });
  const [gsc, setGsc] = useState<Load<GscReport>>({ state: 'off' });
  const ga4On = !!enabled?.ga4;
  const gscOn = !!enabled?.gsc;

  useEffect(() => {
    if (!ga4On) return;
    setGa4({ state: 'loading' });
    SiteApi.ga4Report()
      .then((data) => setGa4({ state: 'ok', data }))
      .catch((e) => setGa4({ state: 'error', error: e instanceof Error ? e.message : 'Request failed' }));
  }, [ga4On]);

  useEffect(() => {
    if (!gscOn) return;
    setGsc({ state: 'loading' });
    SiteApi.gscReport()
      .then((data) => setGsc({ state: 'ok', data }))
      .catch((e) => setGsc({ state: 'error', error: e instanceof Error ? e.message : 'Request failed' }));
  }, [gscOn]);

  return { ga4, gsc };
}

const fmtSec = (s: number) => (s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`);
const fmtRange = (r: { start: string; end: string }) => {
  const d = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${d(r.start)} – ${d(r.end)}`;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-background/40 p-3">
      <p className="label text-[11px] text-muted-foreground">{label}</p>
      <p className="tabular mt-1.5 text-[22px] font-medium leading-none text-foreground">{value}</p>
    </div>
  );
}

/** One series of daily bars with a hover readout. */
function Bars({ points, caption, unit }: { points: { date: string; value: number }[]; caption: string; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return null;
  const max = Math.max(1, ...points.map((p) => p.value));
  const W = 560;
  const H = 96;
  const bw = W / points.length;
  const shown = hover !== null ? points[hover] : null;
  return (
    <figure className="space-y-1.5">
      <figcaption className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="font-medium text-foreground">{caption}</span>
        <span className="tabular text-muted-foreground" aria-live="polite">
          {shown ? `${shown.date.slice(5)}: ${shown.value.toLocaleString()} ${unit}` : `Peak ${max.toLocaleString()}`}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={caption} onMouseLeave={() => setHover(null)}>
        <line x1={0} x2={W} y1={H} y2={H} stroke="hsl(var(--border))" strokeWidth={1} />
        {points.map((p, i) => {
          const h = (p.value / max) * (H - 2);
          return (
            <g key={p.date} onMouseEnter={() => setHover(i)}>
              <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
              {h > 0 && (
                <rect x={i * bw + 1} y={H - h} width={Math.max(1, bw - 3)} height={h} rx={2} fill="#e5562b" opacity={hover === null || hover === i ? 1 : 0.45} />
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function List({ title, head, rows }: { title: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="min-w-0">
      <h4 className="label mb-2 text-[11px] text-muted-foreground">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">No data in this period.</p>
      ) : (
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="text-muted-foreground">
              {head.map((h, i) => (
                <th key={h} className={cn('pb-1 font-normal', i > 0 && 'text-right')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r[0])} className="border-t border-border-subtle">
                {r.map((c, i) => (
                  <td key={i} className={cn('py-1.5', i === 0 ? 'max-w-0 truncate pr-3 text-foreground' : 'tabular text-right text-muted-foreground')} title={i === 0 ? String(c) : undefined}>
                    {typeof c === 'number' ? c.toLocaleString() : c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Panel<T extends { range: { start: string; end: string } }>({ title, href, load, setup, children }: { title: string; href: string; load: Load<T>; setup: string; children: (data: T) => ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border-subtle bg-card p-4">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-medium text-foreground">
          {title}
          {load.state === 'ok' && <span className="ml-2 text-[12px] font-normal text-muted-foreground">{fmtRange(load.data.range)}</span>}
        </h3>
        <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
          Open <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </header>
      {load.state === 'off' && <p className="text-[13px] text-muted-foreground">{setup}</p>}
      {load.state === 'loading' && <div className={cn(SKELETON, 'h-48')} />}
      {load.state === 'error' && (
        <p role="alert" className="text-[13px] text-warning-fg">
          Couldn’t load this report: {load.error}
        </p>
      )}
      {load.state === 'ok' && children(load.data)}
    </section>
  );
}

export function Ga4Panel({ load }: { load: Load<Ga4Report> }) {
  return (
    <Panel
      title="Google Analytics 4"
      href="https://analytics.google.com/"
      load={load}
      setup="Not connected. Set GA4_PROPERTY_ID on the site and give the site's service account Viewer access to the property (docs §8)."
    >
      {(r) => (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Stat label="Views" value={r.totals.views.toLocaleString()} />
            <Stat label="Users" value={r.totals.users.toLocaleString()} />
            <Stat label="Sessions" value={r.totals.sessions.toLocaleString()} />
            <Stat label="Avg. engagement" value={fmtSec(r.totals.avgEngagementSec)} />
          </div>
          <Bars caption="Views per day" unit="views" points={r.daily.map((d) => ({ date: d.date, value: d.views }))} />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <List title="Top pages" head={['Page', 'Views', 'Users']} rows={r.pages.slice(0, 8).map((p) => [p.path, p.views, p.users])} />
            <List title="Sources" head={['Source', 'Sessions']} rows={r.sources.slice(0, 6).map((s) => [s.source, s.sessions])} />
          </div>
        </>
      )}
    </Panel>
  );
}

export function GscPanel({ load }: { load: Load<GscReport> }) {
  return (
    <Panel
      title="Google Search Console"
      href="https://search.google.com/search-console"
      load={load}
      setup="Not connected. Set GSC_SITE_URL on the site and add the site's service account as a user on the property (docs §8)."
    >
      {(r) => (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Stat label="Clicks" value={r.totals.clicks.toLocaleString()} />
            <Stat label="Impressions" value={r.totals.impressions.toLocaleString()} />
            <Stat label="Click-through" value={`${r.totals.ctr}%`} />
            <Stat label="Avg. position" value={r.totals.position ? String(r.totals.position) : '—'} />
          </div>
          <Bars caption="Clicks from Google per day" unit="clicks" points={r.daily.map((d) => ({ date: d.date, value: d.clicks }))} />
          <div className="grid gap-5 lg:grid-cols-2">
            <List title="Top searches" head={['Query', 'Clicks', 'Impr.', 'Pos.']} rows={r.queries.slice(0, 10).map((q) => [q.query, q.clicks, q.impressions, q.position])} />
            <List title="Top pages" head={['Page', 'Clicks', 'Impr.']} rows={r.pages.slice(0, 10).map((p) => [p.path, p.clicks, p.impressions])} />
          </div>
        </>
      )}
    </Panel>
  );
}
