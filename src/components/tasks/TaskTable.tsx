"use client";

import { useState, useMemo } from "react";
import { Task } from "@/types/database";
import { TaskRow } from "./TaskRow";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter } from "lucide-react";

interface TaskTableProps {
  tasks: Task[];
  onUpdate: (taskId: string, data: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onEdit?: (task: Task) => void;
  onReorder?: (taskId: string, newIndex: number) => Promise<void>;
  projectId: string;
  onTaskUpdated?: () => void;
}

export function TaskTable({
  tasks,
  onUpdate,
  onDelete,
  onEdit,
  onReorder,
  projectId,
  onTaskUpdated,
}: TaskTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  // Drag and drop handlers
  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetTaskId: string) => {
    if (!draggedTaskId || draggedTaskId === targetTaskId || !onReorder) return;

    const draggedIndex = filteredTasks.findIndex((t) => t.id === draggedTaskId);
    const targetIndex = filteredTasks.findIndex((t) => t.id === targetTaskId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Optimistic update - reorder locally
    const newTasks = [...filteredTasks];
    const [draggedTask] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(targetIndex, 0, draggedTask);

    // Update order_index on server
    await onReorder(draggedTaskId, targetIndex);
    setDraggedTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hľadať úlohy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky statusy</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Priorita" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active filters */}
      {(statusFilter !== "all" ||
        priorityFilter !== "all" ||
        searchQuery) && (
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">Aktívne filtre:</span>
          {statusFilter !== "all" && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => setStatusFilter("all")}
            >
              Status: {statusFilter} ×
            </Badge>
          )}
          {priorityFilter !== "all" && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => setPriorityFilter("all")}
            >
              Priorita: {priorityFilter} ×
            </Badge>
          )}
          {searchQuery && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => setSearchQuery("")}
            >
              Hľadanie: {searchQuery} ×
            </Badge>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/80 hover:bg-muted border-b border-border">
              <TableHead className="w-[40px] text-xs font-semibold text-muted-foreground py-4 px-6 uppercase tracking-wider">{/* Drag handle */}</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground py-4 px-6 uppercase tracking-wider">Úloha</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground py-4 px-6 uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground py-4 px-6 uppercase tracking-wider">Assignee</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground py-4 px-6 w-fit uppercase tracking-wider">Čas</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground py-4 px-6 w-fit uppercase tracking-wider">Cena</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground py-4 px-6 w-fit uppercase tracking-wider">Deadline</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground py-4 px-6 uppercase tracking-wider">Priorita</TableHead>
              <TableHead className="w-[40px] text-xs font-semibold text-muted-foreground py-4 px-6 uppercase tracking-wider">{/* Actions */}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <td
                  colSpan={9}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                    ? "Žiadne úlohy nevyhovujú filtrom"
                    : "Žiadne úlohy"}
                </td>
              </TableRow>
            ) : (
              filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  projectId={projectId}
                  isDragging={draggedTaskId === task.id}
                  onDragStart={() => handleDragStart(task.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(task.id)}
                  onDragEnd={handleDragEnd}
                  onTaskUpdated={onTaskUpdated}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>
          Zobrazené: {filteredTasks.length} z {tasks.length} úloh
        </span>
        <div className="flex gap-4">
          <span>
            Celkom odhadované hodiny:{" "}
            {filteredTasks
              .reduce((sum, task) => sum + (task.estimated_hours || 0), 0)
              .toFixed(2)}{" "}
            h
          </span>
          <span>
            Celková cena:{" "}
            {filteredTasks
              .reduce((sum, task) => sum + (task.budget_cents ? task.budget_cents / 100 : 0), 0)
              .toLocaleString("sk-SK", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 2,
              })}
          </span>
        </div>
      </div>
    </div>
  );
}

