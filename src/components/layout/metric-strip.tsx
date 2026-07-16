import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface MetricStripItem {
  label: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  tone?: string;
}

interface MetricStripProps {
  items: MetricStripItem[];
  className?: string;
}

const columnClasses: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export const MetricStrip = ({ items, className }: MetricStripProps) => (
  <section
    aria-label="Súhrn"
    className={cn(
      "grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card",
      columnClasses[Math.min(items.length, 4)] || "lg:grid-cols-4",
      className
    )}
  >
    {items.map((item, index) => (
      <div
        key={item.label}
        className={cn(
          "flex min-w-0 items-center gap-3 border-border px-4 py-3.5",
          index % 2 === 0 && index < items.length - 1 && "border-r",
          index < Math.ceil(items.length / 2) * 2 - 2 && "border-b lg:border-b-0",
          index < items.length - 1 && "lg:border-r",
          index === items.length - 1 && "lg:border-r-0"
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
          <item.icon aria-hidden="true" className={cn("h-4 w-4 text-muted-foreground", item.tone)} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold tabular-nums text-foreground">
            {item.value}
          </div>
          <div className="truncate text-[11px] font-medium text-muted-foreground">
            {item.label}
          </div>
          {item.description && (
            <div className="truncate text-[10px] text-muted-foreground/75">{item.description}</div>
          )}
        </div>
      </div>
    ))}
  </section>
);
