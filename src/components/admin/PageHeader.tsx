import React from 'react';

interface PageHeaderProps {
  title: string;
  /** Muted second half of a two-tone headline, e.g. the user's name. */
  soft?: string;
  /** Mono meta line under the title, e.g. "12 projects · 9 published". */
  subtitle?: React.ReactNode;
  /** Right-aligned actions. */
  actions?: React.ReactNode;
}

/** Standard list-page header: big title, mono meta line, actions on the right. */
const PageHeader: React.FC<PageHeaderProps> = ({ title, soft, subtitle, actions }) => (
  <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="max-md:sr-only text-[28px] font-medium leading-[1.05] tracking-[-0.03em] text-foreground md:text-[40px]">
        {title}
        {soft && <span className="soft"> {soft}</span>}
      </h1>
      {subtitle && <p className="meta md:mt-2.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">{actions}</div>}
  </div>
);

export default PageHeader;
