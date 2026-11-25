import { describe, expect, it } from 'vitest';
import { applySuggestions, skillKey } from './skillPlan';
import type { SkillSet } from '@/types';

describe('skillKey', () => {
  it('folds .js suffixes and punctuation', () => {
    expect(skillKey('React.js')).toBe(skillKey('React'));
    expect(skillKey('Node.js')).toBe(skillKey('NodeJS'));
    expect(skillKey('VS Code')).toBe('vscode');
  });
});

describe('applySuggestions', () => {
  const sets: SkillSet[] = [
    {
      category: 'Web',
      skills: [
        { name: 'React.js', level: 'Expert', startYear: 2026 },
        { name: 'Docker', level: 'Intermediate', startYear: 2026 },
        { name: 'Antigravity', level: 'Intermediate', startYear: 2026 },
        { name: 'Unknown Tool', level: 'Intermediate', startYear: 2026 },
      ],
    },
  ];

  it('sets years, keeps hand-set levels and leaves unknown skills alone', () => {
    const { sets: out, changed } = applySuggestions(sets);
    const [react, docker, anti, unknown] = out[0].skills;
    expect(react).toMatchObject({ level: 'Expert', startYear: 2022 });
    expect(docker).toMatchObject({ level: 'Advance', startYear: 2022 });
    expect(anti).toMatchObject({ level: 'Beginner', startYear: 2026 });
    expect(unknown).toBe(sets[0].skills[3]);
    expect(changed).toBe(3);
  });

  it('does not mutate the input', () => {
    applySuggestions(sets);
    expect(sets[0].skills[0].startYear).toBe(2026);
  });
});
