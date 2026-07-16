import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, Loader2, LockKeyhole } from "lucide-react";

import { cn } from "@/lib/utils";

type PageStateVariant = "empty" | "loading" | "permission" | "error";

interface PageStateProps {
  title: string;
  description?: string;
  variant?: PageStateVariant;
  icon?: LucideIcon;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

const variantIcons: Record<PageStateVariant, LucideIcon> = {
  empty: Inbox,
  loading: Loader2,
  permission: LockKeyhole,
  error: AlertTriangle,
};

export const PageState = ({
  title,
  description,
  variant = "empty",
  icon,
  action,
  compact = false,
  className,
}: PageStateProps) => {
  const Icon = icon || variantIcons[variant];

  return (
    <div
      role={variant === "error" ? "alert" : variant === "loading" ? "status" : undefined}
      aria-live={variant === "loading" ? "polite" : undefined}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 text-center",
        compact ? "min-h-40 py-8" : "min-h-[320px] py-12",
        className
      )}
    >
      <span
        className={cn(
          "mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/45 text-muted-foreground",
          variant === "error" && "border-destructive/15 bg-destructive/[0.05] text-destructive"
        )}
      >
        <Icon aria-hidden="true" className={cn("h-4 w-4", variant === "loading" && "animate-spin")} />
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
