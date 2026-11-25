import { describe, expect, it } from 'vitest';
import { subscribersCsv, type Subscriber } from './subscribers';

describe('subscribersCsv', () => {
  it('exports only active subscribers and escapes cells', () => {
    const rows: Subscriber[] = [
      { id: '1', email: 'a@b.co', topics: ['founder', 'cse'], status: 'active', source: 'footer', confirmed_at: 'x' },
      { id: '2', email: 'p@b.co', status: 'pending' },
      { id: '3', email: 'q@b.co', status: 'active', source: 'a,"b"' },
    ];
    expect(subscribersCsv(rows, (v) => (v ? '2026-01-01' : ''))).toBe(
      'email,series,confirmed,source\na@b.co,founder cse,2026-01-01,footer\nq@b.co,,,"a,""b"""',
    );
  });
});
