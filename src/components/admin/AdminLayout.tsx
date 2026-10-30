import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown, ExternalLink, History, Inbox, Layers, LayoutGrid, LogOut, MoreHorizontal,
  PanelLeft, Plus, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/shared/lib/utils';
import { useAuth } from '@/shared/contexts/AuthContext';
import {
  createActions, findNavItem, navGroups, openCommandMenu, SITE_URL,
  type NavGroup, type NavItem,
} from './navConfig';
import { OVERVIEW_QUERY_KEY, useAdminOverview } from './useAdminOverview';
import { BrandAppIcon } from './BrandMark';
import CommandMenu from './CommandMenu';

const SIDEBAR_KEY = 'admin_sidebar_collapsed';
const MORE_KEY = 'admin_sidebar_more_open';

const readFlag = (key: string) => {
  try { return localStorage.getItem(key) === 'true'; } catch { return false; }
};
const writeFlag = (key: string, value: boolean) => {
  try { localStorage.setItem(key, String(value)); } catch { /* storage unavailable */ }
};

const isActivePath = (pathname: string, path: string) => pathname === path || pathname.startsWith(path + '/');

const contentPaths = navGroups.find((g) => g.label === 'Content')!.items.map((i) => i.path);

/** "Projects / New", "Inbox", etc. for the top bar. */
function useBreadcrumb() {
  const { pathname } = useLocation();
  if (pathname === '/' || pathname === '/dashboard') return { group: 'Overview', page: 'Dashboard', detail: undefined };
  if (pathname === '/more') return { group: 'Overview', page: 'More', detail: undefined };
  const item = findNavItem(pathname);
  if (!item) return { group: 'Overview', page: 'Dashboard', detail: undefined };
  const rest = pathname.slice(item.path.length + 1);
  const detail = rest ? (rest === 'new' ? 'New' : 'Edit') : undefined;
  return { group: item.group === 'More collections' ? 'More' : item.group, page: item.label, detail };
}

const initialsOf = (name?: string | null, email?: string | null) => {
  const source = name || email?.split('@')[0] || 'Admin';
  return source.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
};

const Avatar = ({ initials, className }: { initials: string; className?: string }) => (
  <span
    className={cn(
      'flex shrink-0 items-center justify-center rounded-full border border-border bg-gradient-to-b from-surface-3 to-secondary font-mono text-[12px] text-foreground',
      className,
    )}
    aria-hidden="true"
  >
    {initials}
  </span>
);

/* ── Sidebar ─────────────────────────────────────────────────── */

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  counts: Partial<Record<string, number>>;
  userName: string;
  userEmail: string;
  initials: string;
  onSignOut: () => void;
}

