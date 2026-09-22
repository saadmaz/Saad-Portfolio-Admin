import React from 'react';
import BackButton from '@/components/admin/BackButton';

interface PageHeaderProps {
  /** Small uppercase label above the title, e.g. "PORTFOLIO" */
  eyebrow: string;
  title: string;
  subtitle?: React.ReactNode;
  /** Path for the back button. Omit to hide it. */
  backTo?: string;
  /** Right-aligned action buttons */
  actions?: React.ReactNode;
}

/**
 * Standard admin page header: eyebrow label, title, subtitle, back button,
 * and right-aligned actions. Keeps typography identical across every
 * admin list/detail page instead of each page hand-rolling its own scale.
 */
const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, subtitle, backTo, actions }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="flex items-start gap-3">
        {backTo && <BackButton to={backTo} className="mt-1 flex-shrink-0" />}
        <div>
          <p className="label mb-2">
            {eyebrow}
          </p>
          <h1 className="text-display text-foreground mb-1">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground font-medium">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
};

export default PageHeader;
