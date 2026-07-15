import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, autoComplete, ...props }, ref) => {
    // Add browser extension protection attributes for non-email/password fields
    // Password managers should work normally for email/password fields
    const shouldIgnoreExtensions =
      type !== "password" &&
      type !== "email" &&
      (!autoComplete ||
        (autoComplete !== "email" &&
          autoComplete !== "username" &&
          autoComplete !== "current-password" &&
          autoComplete !== "new-password"));

    const extensionProtectionProps = shouldIgnoreExtensions
      ? {
          "data-1p-ignore": true,
          "data-lpignore": "true",
          autoComplete: autoComplete || "off",
        }
      : { autoComplete };

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...extensionProtectionProps}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
