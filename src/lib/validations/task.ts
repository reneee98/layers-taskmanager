import { z } from "zod";

export const taskStatusEnum = z.enum(["todo", "in_progress", "review", "sent_to_client", "done", "cancelled"]);

export const taskPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const taskSchema = z.object({
  project_id: z.union([
    z.string().uuid("Neplatné ID projektu"),
    z.null(),
    z.undefined(),
    z.literal("")
  ]).transform((val) => val === "" || val === undefined ? null : val).optional().nullable(),
  parent_task_id: z.union([
    z.string().uuid("Neplatné ID parent task"),
    z.null(),
    z.undefined(),
    z.literal("")
  ]).transform((val) => val === "" || val === undefined ? null : val).optional().nullable(),
  title: z.string().min(1, "Názov je povinný").max(500, "Názov je príliš dlhý"),
  description: z.string().optional().or(z.literal("")).nullable(),
  status: taskStatusEnum.default("todo").optional(),
  priority: taskPriorityEnum.default("medium").optional(),
  assigned_to: z.string().uuid("Neplatné ID používateľa").optional().nullable(),
  assignee_id: z.string().uuid("Neplatné ID používateľa").optional().nullable(),
  estimated_hours: z.number().min(0, "Odhad musí byť kladný").optional().nullable(),
  hourly_rate_cents: z.number().min(0, "Hodinová sadzba musí byť kladná").optional().nullable(),
  budget_amount: z.number().min(0, "Budget musí byť kladný").optional().nullable(),
  budget_cents: z.number().min(0, "Budget v centoch musí byť kladný").optional().nullable(),
  start_date: z.string().optional().or(z.literal("")).nullable(),
  end_date: z.string().optional().or(z.literal("")).nullable(),
  due_date: z.string().optional().or(z.literal("")).nullable(),
  order_index: z.number().int("Poradie musí byť celé číslo").default(0).optional(),
});

export const updateTaskSchema = taskSchema.partial();

export const reorderTasksSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().uuid(),
      order_index: z.number().int(),
    })
  ),
});

export type TaskFormData = z.infer<typeof taskSchema>;
export type UpdateTaskData = z.infer<typeof updateTaskSchema>;
export type TaskStatus = z.infer<typeof taskStatusEnum>;
export type TaskPriority = z.infer<typeof taskPriorityEnum>;
export type ReorderTasksData = z.infer<typeof reorderTasksSchema>;

