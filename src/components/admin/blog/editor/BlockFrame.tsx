import React from 'react';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/**
 * Editor chrome shared by every custom block: a label bar with a drag
 * handle and delete button, and a selection outline. `contentEditable` is
 * off for the chrome so typing never lands in it.
 */
export function BlockFrame({
  label,
  icon: Icon,
  selected,
  onDelete,
  actions,
  children,
  className,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
  onDelete: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <NodeViewWrapper
      className={cn(
        'not-prose my-5 overflow-hidden rounded-xl border bg-secondary/40 transition-colors',
        selected ? 'border-accent/60 ring-2 ring-accent/15' : 'border-border-subtle',
        className,
      )}
      data-drag-handle=""
    >
      <div contentEditable={false} className="flex select-none items-center gap-2 border-b border-border-subtle px-3 py-1.5">
        <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground" aria-hidden="true" />
        <Icon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
        <span className="label flex-1 text-[11px] text-fg-2">{label}</span>
        {actions}
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${label.toLowerCase()}`}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-danger-subtle hover:text-danger-fg"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </NodeViewWrapper>
  );
}

/** Small labelled input used inside block settings. */
export function BlockInput({
  label,
  value,
  onChange,
  placeholder,
  className,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1', className)} contentEditable={false}>
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-border bg-background px-2 text-[13px] text-foreground outline-none focus:border-accent"
      />
    </label>
  );
}

/** Segmented control for small option sets (width, alignment, layout…). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-border bg-background p-0.5" contentEditable={false}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded px-2 py-0.5 text-[12px] transition-colors',
            value === o.value ? 'bg-accent text-accent-foreground' : 'text-fg-2 hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export type NodeViewProps = ReactNodeViewProps;
