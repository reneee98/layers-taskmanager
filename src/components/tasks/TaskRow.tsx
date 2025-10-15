"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Task, User } from "@/types/database";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  Calendar,
  ExternalLink,
  Circle,
  Play,
  Eye,
  CheckCircle,
  XCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Flame,
  Send,
  ChevronDown,
  Check,
} from "lucide-react";
import { formatHours, formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getTextPreview } from "@/lib/utils/html";

interface TaskRowProps {
  task: Task;
  onUpdate: (taskId: string, data: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onEdit?: (task: Task) => void;
  projectId: string;
  isDragging?: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onTaskUpdated?: () => void;
}

const statusConfig = {
  todo: { 
    label: "Todo", 
    icon: Circle, 
    color: "bg-slate-100 text-slate-700 border-slate-200", 
    iconColor: "text-slate-500" 
  },
  in_progress: { 
    label: "In Progress", 
    icon: Play, 
    color: "bg-blue-100 text-blue-700 border-blue-200", 
    iconColor: "text-blue-500" 
  },
  review: { 
    label: "Review", 
    icon: Eye, 
    color: "bg-amber-100 text-amber-700 border-amber-200", 
    iconColor: "text-amber-500" 
  },
  sent_to_client: { 
    label: "Sent to Client", 
    icon: Send, 
    color: "bg-purple-100 text-purple-700 border-purple-200", 
    iconColor: "text-purple-500" 
  },
  done: { 
    label: "Done", 
    icon: CheckCircle, 
    color: "bg-emerald-100 text-emerald-700 border-emerald-200", 
    iconColor: "text-emerald-500" 
  },
  cancelled: { 
    label: "Cancelled", 
    icon: XCircle, 
    color: "bg-red-100 text-red-700 border-red-200", 
    iconColor: "text-red-500" 
  },
};

const priorityConfig = {
  low: { 
    label: "Low", 
    icon: ArrowDown, 
    color: "bg-emerald-100 text-emerald-700 border-emerald-200", 
    iconColor: "text-emerald-500" 
  },
  medium: { 
    label: "Medium", 
    icon: ArrowUp, 
    color: "bg-amber-100 text-amber-700 border-amber-200", 
    iconColor: "text-amber-500" 
  },
  high: { 
    label: "High", 
    icon: ArrowUpRight, 
    color: "bg-orange-100 text-orange-700 border-orange-200", 
    iconColor: "text-orange-500" 
  },
  urgent: { 
    label: "Urgent", 
    icon: Flame, 
    color: "bg-red-100 text-red-700 border-red-200", 
    iconColor: "text-red-500" 
  },
};

export function TaskRow({
  task,
  onUpdate,
  onDelete,
  onEdit,
  projectId,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onTaskUpdated,
}: TaskRowProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRowClick = (e: React.MouseEvent) => {
    // Ignore clicks on interactive elements or during drag
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("[role='combobox']") ||
      target.closest("[role='menuitem']") ||
      target.closest(".drag-handle") ||
      isDragging
    ) {
      return;
    }
    router.push(`/projects/${projectId}/tasks/${task.id}`);
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await onUpdate(task.id, { status: newStatus as Task["status"] });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    setIsUpdating(true);
    try {
      await onUpdate(task.id, { priority: newPriority as Task["priority"] });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Naozaj chcete vymazať túto úlohu?")) {
      await onDelete(task.id);
    }
  };

  // Get initials from assignee (if available)
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TableRow
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={handleRowClick}
      className={cn(
        "group transition-opacity cursor-pointer hover:bg-muted/50",
        isDragging && "opacity-50",
        isUpdating && "opacity-60 pointer-events-none"
      )}
    >
      {/* Drag handle */}
      <TableCell>
        <GripVertical className="drag-handle h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" />
      </TableCell>

      {/* Title */}
      <TableCell>
        <div className="space-y-1">
          <Link 
            href={`/projects/${task.project_id}?tab=time`}
            className="font-medium hover:text-primary hover:underline inline-flex items-center gap-1 group/link"
          >
            {task.title}
            <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
          </Link>
          {task.description && (
            <div className="text-sm text-muted-foreground line-clamp-1">
              {getTextPreview(task.description, 80)}
            </div>
          )}
        </div>
      </TableCell>

