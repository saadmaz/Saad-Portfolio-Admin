/**
 * Event dates are free text ("2023", "Apr 27, 2022", "2024-05-14"), so
 * Firestore's string order is meaningless. These parse them once for
 * sorting, year grouping and a consistent "Mon YYYY" label.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface ParsedEventDate {
  /** Milliseconds for sorting; NaN when the text isn't a date. */
  time: number;
  year: number | null;
  /** Only the year was given, so there's no month to show. */
  yearOnly: boolean;
}

export function parseEventDate(value: string | undefined): ParsedEventDate {
  const s = (value ?? '').trim();
  if (/^\d{4}$/.test(s)) {
    const year = Number(s);
    // Year-only sorts after dated events of the same year would be arbitrary; treat it as 1 Jan.
    return { time: Date.UTC(year, 0, 1), year, yearOnly: true };
  }
  const time = Date.parse(s);
  if (Number.isNaN(time)) return { time: NaN, year: null, yearOnly: false };
  return { time, year: new Date(time).getFullYear(), yearOnly: false };
}

/** "Apr 27, 2022" → "Apr 2022"; "2023" → "2023"; unparseable text is shown as typed. */
export function eventDateLabel(value: string | undefined): string {
  const d = parseEventDate(value);
  if (d.year === null) return value ?? '';
  if (d.yearOnly) return String(d.year);
  return `${MONTHS[new Date(d.time).getMonth()]} ${d.year}`;
}

/** Newest first; undated events last, in their original order. */
export function byEventDateDesc<T extends { date?: string }>(a: T, b: T): number {
  const ta = parseEventDate(a.date).time;
  const tb = parseEventDate(b.date).time;
  if (Number.isNaN(ta)) return Number.isNaN(tb) ? 0 : 1;
  if (Number.isNaN(tb)) return -1;
  return tb - ta;
}
