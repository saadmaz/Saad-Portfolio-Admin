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

/**
 * One wrapper for label + control + helper/error text, so form pages stop
 * hand-assembling this per field (docs/ui-audit.md section 7 flagged
 * "repeated form-field wrappers" as duplicated across every form component).
 * Takes a render-prop child so it works with Input, Textarea, Select, or any
 * custom control without this component needing to know which one.
 */
const Field: React.FC<FieldProps> = ({ label, hint, error, required, className, children }) => {
  const id = useId();
  const messageId = error || hint ? `${id}-message` : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </Label>
      {children({ id, 'aria-describedby': messageId, 'aria-invalid': !!error })}
      {error ? (
        <p id={messageId} className="text-body-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-body-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export default Field;