      {/* Status - Inline Dropdown */}
      <TableCell className="w-auto min-w-[100px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-auto p-0 hover:bg-transparent",
                isUpdating && "opacity-50 cursor-not-allowed"
              )}
              disabled={isUpdating}
            >
              {(() => {
                const config = statusConfig[task.status] || statusConfig.todo;
                const IconComponent = config.icon;
                return (
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize flex items-center gap-2 px-3 py-1.5 w-fit cursor-pointer transition-all duration-200",
                      config.color
                    )}
                  >
                    <IconComponent className={cn("h-4 w-4", config.iconColor, task.status === 'in_progress' && "animate-pulse")} />
                    <span className="font-medium">{config.label}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Badge>
                );
              })()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 p-2">
            {Object.entries(statusConfig).map(([key, config]) => {
              const IconComponent = config.icon;
              return (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleStatusChange(key as "todo" | "in_progress" | "review" | "sent_to_client" | "done" | "cancelled")}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <IconComponent className={cn("h-4 w-4", config.iconColor, key === 'in_progress' && "animate-pulse")} />
                  <span className="font-medium">{config.label}</span>
                  {task.status === key && <Check className="h-4 w-4 ml-auto text-gray-500" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      {/* Assignees - show avatars with overflow */}
      <TableCell>
        <div className="flex items-center gap-1">
          {task.assignees && task.assignees.length > 0 ? (
            <>
              {task.assignees.slice(0, 4).map((assignee, index) => (
                  <Avatar key={assignee.id} className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(assignee.user?.name || "")}
                    </AvatarFallback>
                  </Avatar>
              ))}
              {task.assignees.length > 4 && (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">
                    +{task.assignees.length - 4}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="text-xs text-muted-foreground/50">?</span>
            </div>
          )}
        </div>
      </TableCell>

      {/* Estimated hours */}
      <TableCell className="text-right">
        {task.estimated_hours ? (
          <div className="flex items-center justify-end gap-1 text-sm">
            <Clock className="h-3 w-3 text-muted-foreground" />
            {formatHours(task.estimated_hours)}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Spent hours (actual_hours) */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 text-sm">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {formatHours(task.actual_hours || 0)}
        </div>
      </TableCell>

      {/* Price - Fixed or Calculated */}
      <TableCell className="text-right">
        {(() => {
          // If there's a fixed budget amount, show it
          if (task.budget_amount && task.budget_amount > 0) {
            return (
              <div className="flex items-center justify-end gap-1 text-sm font-medium">
                <span className="text-green-600 dark:text-green-400">
                  {formatCurrency(task.budget_amount)}
                </span>
                <span className="text-xs text-muted-foreground">(fixná)</span>
              </div>
            );
          }
          
          // If there's calculated price from time entries, show it
          if (task.calculated_price && task.calculated_price > 0) {
            return (
              <div className="flex items-center justify-end gap-1 text-sm">
                <span className="text-blue-600 dark:text-blue-400">
                  {formatCurrency(task.calculated_price)}
                </span>
                <span className="text-xs text-muted-foreground">(čas)</span>
              </div>
            );
          }
          
          // No budget or time
          return <span className="text-muted-foreground">—</span>;
        })()}
      </TableCell>

      {/* Due date */}
      <TableCell>
        {task.due_date ? (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {format(new Date(task.due_date), "dd.MM.yyyy")}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Priority - Inline Dropdown */}
      <TableCell className="w-auto min-w-[80px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-auto p-0 hover:bg-transparent",
                isUpdating && "opacity-50 cursor-not-allowed"
              )}
              disabled={isUpdating}
            >
              {(() => {
                const config = priorityConfig[task.priority] || priorityConfig.low;
                const IconComponent = config.icon;
                return (
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize flex items-center gap-2 px-3 py-1.5 w-fit cursor-pointer transition-all duration-200",
                      config.color
                    )}
                  >
                    <IconComponent className={cn("h-4 w-4", config.iconColor, task.priority === 'urgent' && "animate-pulse")} />
                    <span className="font-medium">{config.label}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Badge>
                );
              })()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44 p-2">
            {Object.entries(priorityConfig).map(([key, config]) => {
              const IconComponent = config.icon;
              return (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handlePriorityChange(key as "low" | "medium" | "high" | "urgent")}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <IconComponent className={cn("h-4 w-4", config.iconColor, key === 'urgent' && "animate-pulse")} />
                  <span className="font-medium">{config.label}</span>
                  {task.priority === key && <Check className="h-4 w-4 ml-auto text-gray-500" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      {/* Actions menu */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <>
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Upraviť
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Vymazať
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

