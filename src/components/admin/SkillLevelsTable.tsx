import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import type { Skill, SkillSet } from '@/types';

type Level = Skill['level'];

/** Stored value → label shown on the public /skills page. */
const LEVEL_LABELS: Record<Level, string> = {
  Expert: 'Daily driver',
  Advance: 'Proficient',
  Intermediate: 'Familiar',
  Beginner: 'Learning',
};
const LEVELS = Object.keys(LEVEL_LABELS) as Level[];
const NOW = new Date().getFullYear();
const YEARS = Array.from({ length: NOW - 2021 + 1 }, (_, i) => 2021 + i);

const fieldCls =
  'h-8 rounded-md border border-border bg-background px-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

type Row = { cat: number; idx: number; skill: Skill; category: string };
const rowId = (r: Pick<Row, 'cat' | 'idx'>) => `${r.cat}:${r.idx}`;

interface Props {
  skillSets: SkillSet[];
  onChange: (sets: SkillSet[]) => void;
}

/** One row per skill so levels and start years can be set in bulk. */
export default function SkillLevelsTable({ skillSets, onChange }: Props) {
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    return skillSets.flatMap((set, cat) =>
      set.skills
        .map((skill, idx) => ({ cat, idx, skill, category: set.category }))
        .filter(
          (r) =>
            (category === 'all' || String(r.cat) === category) &&
            (level === 'all' || r.skill.level === level) &&
            (!q || r.skill.name.toLowerCase().includes(q)),
        ),
    );
  }, [skillSets, category, level, query]);

  const patch = (ids: Set<string>, change: Partial<Skill>) =>
    onChange(
      skillSets.map((set, cat) => ({
        ...set,
        skills: set.skills.map((s, idx) => (ids.has(rowId({ cat, idx })) ? { ...s, ...change } : s)),
      })),
    );

  const allShownSelected = rows.length > 0 && rows.every((r) => selected.has(rowId(r)));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => (allShownSelected ? next.delete(rowId(r)) : next.add(rowId(r))));
      return next;
    });
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const yearCounts = useMemo(() => {
    const m = new Map<number, number>();
    skillSets.forEach((s) => s.skills.forEach((k) => !k.toolOnly && m.set(k.startYear, (m.get(k.startYear) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [skillSets]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search skills" className="h-8 w-48 text-[13px]" />
        <select className={fieldCls} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {skillSets.map((s, i) => (
            <option key={i} value={i}>{s.category}</option>
          ))}
        </select>
        <select className={fieldCls} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filter by level">
          <option value="all">All levels</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
          ))}
        </select>
        <span className="ml-auto text-[12px] text-muted-foreground">
          Per year: {yearCounts.map(([y, n]) => `${y} · ${n}`).join('  ·  ')}
        </span>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-[13px]">
          <span className="font-medium text-foreground">{selected.size} selected</span>
          <select className={fieldCls} value="" onChange={(e) => e.target.value && patch(selected, { level: e.target.value as Level })} aria-label="Set level for selected">
            <option value="">Set level…</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
            ))}
          </select>
          <select className={fieldCls} value="" onChange={(e) => e.target.value && patch(selected, { startYear: Number(e.target.value) })} aria-label="Set year for selected">
            <option value="">Set year…</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button type="button" className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-secondary text-left text-[12px] text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2">
                <input type="checkbox" checked={allShownSelected} onChange={toggleAll} aria-label="Select all shown" className="accent-[var(--accent,#ff5f00)]" />
              </th>
              <th className="px-3 py-2 font-medium">Skill</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Level</th>
              <th className="px-3 py-2 font-medium">Since</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const id = rowId(r);
              return (
                <tr key={id} className="border-t border-border">
                  <td className="px-3 py-1.5">
                    <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} aria-label={`Select ${r.skill.name}`} className="accent-[var(--accent,#ff5f00)]" />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white">
                        {r.skill.icon && <img src={r.skill.icon} alt="" className="h-4 w-4 object-contain" loading="lazy" />}
                      </span>
                      <span className="font-medium text-foreground">{r.skill.name}</span>
                      {r.skill.toolOnly && <span className="text-[11px] text-muted-foreground">(strip only)</span>}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{r.category}</td>
                  <td className="px-3 py-1.5">
                    <select className={fieldCls} value={r.skill.level} onChange={(e) => patch(new Set([id]), { level: e.target.value as Level })} aria-label={`Level for ${r.skill.name}`}>
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-1.5">
                    <select className={fieldCls} value={r.skill.startYear} onChange={(e) => patch(new Set([id]), { startYear: Number(e.target.value) })} aria-label={`Start year for ${r.skill.name}`}>
                      {!YEARS.includes(r.skill.startYear) && <option value={r.skill.startYear}>{r.skill.startYear || '—'}</option>}
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No skills match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
