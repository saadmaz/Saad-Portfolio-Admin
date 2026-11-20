export interface ChartData {
  labels: string[];
  series: { name: string; values: number[] }[];
}

/** Limits the site also enforces when rendering. */
export const CHART_LIMITS = { labels: 24, series: 4 } as const;

/**
 * Parses the chart editor's text format:
 *   Quarter, Revenue, Costs      ← header: first cell ignored, rest are series
 *   Q1, 120, 80
 *   Q2, 150, 95
 * Commas or tabs (pasted from a spreadsheet) separate cells.
 */
export function chartFromText(text: string): ChartData | { error: string } {
  const rows = text
    .split(/\r?\n/)
    .map((r) => r.split(/\t|,/).map((c) => c.trim()))
    .filter((r) => r.some(Boolean));
  if (rows.length < 2) return { error: 'Add a header row and at least one data row.' };
  const [header, ...data] = rows;
  const names = header.slice(1);
  if (!names.length) return { error: 'The header needs at least one series name after the first cell.' };
  if (names.length > CHART_LIMITS.series) return { error: `Up to ${CHART_LIMITS.series} series.` };
  if (data.length > CHART_LIMITS.labels) return { error: `Up to ${CHART_LIMITS.labels} rows.` };
  const series = names.map((name) => ({ name, values: [] as number[] }));
  for (const [r, row] of data.entries()) {
    for (let s = 0; s < names.length; s++) {
      const raw = (row[s + 1] ?? '').replace(/[%$€£\s]/g, '');
      const n = Number(raw);
      if (raw === '' || !Number.isFinite(n)) return { error: `Row ${r + 2}: “${row[s + 1] ?? ''}” isn't a number.` };
      series[s].values.push(n);
    }
  }
  return { labels: data.map((row) => row[0]), series };
}

export function chartToText(data: ChartData): string {
  if (!data.labels.length) return 'Label, Series A\nFirst, 10\nSecond, 20';
  return [
    ['Label', ...data.series.map((s) => s.name)].join(', '),
    ...data.labels.map((l, i) => [l, ...data.series.map((s) => s.values[i] ?? '')].join(', ')),
  ].join('\n');
}
