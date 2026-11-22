import { describe, expect, it } from 'vitest';
import { EVENT_MIN_WORDS, eventWordCount, isEventIndexable } from './indexing';

const text = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

describe('event indexing (mirror of the site rule)', () => {
  it('counts description and highlights', () => {
    expect(eventWordCount({ description: 'one two  three', highlights: ['four five'] })).toBe(5);
  });

  it('indexes at the threshold under auto', () => {
    expect(isEventIndexable({ description: text(EVENT_MIN_WORDS) })).toBe(true);
    expect(isEventIndexable({ description: text(EVENT_MIN_WORDS - 1) })).toBe(false);
  });

  it('honours the manual override', () => {
    expect(isEventIndexable({ description: 'Big Debate', seo_visibility: 'index' })).toBe(true);
    expect(isEventIndexable({ description: text(400), seo_visibility: 'noindex' })).toBe(false);
  });
});
