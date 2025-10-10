import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Neplatný email formát"),
  password: z.string().min(8, "Heslo musí mať aspoň 8 znakov"),
  display_name: z.string().min(2, "Meno musí mať aspoň 2 znaky").max(50, "Meno je príliš dlhé"),
});

export const updateProfileSchema = z.object({
  display_name: z.string().min(2, "Meno musí mať aspoň 2 znaky").max(50, "Meno je príliš dlhé").optional(),
  avatar_url: z.string().url("Neplatný URL formát").optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'admin'], {
    errorMap: () => ({ message: "Neplatná rola" })
  }),
});

export const updateSettingsSchema = z.object({
  language: z.string().min(2, "Neplatný jazyk").optional(),
  theme: z.enum(['light', 'dark', 'system'], {
    errorMap: () => ({ message: "Neplatný motív" })
  }).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    task_updates: z.boolean().optional(),
  }).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
