import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FormHeaderProps {
  /** Path to return to when the back button is clicked. */
  backTo: string;
  title: string;
  subtitle?: string;
  /** Right-aligned action buttons (save, delete, preview, etc). */
  actions?: React.ReactNode;
}

/**
 * Standard header for admin create/edit form pages: back button, title,
 * optional subtitle, and right-aligned actions. Keeps every form's header
 * identical instead of each one hand-rolling its own back-button style
 * and heading scale.
 */
const FormHeader: React.FC<FormHeaderProps> = ({ backTo, title, subtitle, actions }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground w-9 h-9 flex-shrink-0"
        onClick={() => navigate(backTo)}
        aria-label="Go back"
      >
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <div>
        <h1
          className="text-2xl font-black tracking-tight text-foreground"
          style={{ fontFamily: 'DM Sans' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground font-medium mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="ml-auto flex items-center gap-2 flex-wrap">{actions}</div>
      )}
    </div>
  );
};

export default FormHeader;
