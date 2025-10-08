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
  status: projectStatusEnum,
  code: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  currency: z.string().length(3, "Mena musí mať 3 znaky").default("EUR").optional().or(z.literal("")),
  start_date: z.string().optional().or(z.literal("")).nullable(),
  end_date: z.string().optional().or(z.literal("")).nullable(),
  hourly_rate: z.number().min(0, "Hodinová sadzba musí byť kladná").optional().nullable(),
  fixed_fee: z.number().min(0, "Fixný poplatok musí byť kladný").optional().nullable(),
  external_costs_budget: z.number().min(0, "Rozpočet nákladov musí byť kladný").optional().nullable(),
  notes: z.string().optional().or(z.literal("")),
});

export const updateProjectSchema = projectSchema.partial();

export type ProjectFormData = z.infer<typeof projectSchema>;
export type UpdateProjectData = z.infer<typeof updateProjectSchema>;
export type ProjectStatus = z.infer<typeof projectStatusEnum>;

