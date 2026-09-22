import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Save, Trash2, GraduationCap, Calendar, Trophy,
  Image as ImageIcon, Link as LinkIcon, FileText, Presentation,
  X, Plus, ChevronDown, ChevronUp, Star, Globe,
  Sparkles, Settings2, Check,
} from 'lucide-react';
import LogoUpload from './LogoUpload';
import { CommonService } from '@/shared/services/common-service';
import { ProjectService } from '@/services/project-service';
import { Education, EducationMedia, EducationAward, Project } from '@/types';
import { toast } from 'sonner';
import { uploadImage } from '@/services/storage';
import PageHeader from './PageHeader';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const DEGREE_SUGGESTIONS = [
  'Bachelor of Science','Bachelor of Arts','Master of Science',
  'Master of Business Administration','Doctor of Philosophy',
  'High School Diploma','Associate Degree','Certificate','Diploma','Other',
];

const MEDIA_TYPES = ['Image', 'Document', 'Link', 'Presentation'] as const;
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
  if (m < 1) m = 0;
  const yrs = Math.floor(m / 12);
  const mos = m % 12;
  if (yrs === 0 && mos === 0) return '';
  return [yrs > 0 && `${yrs} yr${yrs > 1 ? 's' : ''}`, mos > 0 && `${mos} mo${mos > 1 ? 's' : ''}`]
    .filter(Boolean).join(' ');
}

function charColor(len: number, max: number): string {
  const pct = len / max;
  if (pct >= 1) return 'text-danger';
  if (pct >= 0.8) return 'text-warning-fg';
  return 'text-muted-foreground';
}

// ─── Shared sub-components ────────────────────────────────────────────────────

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

function MonthYearPicker({
  month, year, onMonthChange, onYearChange, disabled = false,
  minYear = 1926, maxYear = 2036,
}: {
  month?: string;
  year?: number;
  onMonthChange: (v?: string) => void;
  onYearChange: (v?: number) => void;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
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
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </AdminSelect>
      </div>
      <AdminSelect
        value={year ? String(year) : NONE}
        onValueChange={(v) => onYearChange(v === NONE ? undefined : parseInt(v))}
        disabled={disabled}
        className="w-28"
      >
        <SelectItem value={NONE} className="text-muted-foreground">Year</SelectItem>
        {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map(y => (
          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
        ))}
      </AdminSelect>
    </div>
  );
}

