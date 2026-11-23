import { useState } from 'react';
import { Node } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { BarChart3, PlaySquare } from 'lucide-react';
import { BlockFrame, BlockInput, Segmented, type NodeViewProps } from '../BlockFrame';
import { withBlockView } from '../block-view-context';
import { EMBED_PROVIDERS, parseEmbedUrl, type EmbedProviderId } from '../embeds';
import { chartFromText, chartToText, type ChartData } from '../chart-data';

// ── Video / embed ────────────────────────────────────────────────────────

const EmbedView = ({ node, updateAttributes, deleteNode, selected }: NodeViewProps) => {
  const { provider, embedId, label, caption } = node.attrs as { provider: EmbedProviderId | ''; embedId: string; label: string; caption: string };
  const [url, setUrl] = useState(provider && embedId ? EMBED_PROVIDERS[provider].page(embedId) : '');
  const parsed = url ? parseEmbedUrl(url) : null;
  const p = provider ? EMBED_PROVIDERS[provider] : null;

  return (
    <BlockFrame label={p ? `${p.label} embed` : 'Embed'} icon={PlaySquare} selected={selected} onDelete={deleteNode}>
      <div className="space-y-3 p-3" contentEditable={false}>
        <BlockInput
          label="Video or pen URL (YouTube, Vimeo, Loom, CodePen)"
          value={url}
          onChange={(v) => {
            setUrl(v);
            const hit = parseEmbedUrl(v);
            if (hit) updateAttributes({ provider: hit.provider, embedId: hit.id });
          }}
          placeholder="https://www.youtube.com/watch?v=…"
          type="url"
        />
        {url && !parsed && <p className="text-[12px] text-danger-fg">Only YouTube, Vimeo, Loom and CodePen links can be embedded.</p>}
        {p && embedId && (
          <div className="relative aspect-video overflow-hidden rounded-lg border border-border-subtle bg-background">
            <iframe src={p.src(embedId)} title={label || `${p.label} preview`} className="absolute inset-0 h-full w-full" loading="lazy" sandbox="allow-scripts allow-same-origin allow-presentation" />
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <BlockInput label="Title (for accessibility)" value={label} onChange={(v) => updateAttributes({ label: v })} />
          <BlockInput label="Caption" value={caption} onChange={(v) => updateAttributes({ caption: v })} />
        </div>
      </div>
    </BlockFrame>
  );
};

export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    const data = (key: string) => ({ default: '', parseHTML: (el: HTMLElement) => el.dataset[key] ?? '', renderHTML: () => ({}) });
    return {
      provider: data('provider'),
      embedId: data('embedId'),
      label: data('title'),
      caption: { default: '', parseHTML: (el: HTMLElement) => el.querySelector('figcaption')?.textContent ?? '', renderHTML: () => ({}) },
    };
  },

  parseHTML: () => [{ tag: 'figure[data-embed]' }],

  renderHTML({ node }) {
    const { provider, embedId, label, caption } = node.attrs;
    const p = EMBED_PROVIDERS[provider as EmbedProviderId];
    const valid = p && p.idPattern.test(embedId);
    return [
      'figure',
      { 'data-embed': '', 'data-provider': valid ? provider : '', 'data-embed-id': valid ? embedId : '', 'data-title': label },
      // No-JS / RSS fallback: a plain link to the original.
      ...(valid ? [['a', { href: p.page(embedId) }, `${p.label}: ${label || 'watch'}`] as DOMOutputSpec] : []),
      ...(caption ? [['figcaption', {}, caption] as DOMOutputSpec] : []),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(withBlockView(EmbedView));
  },
});

// ── Chart ────────────────────────────────────────────────────────────────

function MiniChart({ data, type }: { data: ChartData; type: 'bar' | 'line' }) {
  const values = data.series.flatMap((s) => s.values);
  const max = Math.max(1, ...values);
  const w = 100 / data.labels.length;
  // Same validated order as the site's chart block.
  const colors = ['#e5562b', '#2f86d6', '#b8890a', '#9b5fd6'];
  return (
    <svg viewBox="0 0 100 50" className="h-32 w-full" role="img" aria-label="Chart preview" preserveAspectRatio="none">
      {type === 'bar'
        ? data.series.map((s, si) =>
            s.values.map((v, i) => {
              const bw = (w * 0.7) / data.series.length;
              const h = (Math.max(0, v) / max) * 46;
              return <rect key={`${si}-${i}`} x={i * w + w * 0.15 + bw * si} y={48 - h} width={bw * 0.9} height={h} fill={colors[si % 4]} />;
            }),
          )
        : data.series.map((s, si) => (
            <polyline
              key={si}
              fill="none"
              stroke={colors[si % 4]}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              points={s.values.map((v, i) => `${i * w + w / 2},${48 - (Math.max(0, v) / max) * 46}`).join(' ')}
            />
          ))}
    </svg>
  );
}

