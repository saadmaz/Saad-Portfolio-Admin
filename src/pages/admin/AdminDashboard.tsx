import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Code, BookOpen, Briefcase, Zap, FileCheck, Award,
  CalendarDays, Newspaper, Globe, Trophy, Quote,
  BookMarked, FileText, Lightbulb, Building2, Heart,
  GraduationCap, Mail, Clock, ArrowRight,
} from 'lucide-react';
import { ProjectService } from '@/services/project-service';
import { BlogService } from '@/services/blog-service';
import { CommonService } from '@/shared/services/common-service';
import type { ActivityLog, FirestoreLikeTimestamp } from '@/types';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

/* ── All 18 stat cards ─────────────────────────────────────────── */
const STAT_CARDS = [
  { key: 'projects',      label: 'Projects',        icon: Code,         path: '/projects',      gradient: 'var(--grad-projects)' },
  { key: 'blogs',         label: 'Blog Posts',       icon: BookOpen,     path: '/blogs',         gradient: 'var(--grad-blogs)' },
  { key: 'experience',    label: 'Experience',       icon: Briefcase,    path: '/experience',    gradient: 'var(--grad-experience)' },
  { key: 'skills',        label: 'Skills & Tools',   icon: Zap,          path: '/skills',        gradient: 'var(--grad-skills)' },
  { key: 'certs',         label: 'Certifications',   icon: FileCheck,    path: '/certificates',  gradient: 'var(--grad-certs)' },
  { key: 'awards',        label: 'Awards',           icon: Award,        path: '/awards',        gradient: 'var(--grad-awards)' },
  { key: 'events',        label: 'Events',           icon: CalendarDays, path: '/events',        gradient: 'var(--grad-events)' },
  { key: 'newsletters',   label: 'Newsletters',      icon: Newspaper,    path: '/newsletters',   gradient: 'var(--grad-newsletters)' },
  { key: 'languages',     label: 'Languages',        icon: Globe,        path: '/languages',     gradient: 'var(--grad-languages)' },
  { key: 'hackathons',    label: 'Hackathons',       icon: Trophy,       path: '/hackathons',    gradient: 'var(--grad-hackathons)' },
  { key: 'testimonials',  label: 'Testimonials',     icon: Quote,        path: '/testimonials',  gradient: 'var(--grad-testimonials)' },
  { key: 'courses',       label: 'Courses',          icon: BookMarked,   path: '/courses',       gradient: 'var(--grad-courses)' },
  { key: 'publications',  label: 'Publications',     icon: FileText,     path: '/publications',  gradient: 'var(--grad-publications)' },
  { key: 'patents',       label: 'Patents',          icon: Lightbulb,    path: '/patents',       gradient: 'var(--grad-patents)' },
  { key: 'organizations', label: 'Organizations',    icon: Building2,    path: '/organizations', gradient: 'var(--grad-organizations)' },
  { key: 'volunteer',     label: 'Volunteer',        icon: Heart,        path: '/volunteer',     gradient: 'var(--grad-volunteer)' },
  { key: 'education',     label: 'Education',        icon: GraduationCap,path: '/education',     gradient: 'var(--grad-education)' },
  { key: 'messages',      label: 'Unread Messages',  icon: Mail,         path: '/messages',      gradient: 'var(--grad-messages)' },
] as const;

