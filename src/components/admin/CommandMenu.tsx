import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpDown, BadgeCheck, BookOpen, CalendarDays, Code2, CornerDownLeft, ExternalLink, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { allNavItems, createActions, OPEN_COMMAND_EVENT, SITE_URL } from './navConfig';
import { useAdminOverview } from './useAdminOverview';

interface ContentHit {
  id: string;
  icon: LucideIcon;
  title: string;
  meta: string;
  path: string;
}

const IconTile = ({ icon: Icon, accent }: { icon: LucideIcon; accent?: boolean }) => (
  <span
    className={
      accent
        ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent'
        : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground group-data-[selected=true]:bg-surface-3'
    }
  >
    <Icon className="h-4 w-4" aria-hidden="true" />
  </span>
);

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-secondary px-1.5 font-mono text-[12px] text-fg-2">
    {children}
  </kbd>
);

/** Global ⌘K palette: search content, create anything, jump anywhere. */
const CommandMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { data } = useAdminOverview();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    document.addEventListener(OPEN_COMMAND_EVENT, onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener(OPEN_COMMAND_EVENT, onOpen);
    };
  }, []);

  useEffect(() => { if (!open) setSearch(''); }, [open]);

  const content = useMemo<ContentHit[]>(() => {
    if (!data) return [];
    return [
      ...data.projects.map((p) => ({
        id: `project-${p.id}`, icon: Code2, title: p.title,
        meta: `Project · ${p.published === false ? 'Hidden' : 'Published'}`, path: `/projects/${p.id}`,
      })),
      ...data.blogs.map((b) => ({
        id: `blog-${b.id}`, icon: BookOpen, title: b.title,
        meta: `Blog · ${b.published ? 'Published' : 'Draft'}`, path: `/blogs/${b.id}`,
      })),
      ...data.events.map((e) => ({
        id: `event-${e.id}`, icon: CalendarDays, title: e.title,
        meta: ['Event', e.date].filter(Boolean).join(' · '), path: '/events',
      })),
      ...data.certificates.map((c) => ({
        id: `cert-${c.id}`, icon: BadgeCheck, title: c.title,
        meta: ['Certificate', c.issuer].filter(Boolean).join(' · '), path: `/certificates/${c.id}`,
      })),
    ];
  }, [data]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const unread = data?.counts.unread ?? 0;
  const query = search.trim();

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      footer={
        <div className="hidden items-center gap-5 border-t border-border px-4 py-3 font-mono text-[13px] text-muted-foreground sm:flex">
          <span className="flex items-center gap-2"><Kbd><ArrowUpDown className="h-3 w-3" /></Kbd>Navigate</span>
          <span className="flex items-center gap-2"><Kbd><CornerDownLeft className="h-3 w-3" /></Kbd>Open</span>
          <span className="flex items-center gap-2"><Kbd>esc</Kbd>Close</span>
        </div>
      }
    >
      <CommandInput
        placeholder="Search content, create, or jump to…"
        value={search}
        onValueChange={setSearch}
        trailing={<span className="hidden sm:inline-flex"><Kbd>esc</Kbd></span>}
      />
      <CommandList>
        <CommandEmpty>Nothing matches “{query}”.</CommandEmpty>

        {query.length > 1 && (
          <CommandGroup heading="Content">
            {content.map((hit) => (
              <CommandItem key={hit.id} value={`${hit.title} ${hit.id}`} onSelect={() => go(hit.path)}>
                <IconTile icon={hit.icon} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{hit.title}</span>
                  <span className="block truncate font-mono text-[13px] text-muted-foreground">{hit.meta}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100" aria-hidden="true" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Create">
          {createActions.map((action) => (
            <CommandItem key={action.path} value={`${action.label} create add`} onSelect={() => go(action.path)}>
              <IconTile icon={Plus} />
              <span className="flex-1">{action.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Go to">
          {allNavItems.map((item) => (
            <CommandItem key={item.path} value={`${item.label} ${item.group} go`} onSelect={() => go(item.path)}>
              <IconTile icon={item.icon} />
              <span className="min-w-0 flex-1">
                <span className="block">{item.label}</span>
                {item.badge && unread > 0 && (
                  <span className="block font-mono text-[13px] text-muted-foreground">{unread} unread</span>
                )}
              </span>
              {item.countKey && !item.badge && data?.counts[item.countKey] !== undefined && (
                <CommandShortcut className="border-0 bg-transparent tracking-normal text-muted-foreground">
                  {data.counts[item.countKey]}
                </CommandShortcut>
              )}
            </CommandItem>
          ))}
          <CommandItem
            value="open saadmaz.com view site"
            onSelect={() => { setOpen(false); window.open(SITE_URL, '_blank', 'noopener,noreferrer'); }}
          >
            <IconTile icon={ExternalLink} />
            <span className="flex-1">Open saadmaz.com</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandMenu;
