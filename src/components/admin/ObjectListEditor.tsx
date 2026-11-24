import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export type FieldSpec<T> = {
  key: keyof T & string;
  label: string;
  placeholder?: string;
  /** "textarea" spans the full row; "select" needs options. */
  type?: 'text' | 'url' | 'textarea' | 'select';
  options?: readonly string[];
  /** Grid columns out of 2 on wide screens (default 1). */
  span?: 1 | 2;
};

/**
 * Edits a list of small records (collaborators, testimonials, links...): one
 * card per entry with its fields, plus reorder and remove. Order is kept as
 * entered, which is the order the public page shows them in.
 */
export function ObjectListEditor<T extends Record<string, unknown>>({
  label,
  hint,
  items,
  fields,
  onChange,
  blank,
  addLabel = 'Add',
  max,
}: {
  label: string;
  hint?: string;
  items: T[];
  fields: FieldSpec<T>[];
  onChange: (items: T[]) => void;
  blank: () => T;
  addLabel?: string;
  max?: number;
}) {
  const set = (i: number, key: keyof T, value: string) =>
    onChange(items.map((item, j) => (j === i ? { ...item, [key]: value } : item)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2.5">
      <div>
        <span className="label mb-1 block">{label}</span>
        {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
      </div>
      {items.length === 0 && <p className="text-xs text-muted-foreground">None added</p>}
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-border-subtle bg-background/40 p-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {fields.map((f) => {
              const value = String(item[f.key] ?? '');
              const id = `${label}-${i}-${f.key}`.replace(/\W+/g, '-');
              return (
                <div key={f.key} className={f.type === 'textarea' || f.span === 2 ? 'sm:col-span-2' : undefined}>
                  <label htmlFor={id} className="mb-1 block text-[12px] text-muted-foreground">
                    {f.label}
                  </label>
                  {f.type === 'textarea' ? (
                    <Textarea
                      id={id}
                      value={value}
                      placeholder={f.placeholder}
                      onChange={(e) => set(i, f.key, e.target.value)}
                      className="min-h-[72px] resize-none"
                    />
                  ) : f.type === 'select' ? (
                    <select
                      id={id}
                      value={value}
                      onChange={(e) => set(i, f.key, e.target.value)}
                      className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                    >
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={id}
                      type={f.type === 'url' ? 'url' : 'text'}
                      value={value}
                      placeholder={f.placeholder}
                      onChange={(e) => set(i, f.key, e.target.value)}
                      className="h-9"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-end gap-1">
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUp />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Move down"
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
            >
              <ArrowDown />
            </Button>
            <Button
              type="button"
              variant="destructive-ghost"
              size="icon-sm"
              aria-label="Remove"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      ))}
      {(max === undefined || items.length < max) && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, blank()])}>
          <Plus /> {addLabel}
        </Button>
      )}
    </div>
  );
}