const Sidebar = ({ collapsed, onToggle, counts, userName, userEmail, initials, onSignOut }: SidebarProps) => {
  const { pathname } = useLocation();
  const moreGroup = navGroups.find((g) => g.collapsible)!;
  const moreActive = moreGroup.items.some((i) => isActivePath(pathname, i.path));
  const [moreOpen, setMoreOpen] = useState(() => readFlag(MORE_KEY));
  const showMore = moreOpen || moreActive;

  const toggleMore = () => {
    setMoreOpen((open) => {
      writeFlag(MORE_KEY, !open);
      return !open;
    });
  };

  const renderItem = (item: NavItem) => {
    const count = item.countKey ? counts[item.countKey] : undefined;
    const active = isActivePath(pathname, item.path) || (item.path === '/dashboard' && pathname === '/');
    const link = (
      <Link
        to={item.path}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group flex items-center gap-2.5 rounded-lg px-2 py-[7px] text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
          collapsed && 'justify-center px-0',
          active ? 'bg-secondary text-foreground' : 'text-fg-2 hover:bg-secondary/60 hover:text-foreground',
        )}
      >
        <span className="relative">
          <item.icon
            className={cn('h-4 w-4 shrink-0', active ? 'text-accent' : 'text-muted-foreground group-hover:text-fg-2')}
            aria-hidden="true"
          />
          {collapsed && item.badge && !!count && (
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-card" />
          )}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.badge ? (
              !!count && (
                <span className="rounded-full bg-accent px-[7px] font-mono text-[12px] leading-[1.5] text-accent-foreground tabular">
                  {count > 99 ? '99+' : count}
                </span>
              )
            ) : (
              count !== undefined && (
                <span className="px-[7px] font-mono text-[13px] text-muted-foreground tabular">{count}</span>
              )
            )}
          </>
        )}
      </Link>
    );

    if (!collapsed) return <li key={item.path}>{link}</li>;
    return (
      <li key={item.path}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {count !== undefined && <span className="font-mono text-muted-foreground">{count}</span>}
          </TooltipContent>
        </Tooltip>
      </li>
    );
  };

  const renderGroup = (group: NavGroup) => (
    <div key={group.label}>
      {!collapsed && <p className="label px-2 pb-2">{group.label}</p>}
      <ul className="space-y-0.5">{group.items.map(renderItem)}</ul>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn('flex items-center gap-2.5 py-[18px] pl-5 pr-4', collapsed && 'flex-col px-0')}>
        <BrandAppIcon className="h-7 w-7" />
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-none">
            <p className="text-sm font-medium tracking-[-0.01em] text-foreground">Saad Mazhar</p>
            <p className="mt-1 font-mono text-[13px] leading-none text-muted-foreground">CMS · v2</p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className={cn('px-3 pb-2', collapsed && 'flex justify-center')}>
        {collapsed ? (
          <button
            type="button"
            onClick={openCommandMenu}
            aria-label="Search"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={openCommandMenu}
            className="flex w-full items-center gap-2 rounded-[10px] border border-border bg-background py-2 pl-2.5 pr-2 text-left text-sm text-muted-foreground transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="flex-1">Search…</span>
            <kbd className="rounded-md border border-border bg-secondary px-1.5 py-px font-mono text-[12px] text-fg-2">⌘K</kbd>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav aria-label="Main" className="no-scrollbar flex-1 space-y-[18px] overflow-y-auto px-3 py-2">
        {navGroups.filter((g) => !g.collapsible).map(renderGroup)}

        <div>
          {!collapsed ? (
            <button
              type="button"
              onClick={toggleMore}
              aria-expanded={showMore}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-[7px] text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1 text-left">{moreGroup.label}</span>
              <span className="font-mono text-[13px]">{moreGroup.items.length}</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showMore && 'rotate-180')} aria-hidden="true" />
            </button>
          ) : (
            <div className="mx-2 mb-2 border-t border-border-subtle" />
          )}
          {(showMore || collapsed) && <ul className="mt-0.5 space-y-0.5">{moreGroup.items.map(renderItem)}</ul>}
        </div>
      </nav>

      {/* User */}
      <div className={cn('flex items-center gap-2.5 border-t border-border-subtle px-4 py-3.5', collapsed && 'flex-col px-0')}>
        <Avatar initials={initials} className="h-8 w-8" />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{userName}</p>
            <p className="truncate font-mono text-[12px] text-muted-foreground">{userEmail}</p>
          </div>
        )}
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

/* ── Mobile tab bar ──────────────────────────────────────────── */

