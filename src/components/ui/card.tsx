import * as React from "react";

import { cn } from "@/shared/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Border-lightening + surface-lift hover, no colored glow (docs/ui-audit.md
   * flagged the old --shadow-card-hover as an accent-tinted bloom — this is
   * its replacement). Opt-in so static cards don't get a pointer cursor.
   *
   * Visual only — does NOT add keyboard/focus/role handling. Card is a plain
   * div used both wrapped in a real focusable element (e.g. `<Link><Card
   * interactive>`, see AdminDashboard.tsx) and standalone. Wrap it in a real
   * `<button>` or `<Link>` when there's no other focusable wrapper — never
   * attach `onClick` straight to the Card itself, since a bare div+onClick
   * isn't keyboard-operable (see src/pages/DesignSystem.tsx for the pattern). */
  interactive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, interactive = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm transition-colors",
      interactive && "cursor-pointer hover:border-border-strong hover:bg-secondary/40",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    // Was text-2xl (24px, off the 7-step scale) — moved to the h2 step
    // (16px/600/-0.01em). Visible change: card titles get smaller across
    // the ~31 existing call sites (ExperienceForm, CertificateForm,
    // AdminSkills), matching the dense-CMS type scale from docs/ui-audit.md
    // instead of the marketing-site sizing this inherited from.
    <h3 ref={ref} className={cn("text-h2", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
