export interface Subscriber {
  id: string;
  email: string;
  topics?: string[];
  status: 'pending' | 'active' | 'unsubscribed';
  source?: string;
  created_at?: unknown;
  confirmed_at?: unknown;
}

const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV of active subscribers for importing into a mail tool. */
export function subscribersCsv(rows: Subscriber[], dateOf: (v: unknown) => string): string {
  const lines = rows
    .filter((r) => r.status === 'active')
    .map((r) => [r.email, (r.topics ?? []).join(' '), dateOf(r.confirmed_at), r.source ?? ''].map(cell).join(','));
  return ['email,series,confirmed,source', ...lines].join('\n');
}
