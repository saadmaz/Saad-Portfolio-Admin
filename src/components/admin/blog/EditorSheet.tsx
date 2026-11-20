import React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { useIsDesktop } from '../useIsDesktop';

/** Right-hand drawer (bottom sheet on mobile) with a scrolling body and a sticky save bar. */
export function EditorSheet({
  open,
  onOpenChange,
  title,
  description,
  onSave,
  saving,
  saveLabel = 'Save',
  disabled,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const isDesktop = useIsDesktop();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className={cn('flex flex-col gap-0 p-0', isDesktop ? 'w-full border-l sm:max-w-[520px]' : 'max-h-[92dvh] rounded-t-2xl border-t')}
      >
        <div className="shrink-0 border-b border-border-subtle px-6 pb-5 pt-6 pr-16">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className={cn('meta mt-1', !description && 'sr-only')}>{description ?? 'Fill in the fields and save.'}</SheetDescription>
        </div>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">{children}</div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border-subtle px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={saving} disabled={disabled}>{saveLabel}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
