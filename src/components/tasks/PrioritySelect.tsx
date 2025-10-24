"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, ArrowDown, ArrowUp, ArrowUpRight, Zap, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrioritySelectProps {
  priority: "low" | "medium" | "high" | "urgent";
  onPriorityChange: (priority: "low" | "medium" | "high" | "urgent") => void;
  disabled?: boolean;
}

const priorityOptions = [
  { 
    value: "low", 
    label: "Low", 
    icon: ArrowDown,
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-800/30",
    iconColor: "text-emerald-500"
  },
  { 
    value: "medium", 
    label: "Medium", 
    icon: ArrowUp,
    color: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-800/30",
    iconColor: "text-amber-500"
  },
  { 
    value: "high", 
    label: "High", 
    icon: ArrowUpRight,
    color: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800 dark:hover:bg-orange-800/30",
    iconColor: "text-orange-500"
  },
  { 
    value: "urgent", 
    label: "Urgent", 
    icon: Flame,
    color: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-800/30",
    iconColor: "text-red-500"
  },
];

export function PrioritySelect({ priority, onPriorityChange, disabled = false }: PrioritySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentPriority = priorityOptions.find(option => option.value === priority) || priorityOptions[0];

  const handlePriorityChange = (newPriority: "low" | "medium" | "high" | "urgent") => {
    onPriorityChange(newPriority);
    setIsOpen(false);
  };

  const IconComponent = currentPriority.icon;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-0 hover:bg-transparent",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <Badge className={cn("cursor-pointer flex items-center gap-2 px-3 py-1.5 transition-all duration-200", currentPriority.color)}>
            <IconComponent className={cn("h-4 w-4", currentPriority.iconColor, priority === "urgent" && "animate-pulse")} />
            <span className="font-medium">{currentPriority.label}</span>
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </Button>
      </DropdownMenuTrigger>
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
    </DropdownMenu>
  );
}
