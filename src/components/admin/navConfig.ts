import {
  LayoutGrid, Inbox, History, Code2, BookOpen, Briefcase, Zap, BadgeCheck,
  CalendarDays, GraduationCap, Award, Globe, Quote, Trophy, Newspaper,
  BookMarked, FileText, Lightbulb, Building2, Heart, Leaf, ClipboardList,
  UserRound, Layers, CornerDownRight, FileQuestion, BarChart3, Settings2, Smile,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const SITE_URL = 'https://www.saadmaz.com';
export const SITE_HOST = 'saadmaz.com';

export const OPEN_COMMAND_EVENT = 'admin:open-command-menu';
/** Opens the ⌘K palette from anywhere (sidebar search field, mobile top bar). */
export const openCommandMenu = () => document.dispatchEvent(new Event(OPEN_COMMAND_EVENT));

export type CountKey =
  | 'projects' | 'blogs' | 'experience' | 'skills' | 'certificates' | 'events'
  | 'education' | 'awards' | 'languages' | 'testimonials' | 'hackathons' | 'newsletters'
  | 'courses' | 'publications' | 'patents' | 'organizations' | 'volunteer' | 'causes'
  | 'testScores' | 'unread';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  countKey?: CountKey;
  /** Render the count as an ember badge (Inbox unread). */
  badge?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  /** Tucked behind a disclosure in the sidebar. */
  collapsible?: boolean;
}

/** Single source of truth for the sidebar, the mobile More sheet, breadcrumbs and ⌘K. */
export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutGrid, label: 'Dashboard', path: '/dashboard' },
      { icon: Inbox,      label: 'Inbox',     path: '/messages', countKey: 'unread', badge: true },
      { icon: History,    label: 'Activity',  path: '/logs' },
    ],
  },
  {
    label: 'Content',
    items: [
      { icon: Code2,        label: 'Projects',       path: '/projects',     countKey: 'projects' },
      { icon: BookOpen,     label: 'Blog posts',     path: '/blogs',        countKey: 'blogs' },
      { icon: Briefcase,    label: 'Experience',     path: '/experience',   countKey: 'experience' },
      { icon: Zap,          label: 'Skills & tools', path: '/skills',       countKey: 'skills' },
      { icon: BadgeCheck,   label: 'Certifications', path: '/certificates', countKey: 'certificates' },
      { icon: CalendarDays, label: 'Events',         path: '/events',       countKey: 'events' },
    ],
  },
  {
    label: 'Publishing',
    items: [
      { icon: UserRound,       label: 'Authors',       path: '/authors' },
      { icon: Layers,          label: 'Series',        path: '/series' },
      { icon: BarChart3,       label: 'Analytics',     path: '/analytics' },
      { icon: CornerDownRight, label: 'Redirects',     path: '/redirects' },
      { icon: FileQuestion,    label: '404 monitor',   path: '/not-found' },
      { icon: Settings2,       label: 'Blog settings', path: '/blog-settings' },
    ],
  },
  {
    label: 'Profile',
    items: [
      { icon: Smile,         label: 'About page',   path: '/about' },
      { icon: GraduationCap, label: 'Education',    path: '/education',    countKey: 'education' },
      { icon: Award,         label: 'Awards',       path: '/awards',       countKey: 'awards' },
      { icon: Globe,         label: 'Languages',    path: '/languages',    countKey: 'languages' },
      { icon: Quote,         label: 'Testimonials', path: '/testimonials', countKey: 'testimonials' },
      { icon: Trophy,        label: 'Hackathons',   path: '/hackathons',   countKey: 'hackathons' },
      { icon: Newspaper,     label: 'Newsletters',  path: '/newsletters',  countKey: 'newsletters' },
    ],
  },
  {
    label: 'More collections',
    collapsible: true,
    items: [
      { icon: BookMarked,    label: 'Courses',       path: '/courses',       countKey: 'courses' },
      { icon: FileText,      label: 'Publications',  path: '/publications',  countKey: 'publications' },
      { icon: Lightbulb,     label: 'Patents',       path: '/patents',       countKey: 'patents' },
      { icon: Building2,     label: 'Organizations', path: '/organizations', countKey: 'organizations' },
      { icon: Heart,         label: 'Volunteer',     path: '/volunteer',     countKey: 'volunteer' },
      { icon: Leaf,          label: 'Causes',        path: '/causes',        countKey: 'causes' },
      { icon: ClipboardList, label: 'Test scores',   path: '/test-scores',   countKey: 'testScores' },
    ],
  },
];

export const allNavItems = navGroups.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label })));

export const findNavItem = (pathname: string) =>
  allNavItems.find((i) => pathname === i.path || pathname.startsWith(i.path + '/'));

export interface CreateAction {
  icon: LucideIcon;
  label: string;
  /** Short noun for Quick create tiles. */
  noun: string;
  path: string;
}

/**
 * Everything the "New" menu, Quick create and ⌘K can create. Collections that
 * edit in a drawer take `?new=1`, which their page turns into an open drawer.
 */
export const createActions: CreateAction[] = [
  { icon: Code2,         noun: 'Project',     label: 'New project',     path: '/projects/new' },
  { icon: BookOpen,      noun: 'Blog post',   label: 'New blog post',   path: '/blogs/new' },
  { icon: CalendarDays,  noun: 'Event',       label: 'New event',       path: '/events?new=1' },
  { icon: BadgeCheck,    noun: 'Certificate', label: 'New certificate', path: '/certificates/new' },
  { icon: Briefcase,     noun: 'Experience',  label: 'New experience',  path: '/experience/new' },
  { icon: Trophy,        noun: 'Hackathon',   label: 'New hackathon',   path: '/hackathons?new=1' },
  { icon: GraduationCap, noun: 'Education',   label: 'New education',   path: '/education/new' },
  { icon: Award,         noun: 'Award',       label: 'New award',       path: '/awards?new=1' },
  { icon: Quote,         noun: 'Testimonial', label: 'New testimonial', path: '/testimonials?new=1' },
];
