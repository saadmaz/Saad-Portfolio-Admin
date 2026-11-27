import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MonthPicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
  Save, Plus, Trash2, Image as ImageIcon, Images,
  Globe, Github, Layout, Layers, Sparkles, X, Video,
  BookOpen, Lightbulb, Star, Link2, Check, GraduationCap, Briefcase,
  Search, CalendarRange, Trophy, Network, Users, MessageSquareQuote,
} from 'lucide-react';
import { ProjectService } from '@/services/project-service';
import { CommonService } from '@/shared/services/common-service';
import { toast } from "sonner";
import type { Education, Experience, Project, SkillSet } from '@/types';
import FormHeader from './FormHeader';
import { isProjectIndexable, PROJECT_MIN_WORDS, projectWordCount } from '@/shared/lib/indexing';
import ImageUpload from './ImageUpload';
import { PROJECT_GROUPS, groupLabel, inferredGroupOf, type ProjectGroupId } from '@/shared/lib/projectGroups';
import MultiImageUpload from './MultiImageUpload';
import { ObjectListEditor } from './ObjectListEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Schema ────────────────────────────────────────────────────────
const projectSchema = z.object({
  // Essentials
  title: z.string().min(2, 'Title is required'),
  slug: z.string().min(2, 'Slug is required'),
  tagline: z.string().min(1, 'Tagline is required'),
  date: z.string().optional().or(z.literal('')),
  role: z.string().optional().or(z.literal('')),
  type: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  group: z.enum(['venture', 'client', 'lab', 'academic']).optional().or(z.literal('')),
  stage: z.string().optional().or(z.literal('')),
  status: z.string().default('Completed'),
  colour: z.string().optional().or(z.literal('')),
  order_index: z.number().optional(),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  seo_visibility: z.enum(['auto', 'index', 'noindex']).default('auto'),

  // Descriptions
  description: z.string().optional().or(z.literal('')),
  long_description: z.string().optional().or(z.literal('')),
  overview: z.string().min(5, 'Overview is required'),

  // Media
  heroImage: z.string().optional().or(z.literal('')),
  altText: z.string().optional().or(z.literal('')),
  image: z.string().optional().or(z.literal('')),
  cardImage: z.string().optional().or(z.literal('')),
  screenshots: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  video: z.string().optional().or(z.literal('')),

  // Tech
  techStack: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),

  // Links
  liveUrl: z.string().optional().or(z.literal('')),
  live_preview: z.string().optional().or(z.literal('')),
  githubUrl: z.string().optional().or(z.literal('')),
  github: z.string().optional().or(z.literal('')),

  // Content
  challenges: z.array(z.string()).optional().default([]),
  learnings: z.array(z.string()).optional().default([]),
  features: z.array(z.string()).optional().default([]),

  // Story & context
  contribution: z.array(z.string()).optional().default([]),
  impact: z.string().optional().or(z.literal('')),
  results: z.array(z.object({ value: z.string(), label: z.string() })).optional().default([]),
  industry: z.string().optional().or(z.literal('')),
  target_audience: z.string().optional().or(z.literal('')),
  client: z.string().optional().or(z.literal('')),
  team_size: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || Number.isNaN(v) ? undefined : Number(v)),
    z.number().int().min(1, 'At least 1').optional(),
  ),
  skills: z.array(z.string()).optional().default([]),

  // Timeline (YYYY-MM)
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
  is_ongoing: z.boolean().default(false),

  // Architecture
  architecture: z
    .object({ description: z.string().optional(), diagramUrl: z.string().optional(), diagramAlt: z.string().optional() })
    .optional()
    .default({}),
  technical_decisions: z.array(z.string()).optional().default([]),

  // Team, proof, links, media
  collaborators: z.array(z.object({ name: z.string(), role: z.string().optional(), url: z.string().optional() })).optional().default([]),
  testimonials: z
    .array(z.object({ quote: z.string(), name: z.string(), role: z.string().optional(), organisation: z.string().optional() }))
    .optional()
    .default([]),
  related_project_ids: z.array(z.string()).optional().default([]),
  gallery: z.array(z.object({ url: z.string(), alt: z.string().optional(), caption: z.string().optional() })).optional().default([]),
  videos: z.array(z.object({ url: z.string(), title: z.string().optional() })).optional().default([]),
  resources: z.array(z.object({ label: z.string(), url: z.string(), kind: z.string().optional() })).optional().default([]),

  // SEO
  seo_title: z.string().max(70, 'Keep it under 70 characters').optional().or(z.literal('')),
  seo_description: z.string().max(170, 'Keep it under 170 characters').optional().or(z.literal('')),
  og_image: z.string().optional().or(z.literal('')),
  canonical_url: z.string().url('Use a full URL, e.g. https://medium.com/...').optional().or(z.literal('')),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const VISIBILITY_OPTIONS = [
  { value: 'auto', label: `Auto (index at ${PROJECT_MIN_WORDS}+ words)` },
  { value: 'index', label: 'Always index' },
  { value: 'noindex', label: 'Hide from search' },
] as const;

// Stage = where the product is in its life; status = where my work on it is.
const STAGE_OPTIONS = ['Idea', 'Prototype', 'Development', 'Beta', 'Production', 'Maintained', 'Archived'];
const STATUS_OPTIONS = ['Completed', 'In Progress', 'Paused', 'Exploration'];
const RESOURCE_KINDS = ['Documentation', 'Publication', 'Case study', 'Press', 'Talk / slides', 'Other'] as const;

