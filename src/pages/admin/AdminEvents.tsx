import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Event } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Search, Calendar, Trash2, Images, X, EyeOff } from 'lucide-react';
import { EVENT_MIN_WORDS, eventWordCount, isEventIndexable } from '@/shared/lib/indexing';
import { toast } from "sonner";
import PageHeader from '@/components/admin/PageHeader';
import { useCreateIntent } from '@/components/admin/useAdminOverview';
import { useIsDesktop } from '@/components/admin/useIsDesktop';
import { cn, plural } from '@/shared/lib/utils';
import { byEventDateDesc, eventDateLabel, parseEventDate } from '@/shared/lib/eventDates';
import EmptyState from '@/components/admin/EmptyState';
import MultiImageUpload from '@/components/admin/MultiImageUpload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Schema ───────────────────────────────────────────────────────────────────
const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  organizer: z.string().min(1, 'Organizer is required'),
  role: z.string().min(1, 'Your role is required'),
  type: z.string().min(1, 'Event type is required'),
  date: z.string().min(1, 'Date is required'),
  location: z.string().min(1, 'Location is required'),
  attendees: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  highlights: z.array(z.string()).optional(),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  images: z.array(z.string()).min(1, 'At least one image is required'),
  imageCaptions: z.array(z.string()).optional(),
  seo_visibility: z.enum(['auto', 'index', 'noindex']).optional(),
});

const VISIBILITY_OPTIONS = [
  { value: 'auto', label: `Auto (index at ${EVENT_MIN_WORDS}+ words)` },
  { value: 'index', label: 'Always index' },
  { value: 'noindex', label: 'Hide from search' },
] as const;

/** Live explanation of what search engines will do with this event as written. */
function visibilityHint(visibility: string | undefined, words: number) {
  if (visibility === 'index') return 'Always indexed, even with a short write-up.';
  if (visibility === 'noindex') return 'Hidden from Google and the sitemap. Still visible on your site.';
  return words >= EVENT_MIN_WORDS
    ? `Indexed by Google · ${words} words.`
    : `Hidden from Google · ${words} of ${EVENT_MIN_WORDS} words. Expand the description or highlights to get it indexed.`;
}

type EventFormData = z.infer<typeof eventSchema>;

const ROLE_OPTIONS = ['Speaker', 'Host', 'Compere', 'Organizer', 'Panelist', 'Attendee'];
const TYPE_OPTIONS = ['Conference', 'Summit', 'Workshop', 'Hackathon', 'Networking', 'Seminar', 'Webinar', 'Other'];

const photosOf = (ev: Event) => (ev.images?.length ? ev.images : ev.image ? [ev.image] : []);

/** Mono pill used for the role filters and the role picker (Figma: Tag, Default / Accent). */
const chip = (active: boolean) =>
  cn(
    'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 font-mono text-label uppercase transition-colors',
    active
      ? 'border-transparent bg-accent-subtle text-accent'
      : 'border-border text-fg-2 hover:border-border-strong hover:text-foreground',
  );

// ─── Edit drawer ──────────────────────────────────────────────────────────────
interface EventDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onSubmit: (data: EventFormData) => Promise<void>;
  onDelete: (event: Event) => void;
}

const toFormValues = (ev: Event | null): Partial<EventFormData> =>
  ev
    ? {
        title: ev.title,
        organizer: ev.organizer,
        role: ev.role ?? '',
        type: ev.type ?? '',
        date: ev.date,
        location: ev.location,
        attendees: ev.attendees ?? '',
        description: ev.description,
        highlights: ev.highlights ?? [],
        link: ev.link ?? '',
        images: photosOf(ev),
        imageCaptions: ev.imageCaptions ?? [],
        seo_visibility: ev.seo_visibility ?? 'auto',
      }
    : { images: [], imageCaptions: [], highlights: [], seo_visibility: 'auto' };

