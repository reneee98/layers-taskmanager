"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Task } from "@/types/database";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { formatHours } from "@/lib/format";
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
}

const statusColors = {
  todo: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  done: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const priorityColors = {
  low: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-500 border-red-500/20",
};

const statusLabels = {
  todo: "Todo",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
  cancelled: "Cancelled",
};

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
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
}: TaskRowProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRowClick = (e: React.MouseEvent) => {
    // Ignore clicks on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("[role='combobox']") ||
      target.closest("[role='menuitem']")
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
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" />
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

      {/* Status - Inline Select */}
      <TableCell>
        <Select
          value={task.status}
          onValueChange={handleStatusChange}
          disabled={isUpdating}
        >
          <SelectTrigger
            className={cn(
              "border-none shadow-none h-auto p-0 hover:bg-transparent",
              "focus:ring-0 focus:ring-offset-0"
            )}
          >
            <Badge
              variant="outline"
              className={cn("capitalize", statusColors[task.status])}
            >
              {statusLabels[task.status]}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      {/* Assignee */}
      <TableCell>
        {task.assigned_to ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {getInitials(task.assigned_to)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{task.assigned_to}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Nepriradené</span>
        )}
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

      {/* Priority - Inline Select */}
      <TableCell>
        <Select
          value={task.priority}
          onValueChange={handlePriorityChange}
          disabled={isUpdating}
        >
          <SelectTrigger
            className={cn(
              "border-none shadow-none h-auto p-0 hover:bg-transparent",
              "focus:ring-0 focus:ring-offset-0"
            )}
          >
            <Badge
              variant="outline"
              className={cn("capitalize", priorityColors[task.priority])}
            >
              {priorityLabels[task.priority]}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
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

