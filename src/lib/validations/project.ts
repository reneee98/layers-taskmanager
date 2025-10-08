import { z } from "zod";

export const projectStatusEnum = z.enum([
  "draft",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);

export const projectSchema = z.object({
  client_id: z.string().uuid("Neplatné ID klienta"),
  name: z.string().min(1, "Názov je povinný").max(255, "Názov je príliš dlhý"),
  code: z
    .string()
    .min(1, "Kód je povinný")
    .max(50, "Kód je príliš dlhý")
    .regex(/^[A-Z0-9_-]+$/, "Kód môže obsahovať len veľké písmená, čísla, _ a -"),
  description: z.string().optional().or(z.literal("")),
  status: projectStatusEnum,
  currency: z.string().length(3, "Mena musí mať 3 znaky").default("EUR").optional(),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  budget_amount: z.number().min(0, "Rozpočet musí byť kladný").optional(),
  hourly_rate: z.number().min(0, "Hodinová sadzba musí byť kladná").optional().nullable(),
  fixed_fee: z.number().min(0, "Fixný poplatok musí byť kladný").optional().nullable(),
  external_costs_budget: z.number().min(0, "Rozpočet nákladov musí byť kladný").optional().nullable(),
  notes: z.string().optional().or(z.literal("")),
});

export const updateProjectSchema = projectSchema.partial();

export type ProjectFormData = z.infer<typeof projectSchema>;
export type UpdateProjectData = z.infer<typeof updateProjectSchema>;
export type ProjectStatus = z.infer<typeof projectStatusEnum>;

