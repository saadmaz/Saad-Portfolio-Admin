import React from 'react';
import { Edit2, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface RowActionsProps {
  /** What the row represents, used in the accessible labels, e.g. "award". */
  label: string;
  onEdit: () => void;
  onDelete: () => void;
  /** Optional external link shown before edit/delete. */
  href?: string;
  /**
   * Hide until the card is hovered or focused. Only applies from `md` up;
   * on touch screens the actions are always visible. The parent needs `group`.
   */
  reveal?: boolean;
  className?: string;
}

/** Edit / delete (and optional open-link) icon buttons for list cards. */
const RowActions: React.FC<RowActionsProps> = ({ label, onEdit, onDelete, href, reveal = false, className }) => (
  <div
    className={cn(
      'flex shrink-0 items-center gap-1',
      reveal &&
        'transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
      className,
    )}
  >
    {href && (
      <Button asChild variant="ghost" size="icon-sm">
        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label} link`}>
          <ExternalLink aria-hidden="true" />
        </a>
      </Button>
    )}
    <Button type="button" variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${label}`}>
      <Edit2 aria-hidden="true" />
    </Button>
    <Button type="button" variant="destructive-ghost" size="icon-sm" onClick={onDelete} aria-label={`Delete ${label}`}>
      <Trash2 aria-hidden="true" />
    </Button>
  </div>
);

export default RowActions;
