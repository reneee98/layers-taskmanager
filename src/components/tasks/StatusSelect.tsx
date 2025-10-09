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

interface StatusSelectProps {
  status: "todo" | "in_progress" | "review" | "done" | "cancelled";
  onStatusChange: (status: "todo" | "in_progress" | "review" | "done" | "cancelled") => void;
  disabled?: boolean;
}

const statusOptions = [
  { value: "todo", label: "Na urobiť", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
  { value: "in_progress", label: "Prebieha", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { value: "review", label: "Na kontrolu", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  { value: "done", label: "Hotovo", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  { value: "cancelled", label: "Zrušené", color: "bg-red-500/10 text-red-500 border-red-500/20" },
];

export function StatusSelect({ status, onStatusChange, disabled = false }: StatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentStatus = statusOptions.find(option => option.value === status) || statusOptions[0];

  const handleStatusChange = (newStatus: "todo" | "in_progress" | "review" | "done" | "cancelled") => {
    onStatusChange(newStatus);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-0 hover:bg-transparent",
            currentStatus.color,
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <Badge className={cn("cursor-pointer", currentStatus.color)}>
            {currentStatus.label}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleStatusChange(option.value as "done" | "cancelled" | "todo" | "in_progress" | "review")}
            className="flex items-center justify-between"
          >
            <span>{option.label}</span>
            {status === option.value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
