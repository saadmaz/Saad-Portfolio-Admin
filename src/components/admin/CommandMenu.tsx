import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { navGroups } from './navConfig';

/**
 * Global ⌘K / Ctrl+K jump-to-anything palette. Sources its item list from
 * navConfig.ts — the same data the sidebar renders — so it always covers
 * every route without a second list to maintain.
 */
const CommandMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to a page…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {navGroups.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem
                key={item.path}
                value={item.label}
                onSelect={() => go(item.path)}
              >
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandMenu;
