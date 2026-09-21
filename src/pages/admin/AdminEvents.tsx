import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CommonService } from '@/shared/services/common-service';
import { Event } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Calendar, MapPin, Edit2, Trash2, Globe, Loader2, Images, X } from 'lucide-react';
import { toast } from "sonner";
import BackButton from '@/components/admin/BackButton';
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
});

type EventFormData = z.infer<typeof eventSchema>;

const ROLE_OPTIONS = ['Speaker', 'Host', 'Compere', 'Organizer', 'Panelist', 'Attendee'];
const TYPE_OPTIONS = ['Conference', 'Summit', 'Workshop', 'Hackathon', 'Networking', 'Seminar', 'Webinar', 'Other'];

// shared input class helper
const inp = 'bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-accent/40 outline-none w-full';
const sel = 'bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent outline-none w-full';
const lbl = 'text-[10px] font-black uppercase tracking-widest text-muted-foreground';

// ─── Event Form Dialog ────────────────────────────────────────────────────────
interface EventFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  defaultValues?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => Promise<void>;
}

function EventFormDialog({ isOpen, onClose, title, defaultValues, onSubmit }: EventFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: { images: [], highlights: [], ...defaultValues },
  });

  const images = watch('images') ?? [];
  const highlights = watch('highlights') ?? [];
  const [newHighlight, setNewHighlight] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      reset({ images: [], highlights: [], ...defaultValues });
      setNewHighlight('');
    }
  }, [isOpen, defaultValues, reset]);

  const addHighlight = () => {
    const val = newHighlight.trim();
    if (!val) return;
    setValue('highlights', [...highlights, val]);
    setNewHighlight('');
  };

  const removeHighlight = (i: number) =>
    setValue('highlights', highlights.filter((_, idx) => idx !== i));

  const handleFormSubmit = async (data: EventFormData) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[680px] bg-card border-border text-foreground max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-foreground" style={{ fontFamily: 'DM Sans' }}>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 py-2">

          {/* ── IMAGES ── */}
          <div className="space-y-1.5">
            <label className={`${lbl} flex items-center gap-1.5`}>
              <Images className="w-3 h-3" /> Event Photos (16:9) <span className="text-red-400">*</span>
            </label>
            <MultiImageUpload
              value={images}
              onChange={(urls) => setValue('images', urls, { shouldValidate: true })}
              maxImages={20}
              folder="events"
            />
            {errors.images && (
              <p className="text-[11px] text-red-400 font-medium">{errors.images.message as string}</p>
            )}
          </div>

          {/* ── TITLE ── */}
          <div className="space-y-1">
            <label className={lbl}>Event Title *</label>
            <input {...register('title')} placeholder="e.g. Google I/O 2024" className={inp} />
            {errors.title && <p className="text-[11px] text-red-400">{errors.title.message}</p>}
          </div>

          {/* ── ROLE + TYPE ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={lbl}>Your Role * <span className="text-white/60 normal-case font-normal">(how you participated)</span></label>
              <Select value={watch('role')} onValueChange={(v) => setValue('role', v, { shouldValidate: true })}>
                <SelectTrigger className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent outline-none w-full h-auto">
                  <SelectValue placeholder="Select role…" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  {ROLE_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-[11px] text-red-400">{errors.role.message}</p>}
            </div>
            <div className="space-y-1">
              <label className={lbl}>Event Type * <span className="text-white/60 normal-case font-normal">(category)</span></label>
              <Select value={watch('type')} onValueChange={(v) => setValue('type', v, { shouldValidate: true })}>
                <SelectTrigger className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent outline-none w-full h-auto">
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  {TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-[11px] text-red-400">{errors.type.message}</p>}
            </div>
          </div>

          {/* ── ORGANIZER + ATTENDEES ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={lbl}>Organizer *</label>
              <input {...register('organizer')} placeholder="e.g. Google" className={inp} />
              {errors.organizer && <p className="text-[11px] text-red-400">{errors.organizer.message}</p>}
            </div>
            <div className="space-y-1">
              <label className={lbl}>Attendees <span className="text-white/60 normal-case font-normal">(optional)</span></label>
              <input {...register('attendees')} placeholder='e.g. 500+, 2,000+' className={inp} />
            </div>
          </div>

          {/* ── DATE + LOCATION ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={lbl}>Date *</label>
              <input {...register('date')} placeholder="e.g. May 14, 2024" className={inp} />
              {errors.date && <p className="text-[11px] text-red-400">{errors.date.message}</p>}
            </div>
            <div className="space-y-1">
              <label className={lbl}>Location *</label>
              <input {...register('location')} placeholder="e.g. Mountain View, CA or Online" className={inp} />
              {errors.location && <p className="text-[11px] text-red-400">{errors.location.message}</p>}
            </div>
          </div>

          {/* ── DESCRIPTION ── */}
          <div className="space-y-1">
            <label className={lbl}>Description / About This Event *</label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Full description shown on the event detail page…"
              className={`${inp} resize-none`}
            />
            {errors.description && <p className="text-[11px] text-red-400">{errors.description.message}</p>}
          </div>

          {/* ── HIGHLIGHTS ── */}
          <div className="space-y-2">
            <label className={lbl}>Highlights <span className="text-white/60 normal-case font-normal">(bullet points on detail page)</span></label>
            {highlights.length > 0 && (
              <ul className="space-y-1.5">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <span className="flex-1">{h}</span>
                    <button type="button" onClick={() => removeHighlight(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                value={newHighlight}
                onChange={(e) => setNewHighlight(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHighlight(); } }}
                placeholder="e.g. 45-minute keynote presentation"
                className={inp}
              />
              <button
                type="button"
                onClick={addHighlight}
                className="shrink-0 h-[38px] px-3 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── LINK ── */}
          <div className="space-y-1">
            <label className={lbl}>Event Link <span className="text-white/60 normal-case font-normal">(optional)</span></label>
            <input {...register('link')} placeholder="https://..." className={inp} />
            {errors.link && <p className="text-[11px] text-red-400">{errors.link.message}</p>}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-secondary text-muted-foreground">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-accent hover:bg-accent/90 text-black font-black px-8">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await CommonService.getEvents();
      setEvents(data);
    } catch {
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => { setCurrentEvent(null); setIsDialogOpen(true); };
  const handleEdit = (event: Event) => { setCurrentEvent(event); setIsDialogOpen(true); };
  const handleDelete = (id: string, label: string) => setDeleteTarget({ id, label });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CommonService.deleteEvent(deleteTarget.id);
      toast.success('Event deleted');
      fetchEvents();
    } catch { toast.error('Delete failed'); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (data: EventFormData) => {
    try {
      const payload = { ...data, image: data.images[0] ?? '' };
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

  const getDefaultValues = (ev: Event | null): Partial<EventFormData> => {
    if (!ev) return { images: [], highlights: [] };
    const imgs = ev.images && ev.images.length > 0
      ? ev.images
      : ev.image ? [ev.image] : [];
    return {
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
      images: imgs,
    };
  };

  const filteredEvents = events.filter(e =>
    e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.organizer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const thumb = (ev: Event) =>
    (ev.images && ev.images.length > 0) ? ev.images[0] : (ev.image ?? null);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-start gap-3">
          <BackButton to="/dashboard" className="mt-1 flex-shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-accent mb-3">SCHEDULE</p>
            <h1 className="text-4xl font-black tracking-tight mb-2 text-foreground" style={{ fontFamily: 'DM Sans' }}>
              Events
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Manage past and upcoming events, workshops, and speaking engagements.
            </p>
          </div>
        </div>
        <Button onClick={handleAdd} className="bg-accent hover:bg-accent/90 text-black font-black h-11 px-6 rounded-lg flex-shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Add Event
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search events..."
            className="w-full bg-secondary border border-border rounded-lg pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-accent outline-none transition-all text-foreground placeholder:text-muted-foreground font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="grid gap-3">
        {isLoading && !isDialogOpen ? (
          [1, 2].map(i => (
            <div key={i} className="h-28 w-full bg-secondary border border-border rounded-lg animate-pulse" />
          ))
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map((event) => {
            const imgCount = (event.images?.length ?? 0) || (event.image ? 1 : 0);
            return (
              <Card key={event.id} className="bg-card border-border shadow-sm hover:border-accent/30 hover:bg-secondary transition-all group rounded-lg overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Thumbnail */}
                    {thumb(event) ? (
                      <div className="w-24 flex-shrink-0 overflow-hidden">
                        <img src={thumb(event)!} alt={event.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 flex-shrink-0 flex items-center justify-center bg-accent/5">
                        <Globe className="w-6 h-6 text-accent/40" />
                      </div>
                    )}

                    <div className="flex-1 p-5 flex items-center gap-5 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-foreground text-base group-hover:text-accent transition-colors truncate" style={{ fontFamily: 'DM Sans' }}>
                            {event.title}
                          </h3>
                          {event.role && (
                            <span className="shrink-0 text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                              {event.role}
                            </span>
                          )}
                          {imgCount > 0 && (
                            <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded">
                              <Images className="w-3 h-3" />{imgCount}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground font-semibold text-sm">{event.organizer} • {event.type}</p>
                        <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground font-medium mt-1.5">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-accent/60" /> {event.date}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-accent/60" /> {event.location}
                          </span>
                          {event.attendees && (
                            <span className="text-muted-foreground">{event.attendees} attendees</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(event)} className="h-9 w-9 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id, event.title)} className="h-9 w-9 hover:bg-red-500/10 text-red-400 hover:text-red-500 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="rounded-lg border border-border bg-card shadow-sm p-12 text-center">
            <h3 className="text-lg font-black text-muted-foreground" style={{ fontFamily: 'DM Sans' }}>No events found</h3>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              {searchQuery ? 'Try a different search.' : 'Add your first event to get started.'}
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Event?"
        description={`"${deleteTarget?.label}" will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
      />

      <EventFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={currentEvent ? 'Edit Event' : 'Add New Event'}
        defaultValues={getDefaultValues(currentEvent)}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default AdminEvents;