const TabLink = ({ to, label, icon: Icon, active, badge }: {
  to: string; label: string; icon: typeof Inbox; active: boolean; badge?: number;
}) => (
  <NavLink
    to={to}
    aria-current={active ? 'page' : undefined}
    className={cn(
      'flex w-16 flex-col items-center gap-1 pt-1 font-mono text-[12px] transition-colors',
      active ? 'text-foreground' : 'text-muted-foreground',
    )}
  >
    <span className="relative">
      <Icon className={cn('h-[22px] w-[22px]', active && 'text-accent')} strokeWidth={1.6} aria-hidden="true" />
      {!!badge && (
        <span className="absolute -top-1 left-3.5 rounded-full bg-accent px-[5px] font-mono text-[12px] leading-[1.35] text-accent-foreground">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </span>
    {label}
  </NavLink>
);

/* ── Layout ──────────────────────────────────────────────────── */

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(() => readFlag(SIDEBAR_KEY));
  const [createOpen, setCreateOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser, logout } = useAuth();
  const { data } = useAdminOverview();
  const counts = data?.counts ?? {};
  const unread = counts.unread ?? 0;
  const crumb = useBreadcrumb();

  const userEmail = currentUser?.email ?? 'saadmazaa@gmail.com';
  const userName = currentUser?.displayName || 'Saad Mazhar';
  const initials = initialsOf(currentUser?.displayName || 'Saad Mazhar', userEmail);

  useEffect(() => { writeFlag(SIDEBAR_KEY, collapsed); }, [collapsed]);

  // Keep counts fresh as you move between collections.
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY });
  }, [pathname, queryClient]);

  const signOut = async () => {
    await logout();
    navigate('/login');
  };

  const isHome = pathname === '/' || pathname === '/dashboard';
  const isContent = contentPaths.some((p) => isActivePath(pathname, p));
  const isInbox = isActivePath(pathname, '/messages');
  const isMore = !isHome && !isContent && !isInbox;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <CommandMenu />

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 border-r border-border-subtle bg-card transition-[width] duration-200 ease-out md:block',
          collapsed ? 'w-[72px]' : 'w-[264px]',
        )}
      >
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          counts={counts}
          userName={userName}
          userEmail={userEmail}
          initials={initials}
          onSignOut={signOut}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop top bar */}
        <header className="sticky top-0 z-30 hidden h-16 items-center gap-3 border-b border-border-subtle bg-background/85 px-8 backdrop-blur-md md:flex">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
            <span className="text-muted-foreground">{crumb.group}</span>
            <span className="text-muted-foreground/60" aria-hidden="true">/</span>
            <span className={cn('truncate', crumb.detail ? 'text-muted-foreground' : 'text-foreground')}>{crumb.page}</span>
            {crumb.detail && (
              <>
                <span className="text-muted-foreground/60" aria-hidden="true">/</span>
                <span className="text-foreground">{crumb.detail}</span>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden gap-1.5 lg:inline-flex">
              <a href={SITE_URL} target="_blank" rel="noopener noreferrer">
                View site <ExternalLink className="!size-3.5" aria-hidden="true" />
              </a>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5 pl-3.5">
                  <Plus aria-hidden="true" /> New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {createActions.map((action) => (
                  <DropdownMenuItem key={action.path} onSelect={() => navigate(action.path)} className="gap-2.5">
                    <action.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {action.noun}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Avatar initials={initials} className="h-9 w-9" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm text-foreground">{userName}</p>
                  <p className="truncate font-mono text-[12px] text-muted-foreground">{userEmail}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="gap-2.5">
                  <a href={SITE_URL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> View site
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/logs')} className="gap-2.5">
                  <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Activity log
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut} className="gap-2.5 text-danger-fg focus:text-danger-fg">
                  <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2.5 border-b border-border-subtle bg-background/90 px-4 backdrop-blur-md md:hidden">
          <Link to="/dashboard" aria-label="Dashboard">
            <BrandAppIcon className="h-8 w-8" />
          </Link>
          <p className="min-w-0 flex-1 truncate text-[17px] font-medium tracking-[-0.01em]">
            {crumb.detail ? `${crumb.page} · ${crumb.detail}` : crumb.page}
          </p>
          <button
            type="button"
            onClick={openCommandMenu}
            aria-label="Search"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-fg-2"
          >
            <Search className="h-4 w-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Account menu" className="rounded-full">
                <Avatar initials={initials} className="h-9 w-9" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm text-foreground">{userName}</p>
                <p className="truncate font-mono text-[12px] text-muted-foreground">{userEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut} className="gap-2.5 text-danger-fg focus:text-danger-fg">
                <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-0">
          <div className="mx-auto w-full max-w-[1320px] px-4 py-5 sm:px-6 md:px-8 md:py-9">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav
        aria-label="Primary"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-card/90 backdrop-blur-md md:hidden"
      >
        <div className="mx-auto flex h-[68px] max-w-md items-start justify-between px-3 pt-2">
          <TabLink to="/dashboard" label="Home" icon={LayoutGrid} active={isHome} />
          <TabLink to="/projects" label="Content" icon={Layers} active={isContent} />
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            aria-label="Create"
            className="-mt-3 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent text-accent-foreground shadow-ember transition-colors active:bg-accent-hover"
          >
            <Plus className="h-[22px] w-[22px]" strokeWidth={2} />
          </button>
          <TabLink to="/messages" label="Inbox" icon={Inbox} active={isInbox} badge={unread} />
          <TabLink to="/more" label="More" icon={MoreHorizontal} active={isMore} />
        </div>
      </nav>

      {/* Mobile create sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl border-t border-border px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-3" aria-hidden="true" />
          <SheetTitle className="mb-4 text-h2">Create</SheetTitle>
          <div className="grid grid-cols-2 gap-2">
            {createActions.map((action) => (
              <button
                key={action.path}
                type="button"
                onClick={() => { setCreateOpen(false); navigate(action.path); }}
                className="flex flex-col items-start gap-3 rounded-xl bg-secondary p-4 text-left text-sm text-foreground transition-colors active:bg-surface-3"
              >
                <action.icon className="h-4 w-4 text-fg-2" aria-hidden="true" />
                {action.noun}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminLayout;
