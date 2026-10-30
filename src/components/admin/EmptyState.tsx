import React from 'react';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

/** Dashed empty state for lists with nothing in them yet (or no search matches). */
const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, secondaryAction, className }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border px-6 py-16 text-center md:py-24',
      className,
    )}
  >
    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-border-subtle bg-secondary text-fg-2 md:h-[88px] md:w-[88px]">
      <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
    </div>
    <div className="max-w-md space-y-2">
      <p className="text-h2 text-foreground">{title}</p>
      {description && <p className="text-[15px] leading-relaxed text-fg-2">{description}</p>}
    </div>
    {(action || secondaryAction) && (
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {action && (
          <Button type="button" onClick={action.onClick}>
            {action.label}
            <ArrowUpRight aria-hidden="true" />
          </Button>
        )}
        {secondaryAction && (
          <Button type="button" variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    )}
  </div>
);

export default EmptyState;
