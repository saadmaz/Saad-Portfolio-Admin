import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Save, Plus, Trash2, Image as ImageIcon, Images,
  Globe, Github, Layout, Layers, Sparkles, X, Video,
  BookOpen, Lightbulb, Tag, Star, Link2, Check, GraduationCap, Briefcase,
} from 'lucide-react';
import { ProjectService } from '@/services/project-service';
import { CommonService } from '@/shared/services/common-service';
import { toast } from "sonner";
import type { Education, Experience } from '@/types';
import ImageUpload from './ImageUpload';
import MultiImageUpload from './MultiImageUpload';
import { cn } from "@/shared/lib/utils";
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
  stage: z.string().optional().or(z.literal('')),
  status: z.string().default('Completed'),
  colour: z.string().optional().or(z.literal('')),
  order_index: z.number().optional(),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),

  // Descriptions
  description: z.string().optional().or(z.literal('')),
  long_description: z.string().optional().or(z.literal('')),
  overview: z.string().min(5, 'Overview is required'),

  // Media
  heroImage: z.string().optional().or(z.literal('')),
  altText: z.string().optional().or(z.literal('')),
  image: z.string().optional().or(z.literal('')),
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
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const toSlug = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');

const FIELD_CLS = "bg-white/[0.04] border-white/10 text-white placeholder:text-white/60 focus:ring-2 focus:ring-accent focus:border-accent/40 rounded-lg h-10";
const LABEL_CLS = "text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block";

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
          <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent text-xs font-bold">
            {v}
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="text-accent/50 hover:text-red-400 ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {values.length === 0 && <p className="text-xs text-white/60">None added</p>}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder} className={cn(FIELD_CLS, "flex-1 h-9 text-sm")} />
        <Button type="button" onClick={add} variant="outline"
          className="border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-white/60 hover:text-white rounded-lg h-9 px-3 font-bold text-xs">
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
};

