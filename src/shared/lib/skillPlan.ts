import type { Skill, SkillSet } from '@/types';

type Level = Skill['level'];

/** Normalises names so "React.js", "react" and "ReactJS" match. */
export const skillKey = (name: string) =>
  name.toLowerCase().replace(/\.js\b|js$/g, '').replace(/[^a-z0-9+#]/g, '');

const YEARS: Record<number, string[]> = {
  2021: ['HTML5 & CSS3', 'CSS', 'JavaScript', 'Java', 'C', 'Python', 'Git', 'GitHub', 'VS Code', 'NetBeans', 'IntelliJ IDEA', 'CodePen', 'MySQL', 'Ubuntu'],
  2022: ['React', 'Responsive Web Design', 'Node', 'Express', 'RESTful Services', 'JSON', 'Postman', 'Figma', 'Docker', 'cPanel', 'Apache', 'Visual Studio', 'Android', 'Android Studio'],
  2023: ['TypeScript', 'Tailwind CSS', 'Vue', 'MongoDB', 'Firebase', 'Authentication & Authorization', 'JWT', 'OAuth', 'EmailJS', 'Netlify', 'Heroku', 'Yarn', 'GitLab', 'Jira', 'Slack', 'Jupyter', 'Anaconda', 'R', 'Flask', 'AngularJS', 'Angular', 'DataTables', 'WooCommerce'],
  2024: ['Next', 'Vite', 'PostgreSQL', 'Supabase', 'Oracle', 'Neo4j', 'AWS', 'Azure', 'Azure SQL Database', 'Vercel', 'Cloudflare', 'NGINX', 'Environment Configuration', 'Server-Side Business Logic', 'Jest', 'OpenAPI', 'Flutter', 'Dart', 'Expo', 'Spring', 'Go', 'Kali Linux', 'OPNsense', 'Sanity', 'Clarity', 'web2py'],
  2025: ['CI/CD Pipelines', 'Cloud Deployment & Monitoring', 'Railway', 'k3OS', 'Vitest', 'Playwright', 'Hugging Face', 'Ollama', 'n8n', 'Apify', 'Claude', 'Cursor', 'Web3'],
  2026: ['Codex', 'Antigravity', 'Lovable'],
};

const LEVELS: Partial<Record<Level, string[]>> = {
  Advance: ['MySQL', 'MongoDB', 'Supabase', 'Firebase', 'Python', 'Java', 'Express', 'PostgreSQL', 'Vercel', 'Postman', 'Figma', 'Docker', 'Claude', 'Cursor', 'Git', 'GitHub', 'VS Code', 'Next', 'Tailwind CSS', 'Node'],
  Beginner: ['Rust', 'Go', 'Flutter', 'Dart', 'Spring', 'Neo4j', 'k3OS', 'Web3', 'Antigravity', 'Codex'],
};

const index = <T,>(groups: Record<string | number, string[]>, cast: (k: string) => T) => {
  const m = new Map<string, T>();
  for (const [k, names] of Object.entries(groups)) for (const n of names) m.set(skillKey(n), cast(k));
  return m;
};
export const SUGGESTED_YEAR = index(YEARS, Number);
export const SUGGESTED_LEVEL = index(LEVELS as Record<string, string[]>, (k) => k as Level);

/**
 * Fills in suggested start years for known skills, and suggested levels only for
 * skills still on the import default (Intermediate), so hand-set levels survive.
 * Returns the new sets and how many skills changed.
 */
export function applySuggestions(sets: SkillSet[]): { sets: SkillSet[]; changed: number } {
  let changed = 0;
  const next = sets.map((set) => ({
    ...set,
    skills: set.skills.map((s) => {
      const k = skillKey(s.name);
      const year = SUGGESTED_YEAR.get(k) ?? s.startYear;
      const level = s.level === 'Intermediate' ? SUGGESTED_LEVEL.get(k) ?? s.level : s.level;
      if (year === s.startYear && level === s.level) return s;
      changed++;
      return { ...s, startYear: year, level };
    }),
  }));
  return { sets: next, changed };
}
