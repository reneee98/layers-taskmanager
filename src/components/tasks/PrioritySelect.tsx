"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, ArrowDown, ArrowUp, ArrowUpRight, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrioritySelectProps {
  priority: "low" | "medium" | "high" | "urgent";
  onPriorityChange: (priority: "low" | "medium" | "high" | "urgent") => void;
  disabled?: boolean;
  size?: "default" | "compact";
}

const priorityOptions = [
  { 
    value: "low", 
    label: "Nízka",
    icon: ArrowDown,
    color: "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-700 hover:bg-emerald-500/[0.12] dark:text-emerald-300",
    iconColor: "text-emerald-500"
  },
  { 
    value: "medium", 
    label: "Stredná",
    icon: ArrowUp,
    color: "border-amber-500/20 bg-amber-500/[0.08] text-amber-700 hover:bg-amber-500/[0.12] dark:text-amber-300",
    iconColor: "text-amber-500"
  },
  { 
    value: "high", 
    label: "Vysoká",
    icon: ArrowUpRight,
    color: "border-orange-500/20 bg-orange-500/[0.08] text-orange-700 hover:bg-orange-500/[0.12] dark:text-orange-300",
    iconColor: "text-orange-500"
  },
  { 
    value: "urgent", 
    label: "Urgentná",
    icon: Flame,
    color: "border-red-500/20 bg-red-500/[0.08] text-red-700 hover:bg-red-500/[0.12] dark:text-red-300",
    iconColor: "text-destructive"
  },
];

export function PrioritySelect({ priority, onPriorityChange, disabled = false, size = "compact" }: PrioritySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentPriority = priorityOptions.find(option => option.value === priority) || priorityOptions[0];

  const handlePriorityChange = (newPriority: "low" | "medium" | "high" | "urgent") => {
    onPriorityChange(newPriority);
    setIsOpen(false);
  };

  const IconComponent = currentPriority.icon;

  const isCompact = size === "compact";

  return (
    <DropdownMenu open={disabled ? false : isOpen} onOpenChange={disabled ? undefined : setIsOpen}>
      <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={`Priorita: ${currentPriority.label}`}
            className={cn(
            "flex items-center justify-between border transition-all duration-200",
            isCompact ? "gap-1 px-1.5 py-0.5 h-6 w-fit text-xs rounded-md" : "gap-2 px-[13px] py-px h-[36px] text-[12px] rounded-full shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]",
            "font-medium whitespace-nowrap",
            currentPriority.color,
            disabled ? "cursor-default" : "cursor-pointer hover:opacity-80"
            )}
          >
            <div className="flex items-center gap-2">
              <IconComponent className={cn(
                "flex-shrink-0",
                isCompact ? "h-3 w-3" : "h-4 w-4",
                currentPriority.iconColor,
                priority === "urgent" && "animate-pulse"
              )} />
              <span className="whitespace-nowrap">{currentPriority.label}</span>
            </div>
            {!disabled && <ChevronDown className={cn(
              "opacity-70 flex-shrink-0",
              isCompact ? "h-2.5 w-2.5" : "h-4 w-4"
            )} />}
          </button>
      </DropdownMenuTrigger>
      {!disabled && (
        <DropdownMenuContent align="start" className="w-48 p-2">
          {priorityOptions.map((option) => {
            const OptionIcon = option.icon;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handlePriorityChange(option.value as "low" | "medium" | "high" | "urgent")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
              >
                <OptionIcon className={cn("h-4 w-4", option.iconColor, option.value === "urgent" && "animate-pulse")} />
                <span className="font-medium">{option.label}</span>
                {priority === option.value && <Check className="h-4 w-4 ml-auto text-muted-foreground" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