// ── Section card wrapper ──────────────────────────────────────────
const Section = ({ icon: Icon, title, children, badge }: {
  icon: React.ElementType; title: string; children: React.ReactNode; badge?: string;
}) => (
  <Card className="bg-white/[0.03] border-white/[0.07] overflow-hidden">
    <CardHeader className="border-b border-white/[0.06] py-3 px-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{title}</span>
        </div>
        {badge && (
          <span className="text-[9px] font-black uppercase tracking-wider bg-accent/15 text-accent px-2 py-0.5 rounded-full border border-accent/20">
            {badge}
          </span>
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

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      techStack: [], technologies: [], screenshots: [], images: [],
      challenges: [], learnings: [], features: [],
      status: 'Completed', featured: false, published: true,
    },
  });

  const w = (field: keyof ProjectFormValues) => watch(field);
  const techStack    = (w('techStack')    as string[]) ?? [];
  const technologies = (w('technologies') as string[]) ?? [];
  const screenshots  = (w('screenshots')  as string[]) ?? [];
  const images       = (w('images')       as string[]) ?? [];
  const challenges   = (w('challenges')   as string[]) ?? [];
  const learnings    = (w('learnings')    as string[]) ?? [];
  const features     = (w('features')     as string[]) ?? [];
  const titleValue   = watch('title');
  const slugValue    = watch('slug');

  useEffect(() => {
    if (!isEditMode && titleValue && !slugValue) setValue('slug', toSlug(titleValue));
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
          stage:            p.stage            || '',
          status:           p.status           || 'Completed',
          colour:           p.colour           || '',
          order_index:      p.order_index,
          featured:         p.featured         ?? false,
          published:        p.published        ?? true,
          description:      p.description      || '',
          long_description: p.long_description || '',
          overview:         p.overview         || '',
          heroImage:        p.heroImage        || p.image || '',
          altText:          p.altText          || '',
          image:            p.image            || '',
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
        });
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
        const [edu, exp] = await Promise.all([
          CommonService.getEducation(),
          CommonService.getWorkExperience(),
        ]);
        setAllEducation(edu.filter(e => e.is_published !== false));
        setAllExperiences(exp);
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
      const payload = {
        ...data,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="icon" className="rounded-xl hover:bg-white/10 w-9 h-9"
          onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-0.5">Portfolio</p>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {isEditMode ? 'Edit Project' : 'New Project'}
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button type="submit" disabled={isLoading}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-black rounded-xl h-10 px-6 shadow-[0_0_20px_hsl(var(--accent)/0.28)]">
            <Save className="w-3.5 h-3.5 mr-2" />
            {isLoading ? 'Saving…' : 'Save Project'}
          </Button>
          {isEditMode && (
            <Button type="button" variant="ghost" size="icon"
              className="text-red-500/60 hover:bg-red-500/10 hover:text-red-500 rounded-xl w-9 h-9"
              onClick={() => setDeleteDialogOpen(true)} disabled={isLoading}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Essentials */}
          <Section icon={Layout} title="Project Essentials">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Title</label>
                <Input {...register('title')} placeholder="e.g. Portfolio v3" className={FIELD_CLS} />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className={LABEL_CLS}>Slug (URL)</label>
                <Input {...register('slug')} placeholder="portfolio-v3" className={cn(FIELD_CLS, "font-mono text-sm")} />
                {errors.slug && <p className="text-xs text-red-400 mt-1">{errors.slug.message}</p>}
              </div>
            </div>

            <div>
              <label className={LABEL_CLS}>Tagline</label>
              <Input {...register('tagline')} placeholder="Short punchy description…" className={FIELD_CLS} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Date</label>
                <Input {...register('date')} placeholder="e.g. 2025-06-01" className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Role</label>
                <Input {...register('role')} placeholder="e.g. Solo Developer" className={FIELD_CLS} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={LABEL_CLS}>Type</label>
                <Select value={(watch('type') as string) ?? ''} onValueChange={(v) => setValue('type', v)}>
                  <SelectTrigger className="w-full bg-transparent border border-white/10 rounded-lg px-3 h-10 text-sm text-white focus:ring-2 focus:ring-accent outline-none">
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
                <Input {...register('category')} placeholder="e.g. Portfolio" className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Stage</label>
                <Select value={(watch('stage') as string) ?? ''} onValueChange={(v) => setValue('stage', v)}>
                  <SelectTrigger className="w-full bg-transparent border border-white/10 rounded-lg px-3 h-10 text-sm text-white focus:ring-2 focus:ring-accent outline-none">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {['Production', 'Development', 'Beta', 'Archived'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          {/* Descriptions */}
          <Section icon={BookOpen} title="Descriptions">
            <div>
              <label className={LABEL_CLS}>Short Description</label>
              <Input {...register('description')} placeholder="One-liner shown on cards…" className={FIELD_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Overview (Detailed)</label>
              <Textarea {...register('overview')} placeholder="Full project overview - goals, outcomes, architecture…"
                className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/60 focus:ring-2 focus:ring-accent rounded-lg min-h-[120px] resize-none" />
              {errors.overview && <p className="text-xs text-red-400 mt-1">{errors.overview.message}</p>}
            </div>
            <div>
              <label className={LABEL_CLS}>Long Description</label>
              <Textarea {...register('long_description')} placeholder="Extended write-up for the project detail page…"
                className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/60 focus:ring-2 focus:ring-accent rounded-lg min-h-[100px] resize-none" />
            </div>
          </Section>

          {/* Tech */}
          <Section icon={Layers} title="Technical Stack">
            <TagListEditor label="Tech Stack Tags (chips on cards)"
              values={techStack} placeholder="e.g. React, TypeScript…"
              onChange={v => setValue('techStack', v)} />
            {errors.techStack && <p className="text-xs text-red-400">{errors.techStack.message}</p>}

            <div className="border-t border-white/5 pt-4">
              <TagListEditor label="Technologies (full list on detail page)"
                values={technologies} placeholder="e.g. Framer Motion, Firebase…"
                onChange={v => setValue('technologies', v)} />
            </div>
          </Section>

          {/* Challenges & Learnings */}
          <Section icon={Lightbulb} title="Challenges & Learnings"
            badge={`${challenges.length + learnings.length}`}>
            <TagListEditor label="Challenges faced"
              values={challenges} placeholder="e.g. Achieving 100/100 Lighthouse scores"
              onChange={v => setValue('challenges', v)} />
            <div className="border-t border-white/5 pt-4">
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

          {/* Associate With */}
          <Section icon={Link2} title="Associate With"
            badge={linkedEducationIds.length + linkedExperienceIds.length > 0
              ? `${linkedEducationIds.length + linkedExperienceIds.length}`
              : undefined}>
            <p className="text-[10px] text-white/60">
              Link this project to education entries and work experience. They will display this project as a card strip in their respective public pages.
            </p>

            {assocLoading ? (
              <div className="flex items-center gap-2 text-xs text-white/60 py-2">
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
                                : 'border-white/10 bg-white/[0.02] hover:border-accent/20 hover:bg-white/5'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                              isLinked ? 'bg-accent border-accent' : 'border-white/20'
                            }`}>
                              {isLinked && <Check className="w-2.5 h-2.5 text-black" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold truncate ${isLinked ? 'text-white' : 'text-white/50'}`}>
                                {edu.school_name ?? edu.institution}
                              </p>
                              <p className="text-[10px] text-white/60 truncate">
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
                                : 'border-white/10 bg-white/[0.02] hover:border-accent/20 hover:bg-white/5'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                              isLinked ? 'bg-accent border-accent' : 'border-white/20'
                            }`}>
                              {isLinked && <Check className="w-2.5 h-2.5 text-black" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold truncate ${isLinked ? 'text-white' : 'text-white/50'}`}>
                                {exp.company_name ?? exp.company}
                              </p>
                              <p className="text-[10px] text-white/60 truncate">
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
                  <p className="text-xs text-white/60 py-1">No education or experience entries found.</p>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="space-y-5">

          {/* Hero Image */}
          <Section icon={ImageIcon} title="Hero Image">
            <ImageUpload
              value={watch('heroImage') || watch('image')}
              onChange={url => { setValue('heroImage', url); setValue('image', url); }}
            />
            <div className="mt-3">
              <label className={LABEL_CLS}>Image Alt Text</label>
              <Input {...register('altText')} placeholder={watch('title') || 'Falls back to the project title if left blank'}
                className={FIELD_CLS} />
            </div>
          </Section>

          {/* Gallery */}
          <Section icon={Images} title="Screenshots / Gallery"
            badge={screenshots.length ? `${screenshots.length}` : undefined}>
            <MultiImageUpload
              value={screenshots}
              onChange={urls => { setValue('screenshots', urls); setValue('images', urls); }}
              maxImages={10}
              folder="projects/screenshots"
            />
          </Section>

          {/* Video */}
          <Section icon={Video} title="Video Demo">
            <div>
              <label className={LABEL_CLS}>YouTube / Video URL</label>
              <div className="relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
                <Input {...register('video')} placeholder="https://youtube.com/watch?v=…"
                  className={cn(FIELD_CLS, "pl-9")} />
              </div>
            </div>
          </Section>

          {/* Links */}
          <Section icon={Link2} title="External Links">
            <div>
              <label className={LABEL_CLS}>Live Demo URL</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
                <Input {...register('liveUrl')} placeholder="https://example.com"
                  className={cn(FIELD_CLS, "pl-9")} />
              </div>
              {errors.liveUrl && <p className="text-xs text-red-400 mt-1">{errors.liveUrl.message}</p>}
            </div>
            <div>
              <label className={LABEL_CLS}>Live Preview (legacy)</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
                <Input {...register('live_preview')} placeholder="https://…"
                  className={cn(FIELD_CLS, "pl-9")} />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>GitHub Repository</label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
                <Input {...register('githubUrl')} placeholder="https://github.com/…"
                  className={cn(FIELD_CLS, "pl-9")} />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>GitHub (legacy)</label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
                <Input {...register('github')} placeholder="https://github.com/…"
                  className={cn(FIELD_CLS, "pl-9")} />
              </div>
            </div>
          </Section>

          {/* Settings */}
          <Section icon={Sparkles} title="Settings">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Status</label>
                <Select value={(watch('status') as string) ?? ''} onValueChange={(v) => setValue('status', v)}>
                  <SelectTrigger className="w-full bg-transparent border border-white/10 rounded-lg px-3 h-10 text-sm text-white focus:ring-2 focus:ring-accent outline-none">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {['Completed', 'In Progress', 'Exploration'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={LABEL_CLS}>Order Index</label>
                <Input type="number" {...register('order_index', { valueAsNumber: true })}
                  placeholder="1" className={FIELD_CLS} />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Card Gradient (Tailwind classes)</label>
              <Input {...register('colour')} placeholder="from-indigo-900/40 to-blue-900/40"
                className={cn(FIELD_CLS, "font-mono text-xs")} />
            </div>
            <label className="flex items-center justify-between cursor-pointer group pt-1">
              <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">Featured Project</span>
              <input type="checkbox" {...register('featured')}
                className="w-4 h-4 rounded accent-teal-400 bg-white/5 border-white/10" />
            </label>
            <label className="flex items-center justify-between cursor-pointer group pt-1">
              <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">
                Published <span className="font-normal text-white/40">(unpublish to hide from the public site and sitemap)</span>
              </span>
              <input type="checkbox" {...register('published')}
                className="w-4 h-4 rounded accent-teal-400 bg-white/5 border-white/10" />
            </label>
          </Section>
        </div>
      </div>

      {/* Delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={o => !isLoading && setDeleteDialogOpen(o)}>
        <AlertDialogContent className="bg-card border-[var(--admin-border-lg)] text-foreground rounded-2xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black">Delete Project?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50 text-sm">
              This project will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isLoading}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl font-bold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction disabled={isLoading} onClick={onDelete}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-black border-0 shadow-lg shadow-red-500/20">
              {isLoading ? 'Deleting…' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};

export default ProjectForm;
