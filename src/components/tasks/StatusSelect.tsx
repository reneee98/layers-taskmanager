"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Circle, Play, Eye, CheckCircle, XCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTaskStatusLabel } from "@/lib/task-status";

interface StatusSelectProps {
  status: "todo" | "in_progress" | "review" | "sent_to_client" | "done" | "cancelled";
  onStatusChange: (
    status: "todo" | "in_progress" | "review" | "sent_to_client" | "done" | "cancelled"
  ) => void;
  disabled?: boolean;
  size?: "default" | "compact" | "icon" | "dashboard";
}

const statusOptions = [
  {
    value: "todo",
    label: getTaskStatusLabel("todo"),
    icon: Circle,
    color: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
    iconColor: "text-slate-500",
  },
  {
    value: "in_progress",
    label: getTaskStatusLabel("in_progress"),
    icon: Play,
    color:
      "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-800/30",
    iconColor: "text-blue-500",
  },
  {
    value: "review",
    label: getTaskStatusLabel("review"),
    icon: Eye,
    color:
      "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40",
    iconColor: "text-amber-700 dark:text-amber-400",
  },
  {
    value: "sent_to_client",
    label: getTaskStatusLabel("sent_to_client"),
    icon: Send,
    color:
      "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-800/30",
    iconColor: "text-purple-500",
  },
  {
    value: "done",
    label: getTaskStatusLabel("done"),
    icon: CheckCircle,
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
    iconColor: "text-emerald-500",
  },
  {
    value: "cancelled",
    label: getTaskStatusLabel("cancelled"),
    icon: XCircle,
    color:
      "bg-red-100 text-red-700 border-red-200 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-800/30",
    iconColor: "text-red-500",
  },
];

const dashboardStatusTone: Record<string, string> = {
  todo: "bg-slate-500/[0.08] text-slate-600 hover:bg-slate-500/[0.14] dark:text-slate-300",
  in_progress: "bg-sky-500/[0.09] text-sky-700 hover:bg-sky-500/[0.15] dark:text-sky-300",
  review: "bg-amber-500/[0.1] text-amber-700 hover:bg-amber-500/[0.17] dark:text-amber-300",
  sent_to_client:
    "bg-violet-500/[0.09] text-violet-700 hover:bg-violet-500/[0.15] dark:text-violet-300",
  done: "bg-emerald-500/[0.09] text-emerald-700 hover:bg-emerald-500/[0.15] dark:text-emerald-300",
  cancelled: "bg-rose-500/[0.09] text-rose-700 hover:bg-rose-500/[0.15] dark:text-rose-300",
};

export function StatusSelect({
  status,
  onStatusChange,
  disabled = false,
  size = "compact",
}: StatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentStatus = statusOptions.find((option) => option.value === status) || statusOptions[0];

  const handleStatusChange = (
    newStatus: "todo" | "in_progress" | "review" | "sent_to_client" | "done" | "cancelled"
  ) => {
    onStatusChange(newStatus);
    setIsOpen(false);
  };

  const IconComponent = currentStatus.icon;

  const isCompact = size === "compact";
  const isIcon = size === "icon";
  const isDashboard = size === "dashboard";

  return (
    <DropdownMenu open={disabled ? false : isOpen} onOpenChange={disabled ? undefined : setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Status: ${currentStatus.label}`}
          title={currentStatus.label}
          className={cn(
            "flex items-center justify-between whitespace-nowrap border font-medium transition-colors duration-150",
            isIcon
              ? "h-8 w-8 justify-center rounded-md border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground"
              : isDashboard
                ? cn(
                    "h-11 w-40 shrink-0 gap-2 overflow-hidden rounded-md border-transparent px-3 text-xs sm:h-9",
                    dashboardStatusTone[status]
                  )
                : isCompact
                  ? "h-6 w-fit gap-1 rounded-md px-1.5 py-0.5 text-xs"
                  : "h-[36px] gap-2 rounded-full px-[13px] py-px text-[12px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]",
            !isIcon && !isDashboard && currentStatus.color,
            disabled ? "cursor-default" : "cursor-pointer"
          )}
        >
          <div className={cn("flex items-center gap-2", isDashboard && "min-w-0 flex-1")}>
            <IconComponent
              className={cn(
                "flex-shrink-0",
                isIcon || isDashboard ? "h-3.5 w-3.5" : isCompact ? "h-3 w-3" : "h-4 w-4",
                isIcon || isDashboard
                  ? status === "in_progress"
                    ? "text-blue-500"
                    : status === "review"
                      ? "text-amber-500"
                      : status === "done"
                        ? "text-emerald-500"
                        : status === "cancelled"
                          ? "text-destructive"
                          : "text-muted-foreground"
                  : currentStatus.iconColor,
                status === "in_progress" && "animate-pulse"
              )}
            />
            {!isIcon && (
              <span className={cn("whitespace-nowrap", isDashboard && "min-w-0 truncate")}>
                {currentStatus.label}
              </span>
            )}
          </div>
          {!disabled && !isIcon && (
            <ChevronDown
              className={cn(
                "flex-shrink-0 opacity-70",
                isCompact ? "h-2.5 w-2.5" : isDashboard ? "ml-auto h-3.5 w-3.5" : "h-4 w-4"
              )}
            />
          )}
        </button>
      </DropdownMenuTrigger>
      {!disabled && (
        <DropdownMenuContent align="start" className="w-48 p-2">
          {statusOptions.map((option) => {
            const OptionIcon = option.icon;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() =>
                  handleStatusChange(
                    option.value as
                      | "done"
                      | "cancelled"
                      | "todo"
                      | "in_progress"
                      | "review"
                      | "sent_to_client"
                  )
                }
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
              >
                <OptionIcon
                  className={cn(
                    "h-4 w-4",
                    option.iconColor,
                    option.value === "in_progress" && "animate-pulse"
                  )}
                />
                <span className="font-medium">{option.label}</span>
                {status === option.value && (
                  <Check className="h-4 w-4 ml-auto text-muted-foreground" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
