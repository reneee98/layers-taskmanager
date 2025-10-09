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
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrioritySelectProps {
  priority: "low" | "medium" | "high" | "urgent";
  onPriorityChange: (priority: "low" | "medium" | "high" | "urgent") => void;
  disabled?: boolean;
}

const priorityOptions = [
  { value: "low", label: "Low", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  { value: "medium", label: "Medium", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  { value: "high", label: "High", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  { value: "urgent", label: "🔥 Urgent", color: "bg-red-500/10 text-red-500 border-red-500/20" },
];

export function PrioritySelect({ priority, onPriorityChange, disabled = false }: PrioritySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentPriority = priorityOptions.find(option => option.value === priority) || priorityOptions[0];

  const handlePriorityChange = (newPriority: "low" | "medium" | "high" | "urgent") => {
    onPriorityChange(newPriority);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-0 hover:bg-transparent",
            currentPriority.color,
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <Badge className={cn("cursor-pointer", currentPriority.color)}>
            {currentPriority.label}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {priorityOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handlePriorityChange(option.value as "low" | "medium" | "high" | "urgent")}
            className="flex items-center justify-between"
          >
            <span>{option.label}</span>
            {priority === option.value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
