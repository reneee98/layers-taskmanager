"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskSchema, type TaskFormData } from "@/lib/validations/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { Task, Project } from "@/types/database";
import { resolveProjectColor } from "@/lib/project-colors";
import {
  TASK_COLOR_PALETTE,
  getRandomTaskColor,
  normalizeTaskColor,
  resolveTaskColor,
} from "@/lib/task-colors";
import { Palette, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskFormProps {
  task?: Task;
  projectId?: string;
  parentTaskId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TaskForm = ({
  task,
  projectId,
  parentTaskId,
  open,
  onOpenChange,
  onSuccess,
}: TaskFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const isEditing = !!task;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: task
      ? {
          project_id: task.project_id,
          title: task.title,
          description: task.description || "",
          color: resolveTaskColor(task),
          status: task.status,
          priority: task.priority,
          assigned_to: (task as any).assigned_to || undefined,
          estimated_hours: task.estimated_hours || undefined,
          start_date: task.start_date || "",
          end_date: task.end_date || "",
          due_date: task.due_date || "",
        }
      : {
          project_id: projectId || "",
          parent_task_id: parentTaskId || null,
          status: "todo",
          priority: "medium",
          color: getRandomTaskColor(),
        },
  });

  useEffect(() => {
    const fetchProjects = async () => {
      const response = await fetch("/api/projects");
      const result = await response.json();
      if (result.success) {
        setProjects(result.data);
      }
    };
    if (!projectId) {
      fetchProjects();
    }
  }, [projectId]);

  const handleFormSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);

    try {
      const url = isEditing ? `/api/tasks/${task.id}` : "/api/tasks";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        toast({
          title: "Chyba",
          description: result.error || "Nepodarilo sa uložiť úlohu",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Úspech",
        description: isEditing ? "Úloha bola aktualizovaná" : "Úloha bola vytvorená",
      });

      reset({
        project_id: projectId || "",
        parent_task_id: parentTaskId || null,
        status: "todo",
        priority: "medium",
        color: getRandomTaskColor(),
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nastala neočakávaná chyba",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTaskColor = normalizeTaskColor(watch("color")) || TASK_COLOR_PALETTE[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Upraviť úlohu" : parentTaskId ? "Pridať pod-úlohu" : "Pridať úlohu"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Upravte údaje o úlohe"
              : parentTaskId
                ? "Vytvorte novú pod-úlohu"
                : "Vytvorte novú úlohu"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {!projectId && (
            <div className="space-y-2">
              <Label htmlFor="project_id">Projekt *</Label>
              <Select
                value={watch("project_id") || undefined}
                onValueChange={(value) => setValue("project_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte projekt" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-full opacity-70"
                          style={{ backgroundColor: resolveProjectColor(project) || undefined }}
                        />
                        <span>
                          {project.name} ({project.code})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project_id && (
                <p className="text-sm text-destructive">{errors.project_id.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Názov *</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Popis</Label>
            <Input id="description" {...register("description")} />
          </div>

          <div className="space-y-2.5 rounded-xl border border-border/80 bg-muted/15 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="task-color" className="text-xs font-semibold">
                  Farba úlohy
                </Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Vyberte farbu alebo použite náhodnú.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs"
                onClick={() => setValue("color", getRandomTaskColor(), { shouldDirty: true })}
              >
                <Shuffle aria-hidden="true" className="h-3.5 w-3.5" />
                Náhodná
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {TASK_COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue("color", color, { shouldDirty: true })}
                  className={cn(
                    "h-7 w-7 rounded-full border border-black/5 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selectedTaskColor === color && "ring-2 ring-foreground/40 ring-offset-2"
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Vybrať farbu ${color}`}
                  aria-pressed={selectedTaskColor === color}
                />
              ))}
              <label
                className="relative flex h-7 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
                title="Vlastná farba"
              >
                <Palette aria-hidden="true" className="h-3.5 w-3.5" />
                <input
                  id="task-color"
                  type="color"
                  value={selectedTaskColor}
                  onChange={(event) =>
                    setValue(
                      "color",
                      normalizeTaskColor(event.target.value) || getRandomTaskColor(),
                      { shouldDirty: true }
                    )
                  }
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Vlastná farba úlohy"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(value) => setValue("status", value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Na spracovanie</SelectItem>
                  <SelectItem value="in_progress">V procese</SelectItem>
                  <SelectItem value="review">Na kontrole</SelectItem>
                  <SelectItem value="done">Dokončené</SelectItem>
                  <SelectItem value="cancelled">Zrušené</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priorita</Label>
              <Select
                value={watch("priority")}
                onValueChange={(value) => setValue("priority", value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_hours">Odhad hodín</Label>
              <Input
                id="estimated_hours"
                type="number"
                step="0.001"
                {...register("estimated_hours", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Dátum začiatku</Label>
              <Input id="start_date" type="date" {...register("start_date")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Dátum konca</Label>
              <Input id="end_date" type="date" {...register("end_date")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Termín</Label>
              <Input id="due_date" type="date" {...register("due_date")} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Zrušiť
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Ukladám..." : isEditing ? "Uložiť" : "Vytvoriť"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