function EventDrawer({ isOpen, onClose, event, onSubmit, onDelete }: EventDrawerProps) {
  const isDesktop = useIsDesktop();
  const [newHighlight, setNewHighlight] = useState('');
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: toFormValues(event),
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ images: [], imageCaptions: [], highlights: [], ...toFormValues(event) });
      setNewHighlight('');
    }
  }, [isOpen, event, form]);

  const highlights = form.watch('highlights') ?? [];
  const writeUpWords = eventWordCount({ description: form.watch('description'), highlights });

  const addHighlight = () => {
    const val = newHighlight.trim();
    if (!val) return;
    form.setValue('highlights', [...highlights, val]);
    setNewHighlight('');
  };

  const handleSubmit = async (data: EventFormData) => {
    try {
      await onSubmit(data);
      onClose();
    } catch {
      // onSubmit already toasted; keep the drawer open with the user's edits.
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className={cn(
          'flex flex-col gap-0 p-0',
          isDesktop ? 'w-full border-l sm:max-w-[480px]' : 'max-h-[92dvh] rounded-t-2xl border-t',
        )}
      >
        {!isDesktop && <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-surface-3" aria-hidden="true" />}
        <div className="shrink-0 border-b border-border-subtle px-6 pb-5 pt-6 pr-16">
          <SheetTitle>{event ? 'Edit event' : 'New event'}</SheetTitle>
          <SheetDescription className="meta mt-1 truncate">
            {event?.slug ? `saadmaz.com/events/${event.slug}` : 'Fill in the details and save.'}
          </SheetDescription>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. 48th Big Debate" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="organizer" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organizer</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Isipathana College" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Your role</FormLabel>
                  <div role="radiogroup" aria-label="Your role" className="flex flex-wrap gap-1.5">
                    {ROLE_OPTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={field.value === r}
                        onClick={() => field.onChange(r)}
                        className={chip(field.value === r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input {...field} placeholder="Apr 27, 2022" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input {...field} placeholder="Colombo" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="attendees" render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel>Attendees</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} placeholder="500+" /></FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="images" render={({ field }) => (
                <FormItem>
                  <FormLabel>Photos</FormLabel>
                  <MultiImageUpload
                    value={field.value ?? []}
                    onChange={(urls) => form.setValue('images', urls, { shouldValidate: true })}
                    maxImages={20}
                    folder="events"
                    firstIsCover
                    nameHint={form.watch('title')}
                    captions={form.watch('imageCaptions')}
                    onCaptionsChange={(caps) => form.setValue('imageCaptions', caps)}
                    captionHint="Leave blank to auto-generate from your name, role, the event title, organizer and location."
                  />
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Shown on the event page…" className="min-h-[120px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="space-y-2">
                <p className="label">Highlights</p>
                {highlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 rounded-[10px] border border-border-subtle bg-secondary px-3 py-2.5 text-sm text-foreground"
                  >
                    <span className="flex-1">{h}</span>
                    <button
                      type="button"
                      aria-label={`Remove "${h}"`}
                      onClick={() => form.setValue('highlights', highlights.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground transition-colors hover:text-danger-fg"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHighlight(); } }}
                    placeholder="Add a highlight and press Enter"
                    aria-label="New highlight"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addHighlight} aria-label="Add highlight">
                    <Plus />
                  </Button>
                </div>
              </div>

              <FormField control={form.control} name="link" render={({ field }) => (
                <FormItem>
                  <FormLabel>Event link</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} placeholder="https://…" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="seo_visibility" render={({ field }) => (
                <FormItem>
                  <FormLabel>Search visibility</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? 'auto'}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VISIBILITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="meta" aria-live="polite">{visibilityHint(field.value, writeUpWords)}</p>
                </FormItem>
              )} />
            </div>

            <div className="flex shrink-0 items-center gap-2 border-t border-border-subtle px-6 py-4 pb-[calc(16px+env(safe-area-inset-bottom))] md:pb-4">
              {event && (
                <Button type="button" variant="destructive-ghost" size="sm" onClick={() => onDelete(event)} className="-ml-2 px-2.5">
                  <Trash2 aria-hidden="true" /> Delete event
                </Button>
              )}
              <div className="ml-auto flex flex-1 gap-2 md:flex-none">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1 md:flex-none">
                  Cancel
                </Button>
                <Button type="submit" loading={form.formState.isSubmitting} className="flex-1 md:flex-none">
                  Save changes
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
// No-photo cover from Figma (Events · Admin Desktop): warm graphite with an ember glow.
const PLACEHOLDER_COVER = {
  backgroundImage:
    'radial-gradient(50% 31% at 60% 62%, rgba(255,158,102,0.35), rgba(255,158,102,0)), linear-gradient(180deg, #33302E 0%, #1C1C1F 100%)',
};

function EventCard({ event, onOpen }: { event: Event; onOpen: () => void }) {
  const photos = photosOf(event);
  const { year } = parseEventDate(event.date);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-[14px] border border-border-subtle bg-card text-left transition-colors hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative h-[130px] w-full overflow-hidden" style={photos.length ? undefined : PLACEHOLDER_COVER}>
        {photos.length > 0 ? (
          <img
            src={photos[0]}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          year && (
            <span
              aria-hidden="true"
              className="absolute -bottom-3 right-3 text-[64px] font-medium leading-none tracking-[-0.05em] text-foreground/[0.07]"
            >
              {year}
            </span>
          )
        )}
        {event.role && (
          <span className="absolute left-3 top-3 rounded-full bg-[rgba(26,26,28,0.7)] px-2.5 py-1 font-mono text-label uppercase text-foreground backdrop-blur-sm">
            {event.role}
          </span>
        )}
        {!isEventIndexable(event) && (
          <span
            title="Not indexed by search engines (open to see why)"
            className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[rgba(26,26,28,0.7)] px-2 py-1 font-mono text-label uppercase text-fg-2 backdrop-blur-sm"
          >
            <EyeOff className="h-3 w-3" aria-hidden="true" /> Hidden
          </span>
        )}
        {photos.length > 1 && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-[rgba(26,26,28,0.7)] px-2 py-1 font-mono text-label text-foreground backdrop-blur-sm">
            <Images className="h-3 w-3" aria-hidden="true" /> {photos.length}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 p-[14px]">
        <p className="line-clamp-2 min-h-[42px] text-sm leading-normal text-foreground transition-colors group-hover:text-accent">
          {event.title}
        </p>
        <p className="meta truncate" title={[event.organizer, event.location].filter(Boolean).join(' · ')}>
          {[event.organizer, eventDateLabel(event.date)].filter(Boolean).join(' · ')}
        </p>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getEvents();
      setEvents([...data].sort(byEventDateDesc));
    } catch {
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => { setCurrentEvent(null); setIsDrawerOpen(true); };
  useCreateIntent(handleAdd);
  const handleEdit = (event: Event) => { setCurrentEvent(event); setIsDrawerOpen(true); };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteEvent(deleteTarget.id);
      toast.success('Event deleted');
      setIsDrawerOpen(false);
      fetchEvents();
    } catch { toast.error('Delete failed'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: EventFormData) => {
    try {
      // One caption per photo, in photo order; blanks get generated alt text on the site.
      const imageCaptions = data.images.map((_, i) => data.imageCaptions?.[i]?.trim() ?? '');
      const payload = { ...data, imageCaptions, image: data.images[0] ?? '' };
      if (currentEvent) {
        await CommonService.updateEvent(currentEvent.id, payload);
        toast.success('Event updated');
      } else {
        await CommonService.createEvent(payload);
        toast.success('Event created');
      }
      fetchEvents();
    } catch {
      toast.error('Failed to save event');
      throw new Error('Save failed');
    }
  };

  // Roles actually in use, most common first, for the filter chips and header.
  const roleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) if (e.role) counts.set(e.role, (counts.get(e.role) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [events]);

  const groups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matches = events.filter(
      (e) =>
        (!roleFilter || e.role === roleFilter) &&
        (!q || [e.title, e.organizer, e.location].some((v) => v?.toLowerCase().includes(q))),
    );
    // events are already newest-first, so years come out in order.
    const byYear = new Map<string, Event[]>();
    for (const e of matches) {
      const key = String(parseEventDate(e.date).year ?? 'Undated');
      byYear.set(key, [...(byYear.get(key) ?? []), e]);
    }
    return [...byYear];
  }, [events, searchQuery, roleFilter]);

  const isFiltered = !!searchQuery.trim() || !!roleFilter;
  const subtitle = [
    plural(events.length, 'event'),
    ...roleCounts.slice(0, 2).map(([role, n]) => `${n} as ${role.toLowerCase()}`),
  ].join(' · ');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        subtitle={subtitle}
        actions={
          <Button onClick={handleAdd} variant="primary">
            <Plus className="w-4 h-4" /> New event
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={`Search ${plural(events.length, 'event')}…`}
            aria-label="Search events"
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <button type="button" aria-pressed={!roleFilter} onClick={() => setRoleFilter(null)} className={chip(!roleFilter)}>
            All <span className="tabular">{events.length}</span>
          </button>
          {roleCounts.map(([role, n]) => (
            <button
              key={role}
              type="button"
              aria-pressed={roleFilter === role}
              onClick={() => setRoleFilter(roleFilter === role ? null : role)}
              className={chip(roleFilter === role)}
            >
              {role} <span className="tabular">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid, grouped by year */}
      {isLoading && !isDrawerOpen ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-[214px] animate-pulse rounded-[14px] border border-border-subtle bg-secondary" />
          ))}
        </div>
      ) : groups.length > 0 ? (
        <div className="space-y-10">
          {groups.map(([year, list]) => (
            <section key={year} aria-label={`${year}, ${plural(list.length, 'event')}`}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="label text-fg-2">{year}</h2>
                <span className="meta tabular">{list.length}</span>
                <div className="h-px flex-1 bg-border-subtle" aria-hidden="true" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((event) => (
                  <EventCard key={event.id} event={event} onOpen={() => handleEdit(event)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title={isFiltered ? 'No events match' : 'No events yet'}
          description={isFiltered ? 'Try a different search or role.' : 'Add your first event to get started.'}
          action={!isFiltered ? { label: 'Add event', onClick: handleAdd } : undefined}
          secondaryAction={
            isFiltered ? { label: 'Clear filters', onClick: () => { setSearchQuery(''); setRoleFilter(null); } } : undefined
          }
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete event?"
        description={`"${deleteTarget?.title}" will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
      />

      <EventDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        event={currentEvent}
        onSubmit={handleSubmit}
        onDelete={setDeleteTarget}
      />
    </div>
  );
};

export default AdminEvents;
