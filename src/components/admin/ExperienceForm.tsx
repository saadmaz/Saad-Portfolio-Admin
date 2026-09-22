import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Save, Trash2, Briefcase, MapPin, Calendar, Building2,
  Sparkles, Plus, ChevronDown, ChevronUp, Trophy,
  Image as ImageIcon, Link as LinkIcon, FileText, Presentation, X, Star, GripVertical, Check,
} from 'lucide-react';
import LogoUpload from './LogoUpload';
import FormHeader from './FormHeader';
import { CommonService } from '@/shared/services/common-service';
import { ProjectService } from '@/services/project-service';
import { Experience, ExperienceRole, ExperienceMedia, Project } from '@/types';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const EMPLOYMENT_TYPES = [
  'Full-time','Part-time','Self-employed','Freelance',
  'Contract','Internship','Apprenticeship','Seasonal',
];

const LOCATION_TYPES = ['On-site', 'Remote', 'Hybrid'] as const;
const MEDIA_TYPES = ['Image', 'Document', 'Link', 'Presentation'] as const;

// "none" sentinel for optional month selects
const NONE = '__none__';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcDuration(
  startMonth?: string, startYear?: number,
  endMonth?: string, endYear?: number,
  isCurrent?: boolean,
): string {
  if (!startYear) return '';
  const sIdx = startMonth ? MONTHS.indexOf(startMonth) : 0;
  const s = new Date(startYear, sIdx < 0 ? 0 : sIdx, 1);
  const e = isCurrent
    ? new Date()
    : endYear ? new Date(endYear, endMonth ? MONTHS.indexOf(endMonth) : 11, 1) : new Date();
  let m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (m < 1) m = 1;
  const yrs = Math.floor(m / 12);
  const mos = m % 12;
  return [yrs > 0 && `${yrs} yr${yrs > 1 ? 's' : ''}`, mos > 0 && `${mos} mo${mos > 1 ? 's' : ''}`]
    .filter(Boolean).join(' ');
}

function parseLegacyDateStr(dateStr?: string): { month?: string; year?: number } {
  if (!dateStr || dateStr === 'Present') return {};
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length >= 2) {
    const monthStr = parts[0];
    const yearNum = parseInt(parts[parts.length - 1]);
    if (MONTHS.includes(monthStr) && !isNaN(yearNum)) return { month: monthStr, year: yearNum };
  }
  const yearOnly = parseInt(dateStr);
  if (!isNaN(yearOnly)) return { year: yearOnly };
  return {};
}

function makeEmptyRole(): ExperienceRole {
  return { role_title: '', role_is_current: false, description: '', skills: [], media: [] };
}

function makeEmptyMedia(): ExperienceMedia {
  return { media_type: 'Link', media_url: '', media_caption: '' };
}

// ─── Shared styled Select sub-components ─────────────────────────────────────

