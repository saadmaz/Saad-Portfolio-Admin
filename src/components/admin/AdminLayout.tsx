import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Code, BookOpen, FileCheck,
  LogOut, Menu, X, ShieldCheck, Zap, Award, Globe, Trophy,
  Mail, Heart, GraduationCap, CalendarDays, Newspaper,
  Quote, ChevronLeft, ChevronRight, ExternalLink,
  BookMarked, FileText, Lightbulb, Building2,
  Leaf, ClipboardList, History,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import { auth } from '@/lib/firebase';
import { CommonService } from '@/shared/services/common-service';
import { ProjectService } from '@/services/project-service';
import { BlogService } from '@/services/blog-service';

/* ─── Nav definition ─────────────────────────────────────────── */
interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  countKey?: string;
  badge?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',  path: '/dashboard' },
    ],
  },
  {
    label: 'Content',
    items: [
      { icon: Code,         label: 'Projects',       path: '/projects',     countKey: 'projects' },
      { icon: BookOpen,     label: 'Blog Posts',      path: '/blogs',        countKey: 'blogs' },
      { icon: Briefcase,    label: 'Experience',      path: '/experience',   countKey: 'experience' },
      { icon: Zap,          label: 'Skills & Tools',  path: '/skills',       countKey: 'skills' },
      { icon: FileCheck,    label: 'Certifications',  path: '/certificates', countKey: 'certificates' },
    ],
  },
  {
    label: 'Metadata',
    items: [
      { icon: Award,        label: 'Awards',       path: '/awards',       countKey: 'awards' },
      { icon: CalendarDays, label: 'Events',        path: '/events',       countKey: 'events' },
      { icon: Newspaper,    label: 'Newsletters',   path: '/newsletters',  countKey: 'newsletters' },
      { icon: Globe,        label: 'Languages',     path: '/languages',    countKey: 'languages' },
      { icon: Trophy,       label: 'Hackathons',    path: '/hackathons',   countKey: 'hackathons' },
      { icon: Quote,        label: 'Testimonials',  path: '/testimonials', countKey: 'testimonials' },
    ],
  },
  {
    label: 'Profile',
    items: [
      { icon: BookMarked,    label: 'Courses',         path: '/courses',       countKey: 'courses' },
      { icon: FileText,      label: 'Publications',    path: '/publications',  countKey: 'publications' },
      { icon: Lightbulb,     label: 'Patents',         path: '/patents',       countKey: 'patents' },
      { icon: Building2,     label: 'Organizations',   path: '/organizations', countKey: 'organizations' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { icon: Heart,         label: 'Volunteer',      path: '/volunteer',   countKey: 'volunteer' },
      { icon: Leaf,          label: 'Causes',         path: '/causes',      countKey: 'causes' },
      { icon: ClipboardList, label: 'Test Scores',    path: '/test-scores', countKey: 'testScores' },
      { icon: GraduationCap, label: 'Education',      path: '/education',   countKey: 'education' },
      { icon: Mail,          label: 'Messages',        path: '/messages',    countKey: 'messages', badge: true },
      { icon: History,       label: 'Activity Logs',  path: '/logs' },
    ],
  },
];

/* ─── Palette ────────────────────────────────────────────────── */
const SIDEBAR_KEY = 'admin_sidebar_collapsed';

