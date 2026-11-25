import { describe, expect, it } from 'vitest';
import type { SkillSet } from '@/types';
import { hasToolIcon, mergeToolLogos, TOOLS_CATEGORY } from './toolLogos';

const sets = (): SkillSet[] => [
  { category: 'Frontend', skills: [{ name: 'React.js', level: 'Expert', startYear: 2020 }] },
];

describe('mergeToolLogos', () => {
  it('gives a matching skill the icon and puts it in the strip', () => {
    const { sets: out, matched, added } = mergeToolLogos(sets(), [{ label: 'React', url: 'r.svg' }]);
    expect(matched).toBe(1);
    expect(added).toBe(0);
    expect(out[0].skills[0]).toMatchObject({ icon: 'r.svg', showInTools: true });
    expect(out[0].skills[0].toolOnly).toBeUndefined();
  });

  it('adds unknown tools to the Tools category as strip-only', () => {
    const { sets: out, added } = mergeToolLogos(sets(), [{ label: 'Figma', url: 'f.svg' }], 2026);
    expect(added).toBe(1);
    const tools = out.find((s) => s.category === TOOLS_CATEGORY);
    expect(tools?.skills[0]).toEqual({
      name: 'Figma', level: 'Intermediate', startYear: 2026, icon: 'f.svg', showInTools: true, toolOnly: true,
    });
  });

  it('keeps an icon the skill already has', () => {
    const start = sets();
    start[0].skills[0].icon = 'mine.svg';
    const { sets: out } = mergeToolLogos(start, [{ label: 'React', url: 'r.svg' }]);
    expect(out[0].skills[0].icon).toBe('mine.svg');
  });
});

describe('hasToolIcon', () => {
  it('finds tools that already have an icon, so re-imports skip them', () => {
    const start = sets();
    expect(hasToolIcon(start, 'React')).toBe(false);
    start[0].skills[0].icon = 'r.svg';
    expect(hasToolIcon(start, 'React')).toBe(true);
  });
});
