import { useEffect, useState } from 'react';
import { useForm, type FieldValues, type Path, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/shared/lib/utils';
import ImageUpload from './ImageUpload';
import LogoUpload from './LogoUpload';

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'date' | 'image' | 'logo';
  placeholder?: string;
  options?: readonly { readonly label: string; readonly value: string }[];
  required?: boolean;
}

// Default shape when a caller doesn't need a specific entity type.
type EntityFormValues = Record<string, unknown>;

interface AdminEntityDialogProps<T extends FieldValues = EntityFormValues> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Mono meta line under the title. */
  description?: string;
  fields: readonly FieldConfig[];
  schema: z.ZodType<T>;
  defaultValues?: Partial<T>;
  onSubmit: (data: T) => Promise<void>;
  isLoading?: boolean;
  onDelete?: () => void;
}

const DESKTOP_QUERY = '(min-width: 768px)';

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia(DESKTOP_QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
};

/**
 * Create/edit form for the simple collections: a right-hand drawer on
 * desktop, a bottom sheet on mobile. Fields are runtime config.
 */
function AdminEntityDialog<T extends FieldValues = EntityFormValues>({
  isOpen,
  onClose,
  title,
  description,
  fields,
  schema,
  defaultValues,
  onSubmit,
  onDelete,
}: AdminEntityDialogProps<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const isDesktop = useIsDesktop();

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: (defaultValues ?? {}) as DefaultValues<T>,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset((defaultValues ?? {}) as DefaultValues<T>);
    }
  }, [isOpen, defaultValues, form]);

  const handleSubmit = async (data: T) => {
    setIsSaving(true);
    try {
      await onSubmit(data);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className={cn(
          'flex flex-col gap-0 p-0',
          isDesktop
            ? 'w-full border-l sm:max-w-[480px]'
            : 'max-h-[92dvh] rounded-t-2xl border-t',
        )}
      >
        {!isDesktop && <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-surface-3" aria-hidden="true" />}
        <div className="shrink-0 border-b border-border-subtle px-6 pb-5 pt-6 pr-16">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className={cn('meta mt-1', !description && 'sr-only')}>
            {description ?? 'Fill in the fields and save.'}
          </SheetDescription>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              {fields.map((field) => (
                <FormField
                  key={field.name}
                  control={form.control}
                  // `fields` is runtime config, not statically tied to T's keys -
                  // this is the one intentional boundary cast for that mismatch.
                  name={field.name as Path<T>}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>{field.label}</FormLabel>
                      <FormControl>
                        {field.type === 'textarea' ? (
                          <Textarea
                            {...formField}
                            value={(formField.value as string) ?? ''}
                            placeholder={field.placeholder}
                            className="min-h-[120px]"
                          />
                        ) : field.type === 'select' ? (
                          <Select onValueChange={formField.onChange} value={(formField.value as string) ?? ''}>
                            <SelectTrigger>
                              <SelectValue placeholder={field.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === 'image' ? (
                          <ImageUpload value={formField.value as string} onChange={formField.onChange} />
                        ) : field.type === 'logo' ? (
                          <LogoUpload
                            value={formField.value as string}
                            onChange={formField.onChange}
                            required={field.required}
                          />
                        ) : (
                          <Input
                            {...formField}
                            value={(formField.value as string | number) ?? ''}
                            type={field.type}
                            placeholder={field.placeholder}
                            onChange={(e) => {
                              if (field.type === 'number') {
                                const raw = e.target.value;
                                formField.onChange(raw === '' ? undefined : Number(raw));
                              } else {
                                formField.onChange(e.target.value);
                              }
                            }}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <div className="flex shrink-0 items-center gap-2 border-t border-border-subtle px-6 py-4 pb-[calc(16px+env(safe-area-inset-bottom))] md:pb-4">
              {onDelete && (
                <Button type="button" variant="destructive-ghost" size="sm" onClick={onDelete} className="-ml-2 px-2.5">
                  <Trash2 aria-hidden="true" /> Delete
                </Button>
              )}
              <div className="ml-auto flex flex-1 gap-2 md:flex-none">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1 md:flex-none">
                  Cancel
                </Button>
                <Button type="submit" loading={isSaving} className="flex-1 md:flex-none">
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

export default AdminEntityDialog;