const SITE_URL = 'https://www.saadmaz.com';

const toSlug = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');

const LABEL_CLS = "label mb-2 block";

// ── Reusable tag-list editor ──────────────────────────────────────
const TagListEditor = ({
  label, values, placeholder, onChange,
}: {
  label: string; values: string[]; placeholder: string;
  onChange: (v: string[]) => void;
}) => {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v || values.includes(v)) { setInput(''); return; }
    onChange([...values, v]);
    setInput('');
  };
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {values.map((v, i) => (
          <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
            {v}
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="text-accent/50 hover:text-danger ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {values.length === 0 && <p className="text-xs text-muted-foreground">None added</p>}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder} className="h-9 flex-1" />
        <Button type="button" onClick={add} variant="outline" size="sm">
          <Plus /> Add
        </Button>
      </div>
    </div>
  );
};

// ── Section card wrapper ──────────────────────────────────────────
const Section = ({ icon: Icon, title, children, badge }: {
  icon: React.ElementType; title: string; children: React.ReactNode; badge?: string;
}) => (
  <Card className="bg-card border-border-subtle overflow-hidden">
    <CardHeader className="border-b border-border-subtle py-3 px-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
        </div>
        {badge && (
          <Badge variant="accent">{badge}</Badge>
        )}
      </div>
    </CardHeader>
    <CardContent className="p-5 space-y-4">{children}</CardContent>
  </Card>
);

// ── Main form ─────────────────────────────────────────────────────
const ProjectForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isEditMode = !!id && id !== 'new';

  // Association state
  const [allEducation, setAllEducation] = useState<Education[]>([]);
  const [allExperiences, setAllExperiences] = useState<Experience[]>([]);
  const [assocLoading, setAssocLoading] = useState(true);
  const [linkedEducationIds, setLinkedEducationIds] = useState<string[]>([]);
  const [linkedExperienceIds, setLinkedExperienceIds] = useState<string[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [skillSets, setSkillSets] = useState<SkillSet[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      techStack: [], technologies: [], screenshots: [], images: [],
      challenges: [], learnings: [], features: [],
      contribution: [], results: [], skills: [], technical_decisions: [], architecture: {},
      collaborators: [], testimonials: [], related_project_ids: [], gallery: [], videos: [], resources: [],
      is_ongoing: false,
      status: 'Completed', featured: false, published: true, seo_visibility: 'auto',
    },
  });

  const w = (field: keyof ProjectFormValues) => watch(field);
  // Live explanation of what search engines will do with this project as written
  // (same rule the public site applies; see shared/lib/indexing).
  const writeUp = {
    tagline: w('tagline') as string,
    overview: w('overview') as string,
    description: w('description') as string,
    long_description: w('long_description') as string,
    impact: w('impact') as string,
    contribution: (w('contribution') as string[]) ?? [],
    technical_decisions: (w('technical_decisions') as string[]) ?? [],
    architecture: (w('architecture') as ProjectFormValues['architecture']) ?? {},
  };
  const writeUpWords = projectWordCount(writeUp);
  const visibility = (w('seo_visibility') as ProjectFormValues['seo_visibility']) ?? 'auto';
  const visibilityHint =
    visibility === 'index'
      ? 'Always indexed, even with a short write-up.'
      : visibility === 'noindex'
        ? 'Hidden from Google and the sitemap. Still visible on your site.'
        : isProjectIndexable(writeUp)
          ? `Indexed by Google · ${writeUpWords} words.`
          : `Hidden from Google · ${writeUpWords} of ${PROJECT_MIN_WORDS} words. Expand the overview or long description to get it indexed.`;
  const techStack    = (w('techStack')    as string[]) ?? [];
  const technologies = (w('technologies') as string[]) ?? [];
  const screenshots  = (w('screenshots')  as string[]) ?? [];
  const challenges   = (w('challenges')   as string[]) ?? [];
  const learnings    = (w('learnings')    as string[]) ?? [];
  const features     = (w('features')     as string[]) ?? [];
  const contribution = (w('contribution') as string[]) ?? [];
  const decisions    = (w('technical_decisions') as string[]) ?? [];
  const results      = (w('results') as ProjectFormValues['results']) ?? [];
  const collaborators = (w('collaborators') as ProjectFormValues['collaborators']) ?? [];
  const testimonials = (w('testimonials') as ProjectFormValues['testimonials']) ?? [];
  const videos       = (w('videos') as ProjectFormValues['videos']) ?? [];
  const resources    = (w('resources') as ProjectFormValues['resources']) ?? [];
  const gallery      = (w('gallery') as ProjectFormValues['gallery']) ?? [];
  const relatedIds   = (w('related_project_ids') as string[]) ?? [];
  const skillNames   = (w('skills') as string[]) ?? [];
  const architecture = (w('architecture') as ProjectFormValues['architecture']) ?? {};
  const seoTitle     = (w('seo_title') as string) ?? '';
  const seoDesc      = (w('seo_description') as string) ?? '';
  const titleValue   = watch('title');
  const slugValue    = watch('slug');

  useEffect(() => {
    if (!isEditMode && titleValue && !slugValue) setValue('slug', toSlug(titleValue));
    // slugValue/setValue intentionally excluded — see BlogForm's identical
    // one-way title->slug mirror for why.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleValue, isEditMode]);

  const loadProject = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const p = await ProjectService.getById(id!);
      if (p) {
        reset({
          title:            p.title,
          slug:             p.slug,
          tagline:          p.tagline          || '',
          date:             p.date             || '',
          role:             p.role             || '',
          type:             p.type             || '',
          category:         p.category         || '',
          group:            p.group            || '',
          stage:            p.stage            || '',
          status:           p.status           || 'Completed',
          colour:           p.colour           || '',
          order_index:      p.order_index,
          featured:         p.featured         ?? false,
          published:        p.published        ?? true,
          seo_visibility:   p.seo_visibility   ?? 'auto',
          description:      p.description      || '',
          long_description: p.long_description || '',
          overview:         p.overview         || '',
          heroImage:        p.heroImage        || p.image || '',
          altText:          p.altText          || '',
          image:            p.image            || '',
          cardImage:        p.cardImage        || '',
          screenshots:      p.screenshots      ?? p.images ?? [],
          images:           p.images           ?? [],
          video:            p.video            || p.videoDemo || '',
          techStack:        p.techStack        ?? [],
          technologies:     p.technologies     ?? [],
          liveUrl:          p.liveUrl          || p.live_preview || '',
          live_preview:     p.live_preview     || '',
          githubUrl:        p.githubUrl        || p.github || '',
          github:           p.github           || '',
          challenges:       (p.challenges as string[]) ?? [],
          learnings:        p.learnings        ?? [],
          features:         p.features         ?? [],
          contribution:     p.contribution     ?? [],
          impact:           p.impact           || '',
          results:          p.results          ?? [],
          industry:         p.industry         || '',
          target_audience:  p.target_audience  || '',
          client:           p.client           || '',
          team_size:        p.team_size ?? undefined,
          skills:           p.skills           ?? [],
          start_date:       p.start_date       || '',
          end_date:         p.end_date         || '',
          is_ongoing:       p.is_ongoing       ?? false,
          architecture:     p.architecture     ?? {},
          technical_decisions: p.technical_decisions ?? [],
          collaborators:    p.collaborators    ?? [],
          testimonials:     p.testimonials     ?? [],
          related_project_ids: p.related_project_ids ?? [],
          gallery:          p.gallery          ?? [],
          videos:           p.videos?.length ? p.videos : (p.video || p.videoDemo) ? [{ url: p.video || p.videoDemo || '', title: '' }] : [],
          resources:        p.resources        ?? [],
          seo_title:        p.seo_title        || '',
          seo_description:  p.seo_description  || '',
          og_image:         p.og_image         || '',
          canonical_url:    p.canonical_url    || '',
        });
        const u = p.updated_at as { toDate?: () => Date } | string | undefined;
        const d = u && typeof u === 'object' && u.toDate ? u.toDate() : u ? new Date(u as string) : null;
        setLastUpdated(d && !Number.isNaN(d.getTime()) ? d.toLocaleString() : '');
        setLinkedEducationIds(p.linked_education_ids ?? []);
        setLinkedExperienceIds(p.linked_experience_ids ?? []);
      }
    } catch { toast.error('Failed to load project'); }
    finally { setIsLoading(false); }
  }, [id, reset]);

  useEffect(() => { if (isEditMode) loadProject(); }, [isEditMode, loadProject]);

  useEffect(() => {
    (async () => {
      try {
        const [edu, exp, projects, skills] = await Promise.all([
          CommonService.getEducation(),
          CommonService.getWorkExperience(),
          ProjectService.getAll().catch(() => [] as Project[]),
          CommonService.getSkills().catch(() => [] as SkillSet[]),
        ]);
        setAllEducation(edu.filter(e => e.is_published !== false));
        setAllExperiences(exp);
        setAllProjects(projects);
        setSkillSets(skills);
      } catch {
        // silently ignore
      } finally {
        setAssocLoading(false);
      }
    })();
  }, []);

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      setIsLoading(true);
      // Keep legacy fields in sync so existing public pages still work
      const shots = data.screenshots ?? [];
      const videoList = (data.videos ?? []).filter(v => v.url.trim());
      const payload = {
        ...data,
        results:       (data.results ?? []).filter(r => r.value.trim() && r.label.trim()),
        collaborators: (data.collaborators ?? []).filter(c => c.name.trim()),
        testimonials:  (data.testimonials ?? []).filter(t => t.quote.trim() && t.name.trim()),
        resources:     (data.resources ?? []).filter(r => r.url.trim()),
        videos:        videoList,
        video:         videoList[0]?.url ?? '',
        // Captions follow the gallery order; images removed from the gallery drop their captions.
        gallery: shots.map(url => {
          const meta = (data.gallery ?? []).find(g => g.url === url);
          return { url, alt: meta?.alt?.trim() ?? '', caption: meta?.caption?.trim() ?? '' };
        }),
        team_size:     data.team_size ?? null,
        end_date:      data.is_ongoing ? '' : data.end_date,
        image:        data.heroImage || data.image,
        images:       data.screenshots?.length ? data.screenshots : data.images,
        live_preview: data.liveUrl   || data.live_preview,
        github:       data.githubUrl || data.github,
        linked_education_ids:  linkedEducationIds.length > 0 ? linkedEducationIds : [],
        linked_experience_ids: linkedExperienceIds.length > 0 ? linkedExperienceIds : [],
      };
      if (isEditMode) {
        await ProjectService.update(id!, payload);
        toast.success('Project saved');
      } else {
        await ProjectService.create(payload);
        toast.success('Project created');
      }
      navigate('/projects');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally { setIsLoading(false); }
  };

  const onDelete = async () => {
    try {
      setIsLoading(true);
      await ProjectService.delete(id!);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    } finally { setIsLoading(false); setDeleteDialogOpen(false); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-24">
      <FormHeader
        backTo="/projects"
        title={isEditMode ? 'Edit project' : 'New project'}
        subtitle={isEditMode ? 'Projects · Editing' : 'Projects · New'}
        actions={
          <>
            <Button type="submit" size="sm" loading={isLoading}>
              <Save aria-hidden="true" />
              Save project
            </Button>
            {isEditMode && (
              <Button type="button" variant="destructive-ghost" size="icon-sm" aria-label="Delete project"
                className="h-9 w-9"
                onClick={() => setDeleteDialogOpen(true)} disabled={isLoading}>
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Essentials */}
          <Section icon={Layout} title="Project essentials">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Title</label>
                <Input {...register('title')} placeholder="e.g. Portfolio v3" />
                {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className={LABEL_CLS}>Slug (URL)</label>
                <Input {...register('slug')} placeholder="portfolio-v3" className="font-mono text-sm" />
                {errors.slug && <p className="text-xs text-danger mt-1">{errors.slug.message}</p>}
              </div>
            </div>

            <div>
              <label className={LABEL_CLS}>Tagline</label>
              <Input {...register('tagline')} placeholder="Short punchy description…" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Role</label>
                <Input {...register('role')} placeholder="e.g. Founder & lead developer" />
              </div>
              <div>
                <label className={LABEL_CLS}>Client / organisation</label>
                <Input {...register('client')} placeholder="e.g. ICTA, or your own startup" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={LABEL_CLS}>Type</label>
                <Select value={(watch('type') as string) ?? ''} onValueChange={(v) => setValue('type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {['Web Application', 'Mobile App', 'API / Backend', 'Open Source', 'Design', 'Other'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={LABEL_CLS}>Category</label>
                <Input {...register('category')} placeholder="e.g. Portfolio" />
              </div>
              <div>
                <label className={LABEL_CLS}>Industry</label>
                <Input {...register('industry')} placeholder="e.g. Logistics, EdTech" />
              </div>
            </div>

            <div>
              <label className={LABEL_CLS}>Projects page section</label>
              <Select value={(watch('group') as string) || 'auto'} onValueChange={(v) => setValue('group', v === 'auto' ? '' : (v as ProjectGroupId), { shouldDirty: true })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="auto">
                    Automatic ({groupLabel(inferredGroupOf({ role: watch('role'), category: watch('category'), type: watch('type'), client: watch('client') }))})
                  </SelectItem>
                  {PROJECT_GROUPS.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="meta mt-1.5">Automatic uses the role (founder → ventures), category and client.</p>
            </div>

            <div>
              <label className={LABEL_CLS}>Target audience</label>
              <Input {...register('target_audience')} placeholder="e.g. Small fuel stations and fleet owners in Sri Lanka" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-border-subtle p-3">
              <div>
                <label className={LABEL_CLS}>Stage</label>
                <Select value={(watch('stage') as string) ?? ''} onValueChange={(v) => setValue('stage', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {STAGE_OPTIONS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[12px] text-muted-foreground">Where the product is: idea, live, archived…</p>
              </div>
              <div>
                <label className={LABEL_CLS}>Status</label>
                <Select value={(watch('status') as string) ?? ''} onValueChange={(v) => setValue('status', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[12px] text-muted-foreground">Where your work on it is.</p>
              </div>
            </div>
          </Section>

          {/* Descriptions */}
          <Section icon={BookOpen} title="Descriptions">
            <div>
              <label className={LABEL_CLS}>Short Description</label>
              <Input {...register('description')} placeholder="One-liner shown on cards…" />
            </div>
            <div>
              <label className={LABEL_CLS}>Overview (Detailed)</label>
              <Textarea {...register('overview')} placeholder="Full project overview - goals, outcomes, architecture…"
                className="min-h-[120px] resize-none" />
              {errors.overview && <p className="text-xs text-danger mt-1">{errors.overview.message}</p>}
            </div>
            <div>
              <label className={LABEL_CLS}>Long Description</label>
              <Textarea {...register('long_description')} placeholder="Extended write-up for the project detail page…"
                className="min-h-[100px] resize-none" />
            </div>
          </Section>

          {/* Timeline */}
          <Section icon={CalendarRange} title="Timeline">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS} htmlFor="start_date">Start</label>
                <MonthPicker id="start_date" value={(w('start_date') as string) ?? ''} onChange={(v) => setValue('start_date', v, { shouldDirty: true })} />
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="end_date">End</label>
                <MonthPicker id="end_date" value={(w('end_date') as string) ?? ''} onChange={(v) => setValue('end_date', v, { shouldDirty: true })} disabled={!!w('is_ongoing')} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-fg-2 cursor-pointer">
              <input type="checkbox" {...register('is_ongoing')} className="h-4 w-4 rounded accent-accent" />
              Still ongoing (shows “Present”)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Launch date (optional)</label>
                <Input {...register('date')} placeholder="e.g. 2025-06-01" />
              </div>
              <div>
                <span className={LABEL_CLS}>Last updated</span>
                <p className="h-9 flex items-center text-sm text-muted-foreground">
                  {lastUpdated || 'Set automatically when you save'}
                </p>
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground">Duration is worked out from start and end, and the “last updated” date is shown to visitors and search engines.</p>
          </Section>

          {/* Contribution & impact */}
          <Section icon={Trophy} title="My contribution & impact"
            badge={contribution.length + results.length ? `${contribution.length + results.length}` : undefined}>
            <TagListEditor label="What I personally did"
              values={contribution} placeholder="e.g. Designed the booking flow and built the Flutter app end to end"
              onChange={v => setValue('contribution', v, { shouldDirty: true })} />
            <div className="border-t border-border-subtle pt-4">
              <ObjectListEditor
                label="Results (headline numbers)"
                hint="The first four show as big numbers under the hero. Keep each one short and true."
                items={results}
                fields={[
                  { key: 'value', label: 'Number', placeholder: 'e.g. 2,000+' },
                  { key: 'label', label: 'What it measures', placeholder: 'e.g. monthly active users' },
                ]}
                blank={() => ({ value: '', label: '' })}
                onChange={v => setValue('results', v, { shouldDirty: true })}
                addLabel="Add result"
                max={8}
              />
            </div>
            <div className="border-t border-border-subtle pt-4">
              <label className={LABEL_CLS}>Impact (business / user outcome)</label>
              <Textarea {...register('impact')} placeholder="What changed because this exists: revenue, time saved, people reached…"
                className="min-h-[90px] resize-none" />
            </div>
          </Section>

          {/* Architecture */}
          <Section icon={Network} title="Architecture">
            <div>
              <span className={LABEL_CLS}>Architecture diagram</span>
              <ImageUpload
                value={architecture.diagramUrl}
                onChange={url => setValue('architecture', { ...architecture, diagramUrl: url }, { shouldDirty: true })}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Diagram description (alt text and caption)</label>
              <Input value={architecture.diagramAlt ?? ''}
                onChange={e => setValue('architecture', { ...architecture, diagramAlt: e.target.value }, { shouldDirty: true })}
                placeholder="e.g. React app talking to Firebase Auth, Firestore and a Cloud Run API" />
            </div>
            <div>
              <label className={LABEL_CLS}>System design</label>
              <Textarea value={architecture.description ?? ''}
                onChange={e => setValue('architecture', { ...architecture, description: e.target.value }, { shouldDirty: true })}
                placeholder="How the pieces fit together: services, data flow, hosting…"
                className="min-h-[100px] resize-none" />
            </div>
            <div className="border-t border-border-subtle pt-4">
              <TagListEditor label="Technical decisions"
                values={decisions} placeholder="e.g. Chose Firestore over Postgres for offline sync on mobile"
                onChange={v => setValue('technical_decisions', v, { shouldDirty: true })} />
            </div>
          </Section>

          {/* Tech */}
          <Section icon={Layers} title="Technical stack">
            <TagListEditor label="Tech Stack Tags (chips on cards)"
              values={techStack} placeholder="e.g. React, TypeScript…"
              onChange={v => setValue('techStack', v)} />
            {errors.techStack && <p className="text-xs text-danger">{errors.techStack.message}</p>}

            <div className="border-t border-border-subtle pt-4">
              <TagListEditor label="Technologies (full list on detail page)"
                values={technologies} placeholder="e.g. Framer Motion, Firebase…"
                onChange={v => setValue('technologies', v)} />
            </div>

            <div className="border-t border-border-subtle pt-4 space-y-2">
              <span className={LABEL_CLS}>Skills this project shows (from your Skills page)</span>
              {skillSets.length === 0 ? (
                <p className="text-xs text-muted-foreground">No skills found. Add them on the Skills page first.</p>
              ) : (
                skillSets.map(set => (
                  <div key={set.category}>
                    <p className="mb-1 text-[12px] text-muted-foreground">{set.category}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(set.skills ?? []).map(sk => {
                        const on = skillNames.includes(sk.name);
                        return (
                          <button key={sk.name} type="button" aria-pressed={on}
                            onClick={() => setValue('skills', on ? skillNames.filter(x => x !== sk.name) : [...skillNames, sk.name], { shouldDirty: true })}
                            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${on
                              ? 'border-accent/40 bg-accent/10 text-accent'
                              : 'border-border text-muted-foreground hover:border-accent/30 hover:text-foreground'}`}>
                            {sk.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Section>

          {/* Challenges & Learnings */}
          <Section icon={Lightbulb} title="Challenges & learnings"
            badge={`${challenges.length + learnings.length}`}>
            <TagListEditor label="Challenges faced"
              values={challenges} placeholder="e.g. Achieving 100/100 Lighthouse scores"
              onChange={v => setValue('challenges', v)} />
            <div className="border-t border-border-subtle pt-4">
              <TagListEditor label="Key Learnings"
                values={learnings} placeholder="e.g. Performance is a feature, not an afterthought."
                onChange={v => setValue('learnings', v)} />
            </div>
          </Section>

          {/* Features */}
          <Section icon={Star} title="Features" badge={features.length ? `${features.length}` : undefined}>
            <TagListEditor label="Key Features"
              values={features} placeholder="e.g. Dark mode, Offline support…"
              onChange={v => setValue('features', v)} />
          </Section>

          {/* Team & credits */}
          <Section icon={Users} title="Team & credits" badge={collaborators.length ? `${collaborators.length}` : undefined}>
            <div className="max-w-[200px]">
              <label className={LABEL_CLS} htmlFor="team_size">Team size</label>
              <Input id="team_size" type="number" min={1} {...register('team_size')} placeholder="1 = solo" />
              {errors.team_size && <p className="text-xs text-danger mt-1">{errors.team_size.message}</p>}
            </div>
            <ObjectListEditor
              label="Collaborators"
              items={collaborators}
              fields={[
                { key: 'name', label: 'Name', placeholder: 'e.g. Ayesha Perera' },
                { key: 'role', label: 'Role', placeholder: 'e.g. UI designer' },
                { key: 'url', label: 'Profile link (optional)', type: 'url', placeholder: 'https://linkedin.com/in/…', span: 2 },
              ]}
              blank={() => ({ name: '', role: '', url: '' })}
              onChange={v => setValue('collaborators', v, { shouldDirty: true })}
              addLabel="Add person"
            />
          </Section>

          {/* Testimonials */}
          <Section icon={MessageSquareQuote} title="Testimonials" badge={testimonials.length ? `${testimonials.length}` : undefined}>
            <ObjectListEditor
              label="Feedback from clients, supervisors or collaborators"
              items={testimonials}
              fields={[
                { key: 'quote', label: 'Quote', type: 'textarea', placeholder: 'What they said, in their words' },
                { key: 'name', label: 'Name', placeholder: 'e.g. Abdurrahman Fuwaiz' },
                { key: 'role', label: 'Role', placeholder: 'e.g. Change and Impact Lead' },
                { key: 'organisation', label: 'Organisation', placeholder: 'e.g. CurveUp Foundation', span: 2 },
              ]}
              blank={() => ({ quote: '', name: '', role: '', organisation: '' })}
              onChange={v => setValue('testimonials', v, { shouldDirty: true })}
              addLabel="Add testimonial"
            />
          </Section>

          {/* Related projects */}
          <Section icon={Link2} title="Related projects" badge={relatedIds.length ? `${relatedIds.length}` : undefined}>
            <p className="text-[12px] text-muted-foreground">Shown at the bottom of this project’s page (up to three), and linked for search engines.</p>
            {allProjects.filter(pr => String(pr.id) !== String(id)).length === 0 ? (
              <p className="text-xs text-muted-foreground">No other projects yet.</p>
            ) : (
              <div className="space-y-1">
                {allProjects.filter(pr => String(pr.id) !== String(id)).map(pr => {
                  const pid = String(pr.id);
                  const on = relatedIds.includes(pid);
                  return (
                    <button key={pid} type="button" aria-pressed={on}
                      onClick={() => setValue('related_project_ids', on ? relatedIds.filter(x => x !== pid) : [...relatedIds, pid], { shouldDirty: true })}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all ${on
                        ? 'border-accent/40 bg-accent/10'
                        : 'border-border bg-card hover:border-accent/20 hover:bg-secondary'}`}>
                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${on ? 'bg-accent border-accent' : 'border-border-strong'}`}>
                        {on && <Check className="w-2.5 h-2.5 text-accent-foreground" />}
                      </div>
                      <span className={`text-xs font-medium truncate ${on ? 'text-foreground' : 'text-muted-foreground'}`}>{pr.title}</span>
                      {pr.published === false && <span className="ml-auto text-[11px] text-muted-foreground">unpublished</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Associate With */}
          <Section icon={Link2} title="Associate with"
            badge={linkedEducationIds.length + linkedExperienceIds.length > 0
              ? `${linkedEducationIds.length + linkedExperienceIds.length}`
              : undefined}>
            <p className="text-[12px] text-muted-foreground">
              Link this project to education entries and work experience. They will display this project as a card strip in their respective public pages.
            </p>

            {assocLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                Loading…
              </div>
            ) : (
              <div className="space-y-4">
                {/* Education */}
                {allEducation.length > 0 && (
                  <div className="space-y-1.5">
                    <label className={LABEL_CLS + ' flex items-center gap-1.5'}>
                      <GraduationCap className="w-3 h-3" /> Education
                    </label>
                    <div className="space-y-1">
                      {allEducation.map(edu => {
                        const eduId = edu.id;
                        const isLinked = linkedEducationIds.includes(eduId);
                        return (
                          <button
                            key={eduId}
                            type="button"
                            onClick={() => setLinkedEducationIds(prev =>
                              isLinked ? prev.filter(i => i !== eduId) : [...prev, eduId]
                            )}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all ${
                              isLinked
                                ? 'border-accent/40 bg-accent/10'
                                : 'border-border bg-card hover:border-accent/20 hover:bg-secondary'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                              isLinked ? 'bg-accent border-accent' : 'border-border-strong'
                            }`}>
                              {isLinked && <Check className="w-2.5 h-2.5 text-accent-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium truncate ${isLinked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {edu.school_name ?? edu.institution}
                              </p>
                              <p className="text-[12px] text-muted-foreground truncate">
                                {edu.degree}{edu.field_of_study ? ` · ${edu.field_of_study}` : ''}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {allExperiences.length > 0 && (
                  <div className="space-y-1.5">
                    <label className={LABEL_CLS + ' flex items-center gap-1.5'}>
                      <Briefcase className="w-3 h-3" /> Work Experience
                    </label>
                    <div className="space-y-1">
                      {allExperiences.map(exp => {
                        const expId = String(exp.id);
                        const isLinked = linkedExperienceIds.includes(expId);
                        return (
                          <button
                            key={expId}
                            type="button"
                            onClick={() => setLinkedExperienceIds(prev =>
                              isLinked ? prev.filter(i => i !== expId) : [...prev, expId]
                            )}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all ${
                              isLinked
                                ? 'border-accent/40 bg-accent/10'
                                : 'border-border bg-card hover:border-accent/20 hover:bg-secondary'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                              isLinked ? 'bg-accent border-accent' : 'border-border-strong'
                            }`}>
                              {isLinked && <Check className="w-2.5 h-2.5 text-accent-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium truncate ${isLinked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {exp.company_name ?? exp.company}
                              </p>
                              <p className="text-[12px] text-muted-foreground truncate">
                                {exp.employment_type ?? exp.employmentType}
                                {exp.location ? ` · ${exp.location}` : ''}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {allEducation.length === 0 && allExperiences.length === 0 && (
                  <p className="text-xs text-muted-foreground py-1">No education or experience entries found.</p>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="space-y-5">

          {/* Search & sharing */}
          <Section icon={Search} title="Search & sharing">
            <div>
              <div className="flex items-baseline justify-between">
                <label className={LABEL_CLS} htmlFor="seo_title">SEO title</label>
                <span className={`text-[11px] ${seoTitle.length > 60 ? 'text-danger' : 'text-muted-foreground'}`}>{seoTitle.length}/60</span>
              </div>
              <Input id="seo_title" {...register('seo_title')} placeholder={`${titleValue || 'Project'} | Project`} />
              {errors.seo_title && <p className="text-xs text-danger mt-1">{errors.seo_title.message}</p>}
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label className={LABEL_CLS} htmlFor="seo_description">Meta description</label>
                <span className={`text-[11px] ${seoDesc.length > 160 ? 'text-danger' : 'text-muted-foreground'}`}>{seoDesc.length}/160</span>
              </div>
              <Textarea id="seo_description" {...register('seo_description')}
                placeholder="Built from the tagline and stack if left blank"
                className="min-h-[80px] resize-none" />
              {errors.seo_description && <p className="text-xs text-danger mt-1">{errors.seo_description.message}</p>}
            </div>
            {/* Rough Google result preview */}
            <div className="rounded-lg border border-border-subtle bg-background/40 p-3">
              <p className="truncate text-[12px] text-muted-foreground">{SITE_URL.replace('https://', '')} › projects › {slugValue || 'slug'}</p>
              <p className="truncate text-[15px] text-[#8ab4f8]">{seoTitle || `${titleValue || 'Project'} | Project`} - Saad Mazhar</p>
              <p className="line-clamp-2 text-[12px] text-fg-2">{seoDesc || (w('tagline') as string) || 'Add a tagline or meta description.'}</p>
            </div>
            <div>
              <span className={LABEL_CLS}>Social share image</span>
              <p className="mb-2 text-[12px] text-muted-foreground">
                Exactly <span className="font-medium text-foreground">1200 × 630 px</span>. Used on LinkedIn, X and WhatsApp previews. If empty, a branded card is generated.
              </p>
              <ImageUpload
                value={w('og_image') as string}
                onChange={url => setValue('og_image', url, { shouldDirty: true })}
                requiredSize={{ width: 1200, height: 630 }}
              />
            </div>
            <div>
              <label className={LABEL_CLS} htmlFor="canonical_url">Canonical URL</label>
              <Input id="canonical_url" {...register('canonical_url')} placeholder={`${SITE_URL}/projects/${slugValue || 'slug'}`} />
              <p className="mt-1 text-[12px] text-muted-foreground">Leave blank unless this case study was first published on another site.</p>
              {errors.canonical_url && <p className="text-xs text-danger mt-1">{errors.canonical_url.message}</p>}
            </div>
            <div>
              <label className={LABEL_CLS}>Search visibility</label>
              <Select
                value={(watch('seo_visibility') as string) ?? 'auto'}
                onValueChange={(v) => setValue('seo_visibility', v as ProjectFormValues['seo_visibility'], { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  {VISIBILITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="meta mt-1.5" aria-live="polite">{visibilityHint}</p>
            </div>
          </Section>

          {/* Hero Image */}
          <Section icon={ImageIcon} title="Hero image">
            <ImageUpload
              value={watch('heroImage') || watch('image')}
              onChange={url => { setValue('heroImage', url); setValue('image', url); }}
            />
            {!(watch('heroImage') || watch('image')) && (
              <p className="mt-2 text-[12px] text-warning-fg">No cover image: the site shows a generated cover with the title and stack. A 16:10 screenshot makes a stronger card.</p>
            )}
            <div className="mt-3">
              <label className={LABEL_CLS}>Image Alt Text</label>
              <Input {...register('altText')} placeholder={watch('title') || 'Falls back to the project title if left blank'} />
            </div>
          </Section>

          {/* Homepage card image */}
          <Section icon={ImageIcon} title="Homepage card image">
            <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
              Shown on the homepage project cards. Upload a square image of exactly{' '}
              <span className="font-medium text-foreground">1200 × 1200 px</span>. Other sizes are rejected.
              Keep the bottom-right corner clear: the arrow button sits there. If empty, the hero image is cropped instead.
            </p>
            <ImageUpload
              value={watch('cardImage')}
              onChange={url => setValue('cardImage', url, { shouldDirty: true })}
              requiredSize={{ width: 1200, height: 1200 }}
              aspectClass="aspect-square"
            />
          </Section>

          {/* Gallery */}
          <Section icon={Images} title="Screenshots / gallery"
            badge={screenshots.length ? `${screenshots.length}` : undefined}>
            <MultiImageUpload
              value={screenshots}
              onChange={urls => { setValue('screenshots', urls); setValue('images', urls); }}
              nameHint={titleValue}
              maxImages={10}
              folder="projects/screenshots"
            />
            {screenshots.length > 0 && (
              <div className="space-y-3 border-t border-border-subtle pt-4">
                <span className={LABEL_CLS}>Alt text & captions</span>
                {screenshots.map((url, i) => {
                  const meta = gallery.find(g => g.url === url) ?? { url, alt: '', caption: '' };
                  const update = (patch: Partial<typeof meta>) =>
                    setValue('gallery', [...gallery.filter(g => g.url !== url), { ...meta, ...patch }], { shouldDirty: true });
                  return (
                    <div key={url} className="flex gap-3">
                      <img src={url} alt="" className="h-14 w-20 flex-shrink-0 rounded-md border border-border object-cover" />
                      <div className="flex-1 space-y-1.5">
                        <Input value={meta.alt ?? ''} onChange={e => update({ alt: e.target.value })}
                          placeholder={`Alt text, e.g. ${titleValue || 'Project'} checkout screen`} className="h-8 text-xs"
                          aria-label={`Alt text for image ${i + 1}`} />
                        <Input value={meta.caption ?? ''} onChange={e => update({ caption: e.target.value })}
                          placeholder="Caption shown under the image (optional)" className="h-8 text-xs"
                          aria-label={`Caption for image ${i + 1}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Video */}
          <Section icon={Video} title="Video demos" badge={videos.length ? `${videos.length}` : undefined}>
            <ObjectListEditor
              label="Videos"
              hint="YouTube links play on the page; other links open in a new tab."
              items={videos}
              fields={[
                { key: 'url', label: 'Video URL', type: 'url', placeholder: 'https://youtube.com/watch?v=…', span: 2 },
                { key: 'title', label: 'Title', placeholder: 'e.g. Full walkthrough', span: 2 },
              ]}
              blank={() => ({ url: '', title: '' })}
              onChange={v => setValue('videos', v, { shouldDirty: true })}
              addLabel="Add video"
            />
          </Section>

          {/* Links */}
          <Section icon={Link2} title="External links">
            <div>
              <label className={LABEL_CLS}>Live Demo URL</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input {...register('liveUrl')} placeholder="https://example.com"
                  className="pl-9" />
              </div>
              {errors.liveUrl && <p className="text-xs text-danger mt-1">{errors.liveUrl.message}</p>}
            </div>
            <div>
              <label className={LABEL_CLS}>Live Preview (legacy)</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input {...register('live_preview')} placeholder="https://…"
                  className="pl-9" />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>GitHub Repository</label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input {...register('githubUrl')} placeholder="https://github.com/…"
                  className="pl-9" />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>GitHub (legacy)</label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input {...register('github')} placeholder="https://github.com/…"
                  className="pl-9" />
              </div>
            </div>
            <div className="border-t border-border-subtle pt-4">
              <ObjectListEditor
                label="Docs & publications"
                items={resources}
                fields={[
                  { key: 'label', label: 'Title', placeholder: 'e.g. API documentation' },
                  { key: 'kind', label: 'Type', type: 'select', options: RESOURCE_KINDS },
                  { key: 'url', label: 'URL', type: 'url', placeholder: 'https://…', span: 2 },
                ]}
                blank={() => ({ label: '', url: '', kind: 'Documentation' })}
                onChange={v => setValue('resources', v, { shouldDirty: true })}
                addLabel="Add link"
              />
            </div>
          </Section>

          {/* Settings */}
          <Section icon={Sparkles} title="Settings">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Order Index</label>
                <Input type="number" {...register('order_index', { valueAsNumber: true })}
                  placeholder="1" />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Card Gradient (Tailwind classes)</label>
              <Input {...register('colour')} placeholder="from-indigo-900/40 to-blue-900/40"
                className="font-mono text-xs" />
            </div>
            <label className="flex items-center justify-between cursor-pointer group pt-1">
              <span className="text-sm font-medium text-fg-2 group-hover:text-foreground transition-colors">Featured project</span>
              <input type="checkbox" {...register('featured')}
                className="h-4 w-4 rounded accent-accent" />
            </label>
            <label className="flex items-center justify-between cursor-pointer group pt-1">
              <span className="text-sm font-medium text-fg-2 group-hover:text-foreground transition-colors">
                Published <span className="font-normal text-muted-foreground">(unpublish to hide from the public site and sitemap)</span>
              </span>
              <input type="checkbox" {...register('published')}
                className="h-4 w-4 rounded accent-accent" />
            </label>
          </Section>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={o => !isLoading && setDeleteDialogOpen(o)}
        title="Delete project?"
        description="This project will be permanently removed. This can’t be undone."
        confirmLabel="Delete project"
        isLoading={isLoading}
        onConfirm={onDelete}
      />
    </form>
  );
};

export default ProjectForm;
