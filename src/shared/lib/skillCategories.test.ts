import { describe, expect, it } from 'vitest';
import type { SkillSet } from '@/types';
import { organiseSkills } from './skillCategories';
import { TOOLS_CATEGORY } from './toolLogos';

const tool = (name: string) => ({
  name, level: 'Intermediate' as const, startYear: 2026, icon: `${name}.svg`, showInTools: true, toolOnly: true,
});

describe('organiseSkills', () => {
  it('moves mapped tools into their categories, visible on the skills page', () => {
    const start: SkillSet[] = [
      { category: 'Frontend Development', skills: [{ name: 'React.js', level: 'Expert', startYear: 2020 }] },
      { category: TOOLS_CATEGORY, skills: [tool('Next.js'), tool('Flutter'), tool('Devicon')] },
    ];
    const { sets, moved, left } = organiseSkills(start);
    expect(moved).toBe(2);
    expect(left).toEqual(['Devicon']);
    const frontend = sets.find((s) => s.category === 'Frontend Development')!;
    expect(frontend.skills.map((s) => s.name)).toEqual(['React.js', 'Next.js']);
    expect(frontend.skills[1]).toMatchObject({ toolOnly: false, showInTools: true, icon: 'Next.js.svg' });
    expect(sets.find((s) => s.category === 'Mobile Development')?.skills[0].name).toBe('Flutter');
  });

  it('orders categories and keeps the leftover Tools bucket last', () => {
    const start: SkillSet[] = [
      { category: TOOLS_CATEGORY, skills: [tool('Figma'), tool('Rect')] },
      { category: 'Backend Development', skills: [{ name: 'Node.js', level: 'Expert', startYear: 2021 }] },
    ];
    const { sets } = organiseSkills(start);
    expect(sets.map((s) => s.category)).toEqual(['Backend Development', 'Design & Collaboration', TOOLS_CATEGORY]);
  });

  it('drops the Tools bucket once it is empty', () => {
    const { sets } = organiseSkills([{ category: TOOLS_CATEGORY, skills: [tool('Git')] }]);
    expect(sets.map((s) => s.category)).toEqual(['Developer Tools']);
  });
});
