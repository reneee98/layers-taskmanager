import { z } from "zod";

export const timeEntrySchema = z.object({
  task_id: z.string().uuid("Neplatné ID úlohy"),
  user_id: z.string().uuid("Neplatné ID používateľa").optional(),
  hours: z.number().min(0.001, "Hodiny musia byť kladné").max(24, "Maximum 24 hodín"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný dátum (YYYY-MM-DD)"),
  description: z.string().optional().or(z.literal("")),
  hourly_rate: z.number().min(0, "Sadzba musí byť kladná").optional().nullable(),
  is_billable: z.boolean().default(true).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "Neplatný čas začiatku (HH:mm:ss)").optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "Neplatný čas konca (HH:mm:ss)").optional(),
});

export const timeEntryUpdateSchema = timeEntrySchema.partial().omit({ task_id: true });

export type TimeEntryInput = z.infer<typeof timeEntrySchema>;
export type TimeEntryUpdate = z.infer<typeof timeEntryUpdateSchema>;

