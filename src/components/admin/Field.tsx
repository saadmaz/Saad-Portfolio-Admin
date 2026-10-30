import React, { useId } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/shared/lib/utils';

interface FieldProps {
  label: string;
  /** Rendered as the field's helper text when there's no error. */
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** Receives { id, 'aria-describedby', 'aria-invalid' } to spread onto the control. */
  children: (bind: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode;
}

/** Label + control + helper/error text. Render-prop child so it works with any control. */
const Field: React.FC<FieldProps> = ({ label, hint, error, required, className, children }) => {
  const id = useId();
  const messageId = error || hint ? `${id}-message` : undefined;

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-accent"> *</span>}
      </Label>
      {children({ id, 'aria-describedby': messageId, 'aria-invalid': !!error })}
      {error ? (
        <p id={messageId} className="text-[13px] text-danger-fg">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export default Field;
