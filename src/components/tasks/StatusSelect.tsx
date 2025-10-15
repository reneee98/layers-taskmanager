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
import { Check, ChevronDown, Circle, Play, Eye, CheckCircle, XCircle, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusSelectProps {
  status: "todo" | "in_progress" | "review" | "sent_to_client" | "done" | "cancelled";
  onStatusChange: (status: "todo" | "in_progress" | "review" | "sent_to_client" | "done" | "cancelled") => void;
  disabled?: boolean;
}

const statusOptions = [
  { 
    value: "todo", 
    label: "To Do", 
    icon: Circle,
    color: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
    iconColor: "text-slate-500"
  },
  { 
    value: "in_progress", 
    label: "In Progress", 
    icon: Play,
    color: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
    iconColor: "text-blue-500"
  },
  { 
    value: "review", 
    label: "Review", 
    icon: Eye,
    color: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200",
    iconColor: "text-amber-500"
  },
  { 
    value: "sent_to_client", 
    label: "Sent to Client", 
    icon: Send,
    color: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200",
    iconColor: "text-purple-500"
  },
  { 
    value: "done", 
    label: "Done", 
    icon: CheckCircle,
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200",
    iconColor: "text-emerald-500"
  },
  { 
    value: "cancelled", 
    label: "Cancelled", 
    icon: XCircle,
    color: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
    iconColor: "text-red-500"
  },
];

export function StatusSelect({ status, onStatusChange, disabled = false }: StatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentStatus = statusOptions.find(option => option.value === status) || statusOptions[0];

  const handleStatusChange = (newStatus: "todo" | "in_progress" | "review" | "sent_to_client" | "done" | "cancelled") => {
    onStatusChange(newStatus);
    setIsOpen(false);
  };

  const IconComponent = currentStatus.icon;

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
          <Badge className={cn("cursor-pointer flex items-center gap-2 px-3 py-1.5 transition-all duration-200", currentStatus.color)}>
            <IconComponent className={cn("h-4 w-4", currentStatus.iconColor, status === "in_progress" && "animate-pulse")} />
            <span className="font-medium">{currentStatus.label}</span>
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 p-2">
        {statusOptions.map((option) => {
          const OptionIcon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleStatusChange(option.value as "done" | "cancelled" | "todo" | "in_progress" | "review" | "sent_to_client")}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <OptionIcon className={cn("h-4 w-4", option.iconColor, option.value === "in_progress" && "animate-pulse")} />
              <span className="font-medium">{option.label}</span>
              {status === option.value && <Check className="h-4 w-4 ml-auto text-gray-500" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
