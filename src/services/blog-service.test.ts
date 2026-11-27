import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));
vi.mock('@/services/storage', () => ({ deleteImage: vi.fn(), uploadImageWithPath: vi.fn() }));

import { toPost } from './blog-service';

describe('toPost', () => {
  it('drops the nulls scheduling leaves behind so dates are string or undefined', () => {
    const p = toPost('x', { title: 'T', date: null, publishedAt: null, scheduledAt: '2026-12-01T00:00:00.000Z' });
    expect(p).toEqual({ id: 'x', title: 'T', scheduledAt: '2026-12-01T00:00:00.000Z' });
    expect('date' in p).toBe(false);
  });
});