/** A full-width Select that matches the admin dark card style. */
function AdminSelect({
  value, onValueChange, placeholder, children, disabled, className = '',
}: {
  value?: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select value={value ?? ''} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={`bg-white/5 border-white/10 text-foreground focus:ring-accent focus:border-accent/40 ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
      >
        <SelectValue placeholder={placeholder ?? 'Select…'} />
      </SelectTrigger>
      <SelectContent className="bg-card border-white/10 shadow-xl">
        {children}
      </SelectContent>
    </Select>
  );
}

/** Reusable month+year picker pair. */
function MonthYearPicker({
  month, year, onMonthChange, onYearChange, disabled = false,
}: {
  month?: string;
  year?: number;
  onMonthChange: (v?: string) => void;
  onYearChange: (v?: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <AdminSelect
          value={month ?? NONE}
          onValueChange={(v) => onMonthChange(v === NONE ? undefined : v)}
          disabled={disabled}
        >
          <SelectItem value={NONE} className="text-muted-foreground">Month</SelectItem>
          {MONTHS.map(m => (
            <SelectItem key={m} value={m}>{m.slice(0, 3)}</SelectItem>
          ))}
        </AdminSelect>
      </div>
      <Input
        type="number"
        value={year ?? ''}
        onChange={(e) => onYearChange(e.target.value ? parseInt(e.target.value) : undefined)}
        placeholder="Year"
        disabled={disabled}
        className={`w-24 bg-white/5 border-white/10 text-sm ${disabled ? 'opacity-40' : ''}`}
      />
    </div>
  );
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  company_name: z.string().min(2, 'Company name is required'),
  company_logo: z.string().optional(),
  employment_type: z.string().default('Full-time'),
  location: z.string().min(2, 'Location is required'),
  location_type: z.string().default('On-site'),
  is_current: z.boolean().default(false),
  start_month: z.string().optional(),
  start_year: z.coerce.number().min(1950).max(2100).optional(),
  end_month: z.string().optional(),
  end_year: z.coerce.number().min(1950).max(2100).optional(),
  description: z.string().optional(),
  achievements: z.string().optional(),
  is_featured: z.boolean().default(false),
  display_order: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Role Sub-Form ────────────────────────────────────────────────────────────

interface RoleSubFormProps {
  role: ExperienceRole;
  index: number;
  total: number;
  collapsed: boolean;
  onToggle: () => void;
  onUpdate: (r: ExperienceRole) => void;
  onRemove: () => void;
}

function RoleSubForm({ role, index, total, collapsed, onToggle, onUpdate, onRemove }: RoleSubFormProps) {
  const [newSkill, setNewSkill] = useState('');

  const addSkill = () => {
    const s = newSkill.trim();
    if (!s || (role.skills ?? []).includes(s)) return;
    if ((role.skills ?? []).length >= 20) { toast.warning('Maximum 20 skills per role'); return; }
    onUpdate({ ...role, skills: [...(role.skills ?? []), s] });
    setNewSkill('');
  };

  const removeSkill = (i: number) =>
    onUpdate({ ...role, skills: (role.skills ?? []).filter((_, idx) => idx !== i) });

  const addMedia = () =>
    onUpdate({ ...role, media: [...(role.media ?? []), makeEmptyMedia()] });

  const updateMedia = (mi: number, patch: Partial<ExperienceMedia>) =>
    onUpdate({ ...role, media: (role.media ?? []).map((m, i) => i === mi ? { ...m, ...patch } : m) });

  const removeMedia = (mi: number) =>
    onUpdate({ ...role, media: (role.media ?? []).filter((_, i) => i !== mi) });

  const duration = calcDuration(
    role.role_start_month, role.role_start_year,
    role.role_end_month, role.role_end_year,
    role.role_is_current,
  );

  const mediaIcon = (type: ExperienceMedia['media_type']) => ({
    Image: <ImageIcon className="w-3 h-3" />,
    Document: <FileText className="w-3 h-3" />,
    Presentation: <Presentation className="w-3 h-3" />,
    Link: <LinkIcon className="w-3 h-3" />,
  }[type]);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      {/* Collapse header */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      >
        <GripVertical className="w-4 h-4 text-white/60 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {role.role_title || <span className="text-white/60 font-normal">Role {index + 1}</span>}
          </p>
          {duration && <p className="text-[10px] text-muted-foreground">{duration}</p>}
        </div>
        <div className="flex items-center gap-2">
          {total > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-1 rounded hover:bg-danger/10 text-danger hover:text-danger/80 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-white/60" />
            : <ChevronUp className="w-4 h-4 text-white/60" />}
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4 border-t border-white/10">
          {/* Role Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Role Title *</label>
            <Input
              value={role.role_title}
              onChange={(e) => onUpdate({ ...role, role_title: e.target.value })}
              placeholder="e.g. Senior Frontend Engineer"
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Role dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Start</label>
              <MonthYearPicker
                month={role.role_start_month}
                year={role.role_start_year}
                onMonthChange={(v) => onUpdate({ ...role, role_start_month: v })}
                onYearChange={(v) => onUpdate({ ...role, role_start_year: v })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">End</label>
              <MonthYearPicker
                month={role.role_end_month}
                year={role.role_end_year}
                onMonthChange={(v) => onUpdate({ ...role, role_end_month: v })}
                onYearChange={(v) => onUpdate({ ...role, role_end_year: v })}
                disabled={role.role_is_current}
              />
            </div>
          </div>

          {/* Currently in this role */}
          <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
            <div
              className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${role.role_is_current ? 'bg-accent' : 'bg-white/10'}`}
              onClick={() => onUpdate({ ...role, role_is_current: !role.role_is_current })}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${role.role_is_current ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              Currently in this role
            </span>
          </label>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Description</label>
              <span className="text-[10px] text-muted-foreground">{(role.description ?? '').length}/2000</span>
            </div>
            <Textarea
              value={role.description ?? ''}
              onChange={(e) => onUpdate({ ...role, description: e.target.value })}
              placeholder="Describe your responsibilities, what you worked on, and your impact..."
              maxLength={2000}
              rows={4}
              className="bg-white/5 border-white/10 text-sm resize-none"
            />
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Skills</label>
              <span className={`text-[10px] ${(role.skills ?? []).length > 5 ? 'text-warning-fg' : 'text-muted-foreground'}`}>
                {(role.skills ?? []).length}/20
                {(role.skills ?? []).length > 5 && ' · LinkedIn recommends top 5'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(role.skills ?? []).map((s, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] font-medium">
                  {s}
                  <button type="button" onClick={() => removeSkill(i)} className="hover:text-danger transition-colors">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(); } }}
                placeholder="Type a skill and press Enter…"
                className="bg-white/5 border-white/10 text-xs h-8"
              />
              <Button type="button" variant="outline" size="sm" className="h-8 border-white/10 bg-white/5 text-xs" onClick={addSkill}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Media */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Media</label>
            {(role.media ?? []).length > 0 && (
              <div className="space-y-2">
                {(role.media ?? []).map((m, mi) => (
                  <div key={mi} className="flex gap-2 items-start p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <span className="mt-2 text-accent flex-shrink-0">{mediaIcon(m.media_type)}</span>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <AdminSelect
                        value={m.media_type}
                        onValueChange={(v) => updateMedia(mi, { media_type: v as ExperienceMedia['media_type'] })}
                        className="h-7 text-xs"
                      >
                        {MEDIA_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                      </AdminSelect>
                      <Input
                        value={m.media_url}
                        onChange={(e) => updateMedia(mi, { media_url: e.target.value })}
                        placeholder="URL"
                        className="bg-white/5 border-white/10 text-xs h-7"
                      />
                      <Input
                        value={m.media_caption ?? ''}
                        onChange={(e) => updateMedia(mi, { media_caption: e.target.value })}
                        placeholder="Caption (optional)"
                        className="bg-white/5 border-white/10 text-xs h-7"
                      />
                    </div>
                    <button type="button" onClick={() => removeMedia(mi)} className="mt-1 p-1 text-danger hover:text-danger/80 hover:bg-danger/10 rounded transition-colors flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(role.media ?? []).length < 10 && (
              <Button type="button" variant="outline" size="sm" className="w-full border-dashed border-white/20 text-xs h-8" onClick={addMedia}>
                <Plus className="w-3 h-3 mr-1.5" /> Add Media
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

const ExperienceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!id && id !== 'new';

  const [roles, setRoles] = useState<ExperienceRole[]>([makeEmptyRole()]);
  const [collapsedRoles, setCollapsedRoles] = useState<Set<number>>(new Set());
  const [topSkills, setTopSkills] = useState<string[]>([]);
  const [topMedia, setTopMedia] = useState<ExperienceMedia[]>([]);
  const [newTopSkill, setNewTopSkill] = useState('');
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>([]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employment_type: 'Full-time',
      location_type: 'On-site',
      is_current: false,
      is_featured: false,
    },
  });

  const isCurrent     = watch('is_current');
  const startMonth    = watch('start_month');
  const startYear     = watch('start_year');
  const endMonth      = watch('end_month');
  const endYear       = watch('end_year');
  const companyLogo   = watch('company_logo');
  const locationType  = watch('location_type');
  const isFeatured    = watch('is_featured');
  const employmentType = watch('employment_type');

  const companyDuration = calcDuration(startMonth, startYear, endMonth, endYear, isCurrent);

  const loadExperience = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await CommonService.getWorkExperience();
      const item = data.find(exp => exp.id.toString() === id);
      if (!item) return;

      if (item.roles && item.roles.length > 0) {
        setRoles(item.roles);
      } else {
        const startParsed = parseLegacyDateStr(item.startDate);
        const endParsed   = parseLegacyDateStr(item.endDate);
        setRoles([{
          role_title:        item.position ?? '',
          role_is_current:   item.is_current ?? item.isCurrent ?? false,
          role_start_month:  startParsed.month,
          role_start_year:   startParsed.year,
          role_end_month:    endParsed.month,
          role_end_year:     endParsed.year,
          description:       item.description ?? '',
          skills:            item.skills ?? item.technologies ?? [],
          media:             item.media ?? [],
        }]);
      }

      setTopSkills(item.skills ?? item.technologies ?? []);
      setTopMedia(item.media ?? []);

      const cStart = parseLegacyDateStr(item.startDate);
      const cEnd   = parseLegacyDateStr(item.endDate);

      reset({
        company_name:    item.company_name ?? item.company ?? '',
        company_logo:    item.company_logo ?? item.companyLogo ?? '',
        employment_type: item.employment_type ?? item.employmentType ?? 'Full-time',
        location:        item.location ?? '',
        location_type:   (item.location_type ?? item.workMode ?? 'On-site') as FormValues['location_type'],
        is_current:      item.is_current ?? item.isCurrent ?? false,
        start_month:     item.start_month ?? cStart.month,
        start_year:      item.start_year ?? cStart.year,
        end_month:       item.end_month ?? cEnd.month,
        end_year:        item.end_year ?? cEnd.year,
        description:     item.description ?? '',
        achievements:    item.achievements ?? item.impact ?? '',
        is_featured:     item.is_featured ?? false,
        display_order:   item.display_order ?? item.order_index,
      });
    } catch {
      toast.error('Failed to load experience');
    } finally {
      setIsLoading(false);
    }
  }, [id, reset]);

  useEffect(() => { if (isEditMode) loadExperience(); }, [isEditMode, loadExperience]);

  useEffect(() => {
    (async () => {
      try {
        const projs = await ProjectService.getAll();
        setAllProjects(projs);
        if (isEditMode && id) {
          const preLinked = projs
            .filter(p => (p.linked_experience_ids ?? []).includes(id))
            .map(p => String(p.id));
          setLinkedProjectIds(preLinked);
        }
      } catch {
        // silently ignore
      } finally {
        setProjectsLoading(false);
      }
    })();
  }, [isEditMode, id]);

  const onSubmit = async (data: FormValues) => {
    if (!data.company_logo) { toast.error('Company logo is required'); return; }
    if (roles.some(r => !r.role_title.trim())) { toast.error('All roles must have a title'); return; }

    const startDateStr = data.start_month && data.start_year ? `${data.start_month} ${data.start_year}` : '';
    const endDateStr   = !data.is_current && data.end_month && data.end_year ? `${data.end_month} ${data.end_year}` : '';
    const firstRole    = roles[0];

    const saveData: Partial<Experience> = {
      company_name: data.company_name,  company_logo: data.company_logo,
      employment_type: data.employment_type, location: data.location,
      location_type: data.location_type as Experience['location_type'],
      is_current: data.is_current,
      start_month: data.start_month, start_year: data.start_year,
      end_month: data.end_month,     end_year: data.end_year,
      roles, description: data.description, achievements: data.achievements,
      skills: topSkills, media: topMedia,
      is_featured: data.is_featured, display_order: data.display_order,
      // Backward-compat aliases
      company: data.company_name, companyLogo: data.company_logo,
      employmentType: data.employment_type, workMode: data.location_type,
      isCurrent: data.is_current, startDate: startDateStr, endDate: endDateStr,
      position: firstRole?.role_title ?? '',
      technologies: topSkills.length > 0 ? topSkills : (firstRole?.skills ?? []),
      responsibilities: [], impact: data.achievements, order_index: data.display_order,
    };

    try {
      setIsLoading(true);
      let experienceId: string;
      if (isEditMode) {
        await CommonService.updateExperience(id!, saveData);
        experienceId = id!;
        toast.success('Experience updated');
      } else {
        const created = await CommonService.createExperience(saveData);
        experienceId = String(created.id);
        toast.success('Experience added');
      }

      // Bidirectional project linking
      const linkingPromises = allProjects
        .filter(proj => {
          const projId = String(proj.id);
          const currentlyLinked = (proj.linked_experience_ids ?? []).includes(experienceId);
          const shouldBeLinked = linkedProjectIds.includes(projId);
          return currentlyLinked !== shouldBeLinked;
        })
        .map(proj => {
          const projId = String(proj.id);
          const shouldBeLinked = linkedProjectIds.includes(projId);
          const currentIds = proj.linked_experience_ids ?? [];
          const newIds = shouldBeLinked
            ? [...currentIds, experienceId]
            : currentIds.filter(eid => eid !== experienceId);
          return ProjectService.update(projId, { linked_experience_ids: newIds });
        });
      await Promise.all(linkingPromises);

      navigate('/experience');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRoleCollapse = (i: number) =>
    setCollapsedRoles(prev => { const s = new Set(prev); if (s.has(i)) s.delete(i); else s.add(i); return s; });

  const addTopSkill = () => {
    const s = newTopSkill.trim();
    if (!s || topSkills.includes(s)) return;
    if (topSkills.length >= 20) { toast.warning('Maximum 20 skills'); return; }
    setTopSkills(prev => [...prev, s]);
    setNewTopSkill('');
  };

  const updateTopMedia = (i: number, patch: Partial<ExperienceMedia>) =>
    setTopMedia(m => m.map((item, idx) => idx === i ? { ...item, ...patch } : item));

  const mediaIcon = (type: ExperienceMedia['media_type']) => ({
    Image: <ImageIcon className="w-3 h-3" />,
    Document: <FileText className="w-3 h-3" />,
    Presentation: <Presentation className="w-3 h-3" />,
    Link: <LinkIcon className="w-3 h-3" />,
  }[type]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">

      <FormHeader
        backTo="/experience"
        title={isEditMode ? 'Edit Experience' : 'New Experience'}
        subtitle="Fill in the company details and roles below."
        actions={
          <Button type="submit"
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-8"
            disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving…' : 'Save'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT (main) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section 1 — Company Info */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/5 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent" /> Company Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Company name */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Company / Organization *</label>
                <Input {...register('company_name')} placeholder="e.g. Google" className="bg-white/5 border-white/10" />
                {errors.company_name && <p className="text-xs text-danger">{errors.company_name.message}</p>}
              </div>

              {/* Employment Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Employment Type</label>
                <AdminSelect
                  value={employmentType}
                  onValueChange={(v) => setValue('employment_type', v)}
                >
                  {EMPLOYMENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </AdminSelect>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Location *</label>
                <Input
                  {...register('location')}
                  placeholder="e.g. Colombo, Western Province, Sri Lanka"
                  className="bg-white/5 border-white/10"
                />
                {errors.location && <p className="text-xs text-danger">{errors.location.message}</p>}
              </div>

              {/* Location Type — pill toggle */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Location Type</label>
                <div className="flex gap-2">
                  {LOCATION_TYPES.map(lt => (
                    <button key={lt} type="button"
                      onClick={() => setValue('location_type', lt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        locationType === lt
                          ? 'bg-accent text-accent-foreground border-accent'
                          : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground'
                      }`}
                    >
                      {lt}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2 — Duration */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/5 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" /> Company Duration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Start Date</label>
                  <MonthYearPicker
                    month={startMonth}
                    year={startYear}
                    onMonthChange={(v) => setValue('start_month', v)}
                    onYearChange={(v) => setValue('start_year', v)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">End Date</label>
                  <MonthYearPicker
                    month={endMonth}
                    year={endYear}
                    onMonthChange={(v) => setValue('end_month', v)}
                    onYearChange={(v) => setValue('end_year', v)}
                    disabled={isCurrent}
                  />
                </div>
              </div>

              {/* Currently working toggle */}
              <label className="flex items-center gap-3 cursor-pointer group w-fit">
                <div
                  className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${isCurrent ? 'bg-accent' : 'bg-white/10'}`}
                  onClick={() => setValue('is_current', !isCurrent)}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isCurrent ? 'translate-x-5' : ''}`} />
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  Currently working here
                </span>
              </label>

              {companyDuration && (
                <p className="text-xs text-accent font-semibold bg-accent/5 border border-accent/20 rounded-lg px-3 py-2 w-fit">
                  {companyDuration}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Section 3 — Roles */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/5 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-accent" /> Roles at this Company
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {roles.map((role, i) => (
                <RoleSubForm
                  key={i} role={role} index={i} total={roles.length}
                  collapsed={collapsedRoles.has(i)}
                  onToggle={() => toggleRoleCollapse(i)}
                  onUpdate={(updated) => setRoles(r => r.map((x, idx) => idx === i ? updated : x))}
                  onRemove={() => setRoles(r => r.filter((_, idx) => idx !== i))}
                />
              ))}
              <Button type="button" variant="outline"
                className="w-full border-dashed border-white/20 text-muted-foreground hover:text-foreground text-sm"
                onClick={() => setRoles(r => [...r, makeEmptyRole()])}>
                <Plus className="w-4 h-4 mr-2" /> Add Another Role
              </Button>
            </CardContent>
          </Card>

          {/* Section 4 — Description */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/5 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" /> Overview Description
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Company-level summary</p>
                <span className="text-[10px] text-muted-foreground">{(watch('description') ?? '').length}/2000</span>
              </div>
              <Textarea {...register('description')}
                placeholder="Describe your overall responsibilities, what you worked on, and your impact..."
                maxLength={2000} rows={5} className="bg-white/5 border-white/10 resize-none" />
            </CardContent>
          </Card>

          {/* Section 5 — Achievements */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/5 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-accent" /> Key Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Metrics, wins, and impact highlights</p>
                <span className="text-[10px] text-muted-foreground">{(watch('achievements') ?? '').length}/2000</span>
              </div>
              <Textarea {...register('achievements')}
                placeholder="e.g. Grew user base by 40%, Led a team of 8, Shipped 3 major features..."
                maxLength={2000} rows={4} className="bg-white/5 border-white/10 resize-none" />
            </CardContent>
          </Card>

          {/* Section 6 — Skills */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/5 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Star className="w-4 h-4 text-accent" /> Company-Level Skills
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Skills across all roles (optional)</p>
                <span className={`text-[10px] ${topSkills.length > 5 ? 'text-warning-fg' : 'text-muted-foreground'}`}>
                  {topSkills.length}/20{topSkills.length > 5 && ' · LinkedIn recommends top 5'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {topSkills.map((s, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[11px] font-medium">
                    {s}
                    <button type="button" onClick={() => setTopSkills(prev => prev.filter((_, idx) => idx !== i))}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Input value={newTopSkill} onChange={(e) => setNewTopSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTopSkill(); } }}
                  placeholder="Type a skill and press Enter…"
                  className="bg-white/5 border-white/10 text-sm h-9" />
                <Button type="button" variant="outline" size="sm" className="h-9 border-white/10 bg-white/5" onClick={addTopSkill}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 7 — Media */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/5 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-accent" /> Media
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <p className="text-xs text-muted-foreground">Images, documents, links, or presentations — up to 10 items</p>
              {topMedia.map((m, i) => (
                <div key={i} className="flex gap-2 items-start p-3 rounded-lg bg-white/[0.03] border border-white/5">
                  <span className="mt-2 text-accent flex-shrink-0">{mediaIcon(m.media_type)}</span>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <AdminSelect
                      value={m.media_type}
                      onValueChange={(v) => updateTopMedia(i, { media_type: v as ExperienceMedia['media_type'] })}
                      className="h-8 text-xs"
                    >
                      {MEDIA_TYPES.map(t => <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>)}
                    </AdminSelect>
                    <Input value={m.media_url} onChange={(e) => updateTopMedia(i, { media_url: e.target.value })}
                      placeholder="URL" className="bg-white/5 border-white/10 text-xs h-7" />
                    <Input value={m.media_caption ?? ''} onChange={(e) => updateTopMedia(i, { media_caption: e.target.value })}
                      placeholder="Caption (optional)" className="bg-white/5 border-white/10 text-xs h-7" />
                  </div>
                  <button type="button" onClick={() => setTopMedia(m => m.filter((_, idx) => idx !== i))}
                    className="mt-1 p-1 text-danger hover:text-danger/80 hover:bg-danger/10 rounded transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {topMedia.length < 10 && (
                <Button type="button" variant="outline"
                  className="w-full border-dashed border-white/20 text-sm"
                  onClick={() => setTopMedia(m => [...m, makeEmptyMedia()])}>
                  <Plus className="w-4 h-4 mr-2" /> Add Media
                </Button>
              )}
            </CardContent>
          </Card>
          {/* Section 8 — Linked Projects */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/5 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Star className="w-4 h-4 text-accent" /> Linked Projects
                {linkedProjectIds.length > 0 && (
                  <span className="ml-auto text-[10px] font-bold text-accent">{linkedProjectIds.length} linked</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <p className="text-xs text-muted-foreground">
                Link portfolio projects to this experience. They will appear as a card strip on the public experience page.
              </p>
              {projectsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  Loading projects…
                </div>
              ) : allProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No projects found. Add portfolio projects first.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {allProjects.map((proj) => {
                    const projId = String(proj.id);
                    const isLinked = linkedProjectIds.includes(projId);
                    return (
                      <button
                        key={projId}
                        type="button"
                        onClick={() => setLinkedProjectIds(prev =>
                          isLinked ? prev.filter(pid => pid !== projId) : [...prev, projId]
                        )}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                          isLinked
                            ? 'border-accent/40 bg-accent/10'
                            : 'border-white/10 bg-white/[0.02] hover:border-accent/20 hover:bg-white/5'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                          isLinked ? 'bg-accent border-accent' : 'border-white/20'
                        }`}>
                          {isLinked && <Check className="w-2.5 h-2.5 text-accent-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${isLinked ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {proj.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {proj.status}{proj.techStack?.length ? ` · ${proj.techStack.slice(0, 3).join(', ')}` : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT (sidebar) ── */}
        <div className="space-y-6">

          {/* Company Logo */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/5 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent" />
                Company Logo <span className="text-danger text-[10px] font-normal">(required)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <LogoUpload
                value={companyLogo ?? ''}
                onChange={(url) => setValue('company_logo', url)}
                required label="Company Logo" size={80}
              />
            </CardContent>
          </Card>

          {/* Section 8 — Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="border-b border-white/5 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" /> Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Featured toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Featured</p>
                  <p className="text-[10px] text-muted-foreground">Pin at top of Experience section</p>
                </div>
                <div
                  className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${isFeatured ? 'bg-accent' : 'bg-white/10'}`}
                  onClick={() => setValue('is_featured', !isFeatured)}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isFeatured ? 'translate-x-5' : ''}`} />
                </div>
              </div>

              {/* Display Order */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Display Order</label>
                <Input {...register('display_order')} type="number" placeholder="e.g. 1"
                  className="bg-white/5 border-white/10 text-sm" />
                <p className="text-[10px] text-muted-foreground">Lower = appears first</p>
              </div>
            </CardContent>
          </Card>

          {/* LinkedIn hint */}
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-muted-foreground">Tip:</span> Structure your entries the same way as your LinkedIn profile — company name, roles, and dates should match exactly.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
};

export default ExperienceForm;