/* ── Quick actions ─────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: 'Add Project',      sub: 'Upload a new project entry',        icon: Code,         color: 'hsl(221 83% 60%)', iconBg: 'hsl(221 83% 60% / 0.12)', bg: 'hsl(221 83% 60% / 0.08)', path: '/projects/new' },
  { label: 'Write Blog',       sub: 'Publish an article',                 icon: BookOpen,     color: 'hsl(37 96% 44%)',  iconBg: 'hsl(37 96% 44% / 0.12)',  bg: 'hsl(37 96% 44% / 0.08)',  path: '/blogs/new' },
  { label: 'Add Event',        sub: 'Log a speaking or attended event',   icon: CalendarDays, color: 'hsl(162 94% 30%)', iconBg: 'hsl(162 94% 30% / 0.12)', bg: 'hsl(162 94% 30% / 0.08)', path: '/events' },
  { label: 'Add Hackathon',    sub: 'Record a hackathon entry',           icon: Trophy,       color: 'hsl(262 84% 58%)', iconBg: 'hsl(262 84% 58% / 0.12)', bg: 'hsl(262 84% 58% / 0.08)', path: '/hackathons' },
  { label: 'Add Experience',   sub: 'Add a work experience entry',        icon: Briefcase,    color: 'hsl(177 84% 31%)', iconBg: 'hsl(177 84% 31% / 0.12)', bg: 'hsl(177 84% 31% / 0.08)', path: '/experience/new' },
  { label: 'Manage Education', sub: 'Edit your academic background',      icon: GraduationCap,color: 'hsl(344 79% 51%)', iconBg: 'hsl(344 79% 51% / 0.12)', bg: 'hsl(344 79% 51% / 0.08)', path: '/education' },
];

/* ── Helpers ───────────────────────────────────────────────────── */
const actionDotColor = (action: string) => {
  if (action === 'CREATE') return 'hsl(var(--status-create))';
  if (action === 'UPDATE') return 'hsl(var(--status-update))';
  if (action === 'DELETE') return 'hsl(var(--status-delete))';
  return 'hsl(var(--status-default))';
};

const actionVerb = (action: string) => {
  if (action === 'CREATE') return 'Added';
  if (action === 'UPDATE') return 'Updated';
  if (action === 'DELETE') return 'Deleted';
  return action;
};

/** Firestore Admin/client SDKs return Timestamp objects with .toDate(); plain
 * writes may store a Date, ISO string, or epoch number instead. */
