import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(1, "Názov je povinný").max(255, "Názov je príliš dlhý"),
  email: z.string().email("Neplatný email").optional().or(z.literal("")),
  phone: z.string().max(50, "Telefón je príliš dlhý").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  tax_id: z.string().max(50, "IČO/DIČ je príliš dlhé").optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const updateClientSchema = clientSchema.partial();

export type ClientFormData = z.infer<typeof clientSchema>;
export type UpdateClientData = z.infer<typeof updateClientSchema>;