function SectionHeader({
  title, icon, collapsed, onToggle, children,
}: {
  title: string;
  icon: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      >
        <span className="text-accent flex-shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-bold text-foreground">{title}</span>
        {children}
        {collapsed ? <ChevronDown className="w-4 h-4 text-white/60" /> : <ChevronUp className="w-4 h-4 text-white/60" />}
      </div>
    </div>
  );
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  school_name: z.string().min(1, 'School name is required'),
  school_logo: z.string().min(1, 'School logo is required'),
  school_website_url: z.string().optional(),
  degree: z.string().optional(),
  field_of_study: z.string().optional(),
  is_current: z.boolean().default(false),
  start_month: z.string().optional(),
  start_year: z.coerce.number().optional(),
  end_month: z.string().optional(),
  end_year: z.coerce.number().optional(),
  grade: z.string().max(80, 'Grade must be 80 characters or less').optional(),
  show_grade_publicly: z.boolean().default(true),
  activities_and_societies: z.string().max(500, 'Max 500 characters').optional(),
  description: z.string().max(1000, 'Max 1000 characters').optional(),
  is_featured: z.boolean().default(false),
  display_order: z.coerce.number().optional(),
  is_published: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

// ─── Empty makers ─────────────────────────────────────────────────────────────

const emptyMedia = (): EducationMedia => ({
  media_type: 'Link', media_url: '', media_caption: '',
  media_description: '', media_date_month: undefined, media_date_year: undefined,
});

const emptyAward = (): EducationAward => ({
  award_title: '', award_issuer: '', award_date_month: undefined,
  award_date_year: undefined, award_description: '',
});

// ─── Media sub-form ───────────────────────────────────────────────────────────

function MediaSubForm({
  item, index, collapsed, onToggle, onUpdate, onRemove,
}: {
  item: EducationMedia;
  index: number;
  collapsed: boolean;
  onToggle: () => void;
  onUpdate: (m: EducationMedia) => void;
  onRemove: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);

  const mediaIcon = (type: EducationMedia['media_type']) => ({
    Image: <ImageIcon className="w-3.5 h-3.5" />,
    Document: <FileText className="w-3.5 h-3.5" />,
    Presentation: <Presentation className="w-3.5 h-3.5" />,
    Link: <LinkIcon className="w-3.5 h-3.5" />,
  }[type]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const folder = item.media_type === 'Image' ? 'education/media' : 'education/documents';
      const url = await uploadImage(file, folder);
      onUpdate({ ...item, media_url: url });
      toast.success('File uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const showUpload = item.media_type === 'Image' || item.media_type === 'Document';
  const captionLen = item.media_caption.length;

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] transition-colors"
        onClick={onToggle}
      >
        <span className="text-accent flex-shrink-0">{mediaIcon(item.media_type)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {item.media_caption || <span className="text-white/60 font-normal">Media {index + 1}</span>}
          </p>
          <p className="text-[10px] text-muted-foreground">{item.media_type}</p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1 rounded hover:bg-danger/10 text-danger hover:text-danger/80 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        {collapsed ? <ChevronDown className="w-4 h-4 text-white/60" /> : <ChevronUp className="w-4 h-4 text-white/60" />}
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3 border-t border-white/10">
          {/* Media type toggle */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Media Type</label>
            <div className="flex gap-1.5 flex-wrap">
              {MEDIA_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onUpdate({ ...item, media_type: t })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    item.media_type === t
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-white/5 border-white/10 text-muted-foreground hover:border-accent/40'
                  }`}
                >
                  {mediaIcon(t)} {t}
                </button>
              ))}
            </div>
          </div>

          {/* URL or upload */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">
              {showUpload ? 'Upload or URL' : 'URL'}
            </label>
            {showUpload && (
              <div className="flex gap-2 mb-1.5">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white/20 text-xs text-muted-foreground cursor-pointer hover:border-accent/40 hover:text-accent transition-all">
                  {isUploading ? 'Uploading…' : <><Plus className="w-3 h-3" /> Upload file</>}
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading}
                    accept={item.media_type === 'Image' ? 'image/*' : '*'} />
                </label>
              </div>
            )}
            <Input
              value={item.media_url}
              onChange={(e) => onUpdate({ ...item, media_url: e.target.value })}
              placeholder={showUpload ? 'Or paste URL…' : 'https://…'}
              className="bg-white/5 border-white/10 text-sm"
            />
          </div>

          {/* Thumbnail preview for images */}
          {item.media_type === 'Image' && item.media_url && (
            <div className="aspect-video w-full max-w-xs rounded-lg overflow-hidden border border-white/10">
              <img src={item.media_url} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Caption (required) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">
                Caption <span className="text-danger">*</span>
              </label>
              <span className={`text-[10px] ${charColor(captionLen, 120)}`}>{captionLen}/120</span>
            </div>
            <Input
              value={item.media_caption}
              onChange={(e) => onUpdate({ ...item, media_caption: e.target.value.slice(0, 120) })}
              placeholder="e.g. Final Year Project Presentation"
              className="bg-white/5 border-white/10 text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Description</label>
            <Textarea
              value={item.media_description ?? ''}
              onChange={(e) => onUpdate({ ...item, media_description: e.target.value })}
              placeholder="What is this media about? Shown in the lightbox view."
              rows={3}
              className="bg-white/5 border-white/10 text-sm resize-none"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Date (when was this from?)</label>
            <MonthYearPicker
              month={item.media_date_month}
              year={item.media_date_year}
              onMonthChange={(v) => onUpdate({ ...item, media_date_month: v })}
              onYearChange={(v) => onUpdate({ ...item, media_date_year: v })}
              minYear={1990}
              maxYear={new Date().getFullYear() + 1}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Award sub-form ───────────────────────────────────────────────────────────

function AwardSubForm({
  award, index, collapsed, onToggle, onUpdate, onRemove,
}: {
  award: EducationAward;
  index: number;
  collapsed: boolean;
  onToggle: () => void;
  onUpdate: (a: EducationAward) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] transition-colors"
        onClick={onToggle}
      >
        <Trophy className="w-3.5 h-3.5 text-accent flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {award.award_title || <span className="text-white/60 font-normal">Award {index + 1}</span>}
          </p>
          {award.award_issuer && <p className="text-[10px] text-muted-foreground truncate">{award.award_issuer}</p>}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1 rounded hover:bg-danger/10 text-danger hover:text-danger/80 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {collapsed ? <ChevronDown className="w-4 h-4 text-white/60" /> : <ChevronUp className="w-4 h-4 text-white/60" />}
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3 border-t border-white/10">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Award Title *</label>
            <Input
              value={award.award_title}
              onChange={(e) => onUpdate({ ...award, award_title: e.target.value })}
              placeholder="e.g. Dean's List, Best Final Year Project"
              className="bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Issuer</label>
            <Input
              value={award.award_issuer ?? ''}
              onChange={(e) => onUpdate({ ...award, award_issuer: e.target.value })}
              placeholder="e.g. Informatics Institute of Technology"
              className="bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Date Received</label>
            <MonthYearPicker
              month={award.award_date_month}
              year={award.award_date_year}
              onMonthChange={(v) => onUpdate({ ...award, award_date_month: v })}
              onYearChange={(v) => onUpdate({ ...award, award_date_year: v })}
              minYear={1990}
              maxYear={new Date().getFullYear() + 1}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Description</label>
            <Textarea
              value={award.award_description ?? ''}
              onChange={(e) => onUpdate({ ...award, award_description: e.target.value })}
              placeholder="Brief description of the award..."
              rows={2}
              className="bg-white/5 border-white/10 text-sm resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

const EducationForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!id && id !== 'new';

  // State for nested arrays
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [media, setMedia] = useState<EducationMedia[]>([]);
  const [collapsedMedia, setCollapsedMedia] = useState<Set<number>>(new Set());
  const [awards, setAwards] = useState<EducationAward[]>([]);
  const [collapsedAwards, setCollapsedAwards] = useState<Set<number>>(new Set());

  // Linked projects state
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>([]);

  // Section collapse state
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    institution: false,
    degree: false,
    duration: false,
    academic: false,
    skills: true,
    projects: true,
    awards: true,
    media: true,
    settings: true,
  });

  const toggle = (k: string) => setCollapsed(p => ({ ...p, [k]: !p[k] }));

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      is_current: false,
      show_grade_publicly: true,
      is_featured: false,
      is_published: true,
    },
  });

  const isCurrent    = watch('is_current');
  const startMonth   = watch('start_month');
  const startYear    = watch('start_year');
  const endMonth     = watch('end_month');
  const endYear      = watch('end_year');
  const schoolLogo   = watch('school_logo');
  const isFeatured   = watch('is_featured');
  const isPublished  = watch('is_published');
  const showGrade    = watch('show_grade_publicly');
  const grade        = watch('grade') ?? '';
  const activities   = watch('activities_and_societies') ?? '';
  const description  = watch('description') ?? '';

  const duration = calcDuration(startMonth, startYear, endMonth, endYear, isCurrent);

  // Expected graduation: end_year in future AND is_current
  const now = new Date();
  const isExpectedGrad = isCurrent && endYear && (
    endYear > now.getFullYear() ||
    (endYear === now.getFullYear() && endMonth && MONTHS.indexOf(endMonth) >= now.getMonth())
  );

  const loadEducation = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await CommonService.getEducation();
      const item = data.find(e => e.id.toString() === id);
      if (!item) { toast.error('Education entry not found'); navigate('/education'); return; }

      setSkills(item.skills ?? []);
      setProjects(item.projects ?? []);
      setMedia(item.media ?? []);
      setAwards(item.honors_and_awards ?? []);

      reset({
        school_name: item.school_name ?? item.institution ?? '',
        school_logo: item.school_logo ?? item.logo ?? '',
        school_website_url: item.school_website_url ?? '',
        degree: item.degree ?? '',
        field_of_study: item.field_of_study ?? item.fieldOfStudy ?? '',
        is_current: item.is_current ?? item.isCurrent ?? false,
        start_month: item.start_month,
        start_year: item.start_year,
        end_month: item.end_month,
        end_year: item.end_year,
        grade: item.grade ?? '',
        show_grade_publicly: item.show_grade_publicly ?? true,
        activities_and_societies: item.activities_and_societies ?? '',
        description: item.description ?? '',
        is_featured: item.is_featured ?? false,
        display_order: item.display_order,
        is_published: item.is_published ?? true,
      });
    } catch {
      toast.error('Failed to load education entry');
    } finally {
      setIsLoading(false);
    }
  }, [id, reset, navigate]);

  useEffect(() => { if (isEditMode) loadEducation(); }, [isEditMode, loadEducation]);

  useEffect(() => {
    (async () => {
      try {
        const projs = await ProjectService.getAll();
        setAllProjects(projs);
        if (isEditMode && id) {
          const preLinked = projs
            .filter(p => (p.linked_education_ids ?? []).includes(id))
            .map(p => String(p.id));
          setLinkedProjectIds(preLinked);
        }
      } catch {
        // silently ignore — projects list is optional
      } finally {
        setProjectsLoading(false);
      }
    })();
  }, [isEditMode, id]);

  const addSkill = () => {
    const s = newSkill.trim();
    if (!s || skills.includes(s)) return;
    if (skills.length >= 20) { toast.warning('Maximum 20 skills reached'); return; }
    if (skills.length === 5) toast.info('Top 5 recommended for visibility');
    setSkills(p => [...p, s]);
    setNewSkill('');
  };

  const onSubmit = async (data: FormValues) => {
    if (!data.school_logo) { toast.error('School logo is required'); return; }
    if (media.some(m => !m.media_caption.trim())) {
      toast.error('All media items must have a caption');
      return;
    }
    if (awards.some(a => !a.award_title.trim())) {
      toast.error('All award entries must have a title');
      return;
    }

    const saveData: Partial<Education> = {
      school_name: data.school_name,
      school_logo: data.school_logo,
      school_website_url: data.school_website_url || undefined,
      degree: data.degree || undefined,
      field_of_study: data.field_of_study || undefined,
      is_current: data.is_current,
      start_month: data.start_month || undefined,
      start_year: data.start_year || undefined,
      end_month: data.is_current ? undefined : (data.end_month || undefined),
      end_year: data.end_year || undefined,
      grade: data.grade || undefined,
      show_grade_publicly: data.show_grade_publicly,
      activities_and_societies: data.activities_and_societies || undefined,
      description: data.description || undefined,
      skills: skills.length > 0 ? skills : undefined,
      media: media.length > 0 ? media : undefined,
      honors_and_awards: awards.length > 0 ? awards : undefined,
      is_featured: data.is_featured,
      display_order: data.display_order || undefined,
      is_published: data.is_published,
      // Backward-compat aliases
      institution: data.school_name,
      logo: data.school_logo,
      fieldOfStudy: data.field_of_study || undefined,
      isCurrent: data.is_current,
    };

    try {
      setIsLoading(true);
      let educationId: string;
      if (isEditMode) {
        await CommonService.updateEducation(id!, saveData);
        educationId = id!;
        toast.success('Education updated');
      } else {
        const created = await CommonService.createEducation(saveData);
        educationId = created.id;
        toast.success('Education added');
      }

      // Bidirectional project linking
      const linkingPromises = allProjects
        .filter(proj => {
          const projId = String(proj.id);
          const currentlyLinked = (proj.linked_education_ids ?? []).includes(educationId);
          const shouldBeLinked = linkedProjectIds.includes(projId);
          return currentlyLinked !== shouldBeLinked;
        })
        .map(proj => {
          const projId = String(proj.id);
          const shouldBeLinked = linkedProjectIds.includes(projId);
          const currentIds = proj.linked_education_ids ?? [];
          const newIds = shouldBeLinked
            ? [...currentIds, educationId]
            : currentIds.filter(eid => eid !== educationId);
          return ProjectService.update(projId, { linked_education_ids: newIds });
        });
      await Promise.all(linkingPromises);

      navigate('/education');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-3xl">
      <PageHeader
        eyebrow="ACADEMIC"
        title={isEditMode ? 'Edit Education' : 'Add Education'}
        subtitle={isEditMode ? 'Update this education entry.' : 'Add a new education entry to your portfolio.'}
        backTo="/education"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── Section 1: Institution ─────────────────────────────────── */}
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <SectionHeader
            title="Institution"
            icon={<GraduationCap className="w-4 h-4" />}
            collapsed={collapsed.institution}
            onToggle={() => toggle('institution')}
          />
          {!collapsed.institution && (
            <div className="p-5 space-y-4 border-t border-white/10">
              {/* School Logo */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  School Logo <span className="text-danger">*</span>
                </label>
                <LogoUpload
                  value={schoolLogo}
                  onChange={(url) => setValue('school_logo', url, { shouldValidate: true })}
                  required
                  label="School / Institution Logo"
                  size={96}
                />
                {errors.school_logo && (
                  <p className="text-xs text-danger">{errors.school_logo.message}</p>
                )}
              </div>

              {/* School Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  School / Institution Name <span className="text-danger">*</span>
                </label>
                <Input
                  {...register('school_name')}
                  placeholder="e.g. University of Westminster"
                  className="bg-white/5 border-white/10"
                />
                {errors.school_name && (
                  <p className="text-xs text-danger">{errors.school_name.message}</p>
                )}
              </div>

              {/* School Website URL */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">
                  School Website URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    {...register('school_website_url')}
                    placeholder="https://www.university.edu"
                    className="bg-white/5 border-white/10 pl-9"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Logo and school name on public site will link here.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2: Degree & Field ──────────────────────────────── */}
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <SectionHeader
            title="Degree & Field"
            icon={<Star className="w-4 h-4" />}
            collapsed={collapsed.degree}
            onToggle={() => toggle('degree')}
          />
          {!collapsed.degree && (
            <div className="p-5 space-y-4 border-t border-white/10">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Degree</label>
                <Input
                  {...register('degree')}
                  placeholder="e.g. Bachelor of Science"
                  list="degree-suggestions"
                  className="bg-white/5 border-white/10"
                />
                <datalist id="degree-suggestions">
                  {DEGREE_SUGGESTIONS.map(d => <option key={d} value={d} />)}
                </datalist>
                <p className="text-[10px] text-muted-foreground">
                  Suggestions: {DEGREE_SUGGESTIONS.slice(0, 4).join(', ')}…
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Field of Study</label>
                <Input
                  {...register('field_of_study')}
                  placeholder="e.g. Computer Science"
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Section 3: Duration ────────────────────────────────────── */}
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <SectionHeader
            title="Duration"
            icon={<Calendar className="w-4 h-4" />}
            collapsed={collapsed.duration}
            onToggle={() => toggle('duration')}
          />
          {!collapsed.duration && (
            <div className="p-5 space-y-4 border-t border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Start Date</label>
                  <MonthYearPicker
                    month={startMonth}
                    year={startYear}
                    onMonthChange={(v) => setValue('start_month', v)}
                    onYearChange={(v) => setValue('start_year', v)}
                    minYear={1926}
                    maxYear={new Date().getFullYear()}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">
                    End Date {isCurrent && <span className="text-muted-foreground font-normal">(or expected)</span>}
                  </label>
                  <MonthYearPicker
                    month={endMonth}
                    year={endYear}
                    onMonthChange={(v) => setValue('end_month', v)}
                    onYearChange={(v) => setValue('end_year', v)}
                    disabled={false}
                    minYear={1926}
                    maxYear={2036}
                  />
                </div>
              </div>

              {/* Currently studying toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
                <div
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${isCurrent ? 'bg-accent' : 'bg-white/10'}`}
                  onClick={() => setValue('is_current', !isCurrent)}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isCurrent ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Currently studying here
                </span>
              </label>

              {/* Auto-calculated duration */}
              {duration && (
                <p className="text-xs text-accent font-medium">
                  Duration: {duration}
                  {isExpectedGrad && endMonth && endYear && (
                    <span className="ml-2 text-warning-fg">· Expected {endMonth.slice(0, 3)} {endYear}</span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Section 4: Academic Details ────────────────────────────── */}
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <SectionHeader
            title="Academic Details"
            icon={<Sparkles className="w-4 h-4" />}
            collapsed={collapsed.academic}
            onToggle={() => toggle('academic')}
          />
          {!collapsed.academic && (
            <div className="p-5 space-y-4 border-t border-white/10">
              {/* Grade */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Grade</label>
                  <span className={`text-[10px] ${charColor(grade.length, 80)}`}>{grade.length}/80</span>
                </div>
                <Input
                  {...register('grade')}
                  placeholder="e.g. 3.8 GPA, First Class Honours, 85%"
                  maxLength={80}
                  className="bg-white/5 border-white/10"
                />
                <p className="text-[10px] text-muted-foreground">
                  Accepts any format: GPA, percentage, grade classification, or score.
                </p>
                {errors.grade && <p className="text-xs text-danger">{errors.grade.message}</p>}
              </div>

              {/* Show grade publicly toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
                <div
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${showGrade ? 'bg-accent' : 'bg-white/10'}`}
                  onClick={() => setValue('show_grade_publicly', !showGrade)}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showGrade ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Show grade on public portfolio
                </span>
              </label>

              {/* Activities */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Activities & Societies</label>
                  <span className={`text-[10px] ${charColor(activities.length, 500)}`}>{activities.length}/500</span>
                </div>
                <Textarea
                  {...register('activities_and_societies')}
                  placeholder="e.g. Computer Science Society, Debate Club, Student Council, Cricket Team…"
                  maxLength={500}
                  rows={3}
                  className="bg-white/5 border-white/10 text-sm resize-none"
                  onChange={(e) => setValue('activities_and_societies', e.target.value.slice(0, 500))}
                />
                {errors.activities_and_societies && (
                  <p className="text-xs text-danger">{errors.activities_and_societies.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Description</label>
                  <span className={`text-[10px] ${charColor(description.length, 1000)}`}>{description.length}/1,000</span>
                </div>
                <Textarea
                  {...register('description')}
                  placeholder="Describe what you studied, notable coursework, thesis topic, or anything relevant about your time here…"
                  maxLength={1000}
                  rows={5}
                  className="bg-white/5 border-white/10 text-sm resize-none"
                  onChange={(e) => setValue('description', e.target.value.slice(0, 1000))}
                />
                {errors.description && (
                  <p className="text-xs text-danger">{errors.description.message}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Section 5: Skills ──────────────────────────────────────── */}
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <SectionHeader
            title="Skills"
            icon={<Sparkles className="w-4 h-4" />}
            collapsed={collapsed.skills}
            onToggle={() => toggle('skills')}
          >
            <span className={`text-[10px] font-bold mr-2 ${skills.length > 5 ? 'text-warning-fg' : 'text-muted-foreground'}`}>
              {skills.length}/20
            </span>
          </SectionHeader>
          {!collapsed.skills && (
            <div className="p-5 space-y-3 border-t border-white/10">
              <p className="text-[10px] text-muted-foreground">
                Add the top skills you developed during this education. Top 5 recommended for visibility.
              </p>

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s, i) => (
                    <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
                      {s}
                      <button type="button" onClick={() => setSkills(p => p.filter((_, idx) => idx !== i))} className="hover:text-danger transition-colors ml-0.5">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-1.5">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(); }
                  }}
                  placeholder="Type a skill and press Enter…"
                  className="bg-white/5 border-white/10 text-sm h-9"
                />
                <Button type="button" variant="outline" size="sm" className="h-9 border-white/10 bg-white/5" onClick={addSkill}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              {skills.length > 5 && (
                <p className="text-[10px] text-warning-fg">Top 5 recommended for visibility on LinkedIn and public portfolio.</p>
              )}
              {skills.length >= 20 && (
                <p className="text-[10px] text-danger font-bold">Maximum 20 skills reached.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Section 6: Linked Projects ─────────────────────────────── */}
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <SectionHeader
            title="Linked Projects"
            icon={<Globe className="w-4 h-4" />}
            collapsed={collapsed.projects}
            onToggle={() => toggle('projects')}
          >
            {linkedProjectIds.length > 0 && (
              <span className="text-[10px] font-bold text-accent mr-2">{linkedProjectIds.length} linked</span>
            )}
          </SectionHeader>
          {!collapsed.projects && (
            <div className="p-5 space-y-3 border-t border-white/10">
              <p className="text-[10px] text-muted-foreground">
                Link existing portfolio projects to this education entry. Linked projects appear as a card strip on the public education page.
              </p>
              {projectsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  Loading projects…
                </div>
              ) : allProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No projects found. Add portfolio projects first, then link them here.
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
            </div>
          )}
        </div>

        {/* ── Section 7: Honors & Awards ─────────────────────────────── */}
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <SectionHeader
            title="Honors & Awards"
            icon={<Trophy className="w-4 h-4" />}
            collapsed={collapsed.awards}
            onToggle={() => toggle('awards')}
          >
            <span className="text-[10px] text-muted-foreground mr-2">{awards.length}</span>
          </SectionHeader>
          {!collapsed.awards && (
            <div className="p-5 space-y-3 border-t border-white/10">
              {awards.map((a, i) => (
                <AwardSubForm
                  key={i}
                  award={a}
                  index={i}
                  collapsed={collapsedAwards.has(i)}
                  onToggle={() => setCollapsedAwards(s => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
                  onUpdate={(updated) => setAwards(arr => arr.map((x, idx) => idx === i ? updated : x))}
                  onRemove={() => { setAwards(arr => arr.filter((_, idx) => idx !== i)); setCollapsedAwards(s => { const n = new Set(s); n.delete(i); return n; }); }}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed border-white/20 text-xs h-9"
                onClick={() => setAwards(a => [...a, emptyAward()])}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Award
              </Button>
            </div>
          )}
        </div>

        {/* ── Section 8: Media ───────────────────────────────────────── */}
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <SectionHeader
            title="Media"
            icon={<ImageIcon className="w-4 h-4" />}
            collapsed={collapsed.media}
            onToggle={() => toggle('media')}
          >
            <span className="text-[10px] text-muted-foreground mr-2">{media.length}/20</span>
          </SectionHeader>
          {!collapsed.media && (
            <div className="p-5 space-y-3 border-t border-white/10">
              <p className="text-[10px] text-muted-foreground">
                Each media item requires a caption. Clicking a thumbnail on the public site opens a lightbox with the caption, description, and date.
              </p>
              {media.map((m, i) => (
                <MediaSubForm
                  key={i}
                  item={m}
                  index={i}
                  collapsed={collapsedMedia.has(i)}
                  onToggle={() => setCollapsedMedia(s => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
                  onUpdate={(updated) => setMedia(arr => arr.map((x, idx) => idx === i ? updated : x))}
                  onRemove={() => { setMedia(arr => arr.filter((_, idx) => idx !== i)); setCollapsedMedia(s => { const n = new Set(s); n.delete(i); return n; }); }}
                />
              ))}
              {media.length < 20 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed border-white/20 text-xs h-9"
                  onClick={() => setMedia(m => [...m, emptyMedia()])}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Media
                </Button>
              )}
              {media.length >= 20 && (
                <p className="text-[10px] text-danger font-bold">Maximum 20 media items per education entry.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Section 9: Settings ────────────────────────────────────── */}
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <SectionHeader
            title="Settings"
            icon={<Settings2 className="w-4 h-4" />}
            collapsed={collapsed.settings}
            onToggle={() => toggle('settings')}
          />
          {!collapsed.settings && (
            <div className="p-5 space-y-4 border-t border-white/10">
              {/* Featured toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${isFeatured ? 'bg-accent' : 'bg-white/10'}`}
                  onClick={() => setValue('is_featured', !isFeatured)}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isFeatured ? 'translate-x-4' : ''}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">Featured</p>
                  <p className="text-[10px] text-muted-foreground">Pins this entry to the top of the Education section on your public portfolio.</p>
                </div>
              </label>

              {/* Published toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${isPublished ? 'bg-accent' : 'bg-white/10'}`}
                  onClick={() => setValue('is_published', !isPublished)}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublished ? 'translate-x-4' : ''}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">
                    {isPublished ? 'Published' : 'Draft'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Draft entries are saved but not visible on your public portfolio.</p>
                </div>
              </label>

              {/* Display order */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Display Order</label>
                <Input
                  {...register('display_order')}
                  type="number"
                  placeholder="e.g. 1 (lower = appears first)"
                  className="bg-white/5 border-white/10 w-48"
                />
                <p className="text-[10px] text-muted-foreground">Lower number = appears first. Leave blank for auto-ordering.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer actions ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-black h-11 px-8 rounded-lg"
          >
            {isLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEditMode ? 'Save Changes' : 'Add Education'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/education')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EducationForm;
