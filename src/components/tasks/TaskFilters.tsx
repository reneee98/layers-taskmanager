"use client";

import { useState } from "react";
import { Filter, X, ChevronDown, Circle, Play, Eye, Send, CheckCircle, XCircle, ArrowDown, ArrowUp, ArrowUpRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export interface TaskFilter {
  status: string[];
  priority: string[];
  assignee: string[];
  deadline: string;
}

interface TaskFiltersProps {
  filters: TaskFilter;
  onFiltersChange: (filters: TaskFilter) => void;
  totalTasks: number;
  filteredTasks: number;
}

const statusOptions = [
  { value: "todo", label: "Na spracovanie" },
  { value: "in_progress", label: "V procese" },
  { value: "review", label: "Na kontrole" },
  { value: "sent_to_client", label: "Odoslané klientovi" },
  { value: "done", label: "Dokončené" },
  { value: "cancelled", label: "Zrušené" },
];

const priorityOptions = [
  { value: "low", label: "Nízka" },
  { value: "medium", label: "Stredná" },
  { value: "high", label: "Vysoká" },
  { value: "urgent", label: "Naliehavá" },
];

const deadlineOptions = [
  { value: "all", label: "Všetky" },
  { value: "today", label: "Dnes" },
  { value: "tomorrow", label: "Zajtra" },
  { value: "this_week", label: "Tento týždeň" },
  { value: "overdue", label: "Prešli deadline" },
  { value: "no_deadline", label: "Bez deadline" },
];

export const TaskFilters = ({ filters, onFiltersChange, totalTasks, filteredTasks }: TaskFiltersProps) => {
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);

  // Get icon for status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return Circle;
      case 'in_progress': return Play;
      case 'review': return Eye;
      case 'sent_to_client': return Send;
      case 'done': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return Circle;
    }
  };

  // Get icon for priority
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'low': return ArrowDown;
      case 'medium': return ArrowUp;
      case 'high': return ArrowUpRight;
      case 'urgent': return Flame;
      default: return ArrowUp;
    }
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...filters.status, status]
      : filters.status.filter(s => s !== status);
    
    onFiltersChange({
      ...filters,
      status: newStatuses,
    });
  };

  const handlePriorityChange = (priority: string, checked: boolean) => {
    const newPriorities = checked
      ? [...filters.priority, priority]
      : filters.priority.filter(p => p !== priority);
    
    onFiltersChange({
      ...filters,
      priority: newPriorities,
    });
  };

  const handleDeadlineChange = (deadline: string) => {
    onFiltersChange({
      ...filters,
      deadline,
    });
    setIsDeadlineOpen(false);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: [],
      priority: [],
      assignee: [],
      deadline: "all",
    });
  };

  const hasActiveFilters = 
    filters.status.length > 0 || 
    filters.priority.length > 0 || 
    filters.assignee.length > 0 || 
    filters.deadline !== "all";

  const getStatusLabel = (status: string) => {
    return statusOptions.find(opt => opt.value === status)?.label || status;
  };

  const getPriorityLabel = (priority: string) => {
    return priorityOptions.find(opt => opt.value === priority)?.label || priority;
  };

  const getDeadlineLabel = (deadline: string) => {
    return deadlineOptions.find(opt => opt.value === deadline)?.label || deadline;
  };

  return (
    <div className="flex items-center gap-2 mb-0">
      {/* Filter Button */}
      <DropdownMenu open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-1.5 text-xs border-border hover:bg-accent text-foreground"
          >
            <Filter className="h-4 w-4 mr-1" />
            Status
            {filters.status.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-xs bg-muted text-muted-foreground">
                {filters.status.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {statusOptions.map((option) => {
            const IconComponent = getStatusIcon(option.value);
            return (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={filters.status.includes(option.value)}
                onCheckedChange={(checked) => handleStatusChange(option.value, checked)}
                className="text-sm flex items-center gap-2"
              >
                <IconComponent className="h-4 w-4" />
                {option.label}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Priority Filter */}
      <DropdownMenu open={isPriorityOpen} onOpenChange={setIsPriorityOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-1.5 text-xs border-border hover:bg-accent text-foreground"
          >
            Priorita
            {filters.priority.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-xs bg-muted text-muted-foreground">
                {filters.priority.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {priorityOptions.map((option) => {
            const IconComponent = getPriorityIcon(option.value);
            return (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={filters.priority.includes(option.value)}
                onCheckedChange={(checked) => handlePriorityChange(option.value, checked)}
                className="text-sm flex items-center gap-2"
              >
                <IconComponent className="h-4 w-4" />
                {option.label}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Deadline Filter */}
      <DropdownMenu open={isDeadlineOpen} onOpenChange={setIsDeadlineOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-1.5 text-xs border-border hover:bg-accent text-foreground"
          >
            Deadline
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {deadlineOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.deadline === option.value}
              onCheckedChange={() => handleDeadlineChange(option.value)}
              className="text-sm"
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Aktívne:</span>
          
          {filters.status.map((status) => (
            <Badge
              key={status}
              variant="outline"
              className="h-5 px-1.5 text-xs bg-muted text-foreground border-border"
            >
              {getStatusLabel(status)}
              <button
                onClick={() => handleStatusChange(status, false)}
                className="ml-1 hover:bg-accent rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {filters.priority.map((priority) => (
            <Badge
              key={priority}
              variant="outline"
              className="h-5 px-1.5 text-xs bg-muted text-foreground border-border"
            >
              {getPriorityLabel(priority)}
              <button
                onClick={() => handlePriorityChange(priority, false)}
                className="ml-1 hover:bg-accent rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {filters.deadline !== "all" && (
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-xs bg-muted text-foreground border-border"
            >
              {getDeadlineLabel(filters.deadline)}
              <button
                onClick={() => handleDeadlineChange("all")}
                className="ml-1 hover:bg-accent rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            Vymazať všetko
          </Button>
        </div>
      )}

      {/* Results Count */}
      <div className="ml-auto text-xs text-muted-foreground">
        {filteredTasks} z {totalTasks}
      </div>
    </div>
  );
};
