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
  GripVertical,
  ChevronDown,
  ChevronUp,
  Save,
} from 'lucide-react';
import { CommonService } from '@/shared/services/common-service';
import PageHeader from '@/components/admin/PageHeader';
import { SkillSet, Skill } from '@/types';
import { toast } from "sonner";

const AdminSkills = () => {
  const [skillSets, setSkillSets] = useState<SkillSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteCatIndex, setDeleteCatIndex] = useState<number | null>(null);

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

  const updateSkill = (catIndex: number, skillIndex: number, field: keyof Skill, value: string | number) => {
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        eyebrow="EXPERTISE"
        title="Skills & Tools"
        subtitle="Manage your technical expertise and group them by category."
        backTo="/dashboard"
        actions={
          <>
            <Button
              variant="outline"
              onClick={addCategory}
              className="border-border hover:bg-secondary rounded-xl px-4 py-2 text-muted-foreground hover:text-foreground transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </>
        }
      />

      <div className="space-y-8">
        {isLoading ? (
          <div className="h-40 bg-secondary border border-border rounded-xl animate-pulse" />
        ) : skillSets.map((set, catIndex) => (
          <Card key={catIndex} interactive className="overflow-hidden rounded-xl group/card">
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border bg-secondary">
              <div className="flex items-center gap-4 flex-1">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing hover:text-accent transition-colors" />
                <div className="relative group/input flex-1 max-w-sm">
                  <Input
                    value={set.category}
                    onChange={(e) => {
                      const next = [...skillSets];
                      next[catIndex].category = e.target.value;
                      setSkillSets(next);
                    }}
                    className="bg-transparent border-none text-xl font-bold p-0 h-auto focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
                    placeholder="Enter category name..."
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-accent transition-all duration-300 group-focus-within/input:w-full" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground" onClick={() => moveCategory(catIndex, 'up')} disabled={catIndex === 0}>
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground" onClick={() => moveCategory(catIndex, 'down')} disabled={catIndex === skillSets.length - 1}>
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-danger-fg hover:text-danger-fg hover:bg-danger-subtle rounded-lg ml-1" onClick={() => removeCategory(catIndex)}>
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
                        className="bg-transparent border-none font-bold p-0 h-auto focus-visible:ring-0 text-sm text-foreground"
                        placeholder="Skill name"
                      />
                      <button
                        onClick={() => removeSkill(catIndex, skillIndex)}
                        className="opacity-0 group-hover:opacity-100 text-danger-fg hover:text-danger-fg/80 transition-all active:scale-90"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Select
                        value={skill.level}
                        onValueChange={(v) => updateSkill(catIndex, skillIndex, 'level', v)}
                      >
                        <SelectTrigger className="bg-card border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold text-muted-foreground h-auto focus:ring-accent">
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
                          <span className="absolute -top-4 right-0 text-[9px] text-accent/70 font-mono">
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
                  Add Skill
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={deleteCatIndex !== null}
        onOpenChange={(o) => !o && setDeleteCatIndex(null)}
        title="Remove Category?"
        description={deleteCatIndex !== null ? `"${skillSets[deleteCatIndex]?.category}" and all its skills will be permanently removed.` : ''}
        confirmLabel="Remove"
        onConfirm={handleConfirmRemoveCategory}
      />
    </div>
  );
};

export default AdminSkills;
