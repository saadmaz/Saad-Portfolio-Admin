import { describe, expect, it } from 'vitest';
import { byEventDateDesc, eventDateLabel, parseEventDate } from './eventDates';

describe('parseEventDate', () => {
  it('reads year-only, long-form and ISO dates', () => {
    expect(parseEventDate('2023')).toMatchObject({ year: 2023, yearOnly: true });
    expect(parseEventDate('Apr 27, 2022')).toMatchObject({ year: 2022, yearOnly: false });
    expect(parseEventDate('2024-05-14')).toMatchObject({ year: 2024, yearOnly: false });
  });

  it('marks unparseable text as undated', () => {
    expect(parseEventDate('sometime')).toMatchObject({ year: null });
    expect(parseEventDate(undefined).year).toBeNull();
  });
});

describe('eventDateLabel', () => {
  it('shows month and year, or the year alone', () => {
    expect(eventDateLabel('Apr 27, 2022')).toBe('Apr 2022');
    expect(eventDateLabel('2023')).toBe('2023');
    expect(eventDateLabel('TBC')).toBe('TBC');
  });
});

describe('byEventDateDesc', () => {
  it('sorts newest first across formats, undated last', () => {
    const events = [{ date: 'Apr 27, 2022' }, { date: 'TBC' }, { date: '2024' }, { date: '2023-11-02' }];
    expect([...events].sort(byEventDateDesc).map((e) => e.date)).toEqual([
      '2024',
      '2023-11-02',
      'Apr 27, 2022',
      'TBC',
    ]);
  });
});
