import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Code, BookOpen, Briefcase, Zap, FileCheck, Award,
  CalendarDays, Newspaper, Globe, Trophy, Quote,
  BookMarked, FileText, Lightbulb, Building2, Heart,
  GraduationCap, Mail, Clock, ArrowRight, ChevronDown,
} from 'lucide-react';
import { ProjectService } from '@/services/project-service';
import { BlogService } from '@/services/blog-service';
import { CommonService } from '@/shared/services/common-service';
import type { ActivityLog, FirestoreLikeTimestamp } from '@/types';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import EmptyState from '@/components/admin/EmptyState';

/* ── The 4 metrics that are actually acted on day to day ─────────── */
const PRIMARY_METRICS = [
  { key: 'projects', label: 'Projects',        icon: Code,     path: '/projects' },
  { key: 'blogs',    label: 'Blog Posts',      icon: BookOpen, path: '/blogs' },
  { key: 'certs',    label: 'Certifications',  icon: FileCheck,path: '/certificates' },
  { key: 'messages', label: 'Unread Messages', icon: Mail,     path: '/messages' },
] as const;

/* ── Everything else — dense list, not equally-weighted tiles ────── */
const SECONDARY_METRICS = [
  { key: 'experience',    label: 'Experience',      icon: Briefcase,     path: '/experience' },
  { key: 'skills',        label: 'Skills & Tools',  icon: Zap,           path: '/skills' },
  { key: 'awards',        label: 'Awards',          icon: Award,         path: '/awards' },
  { key: 'events',        label: 'Events',          icon: CalendarDays,  path: '/events' },
  { key: 'newsletters',   label: 'Newsletters',     icon: Newspaper,     path: '/newsletters' },
  { key: 'languages',     label: 'Languages',       icon: Globe,         path: '/languages' },
  { key: 'hackathons',    label: 'Hackathons',      icon: Trophy,        path: '/hackathons' },
  { key: 'testimonials',  label: 'Testimonials',    icon: Quote,         path: '/testimonials' },
  { key: 'courses',       label: 'Courses',         icon: BookMarked,    path: '/courses' },
  { key: 'publications',  label: 'Publications',    icon: FileText,      path: '/publications' },
  { key: 'patents',       label: 'Patents',         icon: Lightbulb,     path: '/patents' },
  { key: 'organizations', label: 'Organizations',   icon: Building2,     path: '/organizations' },
  { key: 'volunteer',     label: 'Volunteer',       icon: Heart,         path: '/volunteer' },
  { key: 'education',     label: 'Education',       icon: GraduationCap, path: '/education' },
] as const;

/* ── Quick actions ─────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: 'Add Project',      sub: 'Upload a new project entry',      icon: Code,          path: '/projects/new' },
  { label: 'Write Blog',       sub: 'Publish an article',              icon: BookOpen,      path: '/blogs/new' },
  { label: 'Add Event',        sub: 'Log a speaking or attended event',icon: CalendarDays,  path: '/events' },
  { label: 'Add Hackathon',    sub: 'Record a hackathon entry',        icon: Trophy,        path: '/hackathons' },
  { label: 'Add Experience',   sub: 'Add a work experience entry',     icon: Briefcase,     path: '/experience/new' },
  { label: 'Manage Education', sub: 'Edit your academic background',   icon: GraduationCap, path: '/education' },
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
  const dateStr = format(now, 'EEEE, MMMM d');

  const populatedSecondary = SECONDARY_METRICS.filter((m) => (counts[m.key] ?? 0) > 0);
  const emptySecondary = SECONDARY_METRICS.filter((m) => (counts[m.key] ?? 0) === 0);

  return (
    <div className="space-y-6">

      {/* ── Greeting — one line ────────────────────────────────── */}
      <p className="text-h3 text-foreground">
        {greeting}, Saad <span className="text-muted-foreground">· {dateStr}</span>
      </p>

      {/* ── Primary metrics (4) ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PRIMARY_METRICS.map((metric) => (
          <Link key={metric.key} to={metric.path}>
            <Card interactive className="p-4 h-full">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground mb-3">
                <metric.icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="text-body-sm text-muted-foreground mb-0.5">{metric.label}</p>
              <p className="text-display tabular text-foreground">
                {loading ? (
                  <span className="inline-block h-7 w-10 rounded-md bg-secondary animate-pulse align-middle" />
                ) : (
                  counts[metric.key] ?? 0
                )}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── Bottom row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">

        <div className="space-y-4">
          {/* Secondary metrics — dense list */}
          <Card className="p-5">
            <h2 className="label mb-3">Content</h2>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-md bg-secondary animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {populatedSecondary.map((metric) => (
                    <Link
                      key={metric.key}
                      to={metric.path}
                      className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-secondary"
                    >
                      <metric.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                      <span className="text-body-sm text-foreground flex-1 truncate">{metric.label}</span>
                      <span className="text-body-sm tabular text-muted-foreground">{counts[metric.key]}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-foreground transition-colors" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
                {emptySecondary.length > 0 && (
                  <details className="mt-2 group">
                    <summary className="flex items-center gap-1.5 cursor-pointer text-body-sm text-muted-foreground hover:text-foreground list-none px-2 py-1.5 -mx-2 rounded-md hover:bg-secondary">
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
                      Not yet added ({emptySecondary.length})
                    </summary>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                      {emptySecondary.map((metric) => (
                        <Link
                          key={metric.key}
                          to={metric.path}
                          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-secondary text-muted-foreground/70 hover:text-foreground"
                        >
                          <metric.icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                          <span className="text-body-sm flex-1 truncate">{metric.label}</span>
                        </Link>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="p-5">
            <h2 className="label mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Link key={action.path} to={action.path}>
                  <div className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-secondary">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-secondary text-muted-foreground">
                      <action.icon className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-sm font-semibold text-foreground">{action.label}</p>
                      <p className="text-body-sm text-muted-foreground truncate">{action.sub}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-h3 text-foreground">Recent Activity</h2>
            {logs.length > 0 && (
              <Link
                to="/messages"
                className="text-body-sm font-semibold flex items-center gap-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            )}
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
                      <p className="text-body-sm font-medium text-foreground">
                        {actionVerb(log.action)}{' '}
                        <span style={{ color: dotColor }}>{log.entityType}</span>
                      </p>
                      {log.details && (
                        <p className="text-body-sm truncate mt-0.5 text-muted-foreground">
                          {log.details}
                        </p>
                      )}
                      <p className="text-body-sm mt-0.5 flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDistanceToNow(ts, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={Clock}
                title="No recent activity"
                description="Changes you make across the admin panel will show up here."
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