const ChartView = ({ node, updateAttributes, deleteNode, selected }: NodeViewProps) => {
  const data: ChartData = { labels: node.attrs.labels, series: node.attrs.series };
  const [text, setText] = useState(() => chartToText(data));
  const [error, setError] = useState('');

  return (
    <BlockFrame label="Chart" icon={BarChart3} selected={selected} onDelete={deleteNode}>
      <div className="grid gap-3 p-3 lg:grid-cols-2" contentEditable={false}>
        <div className="space-y-2">
          <Segmented
            label="Chart type"
            value={node.attrs.chartType}
            onChange={(chartType) => updateAttributes({ chartType })}
            options={[
              { value: 'bar', label: 'Bar' },
              { value: 'line', label: 'Line' },
            ]}
          />
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Data (first row: series names)</span>
            <textarea
              value={text}
              rows={7}
              spellCheck={false}
              onChange={(e) => {
                setText(e.target.value);
                const parsed = chartFromText(e.target.value);
                if ('error' in parsed) setError(parsed.error);
                else {
                  setError('');
                  updateAttributes({ labels: parsed.labels, series: parsed.series });
                }
              }}
              className="rounded-md border border-border bg-background p-2 font-mono text-[12px] text-foreground outline-none focus:border-accent"
            />
          </label>
          {error && <p className="text-[12px] text-danger-fg">{error}</p>}
        </div>
        <div className="space-y-2">
          <div className="rounded-md border border-border-subtle bg-background p-2">
            {data.labels.length ? <MiniChart data={data} type={node.attrs.chartType} /> : <p className="p-6 text-center text-sm text-muted-foreground">Enter data to preview</p>}
          </div>
          <BlockInput label="Title" value={node.attrs.heading} onChange={(heading) => updateAttributes({ heading })} />
          <BlockInput label="Source" value={node.attrs.source} onChange={(source) => updateAttributes({ source })} placeholder="e.g. World Bank, 2025" />
        </div>
      </div>
    </BlockFrame>
  );
};

export const Chart = Node.create({
  name: 'chart',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    const none = { renderHTML: () => ({}) };
    return {
      chartType: { default: 'bar', parseHTML: (el: HTMLElement) => (el.dataset.chartType === 'line' ? 'line' : 'bar'), ...none },
      labels: {
        default: [] as string[],
        parseHTML: (el: HTMLElement) => {
          try {
            return JSON.parse(el.dataset.chart ?? '{}').labels ?? [];
          } catch {
            return [];
          }
        },
        ...none,
      },
      series: {
        default: [] as ChartData['series'],
        parseHTML: (el: HTMLElement) => {
          try {
            return JSON.parse(el.dataset.chart ?? '{}').series ?? [];
          } catch {
            return [];
          }
        },
        ...none,
      },
      heading: { default: '', parseHTML: (el: HTMLElement) => el.querySelector('figcaption [data-chart-title]')?.textContent ?? '', ...none },
      source: { default: '', parseHTML: (el: HTMLElement) => el.querySelector('figcaption [data-chart-source]')?.textContent ?? '', ...none },
    };
  },

  parseHTML: () => [{ tag: 'figure[data-chart]' }],

  renderHTML({ node }) {
    const { chartType, labels, series, heading, source } = node.attrs as { chartType: string; labels: string[]; series: ChartData['series']; heading: string; source: string };
    // A real table: the accessible / no-JS version of the chart.
    const table: DOMOutputSpec = [
      'table',
      {},
      ['thead', {}, ['tr', {}, ['th', {}, ''], ...series.map((s): DOMOutputSpec => ['th', {}, s.name])]],
      [
        'tbody',
        {},
        ...labels.map((label, i): DOMOutputSpec => ['tr', {}, ['th', {}, label], ...series.map((s): DOMOutputSpec => ['td', {}, String(s.values[i] ?? '')])]),
      ],
    ];
    const caption: DOMOutputSpec[] =
      heading || source
        ? [
            [
              'figcaption',
              {},
              ...(heading ? [['span', { 'data-chart-title': '' }, heading] as DOMOutputSpec] : []),
              ...(source ? [['span', { 'data-chart-source': '' }, ` Source: ${source}`] as DOMOutputSpec] : []),
            ],
          ]
        : [];
    return ['figure', { 'data-chart': JSON.stringify({ labels, series }), 'data-chart-type': chartType }, table, ...caption];
  },

  addNodeView() {
    return ReactNodeViewRenderer(withBlockView(ChartView));
  },
});
