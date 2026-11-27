import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isValid, parse,
  startOfMonth, startOfWeek,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/*
 * Themed replacements for <input type="datetime-local"> and <input type="month">.
 * Native pickers open browser-drawn popups that ignore the CMS theme.
 * Values keep the native string formats ("yyyy-MM-ddTHH:mm" and "yyyy-MM"),
 * so callers and stored data are unchanged.
 */

const LOCAL_FMT = "yyyy-MM-dd'T'HH:mm";
const MONTH_FMT = 'yyyy-MM';
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const TRIGGER_CLS =
  'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-2.5 text-left text-[13px] text-foreground transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
const NAV_CLS =
  'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground';
const FOOT_CLS = 'rounded-md px-2 py-1 text-[12px] font-medium text-accent hover:bg-accent-subtle';

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

function Popover({ open, children, align = 'left' }: { open: boolean; children: ReactNode; align?: 'left' | 'right' }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      className={cn(
        'absolute top-full z-50 mt-1.5 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl',
        align === 'right' ? 'right-0' : 'left-0',
      )}
    >
      {children}
    </div>
  );
}

function parseLocal(value: string): Date | null {
  if (!value) return null;
  const d = parse(value, LOCAL_FMT, new Date());
  return isValid(d) ? d : null;
}

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  'aria-label'?: string;
  placeholder?: string;
  className?: string;
}

