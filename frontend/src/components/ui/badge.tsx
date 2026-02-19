import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
  {
    variants: {
      variant: {
        default: "border-[color:var(--border-subtle)] bg-[color:var(--glass-panel-surface)] text-[color:var(--color-text-primary)]",
        secondary: "border-[color:var(--border-stage)] bg-[color:var(--glass-stage-surface)] text-[color:var(--color-text-secondary)]",
        success:
          "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success-text)]",
        warning:
          "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning-text)]",
        destructive:
          "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)]",
        outline: "border-[color:var(--border-strong)] bg-transparent text-[color:var(--color-text-primary)]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
