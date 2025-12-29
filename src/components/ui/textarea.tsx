import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, autoComplete, ...props }, ref) => {
  // Add browser extension protection attributes for textarea fields
  const shouldIgnoreExtensions = 
    (!autoComplete || (autoComplete !== "email" && autoComplete !== "username" && autoComplete !== "password"));

  const extensionProtectionProps = shouldIgnoreExtensions
    ? {
        "data-1p-ignore": true,
        "data-lpignore": "true",
        autoComplete: autoComplete || "off",
      }
    : { autoComplete };

  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...extensionProtectionProps}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
