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

/** Same rule as /api/subscribe. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Emails pasted one per line or separated by commas, semicolons or spaces
 * (also "Name <a@b.co>"). Lower-cased and de-duplicated.
 */
export function parseEmails(text: string): { valid: string[]; invalid: string[] } {
  const valid = new Set<string>();
  const invalid = new Set<string>();
  for (const raw of text.split(/[\s,;]+/)) {
    const token = raw.replace(/^<|>$/g, '').trim().toLowerCase();
    if (!token || !token.includes('@')) continue;
    (EMAIL_RE.test(token) && token.length <= 254 ? valid : invalid).add(token);
  }
  return { valid: [...valid], invalid: [...invalid] };
}

/** Document id, matching the site's subscriberId(): sha256 hex of the lower-cased email. */
export async function subscriberId(email: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase()));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
