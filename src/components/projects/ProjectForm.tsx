"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectSchema, updateProjectSchema, type ProjectFormData, type UpdateProjectData } from "@/lib/validations/project";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { Project, Client } from "@/types/database";
import { generateProjectCode } from "@/lib/generate-project-code";
import { DatePicker } from "@/components/ui/date-picker";
import { ExchangeRateNotice } from "@/components/currency/ExchangeRateNotice";
import { SUPPORTED_CURRENCIES, getCurrencySymbol, normalizeCurrency } from "@/lib/currency";
import { Check, Dices } from "lucide-react";
import {
  getProjectFallbackColor,
  getRandomProjectColor,
  normalizeProjectColor,
  PROJECT_COLOR_PALETTE,
  projectColorToRgba,
} from "@/lib/project-colors";

interface ProjectFormProps {
  project?: Project;
  clients: Client[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ProjectForm = ({ project, clients: propClients, open, onOpenChange, onSuccess }: ProjectFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>(propClients);
  const [existingCodes, setExistingCodes] = useState<string[]>([]);
  const isEditing = !!project;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: "draft",
      currency: "EUR",
      color: getRandomProjectColor(),
      hourly_rate: null,
      fixed_fee: null,
      external_costs_budget: null,
    },
  });
  const selectedCurrency = normalizeCurrency(watch("currency"));
  const currencySymbol = getCurrencySymbol(selectedCurrency);

  useEffect(() => {
    setClients(propClients);
  }, [propClients]);

  // Load existing project codes for unique code generation
  useEffect(() => {
    const fetchExistingCodes = async () => {
      try {
        const response = await fetch("/api/projects");
        const result = await response.json();
        if (result.success) {
          const codes = result.data.map((p: Project) => p.code).filter(Boolean);
          setExistingCodes(codes);
        }
      } catch (error) {
        console.error("Failed to fetch existing codes:", error);
      }
    };

    if (open && !isEditing) {
      fetchExistingCodes();
    }
  }, [open, isEditing]);

  // Auto-generate code when name changes (only for new projects)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue("name", name);
    
    // Only auto-generate code for new projects
    if (!isEditing && name.trim()) {
      const baseCode = generateProjectCode(name);
      if (baseCode) {
        // Find next available number for this base code
        const pattern = new RegExp(`^${baseCode}-(\\d+)$`);
        let maxNumber = 0;

        for (const code of existingCodes) {
          const match = code.match(pattern);
          if (match) {
            const number = parseInt(match[1], 10);
            if (number > maxNumber) {
              maxNumber = number;
            }
          }
        }

        // Generate next number with zero padding
        const nextNumber = maxNumber + 1;
        const uniqueCode = `${baseCode}-${nextNumber.toString().padStart(3, "0")}`;
        setValue("code", uniqueCode);
      }
    }
  };

  // Reset form when project changes
  useEffect(() => {
    const resetForm = async () => {
      if (project) {
        // Always fetch fresh data from API when editing
        try {
          const response = await fetch(`/api/projects/${project.id}`);
          const result = await response.json();
          
          if (result.success && result.data) {
            const freshProject = result.data;
            
            reset({
              client_id: freshProject.client_id,
              name: freshProject.name,
              color:
                normalizeProjectColor(freshProject.color) ||
                getProjectFallbackColor(freshProject.id),
              code: freshProject.code || "",
              description: freshProject.description || "",
              status: freshProject.status,
              currency: freshProject.currency || "EUR",
              hourly_rate: freshProject.hourly_rate || null,
              fixed_fee: freshProject.fixed_fee || null,
              external_costs_budget: null,
              start_date: freshProject.start_date || "",
              end_date: freshProject.end_date || "",
              notes: "",
            });
          }
        } catch (error) {
          console.error("Failed to fetch project:", error);
          // Fallback to provided project if fetch fails
          reset({
            client_id: project.client_id,
            name: project.name,
            color: normalizeProjectColor(project.color) || getProjectFallbackColor(project.id),
            code: project.code || "",
            description: project.description || "",
            status: project.status,
            currency: project.currency || "EUR",
            hourly_rate: project.hourly_rate || null,
            fixed_fee: project.fixed_fee || null,
            external_costs_budget: null,
            start_date: project.start_date || "",
            end_date: project.end_date || "",
            notes: "",
          });
        }
      } else {
        reset({
          status: "draft",
          currency: "EUR",
          color: getRandomProjectColor(),
          hourly_rate: null,
          fixed_fee: null,
          external_costs_budget: null,
        });
      }
    };
    
    resetForm();
  }, [project?.id, reset, open]);

  // Check if this is an existing personal project (for edit mode) - only by name
  const isPersonalProject = project && project.name === "Osobné úlohy";
  const selectedProjectColor =
    normalizeProjectColor(watch("color")) || PROJECT_COLOR_PALETTE[0];

  const handleFormSubmit = async (data: ProjectFormData | UpdateProjectData) => {
    setIsSubmitting(true);

    try {
      const url = isEditing ? `/api/projects/${project.id}` : "/api/projects";
      const method = isEditing ? "PATCH" : "POST";
      
      // Prevent changes to personal project fields (only for existing personal projects in edit mode)
      if (isPersonalProject && isEditing) {
        if (data.status !== undefined) {
          delete (data as any).status;
        }
        if (data.client_id !== undefined) {
          (data as any).client_id = null;
        }
        if (data.code !== undefined) {
          (data as any).code = null;
        }
      }

      // Clean up data - convert empty strings to null for optional fields
      const cleanedData = {
        ...data,
        start_date: data.start_date && data.start_date.trim() !== "" ? data.start_date : null,
        end_date: data.end_date && data.end_date.trim() !== "" ? data.end_date : null,
        code: data.code && data.code.trim() !== "" ? data.code : null,
        description: data.description && data.description.trim() !== "" ? data.description : null,
        notes: data.notes && data.notes.trim() !== "" ? data.notes : null,
        currency: normalizeCurrency(data.currency),
      };

      // Handle number fields separately - convert empty strings to null
      if (data.hourly_rate && data.hourly_rate > 0) {
        cleanedData.hourly_rate = data.hourly_rate;
      } else {
        cleanedData.hourly_rate = null;
      }
      
      if (data.fixed_fee && data.fixed_fee > 0) {
        cleanedData.fixed_fee = data.fixed_fee;
      } else {
        cleanedData.fixed_fee = null;
      }
      
      if (data.external_costs_budget && data.external_costs_budget > 0) {
        cleanedData.external_costs_budget = data.external_costs_budget;
      } else {
        cleanedData.external_costs_budget = null;
      }

      // Force convert empty strings to null for number fields
      if (cleanedData.hourly_rate === 0) {
        cleanedData.hourly_rate = null;
      }
      if (cleanedData.fixed_fee === 0) {
        cleanedData.fixed_fee = null;
      }
      if (cleanedData.external_costs_budget === 0) {
        cleanedData.external_costs_budget = null;
      }

      // Remove undefined values
      Object.keys(cleanedData).forEach(key => {
        if ((cleanedData as any)[key] === undefined) {
          delete (cleanedData as any)[key];
        }
      });


      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanedData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Nastala chyba");
      }

      toast({
        title: "Úspech",
        description: isEditing ? "Projekt bol aktualizovaný" : "Projekt bol vytvorený",
      });

      reset();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Upraviť projekt" : "Pridať projekt"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Upravte údaje o projekte" : "Vyplňte údaje nového projektu"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {!isPersonalProject && (
              <div className="col-span-2 space-y-2">
                <Label htmlFor="client_id">Klient *</Label>
                <Select
                  value={watch("client_id") || ""}
                  onValueChange={(value) => setValue("client_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte klienta" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.client_id && (
                  <p className="text-sm text-destructive">{errors.client_id.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Názov *</Label>
              <Input 
                id="name" 
                {...register("name")} 
                onChange={handleNameChange}
                placeholder="Napr. E-shop, Web stránka, Mobile App"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Kód</Label>
              <Input 
                id="code" 
                {...register("code")} 
                placeholder="ESHOP-001"
                readOnly={!isEditing}
                className={!isEditing ? "bg-muted" : ""}
              />
              {!isEditing && (
                <p className="text-xs text-muted-foreground">
                  Kód sa vygeneruje automaticky z názvu
                </p>
              )}
              {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
            </div>

            {!isPersonalProject ? (
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={watch("status") || ""} onValueChange={(value) => setValue("status", value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Návrh</SelectItem>
                    <SelectItem value="active">Aktívny</SelectItem>
                    <SelectItem value="on_hold">Pozastavený</SelectItem>
                    <SelectItem value="completed">Dokončený</SelectItem>
                    <SelectItem value="cancelled">Zrušený</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Input 
                  id="status" 
                  value="Aktívny" 
                  disabled 
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Status osobného projektu sa nedá meniť
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Popis</Label>
              <Input id="description" {...register("description")} />
            </div>

            <div className="col-span-2 space-y-2.5 rounded-xl border border-border bg-muted/[0.18] p-3.5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Label>Farba projektu</Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Rovnaká farba označí projekt aj jeho úlohy v plánovači.
                  </p>
                </div>
                <div
                  className="mt-2 inline-flex w-fit items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-xs font-medium text-foreground sm:mt-0"
                  style={{
                    borderColor: projectColorToRgba(selectedProjectColor, 0.18),
                    backgroundColor: projectColorToRgba(selectedProjectColor, 0.04),
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: selectedProjectColor }}
                  />
                  {selectedProjectColor}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Farba projektu">
                {PROJECT_COLOR_PALETTE.map((color) => {
                  const isSelected = selectedProjectColor === color;

                  return (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`Vybrať farbu projektu ${color}`}
                      onClick={() => setValue("color", color, { shouldDirty: true })}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 shadow-sm outline-none transition-transform duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      style={{ backgroundColor: color }}
                    >
                      {isSelected && <Check className="h-4 w-4 text-white drop-shadow-sm" />}
                    </button>
                  );
                })}

                <label
                  className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border bg-card shadow-sm outline-none ring-offset-background transition-transform duration-150 hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                  title="Vlastná farba"
                >
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ backgroundColor: selectedProjectColor }}
                  />
                  <input
                    type="color"
                    value={selectedProjectColor}
                    onChange={(event) =>
                      setValue("color", event.target.value.toUpperCase(), { shouldDirty: true })
                    }
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Vybrať vlastnú farbu projektu"
                  />
                </label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setValue("color", getRandomProjectColor(), { shouldDirty: true })
                  }
                  className="ml-auto h-8 text-xs"
                >
                  <Dices className="h-3.5 w-3.5" />
                  Náhodná
                </Button>
              </div>
              {errors.color && (
                <p className="text-sm text-destructive">{errors.color.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Mena</Label>
              <Select
                value={selectedCurrency}
                onValueChange={(value) => setValue("currency", value as "EUR" | "USD")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte menu" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ExchangeRateNotice currency={selectedCurrency} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Dátum začiatku</Label>
              <DatePicker
                value={watch("start_date") || undefined}
                onChange={(value) => setValue("start_date", value || null)}
                placeholder="Vyberte dátum začiatku"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Dátum konca</Label>
              <DatePicker
                value={watch("end_date") || undefined}
                onChange={(value) => setValue("end_date", value || null)}
                placeholder="Vyberte dátum konca"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hodinová sadzba ({currencySymbol}) - voliteľné</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                placeholder="Napr. 50.00"
                {...register("hourly_rate", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Nechajte prázdne, ak sa sadzba nastavuje v úlohách
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixed_fee">Fixný poplatok ({currencySymbol}) - voliteľné</Label>
              <Input
                id="fixed_fee"
                type="number"
                step="0.01"
                placeholder="Napr. 1000.00"
                {...register("fixed_fee", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Nechajte prázdne, ak sa fakturuje len od hodín
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="external_costs_budget">Rozpočet nákladov ({currencySymbol}) - voliteľné</Label>
              <Input
                id="external_costs_budget"
                type="number"
                step="0.01"
                placeholder="Napr. 500.00"
                {...register("external_costs_budget", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Nechajte prázdne, ak nie sú plánované externé náklady
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Poznámky</Label>
              <Input id="notes" {...register("notes")} />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Zrušiť
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Ukladám..." : isEditing ? "Uložiť zmeny" : "Vytvoriť projekt"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
