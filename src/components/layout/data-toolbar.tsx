import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DataToolbarProps {
  children: ReactNode;
  className?: string;
}

export const DataToolbar = ({ children, className }: DataToolbarProps) => (
  <div
    className={cn(
      "flex flex-col gap-2 rounded-xl border border-border bg-muted/[0.16] p-2.5 sm:flex-row sm:items-center sm:justify-between",
      className
    )}
  >
    {children}
  </div>
);
