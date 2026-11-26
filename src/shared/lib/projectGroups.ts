/**
 * Projects page sections. Must match src/lib/projectGroups.js on the site:
 * the `group` field wins, otherwise it's inferred from role and category.
 */

export type ProjectGroupId = 'venture' | 'client' | 'lab' | 'academic';

export const PROJECT_GROUPS: { id: ProjectGroupId; label: string }[] = [
  { id: 'venture', label: 'Ventures I founded' },
  { id: 'client', label: 'Client work' },
  { id: 'lab', label: 'Side projects & experiments' },
  { id: 'academic', label: 'University, open source & community' },
];

const IDS = new Set<string>(PROJECT_GROUPS.map((g) => g.id));

export function inferredGroupOf(p: { role?: string; category?: string; type?: string; client?: string }): ProjectGroupId {
  const category = String(p.category || p.type || '').trim();
  if (/founder/i.test(p.role || '')) return 'venture';
  if (/^(university|open source|community)$/i.test(category)) return 'academic';
  if (/^(ai|prototypes?)$/i.test(category) || !String(p.client || '').trim()) return 'lab';
  return 'client';
}

export function projectGroupOf(p: { group?: string; role?: string; category?: string; type?: string; client?: string }): ProjectGroupId {
  return p.group && IDS.has(p.group) ? (p.group as ProjectGroupId) : inferredGroupOf(p);
}

export const groupLabel = (id: ProjectGroupId) => PROJECT_GROUPS.find((g) => g.id === id)?.label ?? id;
