import React, { useId } from 'react';
import { cn } from '@/shared/lib/utils';

/** Accessible on/off switch. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-[13px] font-medium text-foreground">{label}</label>
        {description && <p className="text-[12px] leading-snug text-muted-foreground">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
          checked ? 'bg-accent' : 'bg-surface-3',
        )}
      >
        <span className={cn('inline-block h-4 w-4 rounded-full bg-foreground transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

/** "42/160" with a warning colour near and over the limit. */
export function CharCount({ value, max, min }: { value: string; max: number; min?: number }) {
  const n = value.length;
  const tone = n > max ? 'text-danger-fg' : min && n > 0 && n < min ? 'text-warning-fg' : n > max * 0.9 ? 'text-warning-fg' : 'text-muted-foreground';
  return <span className={cn('tabular text-[12px]', tone)} aria-live="polite">{n}/{max}</span>;
}

const control =
  'w-full rounded-lg border border-border bg-secondary px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent aria-[invalid=true]:border-danger';

interface FieldBase {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
  max?: number;
  min?: number;
  required?: boolean;
}

export function TextField({ label, value, onChange, hint, error, placeholder, max, min, required, type = 'text', list }: FieldBase & { type?: string; list?: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}{required && <span className="text-accent"> *</span>}
        </label>
        {max && <CharCount value={value} max={max} min={min} />}
      </div>
      <input id={id} type={type} list={list} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={hint || error ? `${id}-m` : undefined} className={control} />
      {(error || hint) && <p id={`${id}-m`} className={cn('text-[12px]', error ? 'text-danger-fg' : 'text-muted-foreground')}>{error || hint}</p>}
    </div>
  );
}

export function TextAreaField({ label, value, onChange, hint, error, placeholder, max, min, required, rows = 3 }: FieldBase & { rows?: number }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}{required && <span className="text-accent"> *</span>}
        </label>
        {max && <CharCount value={value} max={max} min={min} />}
      </div>
      <textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={hint || error ? `${id}-m` : undefined} className={cn(control, 'resize-y')} />
      {(error || hint) && <p id={`${id}-m`} className={cn('text-[12px]', error ? 'text-danger-fg' : 'text-muted-foreground')}>{error || hint}</p>}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(control, 'h-9 py-0')}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function PanelSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="label text-[11px] text-fg-2">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
