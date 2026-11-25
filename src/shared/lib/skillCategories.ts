import type { SkillSet } from '@/types';
import { TOOLS_CATEGORY } from './toolLogos';

/** Category order on the public skills page. */
export const CATEGORY_ORDER = [
  'Frontend Development',
  'Backend Development',
  'Programming Languages',
  'Mobile Development',
  'Database Technologies',
  'DevOps & Cloud',
  'AI & Automation',
  'AI Coding Tools',
  'Testing & APIs',
  'Developer Tools',
  'Design & Collaboration',
  'CMS & E-commerce',
] as const;

/** Where each imported tool belongs. Anything not listed stays in Tools for review. */
const HOME: Record<string, (typeof CATEGORY_ORDER)[number]> = {
  Angular: 'Frontend Development', AngularJS: 'Frontend Development', CSS: 'Frontend Development',
  'Next.js': 'Frontend Development', Vite: 'Frontend Development', DataTables: 'Frontend Development',
  'Web3.js': 'Frontend Development',
  Flask: 'Backend Development', Spring: 'Backend Development', Apache: 'Backend Development',
  NGINX: 'Backend Development', web2py: 'Backend Development', JWT: 'Backend Development',
  OAuth: 'Backend Development', EmailJS: 'Backend Development',
  C: 'Programming Languages', Go: 'Programming Languages', R: 'Programming Languages', Dart: 'Programming Languages',
  Android: 'Mobile Development', 'Android Studio': 'Mobile Development', Flutter: 'Mobile Development',
  Expo: 'Mobile Development',
  Neo4j: 'Database Technologies', Oracle: 'Database Technologies', 'Azure SQL Database': 'Database Technologies',
  Azure: 'DevOps & Cloud', Cloudflare: 'DevOps & Cloud', Vercel: 'DevOps & Cloud', Netlify: 'DevOps & Cloud',
  Heroku: 'DevOps & Cloud', Railway: 'DevOps & Cloud', cPanel: 'DevOps & Cloud', k3OS: 'DevOps & Cloud',
  Ubuntu: 'DevOps & Cloud', 'Kali Linux': 'DevOps & Cloud', OPNsense: 'DevOps & Cloud',
  Anaconda: 'AI & Automation', Jupyter: 'AI & Automation', 'Hugging Face': 'AI & Automation',
  Ollama: 'AI & Automation', n8n: 'AI & Automation', Apify: 'AI & Automation',
  Claude: 'AI Coding Tools', Codex: 'AI Coding Tools', Cursor: 'AI Coding Tools', Antigravity: 'AI Coding Tools',
  Lovable: 'AI Coding Tools',
  Jest: 'Testing & APIs', Vitest: 'Testing & APIs', Playwright: 'Testing & APIs', Postman: 'Testing & APIs',
  OpenAPI: 'Testing & APIs', JSON: 'Testing & APIs',
  Git: 'Developer Tools', GitHub: 'Developer Tools', GitLab: 'Developer Tools', 'VS Code': 'Developer Tools',
  'Visual Studio': 'Developer Tools', 'IntelliJ IDEA': 'Developer Tools', NetBeans: 'Developer Tools',
  CodePen: 'Developer Tools', Yarn: 'Developer Tools',
  Figma: 'Design & Collaboration', Jira: 'Design & Collaboration', Slack: 'Design & Collaboration',
  Clarity: 'Design & Collaboration',
  Sanity: 'CMS & E-commerce', WooCommerce: 'CMS & E-commerce',
};

/**
 * Moves tools out of the Tools bucket into their categories (creating any
 * that are missing) and shows them on the skills page. Existing skills and
 * unmapped tools stay where they are. Categories follow CATEGORY_ORDER.
 */
export function organiseSkills(sets: SkillSet[]): { sets: SkillSet[]; moved: number; left: string[] } {
  const next = sets.map((s) => ({ ...s, skills: s.skills.map((sk) => ({ ...sk })) }));
  const tools = next.find((s) => s.category === TOOLS_CATEGORY);
  let moved = 0;
  if (tools) {
    tools.skills = tools.skills.filter((sk) => {
      const home = HOME[sk.name];
      if (!home) return true;
      let target = next.find((s) => s.category === home);
      if (!target) {
        target = { category: home, skills: [] };
        next.push(target);
      }
      if (!target.skills.some((x) => x.name.toLowerCase() === sk.name.toLowerCase())) {
        target.skills.push({ ...sk, toolOnly: false });
      }
      moved++;
      return false;
    });
  }
  const rank = (c: string) => {
    const i = (CATEGORY_ORDER as readonly string[]).indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length + (c === TOOLS_CATEGORY ? 1 : 0) : i;
  };
  const ordered = next.filter((s) => s.skills.length).sort((a, b) => rank(a.category) - rank(b.category));
  return { sets: ordered, moved, left: tools?.skills.map((s) => s.name) ?? [] };
}
