import { z } from "zod";

export const costItemSchema = z.object({
  project_id: z.union([
    z.string().uuid("Neplatné ID projektu"),
    z.null(),
    z.undefined(),
    z.literal("")
  ]).transform((val) => val === "" || val === undefined ? null : val).optional().nullable(),
  task_id: z.union([
    z.string().uuid("Neplatné ID úlohy"),
    z.null(),
    z.undefined(),
    z.literal("")
  ]).transform((val) => val === "" || val === undefined ? null : val).optional().nullable(),
  name: z.string().min(1, "Názov je povinný").max(255, "Názov je príliš dlhý"),
  description: z.string().max(1000, "Popis je príliš dlhý").optional().nullable(),
  category: z.string().max(100, "Kategória je príliš dlhá").optional().nullable(),
  amount: z.number().min(0, "Suma musí byť kladná"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný dátum (YYYY-MM-DD)"),
  is_billable: z.boolean().default(true).optional(),
});

export const costItemUpdateSchema = costItemSchema.partial().omit({ project_id: true });

export type CostItemInput = z.infer<typeof costItemSchema>;
export type CostItemUpdate = z.infer<typeof costItemUpdateSchema>;