const toJsDate = (ts: FirestoreLikeTimestamp): Date => {
  if (ts && typeof ts === 'object' && 'toDate' in ts) return ts.toDate();
  return ts ? new Date(ts) : new Date(0);
};

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [
          projects, blogs, experience, skills, certs, awards,
          events, newsletters, languages, hackathons, testimonials,
          courses, publications, patents, organizations, volunteer,
          education, messages, activityLogs,
        ] = await Promise.all([
          ProjectService.getAll(),
          BlogService.getAll(),
          CommonService.getWorkExperience(),
          CommonService.getSkills(),
          CommonService.getCertificates(),
          CommonService.getAwards(),
          CommonService.getEvents(),
          CommonService.getNewsletters(),
          CommonService.getLanguages(),
          CommonService.getHackathons(),
          CommonService.getTestimonials(),
          CommonService.getCourses(),
          CommonService.getPublications(),
          CommonService.getPatents(),
          CommonService.getOrganizations(),
          CommonService.getVolunteerExperience(),
          CommonService.getEducation(),
          CommonService.getMessages(),
          CommonService.getActivityLogs(),
        ]);

        setCounts({
          projects:      projects.length,
          blogs:         blogs.length,
          experience:    experience.length,
          skills:        skills.length,
          certs:         certs.length,
          awards:        awards.length,
          events:        events.length,
          newsletters:   newsletters.length,
          languages:     languages.length,
          hackathons:    hackathons.length,
          testimonials:  testimonials.length,
          courses:       courses.length,
          publications:  publications.length,
          patents:       patents.length,
          organizations: organizations.length,
          volunteer:     volunteer.length,
          education:     education.length,
          messages:      messages.filter((m) => !m.read).length,
        });
        setLogs([...activityLogs].reverse().slice(0, 8));
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = format(now, 'EEEE, MMMM d').toUpperCase();

  return (
    <div className="space-y-6">

      {/* ── Greeting ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 pt-0.5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5 text-muted-foreground">
            {dateStr}
          </p>
          <h1 className="text-[27px] font-bold leading-tight text-foreground">
            {greeting}, Saad.
          </h1>
          <p className="text-[13px] mt-1 text-muted-foreground">
            Here's an overview of your portfolio content.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full flex-shrink-0 mt-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-400" />
          Portfolio Live
        </div>
      </div>

      {/* ── Stat cards (all 18) ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {STAT_CARDS.map((card) => (
          <Link key={card.key} to={card.path}>
            <div
              className="relative rounded-2xl p-4 overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl select-none h-full"
              style={{
                background: card.gradient,
                boxShadow: '0 4px 18px rgba(0,0,0,0.14)',
              }}
            >
              {/* Decorative blobs */}
              <div
                className="absolute -right-4 -top-4 w-20 h-20 rounded-full pointer-events-none"
                style={{ background: 'var(--admin-border-lg)' }}
              />
              <div
                className="absolute right-2 -bottom-3 w-10 h-10 rounded-full pointer-events-none"
                style={{ background: 'var(--admin-surface-xl)' }}
              />

              {/* Dark scrim so label/count text clears WCAG contrast against the gradient's light end */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 80%)' }}
              />

              {/* Icon */}
              <div
                className="relative z-10 w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'hsl(0 0% 100% / 0.22)' }}
              >
                <card.icon className="w-3.5 h-3.5 text-white" />
              </div>

              {/* Label + count + arrow */}
              <div className="relative z-10 flex items-end justify-between">
                <div>
                  <p
                    className="text-[9.5px] font-medium mb-0.5 leading-tight"
                    style={{ color: 'hsl(0 0% 100% / 0.85)' }}
                  >
                    {card.label}
                  </p>
                  <p className="text-[26px] font-bold text-white leading-none tabular-nums">
                    {loading ? (
                      <span
                        className="inline-block w-7 h-6 rounded-md animate-pulse align-middle"
                        style={{ background: 'hsl(0 0% 100% / 0.25)' }}
                      />
                    ) : (
                      counts[card.key] ?? 0
                    )}
                  </p>
                </div>
                <ArrowRight
                  className="w-3.5 h-3.5 mb-0.5 flex-shrink-0"
                  style={{ color: 'hsl(0 0% 100% / 0.50)' }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Bottom row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">

        {/* Quick Actions */}
        <div className="rounded-2xl p-6 bg-card shadow-[0_1px_10px_rgba(0,0,0,0.06)]">
          <h2 className="text-[15px] font-bold mb-0.5 text-foreground">
            Quick Actions
          </h2>
          <p className="text-[12px] mb-5 text-muted-foreground">
            Jump to the most common tasks
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.path} to={action.path}>
                <div
                  className="flex items-center gap-3 p-3.5 rounded-xl transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                  style={{ background: action.bg }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: action.iconBg }}
                  >
                    <action.icon className="w-4 h-4" style={{ color: action.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-foreground">
                      {action.label}
                    </p>
                    <p className="text-[10.5px] truncate text-muted-foreground">
                      {action.sub}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl overflow-hidden bg-card shadow-[0_1px_10px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-[15px] font-bold text-foreground">
                Recent Activity
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Latest events across the platform
              </p>
            </div>
            <Link
              to="/messages"
              className="text-[11px] font-semibold flex items-center gap-0.5 transition-opacity hover:opacity-70 text-blue-400"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 animate-pulse bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 rounded-full animate-pulse bg-secondary" style={{ width: '65%' }} />
                    <div className="h-2 rounded-full animate-pulse bg-secondary" style={{ width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length > 0 ? (
            <div>
              {logs.map((log) => {
                const dotColor = actionDotColor(log.action);
                const ts = toJsDate(log.timestamp);
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 px-5 py-3.5 border-b border-border last:border-b-0"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-[5px]"
                      style={{ background: dotColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground">
                        {actionVerb(log.action)}{' '}
                        <span style={{ color: dotColor }}>{log.entityType}</span>
                      </p>
                      {log.details && (
                        <p className="text-[10.5px] truncate mt-0.5 text-muted-foreground">
                          {log.details}
                        </p>
                      )}
                      <p className="text-[10px] mt-0.5 flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDistanceToNow(ts, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
