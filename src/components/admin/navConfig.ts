import {
  LayoutDashboard, Briefcase, Code, BookOpen, FileCheck,
  Zap, Award, Globe, Trophy, Mail, Heart, GraduationCap,
  CalendarDays, Newspaper, Quote, BookMarked, FileText,
  Lightbulb, Building2, Leaf, ClipboardList, History,
} from 'lucide-react';

export interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  countKey?: string;
  badge?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Single source of truth for the admin nav — consumed by AdminLayout's
 * sidebar and by CommandMenu's ⌘K palette, so the two can't drift apart.
 */
export const navGroups: NavGroup[] = [
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
