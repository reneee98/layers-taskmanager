"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Task, Profile } from "@/types/database";
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
  Plus,
  X,
} from "lucide-react";
import { formatHours, formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { cn, stripHtml, truncateTaskTitle } from "@/lib/utils";
import { getTextPreview } from "@/lib/utils/html";
import { getDeadlineStatus, getDeadlineDotClass } from "@/lib/deadline-utils";
import { isProjectArchived } from "@/lib/project-utils";
import type { Project } from "@/types/database";
import { usePermission } from "@/hooks/usePermissions";

interface TaskRowProps {
  task: Task;
  onUpdate: (taskId: string, data: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onEdit?: (task: Task) => void;
  projectId: string;
  project?: Project | null; // Optional project data to check if archived
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
    color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800", 
    iconColor: "text-blue-500" 
  },
  review: { 
    label: "Review", 
    icon: Eye, 
    color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800", 
    iconColor: "text-amber-500" 
  },
  sent_to_client: { 
    label: "Sent to Client", 
    icon: Send, 
    color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800", 
    iconColor: "text-purple-500" 
  },
  done: { 
    label: "Done", 
    icon: CheckCircle, 
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800", 
    iconColor: "text-emerald-500" 
  },
  cancelled: { 
    label: "Cancelled", 
    icon: XCircle, 
    color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800", 
    iconColor: "text-red-500" 
  },
};

const priorityConfig = {
  low: { 
    label: "Low", 
    icon: ArrowDown, 
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800", 
    iconColor: "text-emerald-500" 
  },
  medium: { 
    label: "Medium", 
    icon: ArrowUp, 
    color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800", 
    iconColor: "text-amber-500" 
  },
  high: { 
    label: "High", 
    icon: ArrowUpRight, 
    color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800", 
    iconColor: "text-orange-500" 
  },
  urgent: { 
    label: "Urgent", 
    icon: Flame, 
    color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800", 
    iconColor: "text-red-500" 
  },
};

interface AssigneeCellProps {
  task: Task;
  onUpdate: (taskId: string, data: Partial<Task>) => Promise<void>;
}

function AssigneeCell({ task, onUpdate }: AssigneeCellProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/workspace-users");
        const result = await response.json();
        if (result.success) {
          setUsers(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch workspace users:", error);
      }
    };
    fetchUsers();
  }, []);

  const handleAddAssignee = async (userId: string) => {
    if (userId === "none") return;

    const currentAssigneeIds = (task.assignees || []).map(a => a.user_id || a.id);
    if (currentAssigneeIds.includes(userId)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/assignees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assigneeIds: [...currentAssigneeIds, userId],
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh assignees
        const assigneesResponse = await fetch(`/api/tasks/${task.id}/assignees`);
        const assigneesResult = await assigneesResponse.json();
        if (assigneesResult.success) {
          // Update task with new assignees
          await onUpdate(task.id, { assignees: assigneesResult.data } as any);
        }
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to add assignee:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    const currentAssigneeIds = (task.assignees || []).map(a => a.user_id || a.id);
    const newAssigneeIds = currentAssigneeIds.filter(id => id !== userId);

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/assignees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assigneeIds: newAssigneeIds,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh assignees
        const assigneesResponse = await fetch(`/api/tasks/${task.id}/assignees`);
        const assigneesResult = await assigneesResponse.json();
        if (assigneesResult.success) {
          // Update task with new assignees
          await onUpdate(task.id, { assignees: assigneesResult.data } as any);
        }
      }
    } catch (error) {
      console.error("Failed to remove assignee:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const availableUsers = users.filter(user => {
    const currentAssigneeIds = (task.assignees || []).map(a => a.user_id || a.id);
    return !currentAssigneeIds.includes(user.id);
  });

  return (
    <div className="flex items-center gap-1">
      {task.assignees && task.assignees.length > 0 ? (
        <>
          {task.assignees.slice(0, 3).map((assignee) => {
            const assigneeId = assignee.user_id || assignee.id;
            return (
              <div
                key={assigneeId}
                className="relative group/assignee"
              >
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-xs">
                    {getInitials((assignee as any).display_name || (assignee as any).email || (assignee as any).user?.name || '?')}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full p-0 bg-black text-white opacity-0 group-hover/assignee:opacity-100 transition-opacity flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAssignee(assigneeId);
                  }}
                  disabled={isLoading}
                >
                  <X className="h-2 w-2" />
                </Button>
              </div>
            );
          })}
          {task.assignees.length > 3 && (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center border-2 border-background">
              <span className="text-xs text-muted-foreground">+{task.assignees.length - 3}</span>
            </div>
          )}
        </>
      ) : (
        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
          <span className="text-xs text-muted-foreground">-</span>
        </div>
      )}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 rounded-full p-0 hover:bg-accent border border-dashed border-border hover:border-solid"
            disabled={isLoading || availableUsers.length === 0}
          >
            <Plus className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {availableUsers.length === 0 ? (
            <DropdownMenuItem disabled>Všetci používatelia sú už priradení</DropdownMenuItem>
          ) : (
            availableUsers.map((user) => {
              const userName = (user as any).name || (user as any).display_name || user.email || "Neznámy";
              return (
                <DropdownMenuItem
                  key={user.id}
                  onClick={() => handleAddAssignee(user.id)}
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{userName}</span>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function TaskRow({
  task,
  onUpdate,
  onDelete,
  onEdit,
  projectId,
  project,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onTaskUpdated,
}: TaskRowProps) {
  const { hasPermission: canViewPrices } = usePermission('financial', 'view_prices');
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
    // Ensure projectId is not empty - use task.project_id as fallback, then 'unknown'
    const validProjectId = (projectId && projectId.trim() !== '') 
      ? projectId 
      : (task.project_id && task.project_id.trim() !== '') 
        ? task.project_id 
        : 'unknown';
    router.push(`/projects/${validProjectId}/tasks/${task.id}`);
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

  // Get deadline status and dot class
  // Don't show deadline dot for done/cancelled tasks or tasks in archived projects
  const deadlineStatus = getDeadlineStatus(task.due_date);
  const deadlineDotClass = getDeadlineDotClass(deadlineStatus);
  const isTaskInArchivedProject = isProjectArchived(project);
  const showDeadlineDot = !!deadlineDotClass && 
                          task.status !== "done" && 
                          task.status !== "cancelled" && 
                          !isTaskInArchivedProject;

  return (
    <TableRow
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={handleRowClick}
      className={cn(
        "group cursor-pointer bg-card hover:bg-muted/50 border-b border-border",
        isDragging && "opacity-50",
        isUpdating && "opacity-60 pointer-events-none"
      )}
    >
      {/* Drag handle */}
      <TableCell className="py-3 px-4">
        <GripVertical className="drag-handle h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" />
      </TableCell>

      {/* Title */}
      <TableCell className="py-4 pl-6 pr-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center">
            <Link 
              href={task.project_id ? `/projects/${task.project_id}/tasks/${task.id}` : `/tasks/${task.id}`}
              className="font-semibold text-sm text-foreground hover:text-foreground/80 hover:underline inline-flex items-center gap-1 group/link"
              title={stripHtml(task.title)}
            >
              {truncateTaskTitle(task.title, 50)}
              <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
            </Link>
          </div>
          {task.project && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {task.project.name}
              {task.project.code && (
                <>
                  <span>•</span>
                  <span>{task.project.code}</span>
                </>
              )}
            </div>
          )}
          {task.description && (
            <div className="text-xs text-muted-foreground line-clamp-1">
              {getTextPreview(task.description, 80)}
            </div>
          )}
        </div>
      </TableCell>

      {/* Status - Inline Dropdown */}
      <TableCell className="py-4 pl-6 pr-2">
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
                  <div className={cn(
                    "cursor-pointer flex items-center gap-1.5 px-2 py-1 h-7 rounded-md border transition-all duration-200",
                    "text-xs font-medium whitespace-nowrap",
                    config.color,
                    "hover:opacity-80"
                  )}>
                    <IconComponent className={cn("h-3.5 w-3.5 flex-shrink-0", config.iconColor, task.status === "in_progress" && "animate-pulse")} />
                    <span className="whitespace-nowrap">{config.label}</span>
                    <ChevronDown className="h-3 w-3 opacity-70 flex-shrink-0" />
                  </div>
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
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                >
                  <IconComponent className={cn("h-4 w-4", config.iconColor, key === 'in_progress' && "animate-pulse")} />
                  <span className="font-medium">{config.label}</span>
                  {task.status === key && <Check className="h-4 w-4 ml-auto text-muted-foreground" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      {/* Assignees */}
      <TableCell className="py-4 pl-6 pr-2" onClick={(e) => e.stopPropagation()}>
        <AssigneeCell task={task} onUpdate={onUpdate} />
      </TableCell>

      {/* Time - Estimated hours (budget) */}
      <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 py-4 pl-6 pr-2 w-fit">
        {(() => {
          const estimatedHours = task.estimated_hours || 0;
          const actualHours = task.actual_hours || 0;
          
          // If budget (estimated_hours) is set, show it with clock icon
          if (estimatedHours > 0) {
            return (
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground font-medium">
                  {formatHours(actualHours)}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">
                  {formatHours(estimatedHours)}
                </span>
              </div>
            );
          }
          
          // If no budget, show nothing
          return <span className="text-xs text-muted-foreground italic">—</span>;
        })()}
      </TableCell>

      {/* Price - Fixed or Calculated */}
      {canViewPrices ? (
        <TableCell className="py-4 pl-6 pr-2 w-fit">
          {(() => {
            // Use project from props or from task.project
            const projectData = project || task.project;
            
            // Priority 1: Check if budget matches estimated_hours * hourly_rate (auto-calculated)
            const hasEstimatedHours = task.estimated_hours && task.estimated_hours > 0;
            const hasProjectRate = (projectData as any)?.hourly_rate_cents || projectData?.hourly_rate;
            const hasBudget = task.budget_cents && task.budget_cents > 0;
            
            if (hasEstimatedHours && hasProjectRate && hasBudget && projectData) {
              // Try hourly_rate_cents first, then hourly_rate as fallback
              const hourlyRateCents = (projectData as any).hourly_rate_cents || 
                                     (projectData.hourly_rate ? projectData.hourly_rate * 100 : 0);
              const hourlyRate = hourlyRateCents / 100;
              const calculatedBudget = (task.estimated_hours || 0) * hourlyRate * 100; // Convert to cents
              // Allow small rounding differences (within 1 cent)
              const isMatch = Math.abs(calculatedBudget - (task.budget_cents || 0)) <= 1;
              
              if (isMatch) {
                // Budget is auto-calculated from estimated hours - show it
                return (
                  <div className="flex items-center justify-end gap-1 text-xs font-medium">
                    <span className="text-green-600">
                      {formatCurrency((task.budget_cents || 0) / 100)}
                    </span>
                  </div>
                );
              }
            }

            // Priority 2: If there's a fixed budget amount (manually set), show it
            if (hasBudget) {
              return (
                <div className="flex items-center justify-end gap-1 text-xs font-medium">
                  <span className="text-green-600">
                    {formatCurrency((task.budget_cents || 0) / 100)}
                  </span>
                  <span className="text-xs text-muted-foreground">(fixná)</span>
                </div>
              );
            }
            
            // Priority 3: If there's calculated price from time entries, show it
            if (task.calculated_price && task.calculated_price > 0) {
              return (
                <div className="flex items-center justify-end gap-1 text-xs">
                  <span className="text-blue-600">
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
      ) : (
        <TableCell className="py-4 pl-6 pr-2 w-fit">
          <span className="text-muted-foreground">—</span>
        </TableCell>
      )}

      {/* Due date */}
      <TableCell className="py-4 pl-6 pr-2 w-fit">
        <div>
          {task.due_date ? (
            <div className="text-xs flex items-center gap-1 text-muted-foreground whitespace-nowrap">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{format(new Date(task.due_date), "dd.MM.yyyy")}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">—</span>
          )}
        </div>
      </TableCell>

      {/* Priority - Inline Dropdown */}
      <TableCell className="py-4 pl-6 pr-2">
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
                  <div className={cn(
                    "cursor-pointer flex items-center gap-1.5 px-2 py-1 h-7 rounded-md border transition-all duration-200",
                    "text-xs font-medium whitespace-nowrap",
                    config.color,
                    "hover:opacity-80"
                  )}>
                    <IconComponent className={cn("h-3.5 w-3.5 flex-shrink-0", config.iconColor, task.priority === "urgent" && "animate-pulse")} />
                    <span className="whitespace-nowrap">{config.label}</span>
                    <ChevronDown className="h-3 w-3 opacity-70 flex-shrink-0" />
                  </div>
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
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                >
                  <IconComponent className={cn("h-4 w-4", config.iconColor, key === 'urgent' && "animate-pulse")} />
                  <span className="font-medium">{config.label}</span>
                  {task.priority === key && <Check className="h-4 w-4 ml-auto text-muted-foreground" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      {/* Actions menu */}
      <TableCell className="py-4 px-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
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

