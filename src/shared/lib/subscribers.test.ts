import { describe, expect, it } from 'vitest';
import { parseEmails, subscriberId, subscribersCsv, type Subscriber } from './subscribers';

describe('subscribersCsv', () => {
  it('exports only active subscribers and escapes cells', () => {
    const rows: Subscriber[] = [
      { id: '1', email: 'a@b.co', topics: ['startups', 'tech-news'], status: 'active', source: 'footer', confirmed_at: 'x' },
      { id: '2', email: 'p@b.co', status: 'pending' },
      { id: '3', email: 'q@b.co', status: 'active', source: 'a,"b"' },
    ];
    expect(subscribersCsv(rows, (v) => (v ? '2026-01-01' : ''))).toBe(
      'email,series,confirmed,source\na@b.co,startups tech-news,2026-01-01,footer\nq@b.co,,,"a,""b"""',
    );
  });
});

describe('parseEmails', () => {
  it('splits on lines, commas and spaces, lower-cases and de-duplicates', () => {
    expect(parseEmails('A@b.co, c@d.io\n a@B.co; Jane <jane@x.org>')).toEqual({
      valid: ['a@b.co', 'c@d.io', 'jane@x.org'],
      invalid: [],
    });
  });
  it('reports malformed addresses and ignores words without @', () => {
    expect(parseEmails('hello a@b nope@x.c ok@x.co')).toEqual({ valid: ['ok@x.co'], invalid: ['a@b', 'nope@x.c'] });
  });
});

describe('subscriberId', () => {
  it('is sha256 hex of the normalised email, like the site', async () => {
    expect(await subscriberId(' A@B.co ')).toBe('80305c9bb1bb2480e03894350e0a8a366dcbdeb302e69e0817aa0743abd77054');
  });
});
