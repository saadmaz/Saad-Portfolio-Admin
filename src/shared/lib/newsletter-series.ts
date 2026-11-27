/**
 * The six series. Each is a blog series (`blog_series/{id}`) and a newsletter
 * topic; ids match the public site's src/lib/newsletter.ts and /api/subscribe.
 */
export const SERIES = [
  { id: 'building-in-public', number: '01', title: 'Between Builds', label: 'Projects' },
  { id: 'ai-and-technology', number: '02', title: 'Beyond the Prompt', label: 'AI' },
  { id: 'startups', number: '03', title: 'Founder Files', label: 'Business' },
  { id: 'personal-branding', number: '04', title: 'The Visibility Playbook', label: 'Growth' },
  { id: 'ai-tutorials', number: '05', title: 'Better With AI', label: 'Practical AI' },
  { id: 'tech-news', number: '06', title: 'Tech Radar', label: 'News' },
] as const;

export type SeriesId = (typeof SERIES)[number]['id'];
export const SERIES_IDS: SeriesId[] = SERIES.map((s) => s.id);

const LEGACY: Record<string, string> = { founder: 'Founder notes (old)', cse: 'Engineering (old)' };

/** Display name for a topic id, including the pre-2026 founder/cse ids. */
export const seriesName = (id: string) => SERIES.find((s) => s.id === id)?.title ?? LEGACY[id] ?? id;
