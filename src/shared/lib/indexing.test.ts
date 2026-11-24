import { describe, expect, it } from 'vitest';
import {
  EVENT_MIN_WORDS,
  eventWordCount,
  isEventIndexable,
  isProjectIndexable,
  PROJECT_MIN_WORDS,
  projectWordCount,
} from './indexing';

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

describe('project indexing (mirror of the site rule)', () => {
  it('counts contribution, impact, architecture and technical decisions too', () => {
    expect(
      projectWordCount({
        impact: 'a b',
        contribution: ['c d', 'e'],
        technical_decisions: ['f'],
        architecture: { description: 'g h' },
      }),
    ).toBe(8);
  });

  it('counts tagline, overview, description and long description', () => {
    expect(projectWordCount({ tagline: 'a b', overview: 'c', description: 'd e', long_description: 'f' })).toBe(6);
  });

  it('indexes at the threshold under auto', () => {
    expect(isProjectIndexable({ overview: text(PROJECT_MIN_WORDS) })).toBe(true);
    expect(isProjectIndexable({ tagline: 'gvytcvi', overview: 'x y z' })).toBe(false);
  });

  it('honours the manual override', () => {
    expect(isProjectIndexable({ tagline: 'Short', seo_visibility: 'index' })).toBe(true);
    expect(isProjectIndexable({ overview: text(400), seo_visibility: 'noindex' })).toBe(false);
  });
});
