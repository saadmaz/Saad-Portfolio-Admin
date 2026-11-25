import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  Download,
} from 'lucide-react';
import LogoUpload from '@/components/admin/LogoUpload';
import { uploadImage } from '@/services/storage';
import { TOOL_LABELS, foldToolDuplicates, hasToolIcon, mergeToolLogos } from '@/shared/lib/toolLogos';
import { CommonService } from '@/shared/services/common-service';
import PageHeader from '@/components/admin/PageHeader';
import { plural } from '@/shared/lib/utils';
import { SkillSet, Skill } from '@/types';
import { toast } from "sonner";

// Devicon logos (MIT) bundled with the admin as SVG text. Imported raw so the
// upload never fetches a data: URL, which the admin's CSP (connect-src) blocks.
const BUNDLED_LOGOS = Object.entries(
  import.meta.glob<string>('@/assets/tool-logos/*.svg', { eager: true, query: '?raw', import: 'default' }),
)
  .map(([path, svg]) => {
    const id = path.split('/').pop()!.replace('.svg', '').split('-')[0];
    return { id, svg, label: TOOL_LABELS[id] ?? id };
  })
  .filter((t, i, all) => all.findIndex((x) => x.label === t.label) === i);

const AdminSkills = () => {
  const [skillSets, setSkillSets] = useState<SkillSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteCatIndex, setDeleteCatIndex] = useState<number | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  /** Upload the bundled logos the skills don't have yet, then merge them in (saved with "Save all changes"). */
  const importLogos = async () => {
    // Earlier imports may have added strip-only copies of real skills; fold those first.
    const { sets: base, folded } = foldToolDuplicates(skillSets);
    const todo = BUNDLED_LOGOS.filter((t) => !hasToolIcon(base, t.label));
    if (!todo.length) {
      setSkillSets(base);
      toast.info(folded ? `Merged ${folded} duplicate tools. Press "Save all changes".` : 'Every bundled tool already has a logo');
      return;
    }
    const uploaded: { label: string; url: string }[] = [];
    try {
      for (const [i, t] of todo.entries()) {
        setImporting(`${i + 1}/${todo.length}`);
        const file = new File([t.svg], `${t.id}.svg`, { type: 'image/svg+xml' });
        uploaded.push({ label: t.label, url: await uploadImage(file, 'tools', undefined, t.id) });
      }
    } catch {
      toast.error(`Upload stopped after ${uploaded.length} logos. Run the import again to continue.`);
    } finally {
      setImporting(null);
    }
    if (!uploaded.length) return;
    const r = mergeToolLogos(base, uploaded);
    setSkillSets(r.sets);
    toast.success(`${r.matched + folded} skills got logos, ${r.added} tools added. Press "Save all changes" to publish.`);
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const data = await CommonService.getSkills();
      setSkillSets(data);
    } catch {
      toast.error('Failed to load skills');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await CommonService.updateSkills(skillSets);
      toast.success('Skills updated successfully');
    } catch {
      toast.error('Failed to save skills');
    } finally {
      setIsSaving(false);
    }
  };

  const addCategory = () => {
    setSkillSets([...skillSets, { category: 'New Category', skills: [] }]);
  };

  const removeCategory = (index: number) => setDeleteCatIndex(index);
  const handleConfirmRemoveCategory = () => {
    if (deleteCatIndex === null) return;
    setSkillSets(skillSets.filter((_, i) => i !== deleteCatIndex));
    setDeleteCatIndex(null);
  };

  const addSkill = (catIndex: number) => {
    const newSkillSets = [...skillSets];
    newSkillSets[catIndex].skills.push({ name: 'New Skill', level: 'Intermediate', startYear: new Date().getFullYear() });
    setSkillSets(newSkillSets);
  };

  const updateSkill = (catIndex: number, skillIndex: number, field: keyof Skill, value: string | number | boolean) => {
    const newSkillSets = [...skillSets];
    const skill = { ...newSkillSets[catIndex].skills[skillIndex], [field]: value };
    newSkillSets[catIndex].skills[skillIndex] = skill as Skill;
    setSkillSets(newSkillSets);
  };

  const removeSkill = (catIndex: number, skillIndex: number) => {
    const newSkillSets = [...skillSets];
    newSkillSets[catIndex].skills = newSkillSets[catIndex].skills.filter((_, i) => i !== skillIndex);
    setSkillSets(newSkillSets);
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= skillSets.length) return;
    const newSkillSets = [...skillSets];
    [newSkillSets[index], newSkillSets[newIndex]] = [newSkillSets[newIndex], newSkillSets[index]];
    setSkillSets(newSkillSets);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills & tools"
        subtitle={`${plural(skillSets.reduce((n, s) => n + s.skills.length, 0), "skill")} · ${plural(skillSets.length, "category", "categories")}`}
        actions={
          <>
            <Button variant="outline" onClick={importLogos} loading={importing !== null}>
              <Download className="w-4 h-4" /> {importing ? `Importing ${importing}` : 'Import tool logos'}
            </Button>
            <Button
              variant="outline"
              onClick={addCategory}
            >
              <Plus className="w-4 h-4" /> Add category
            </Button>
            <Button
              onClick={handleSave}
              loading={isSaving}
            >
              <Save className="w-4 h-4" /> Save all changes
            </Button>
          </>
        }
      />

      <div className="space-y-8">
        {isLoading ? (
          <div className="h-40 w-full animate-pulse rounded-xl border border-border-subtle bg-card" />
        ) : skillSets.map((set, catIndex) => (
          <Card key={catIndex} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border bg-secondary">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative group/input flex-1 max-w-sm">
                  <Input
                    value={set.category}
                    onChange={(e) => {
                      const next = [...skillSets];
                      next[catIndex].category = e.target.value;
                      setSkillSets(next);
                    }}
                    className="bg-transparent border-none text-xl font-medium p-0 h-auto focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
                    placeholder="Enter category name…"
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-accent transition-all duration-300 group-focus-within/input:w-full" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon-sm" aria-label="Move category up" className="hover:bg-card" onClick={() => moveCategory(catIndex, 'up')} disabled={catIndex === 0}>
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Move category down" className="hover:bg-card" onClick={() => moveCategory(catIndex, 'down')} disabled={catIndex === skillSets.length - 1}>
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button variant="destructive-ghost" size="icon-sm" aria-label="Delete category" className="ml-1" onClick={() => removeCategory(catIndex)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {set.skills.map((skill, skillIndex) => (
                  <div key={skillIndex} className="p-4 rounded-xl bg-secondary border border-border space-y-4 relative group transition-all hover:bg-secondary/80 hover:border-border/80 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={skill.name}
                        onChange={(e) => updateSkill(catIndex, skillIndex, 'name', e.target.value)}
                        className="bg-transparent border-none font-medium p-0 h-auto focus-visible:ring-0 text-sm text-foreground"
                        placeholder="Skill name"
                      />
                      <button
                        type="button"
                        onClick={() => removeSkill(catIndex, skillIndex)}
                        aria-label={`Remove ${skill.name || 'skill'}`}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-danger-fg transition-[opacity,background-color] hover:bg-danger-subtle focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <LogoUpload
                      value={skill.icon ?? ''}
                      onChange={(url) => updateSkill(catIndex, skillIndex, 'icon', url)}
                      label="Logo"
                      size={52}
                      light
                      compact
                    />
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
                      <div className="contents">
                        <label className="flex items-center gap-2 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="accent-[var(--accent,#ff5f00)]"
                            checked={!!skill.showInTools}
                            onChange={(e) => updateSkill(catIndex, skillIndex, 'showInTools', e.target.checked)}
                          />
                          In tools strip
                        </label>
                        <label className="flex items-center gap-2 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="accent-[var(--accent,#ff5f00)]"
                            checked={!!skill.toolOnly}
                            onChange={(e) => updateSkill(catIndex, skillIndex, 'toolOnly', e.target.checked)}
                          />
                          Hide on skills page
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Select
                        value={skill.level}
                        onValueChange={(v) => updateSkill(catIndex, skillIndex, 'level', v)}
                      >
                        <SelectTrigger className="bg-card border border-border rounded-lg px-2 py-1.5 text-[12px] font-medium text-muted-foreground h-auto focus:ring-accent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border text-foreground">
                          {(['Beginner', 'Intermediate', 'Advance', 'Expert'] as const).map(lvl => (
                            <SelectItem key={lvl} value={lvl} className="text-xs">{lvl}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Input
                          type="number"
                          value={skill.startYear}
                          onChange={(e) => updateSkill(catIndex, skillIndex, 'startYear', parseInt(e.target.value))}
                          className="bg-card border-border h-8 text-caption tabular py-0 px-3 pl-7 rounded-lg font-mono text-foreground focus:border-accent/50 ring-0"
                          placeholder="Year"
                          min={1990}
                          max={new Date().getFullYear()}
                        />
                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-accent" />
                        {skill.startYear > 0 && (
                          <span className="absolute -top-4 right-0 text-[12px] text-accent/70 font-mono">
                            {new Date().getFullYear() - skill.startYear}y
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => addSkill(catIndex)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-border hover:border-accent hover:text-accent transition-all text-sm text-muted-foreground gap-1 min-h-[82px]"
                >
                  <Plus className="w-4 h-4" />
                  Add skill
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={deleteCatIndex !== null}
        onOpenChange={(o) => !o && setDeleteCatIndex(null)}
        title="Remove category?"
        description={deleteCatIndex !== null ? `"${skillSets[deleteCatIndex]?.category}" and all its skills will be permanently removed.` : ''}
        confirmLabel="Remove"
        onConfirm={handleConfirmRemoveCategory}
      />
    </div>
  );
};

export default AdminSkills;
