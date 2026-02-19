import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return <input type={type} className={cn("input-field flex h-11 w-full px-4 py-3 text-sm", className)} ref={ref} {...props} />;
});
Input.displayName = "Input";

export { Input };
