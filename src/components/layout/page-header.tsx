import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  eyebrow,
  icon: Icon,
  actions,
  meta,
  className,
}: PageHeaderProps) => (
  <header
    className={cn(
      "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
      className
    )}
  >
    <div className="min-w-0">
      {eyebrow && (
        <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5" />}
          <span>{eyebrow}</span>
        </div>
      )}
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        {!eyebrow && Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/45 text-muted-foreground">
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
        )}
        <h1 className="page-heading truncate">{title}</h1>
        {meta}
      </div>
      {description && <p className="page-description max-w-2xl">{description}</p>}
    </div>

    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>
);
