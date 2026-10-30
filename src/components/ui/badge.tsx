import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[12px] leading-[1.4] transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-fg-2",
        secondary: "border-transparent bg-secondary text-fg-2",
        destructive: "border-transparent bg-danger-subtle text-danger-fg",
        outline: "border-border bg-transparent text-fg-2",
        neutral: "border-transparent bg-secondary text-muted-foreground",
        accent: "border-transparent bg-accent-subtle text-accent",
        success: "border-transparent bg-success-subtle text-success-fg",
        warning: "border-transparent bg-warning-subtle text-warning-fg",
        danger: "border-transparent bg-danger-subtle text-danger-fg",
        info: "border-transparent bg-info-subtle text-info-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  /** Leading status dot in the current text colour. */
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
