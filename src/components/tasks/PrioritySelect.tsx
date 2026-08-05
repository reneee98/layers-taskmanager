"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

interface PrioritySelectProps {
  priority: TaskPriority;
  onPriorityChange: (priority: TaskPriority) => void;
  disabled?: boolean;
  size?: "default" | "compact" | "flag" | "dashboard";
}

const priorityOptions = [
  {
    value: "low",
    label: "Nízka",
    color:
      "border-slate-500/15 bg-slate-500/[0.06] text-slate-600 hover:bg-slate-500/[0.1] dark:text-slate-400",
    iconColor: "text-slate-400 dark:text-slate-500",
    iconSurface: "bg-slate-500/[0.08]",
  },
  {
    value: "medium",
    label: "Stredná",
    color:
      "border-sky-500/15 bg-sky-500/[0.06] text-sky-700 hover:bg-sky-500/[0.1] dark:text-sky-400",
    iconColor: "text-sky-500",
    iconSurface: "bg-sky-500/[0.08]",
  },
  {
    value: "high",
    label: "Vysoká",
    color:
      "border-orange-500/15 bg-orange-500/[0.06] text-orange-700 hover:bg-orange-500/[0.1] dark:text-orange-400",
    iconColor: "text-orange-500",
    iconSurface: "bg-orange-500/[0.08]",
  },
  {
    value: "urgent",
    label: "Urgentná",
    color:
      "border-rose-500/20 bg-rose-500/[0.08] text-rose-700 hover:bg-rose-500/[0.13] dark:text-rose-400",
    iconColor: "text-rose-600 dark:text-rose-400",
    iconSurface: "bg-rose-500/[0.1]",
  },
] satisfies Array<{
  value: TaskPriority;
  label: string;
  color: string;
  iconColor: string;
  iconSurface: string;
}>;

const dashboardPriorityTone: Record<TaskPriority, string> = {
  low: "bg-slate-500/[0.08] text-slate-600 hover:bg-slate-500/[0.14] dark:text-slate-300",
  medium: "bg-sky-500/[0.09] text-sky-700 hover:bg-sky-500/[0.15] dark:text-sky-300",
  high: "bg-orange-500/[0.09] text-orange-700 hover:bg-orange-500/[0.15] dark:text-orange-300",
  urgent: "bg-rose-500/[0.09] text-rose-700 hover:bg-rose-500/[0.15] dark:text-rose-300",
};

export function PrioritySelect({
  priority,
  onPriorityChange,
  disabled = false,
  size = "compact",
}: PrioritySelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentPriority =
    priorityOptions.find((option) => option.value === priority) || priorityOptions[0];
  const isCompact = size === "compact";
  const isFlag = size === "flag";
  const isDashboard = size === "dashboard";

  const handlePriorityChange = (newPriority: TaskPriority) => {
    onPriorityChange(newPriority);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={disabled ? false : isOpen} onOpenChange={disabled ? undefined : setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Priorita: ${currentPriority.label}`}
          title={`Priorita: ${currentPriority.label}`}
          className={cn(
            "flex items-center justify-between border transition-all duration-200",
            isFlag
              ? "h-6 w-6 justify-center rounded-md border-transparent bg-transparent p-0 hover:border-border/70 hover:bg-muted/70"
              : isDashboard
                ? cn(
                    "h-11 w-full gap-2 rounded-md border-transparent px-3 text-xs sm:h-9",
                    dashboardPriorityTone[priority]
                  )
                : isCompact
                  ? "h-6 w-fit gap-1 rounded-md px-1.5 py-0.5 text-xs"
                  : "h-[36px] gap-2 rounded-full px-[13px] py-px text-[12px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]",
            "font-medium whitespace-nowrap",
            !isFlag && !isDashboard && currentPriority.color,
            disabled ? "cursor-default opacity-65" : "cursor-pointer"
          )}
        >
          <div className={cn("flex items-center", isFlag ? "justify-center" : "gap-2")}>
            <Flag
              className={cn(
                "shrink-0",
                isFlag
                  ? "h-3.5 w-3.5"
                  : isCompact
                    ? "h-3 w-3"
                    : isDashboard
                      ? "h-3.5 w-3.5"
                      : "h-4 w-4",
                currentPriority.iconColor,
                priority === "urgent" && "fill-current"
              )}
            />
            {!isFlag && <span className="whitespace-nowrap">{currentPriority.label}</span>}
          </div>
          {!disabled && !isFlag && (
            <ChevronDown
              className={cn(
                "shrink-0 opacity-60",
                isCompact ? "h-2.5 w-2.5" : isDashboard ? "h-3.5 w-3.5" : "h-4 w-4"
              )}
            />
          )}
        </button>
      </DropdownMenuTrigger>
      {!disabled && (
        <DropdownMenuContent
          align={isFlag ? "end" : "start"}
          sideOffset={6}
          className="w-44 rounded-xl border-border/80 bg-popover/95 p-1.5 shadow-[0_16px_40px_-18px_rgba(15,23,42,0.32)] backdrop-blur-xl"
        >
          {priorityOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handlePriorityChange(option.value)}
              className="flex min-h-8 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors focus:bg-accent"
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                  option.iconSurface
                )}
              >
                <Flag
                  className={cn(
                    "h-3.5 w-3.5",
                    option.iconColor,
                    option.value === "urgent" && "fill-current"
                  )}
                />
              </span>
              <span>{option.label}</span>
              {priority === option.value && (
                <Check className="ml-auto h-3.5 w-3.5 text-foreground/60" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
