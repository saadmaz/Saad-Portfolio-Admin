import type { Skill, SkillSet } from '@/types';

/** Display names for the bundled Devicon logos (file name prefix → label). */
export const TOOL_LABELS: Record<string, string> = {
  amazonwebservices: 'AWS', anaconda: 'Anaconda', android: 'Android', androidstudio: 'Android Studio',
  angular: 'Angular', angularjs: 'AngularJS', antigravity: 'Antigravity', apache: 'Apache', apify: 'Apify',
  apple: 'Apple', azure: 'Azure', azuresqldatabase: 'Azure SQL Database', c: 'C', clarity: 'Clarity',
  claude: 'Claude', cloudflare: 'Cloudflare', codepen: 'CodePen', codex: 'Codex', cpanel: 'cPanel',
  css: 'CSS', css3: 'CSS3', cursor: 'Cursor', dart: 'Dart', datatables: 'DataTables', devicon: 'Devicon',
  docker: 'Docker', emailjs: 'EmailJS', expo: 'Expo', express: 'Express', figma: 'Figma',
  firebase: 'Firebase', firefox: 'Firefox', flask: 'Flask', flutter: 'Flutter', git: 'Git',
  github: 'GitHub', gitlab: 'GitLab', go: 'Go', heroku: 'Heroku', html5: 'HTML5',
  huggingface: 'Hugging Face', intellij: 'IntelliJ IDEA', java: 'Java', javascript: 'JavaScript',
  jest: 'Jest', jira: 'Jira', json: 'JSON', jupyter: 'Jupyter', jwt: 'JWT', k3os: 'k3OS',
  kalilinux: 'Kali Linux', linkedin: 'LinkedIn', lovable: 'Lovable', mongodb: 'MongoDB', mysql: 'MySQL',
  n8n: 'n8n', neo4j: 'Neo4j', netbeans: 'NetBeans', netlify: 'Netlify', nextjs: 'Next.js', nginx: 'NGINX',
  nodejs: 'Node.js', oauth: 'OAuth', ollama: 'Ollama', openapi: 'OpenAPI', opnsense: 'OPNsense',
  oracle: 'Oracle', playwright: 'Playwright', postgresql: 'PostgreSQL', postman: 'Postman',
  python: 'Python', r: 'R', railway: 'Railway', react: 'React', rect: 'Rect', rust: 'Rust',
  safari: 'Safari', sanity: 'Sanity', slack: 'Slack', spring: 'Spring', supabase: 'Supabase',
  tailwindcss: 'Tailwind CSS', twitter: 'Twitter', typescript: 'TypeScript', ubuntu: 'Ubuntu',
  vercel: 'Vercel', visualstudio: 'Visual Studio', vite: 'Vite', vitejs: 'Vite', vitest: 'Vitest',
  vscode: 'VS Code', vuejs: 'Vue.js', web2py: 'web2py', web3js: 'Web3.js', woocommerce: 'WooCommerce',
  yarn: 'Yarn',
};

/** The category imported tools land in when they don't match an existing skill. */
export const TOOLS_CATEGORY = 'Tools';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Keys a skill name can match a tool by: "React.js" matches "React", "Node.js" matches "Node.js". */
const keysOf = (name: string) => {
  const n = norm(name);
  return n.endsWith('js') ? [n, n.slice(0, -2)] : [n];
};

/** True when some skill already carries an icon under this tool's name. */
export function hasToolIcon(sets: SkillSet[], label: string): boolean {
  const k = norm(label);
  return sets.some((s) => s.skills.some((sk) => sk.icon && keysOf(sk.name).includes(k)));
}

/**
 * Applies uploaded logos to the skills: an existing skill with the same name
 * gets the icon and joins the tools strip; anything else is added to the
 * Tools category as strip-only (kept off the public /skills page).
 */
export function mergeToolLogos(
  sets: SkillSet[],
  logos: { label: string; url: string }[],
  year = new Date().getFullYear(),
): { sets: SkillSet[]; matched: number; added: number } {
  const next = sets.map((s) => ({ ...s, skills: s.skills.map((sk) => ({ ...sk })) }));
  let matched = 0;
  let added = 0;
  for (const { label, url } of logos) {
    const k = norm(label);
    const hit = next.flatMap((s) => s.skills).find((sk) => keysOf(sk.name).includes(k));
    if (hit) {
      if (!hit.icon) hit.icon = url;
      hit.showInTools = true;
      matched++;
      continue;
    }
    let tools = next.find((s) => s.category === TOOLS_CATEGORY);
    if (!tools) {
      tools = { category: TOOLS_CATEGORY, skills: [] };
      next.push(tools);
    }
    const skill: Skill = { name: label, level: 'Intermediate', startYear: year, icon: url, showInTools: true, toolOnly: true };
    tools.skills.push(skill);
    added++;
  }
  return { sets: next, matched, added };
}
