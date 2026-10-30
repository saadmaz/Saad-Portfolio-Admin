import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface FormHeaderProps {
  /** Path to return to when the back button is clicked. */
  backTo: string;
  title: string;
  /** Mono meta line, e.g. "Projects · Editing". */
  subtitle?: string;
  /** Status badge rendered next to the title. */
  badge?: React.ReactNode;
  /** Right-aligned actions (save, delete, preview, etc). */
  actions?: React.ReactNode;
}

/** Header for create/edit pages: round back button, title + status, meta line, actions. */
const FormHeader: React.FC<FormHeaderProps> = ({ backTo, title, subtitle, badge, actions }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-4">
      <button
        type="button"
        onClick={() => navigate(backTo)}
        aria-label="Go back"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-fg-2 transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="truncate text-xl font-medium tracking-[-0.02em] text-foreground">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="meta mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">{actions}</div>}
    </div>
  );
};

export default FormHeader;