/** Date and time, as "yyyy-MM-ddTHH:mm" (the datetime-local format). */
export function DateTimePicker({ value, onChange, placeholder = 'Pick date and time', className, ...rest }: DateTimePickerProps) {
  const selected = parseLocal(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startOfMonth(selected ?? new Date()));
  const ref = useDismiss(open, () => setOpen(false));

  const base = selected ?? (() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; })();
  const emit = (d: Date) => onChange(format(d, LOCAL_FMT));
  const withTime = (day: Date, h = base.getHours(), m = base.getMinutes()) => {
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const hours12 = base.getHours() % 12 || 12;
  const pm = base.getHours() >= 12;
  const setTime = (h12: number, minute: number, isPm: boolean) =>
    emit(withTime(base, (h12 % 12) + (isPm ? 12 : 0), minute));

  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(view)), end: endOfWeek(endOfMonth(view)) });
  const today = new Date();

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={rest['aria-label']}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => { setView(startOfMonth(selected ?? new Date())); setOpen((o) => !o); }}
        className={TRIGGER_CLS}
      >
        <span className={cn('truncate tabular', !selected && 'text-muted-foreground')}>
          {selected ? format(selected, 'd MMM yyyy, h:mm a') : placeholder}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      <Popover open={open}>
        <div className="flex gap-3">
          <div className="w-[236px]">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" className={NAV_CLS} onClick={() => setView(addMonths(view, -1))} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[13px] font-semibold">{format(view, 'MMMM yyyy')}</span>
              <button type="button" className={NAV_CLS} onClick={() => setView(addMonths(view, 1))} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS.map((d) => (
                <span key={d} className="py-1 text-[11px] font-medium text-muted-foreground">{d}</span>
              ))}
              {days.map((day) => {
                const isSel = selected && isSameDay(day, selected);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => emit(withTime(day))}
                    className={cn(
                      'h-8 rounded-md text-[12.5px] tabular transition-colors',
                      isSel
                        ? 'bg-accent font-semibold text-accent-foreground'
                        : isSameDay(day, today)
                          ? 'text-accent ring-1 ring-inset ring-accent/50 hover:bg-accent-subtle'
                          : 'hover:bg-secondary',
                      !isSameMonth(day, view) && !isSel && 'text-muted-foreground/50',
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-l border-border-subtle pl-3">
            <span className="text-[11px] font-medium text-muted-foreground">Time</span>
            <TimeColumn
              label="Hour"
              items={Array.from({ length: 12 }, (_, i) => i + 1)}
              value={hours12}
              onPick={(h) => setTime(h, base.getMinutes(), pm)}
            />
            <TimeColumn
              label="Minute"
              items={MINUTES}
              value={base.getMinutes() - (base.getMinutes() % 5)}
              onPick={(m) => setTime(hours12, m, pm)}
              pad
            />
            <div className="grid grid-cols-2 gap-1">
              {[false, true].map((isPm) => (
                <button
                  key={String(isPm)}
                  type="button"
                  onClick={() => setTime(hours12, base.getMinutes(), isPm)}
                  className={cn(
                    'h-7 rounded-md text-[12px] font-medium',
                    pm === isPm ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground',
                  )}
                >
                  {isPm ? 'PM' : 'AM'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-2">
          <button type="button" className={FOOT_CLS} onClick={() => { onChange(''); setOpen(false); }}>Clear</button>
          <div className="flex gap-1">
            <button type="button" className={FOOT_CLS} onClick={() => { const n = new Date(); setView(startOfMonth(n)); emit(withTime(n)); }}>Today</button>
            <button type="button" className={cn(FOOT_CLS, 'bg-accent text-accent-foreground hover:bg-accent-hover')} onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      </Popover>
    </div>
  );
}

function TimeColumn({ label, items, value, onPick, pad }: {
  label: string; items: number[]; value: number; onPick: (n: number) => void; pad?: boolean;
}) {
  return (
    <div role="listbox" aria-label={label} className="grid h-[104px] w-[104px] grid-cols-4 gap-0.5 overflow-y-auto">
      {items.map((n) => (
        <button
          key={n}
          type="button"
          role="option"
          aria-selected={n === value}
          onClick={() => onPick(n)}
          className={cn(
            'h-6 rounded text-[12px] tabular',
            n === value ? 'bg-accent font-semibold text-accent-foreground' : 'hover:bg-secondary',
          )}
        >
          {pad ? String(n).padStart(2, '0') : n}
        </button>
      ))}
    </div>
  );
}

interface MonthPickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/** A month, as "yyyy-MM" (the <input type="month"> format). */
export function MonthPicker({ id, value, onChange, disabled, placeholder = 'Pick a month', className }: MonthPickerProps) {
  const parsed = value ? parse(value, MONTH_FMT, new Date()) : null;
  const selected = parsed && isValid(parsed) ? parsed : null;
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => (selected ?? new Date()).getFullYear());
  const ref = useDismiss(open, () => setOpen(false));
  const now = new Date();

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => { setYear((selected ?? new Date()).getFullYear()); setOpen((o) => !o); }}
        className={cn(TRIGGER_CLS, 'h-10 rounded-md px-3 text-sm')}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? format(selected, 'MMMM yyyy') : placeholder}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      <Popover open={open}>
        <div className="w-[228px]">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className={NAV_CLS} onClick={() => setYear(year - 1)} aria-label="Previous year">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[13px] font-semibold tabular">{year}</span>
            <button type="button" className={NAV_CLS} onClick={() => setYear(year + 1)} aria-label="Next year">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, m) => new Date(year, m, 1)).map((d) => {
              const isSel = selected && isSameMonth(d, selected);
              return (
                <button
                  key={d.getMonth()}
                  type="button"
                  onClick={() => { onChange(format(d, MONTH_FMT)); setOpen(false); }}
                  className={cn(
                    'h-8 rounded-md text-[12.5px] transition-colors',
                    isSel
                      ? 'bg-accent font-semibold text-accent-foreground'
                      : isSameMonth(d, now)
                        ? 'text-accent ring-1 ring-inset ring-accent/50 hover:bg-accent-subtle'
                        : 'hover:bg-secondary',
                  )}
                >
                  {format(d, 'MMM')}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex justify-between border-t border-border-subtle pt-2">
            <button type="button" className={FOOT_CLS} onClick={() => { onChange(''); setOpen(false); }}>Clear</button>
            <button type="button" className={FOOT_CLS} onClick={() => { onChange(format(now, MONTH_FMT)); setOpen(false); }}>This month</button>
          </div>
        </div>
      </Popover>
    </div>
  );
}