/* ─── Main layout ────────────────────────────────────────────── */
const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === 'true'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [navCounts, setNavCounts] = useState<Record<string, number>>({});
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileSidebarRef = useRef<HTMLElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_KEY, String(collapsed)); } catch { /* localStorage unavailable (private mode, quota) - ignore */ }
  }, [collapsed]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user && location.pathname !== '/login') navigate('/login');
    });
    return unsub;
  }, [navigate, location.pathname]);

  useEffect(() => {
    Promise.all([
      ProjectService.getAll(),
      BlogService.getAll(),
      CommonService.getMessages(),
      CommonService.getWorkExperience(),
      CommonService.getSkills(),
      CommonService.getCertificates(),
      CommonService.getAwards(),
      CommonService.getEvents(),
      CommonService.getTestimonials(),
      CommonService.getCourses(),
      CommonService.getPublications(),
      CommonService.getPatents(),
      CommonService.getOrganizations(),
      CommonService.getCauses(),
      CommonService.getTestScores(),
    ]).then(([projects, blogs, messages, experience, skills, certs, awards, events, testimonials, courses, publications, patents, organizations, causes, testScores]) => {
      const unread = messages.filter((m) => !m.read).length;
      setUnreadCount(unread);
      setNavCounts({
        projects:      projects.length,
        blogs:         blogs.length,
        experience:    experience.length,
        skills:        skills.length,
        certificates:  certs.length,
        awards:        awards.length,
        events:        events.length,
        testimonials:  testimonials.length,
        messages:      unread,
        courses:       courses.length,
        publications:  publications.length,
        patents:       patents.length,
        organizations: organizations.length,
        causes:        causes.length,
        testScores:    testScores.length,
      });
    }).catch(() => {});
  }, [location.pathname]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    mobileSidebarRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  const currentPageLabel = navGroups
    .flatMap(g => g.items)
    .find(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'))
    ?.label ?? 'Dashboard';

  /* ── Sidebar content ────────────────────────────────────────── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Logo / brand */}
      <div className={cn(
        "flex items-center h-14 border-b flex-shrink-0 transition-all duration-300",
        "border-[var(--admin-border)]",
        collapsed ? "justify-center px-0" : "justify-between px-4"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'hsl(var(--accent) / 0.10)', border: '1px solid hsl(var(--accent) / 0.22)' }}
            >
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'hsl(var(--accent))' }} />
            </div>
            <span
              className="text-[13px] font-semibold"
              style={{ color: 'hsl(var(--foreground) / 0.90)' }}
            >
              Admin
            </span>
          </div>
        )}
        {collapsed && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'hsl(var(--accent) / 0.10)', border: '1px solid hsl(var(--accent) / 0.22)' }}
          >
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'hsl(var(--accent))' }} />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className={cn(
            "hidden md:flex items-center justify-center w-5 h-5 rounded-md transition-all duration-200 flex-shrink-0",
            "text-[var(--admin-fg-22)] hover:text-[var(--admin-fg-60)] hover:bg-white/[0.06]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            collapsed && "absolute left-[52px] top-[20px] z-10 border shadow-xl rounded-full"
          )}
          style={collapsed ? { background: 'hsl(var(--card))', borderColor: 'var(--admin-border-md)' } : {}}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar px-2 space-y-0">
        <TooltipProvider delayDuration={0}>
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <p
                  className="text-[9px] font-semibold px-2.5 pb-1.5 pt-0.5 tracking-[0.14em] uppercase select-none"
                  style={{ color: 'hsl(var(--foreground) / 0.55)' }}
                >
                  {group.label}
                </p>
              )}
              {collapsed && (
                <div className="my-2 mx-2" style={{ borderTop: '1px solid var(--admin-surface-md)' }} />
              )}

              {group.items.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                const hasBadge = Boolean(item.badge) && unreadCount > 0;
                const count = item.countKey ? navCounts[item.countKey] : undefined;

                const linkEl = (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg transition-colors duration-150 group relative mb-0.5 outline-none",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-2",
                      isActive
                        ? "bg-accent-subtle text-accent"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-accent" />
                    )}

                    <div className="relative flex-shrink-0">
                      <item.icon className="w-[15px] h-[15px] transition-transform duration-150 group-hover:scale-105" />
                      {hasBadge && collapsed && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[13px] h-[13px] px-0.5 rounded-full bg-danger text-danger-foreground text-[8px] font-bold flex items-center justify-center leading-none tabular">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>

                    {!collapsed && (
                      <>
                        <span className={cn("text-body-sm truncate flex-1 transition-colors duration-150", isActive ? "text-accent" : "text-muted-foreground")}>
                          {item.label}
                        </span>
                        {hasBadge ? (
                          <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-danger-subtle text-danger-fg text-[9px] font-bold flex items-center justify-center border border-danger/20 tabular">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        ) : count !== undefined && count > 0 ? (
                          <span className="ml-auto text-body-sm text-muted-foreground tabular">
                            {count}
                          </span>
                        ) : null}
                      </>
                    )}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="text-xs font-medium flex items-center gap-2"
                        style={{ background: 'hsl(var(--card))', borderColor: 'var(--admin-border-lg)', color: 'hsl(var(--foreground))' }}
                      >
                        {item.label}
                        {count !== undefined && (
                          <span style={{ color: 'hsl(var(--foreground) / 0.55)' }}>{count}</span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return linkEl;
              })}
            </div>
          ))}
        </TooltipProvider>
      </nav>

      {/* User profile + sign out */}
      <div
        className="flex-shrink-0"
        style={{ borderTop: '1px solid var(--admin-border)' }}
      >
        {/* User row */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
              style={{ background: 'hsl(var(--accent) / 0.10)', border: '1px solid hsl(var(--accent) / 0.20)', color: 'hsl(var(--accent))' }}
            >
              SM
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-semibold truncate" style={{ color: 'hsl(var(--foreground) / 0.80)' }}>
                Saad Mazhar
              </p>
              <p className="text-[9.5px] truncate" style={{ color: 'hsl(var(--foreground) / 0.60)' }}>
                saadmazaa@gmail.com
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center py-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'hsl(var(--accent) / 0.10)', border: '1px solid hsl(var(--accent) / 0.20)', color: 'hsl(var(--accent))' }}
            >
              SM
            </div>
          </div>
        )}

        {/* Sign out */}
        <div className={cn("pb-3", collapsed ? "px-2" : "px-3")}>
          <TooltipProvider delayDuration={0}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={async () => { try { await auth.signOut(); } catch { /* ignore, still navigate away */ } navigate('/login'); }}
                    className="w-full flex items-center justify-center p-2 rounded-lg transition-colors text-muted-foreground hover:bg-danger-subtle hover:text-danger-fg"
                  >
                    <LogOut className="w-[15px] h-[15px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs" style={{ background: 'hsl(var(--card))', borderColor: 'var(--admin-border-lg)', color: 'hsl(var(--foreground))' }}>
                  Sign Out
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={async () => { try { await auth.signOut(); } catch { /* ignore, still navigate away */ } navigate('/login'); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-body-sm font-medium text-muted-foreground hover:bg-danger-subtle hover:text-danger-fg"
              >
                <LogOut className="w-[14px] h-[14px] flex-shrink-0" />
                Sign Out
              </button>
            )}
          </TooltipProvider>
        </div>
      </div>
    </div>
  );

  /* ── Root render ──────────────────────────────────────────── */
  return (
    <div className="admin-panel min-h-screen flex" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>

        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative",
            collapsed ? "w-[60px]" : "w-[220px]"
          )}
          style={{ background: 'hsl(var(--card))', borderRight: '1px solid var(--admin-border)' }}
        >
          <SidebarContent />
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 backdrop-blur-sm md:hidden"
            style={{ background: 'hsl(var(--background) / 0.75)' }}
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <aside
          ref={mobileSidebarRef}
          tabIndex={-1}
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[220px] transition-all duration-300 ease-in-out md:hidden flex flex-col focus:outline-none",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          style={{ background: 'hsl(var(--card))', borderRight: '1px solid var(--admin-border)' }}
        >
          <SidebarContent />
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Top bar */}
          <header
            className="h-12 flex items-center justify-between px-4 md:px-5 z-40 flex-shrink-0 backdrop-blur-xl gap-3"
            style={{ background: 'hsl(var(--card) / 0.80)', borderBottom: '1px solid var(--admin-border)' }}
          >
            {/* Mobile menu */}
            <Button
              ref={mobileMenuButtonRef}
              variant="ghost"
              size="icon"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="md:hidden rounded-lg w-7 h-7 hover:bg-white/[0.06] flex-shrink-0"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            </Button>

            {/* Breadcrumb */}
            <div
              className="hidden md:flex items-center gap-1.5 text-[10.5px] font-medium flex-shrink-0"
              style={{ color: 'hsl(var(--foreground) / 0.55)' }}
            >
              <ShieldCheck className="w-3 h-3" style={{ color: 'hsl(var(--accent) / 0.55)' }} />
              <span>Admin</span>
              <span aria-hidden="true" style={{ color: 'hsl(var(--foreground) / 0.12)' }}>›</span>
              <span style={{ color: 'hsl(var(--foreground) / 0.60)' }}>{currentPageLabel}</span>
            </div>

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              <a
                href="https://www.saadmaz.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full font-medium tracking-wide transition-colors duration-200 bg-secondary text-muted-foreground hover:text-foreground border border-border"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                View site
              </a>

              <div className="hidden sm:flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-full font-medium bg-success-subtle text-success-fg border border-success/20">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Live
              </div>

              {/* Avatar */}
              <div className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer relative transition-colors duration-150 text-[10px] font-bold bg-accent-subtle border border-accent/20 text-accent">
                SM
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-danger text-danger-foreground text-[7px] font-bold flex items-center justify-center border-[1.5px] border-background tabular">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <div
            className="flex-1 overflow-y-auto custom-scrollbar bg-background"
          >
            <div className="p-5 md:p-7 max-w-[1400px] mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
  );
};

export default AdminLayout;
