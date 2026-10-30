import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-medium tracking-[-0.003em] ring-offset-background transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // The single ember CTA on a page or form.
        primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
        default: "bg-accent text-accent-foreground hover:bg-accent-hover",
        destructive: "bg-danger text-danger-foreground hover:bg-danger/90",
        "destructive-ghost": "text-danger-fg hover:bg-danger-subtle",
        outline: "border border-border-strong/70 bg-transparent text-foreground hover:border-border-strong hover:bg-secondary",
        secondary: "bg-secondary text-foreground hover:bg-surface-3",
        ghost: "text-fg-2 hover:bg-secondary hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 px-4 text-sm",
        xs: "h-8 px-3 text-[13px]",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner and disables the button without changing its width. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }), loading && "relative")}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        <span className={cn("inline-flex items-center justify-center gap-2", loading && "invisible")}>
          {children}
        </span>
        {loading && <Loader2 className="absolute size-4 animate-spin" aria-hidden="true" />}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
