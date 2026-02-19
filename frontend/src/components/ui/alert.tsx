import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full rounded-xl border px-4 py-3 text-sm", {
  variants: {
    variant: {
      info: "border-[color:var(--border-subtle)] bg-[color:var(--glass-panel-surface)] text-[color:var(--color-text-secondary)]",
      success:
        "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success-text)]",
      error: "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)]"
    }
  },
  defaultVariants: {
    variant: "error"
  }
});

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }: AlertProps, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
);
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm leading-relaxed", className)} {...props} />
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription };
