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
  const [isPersonalProject, setIsPersonalProject] = useState(false);
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
      hourly_rate: null,
      fixed_fee: null,
      external_costs_budget: null,
    },
  });

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
            const isPersonal = freshProject.name === "Osobné úlohy" || 
              (freshProject.code && (freshProject.code === "PERSONAL" || freshProject.code.startsWith("PERSONAL-")));
            setIsPersonalProject(isPersonal);
            
            reset({
              client_id: freshProject.client_id,
              name: freshProject.name,
              code: freshProject.code || "",
              description: freshProject.description || "",
              status: freshProject.status,
              currency: "EUR",
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
          const isPersonal = !!project.name && project.name === "Osobné úlohy" ||
            !!(project.code && (project.code === "PERSONAL" || project.code.startsWith("PERSONAL-")));
          setIsPersonalProject(isPersonal);
          
          reset({
            client_id: project.client_id,
            name: project.name,
            code: project.code || "",
            description: project.description || "",
            status: project.status,
            currency: "EUR",
            hourly_rate: project.hourly_rate || null,
            fixed_fee: project.fixed_fee || null,
            external_costs_budget: null,
            start_date: project.start_date || "",
            end_date: project.end_date || "",
            notes: "",
          });
        }
      } else {
        setIsPersonalProject(false);
        reset({
          status: "draft",
          currency: "EUR",
          hourly_rate: null,
          fixed_fee: null,
          external_costs_budget: null,
        });
      }
    };
    
    resetForm();
  }, [project?.id, reset, open]);

  const isPersonalProjectFromData = project && (
    project.name === "Osobné úlohy" || 
    (project.code && (project.code === "PERSONAL" || project.code.startsWith("PERSONAL-"))) ||
    !project.code
  );
  const finalIsPersonalProject = isPersonalProjectFromData || isPersonalProject;

  const handleFormSubmit = async (data: ProjectFormData | UpdateProjectData) => {
    setIsSubmitting(true);

    try {
      const url = isEditing ? `/api/projects/${project.id}` : "/api/projects";
      const method = isEditing ? "PATCH" : "POST";
      
      // Prevent status change for personal project
      if (finalIsPersonalProject && data.status !== undefined) {
        delete (data as any).status;
      }
      
      // Prevent client assignment for personal project
      if (finalIsPersonalProject && data.client_id !== undefined) {
        (data as any).client_id = null;
      }
      
      // For personal projects, set code to null and status to active
      if (finalIsPersonalProject) {
        (data as any).code = null;
        (data as any).status = "active";
        (data as any).client_id = null;
      }

      // Clean up data - convert empty strings to null for optional fields
      const cleanedData = {
        ...data,
        start_date: data.start_date && data.start_date.trim() !== "" ? data.start_date : null,
        end_date: data.end_date && data.end_date.trim() !== "" ? data.end_date : null,
        code: data.code && data.code.trim() !== "" ? data.code : null,
        description: data.description && data.description.trim() !== "" ? data.description : null,
        notes: data.notes && data.notes.trim() !== "" ? data.notes : null,
        currency: data.currency && data.currency.trim() !== "" ? data.currency : null,
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
          {!isEditing && (
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
              <input
                type="checkbox"
                id="isPersonal"
                checked={isPersonalProject}
                onChange={(e) => setIsPersonalProject(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isPersonal" className="text-sm font-medium cursor-pointer">
                Osobný projekt (bez kódu, klienta a statusu)
              </Label>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {!finalIsPersonalProject && (
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

            {!finalIsPersonalProject ? (
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

            <div className="space-y-2">
              <Label htmlFor="currency">Mena</Label>
              <Input id="currency" {...register("currency")} placeholder="EUR" />
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
              <Label htmlFor="hourly_rate">Hodinová sadzba (€) - voliteľné</Label>
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
              <Label htmlFor="fixed_fee">Fixný poplatok (€) - voliteľné</Label>
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
              <Label htmlFor="external_costs_budget">Rozpočet nákladov (€) - voliteľné</Label>
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