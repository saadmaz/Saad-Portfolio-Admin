import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Shared empty state for list pages with no items yet. Replaces the
 * ~15 near-identical hand-rolled copies found in docs/ui-audit.md section 7
 * (`<div className="rounded-lg border border-border bg-card p-12 text-center
 * shadow-sm">`, repeated per page) with one component future list-page
 * migrations can adopt directly.
 */
const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, className }) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card p-12 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-h3 text-foreground">{title}</p>
        {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Button type="button" variant="primary" size="sm" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
