"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

const personalSettingsSchema = z.object({
  workspace_name: z.string().min(1, "Názov workspace je povinný"),
  first_name: z.string().min(1, "Meno je povinné"),
  last_name: z.string().min(1, "Priezvisko je povinné"),
  company_name: z.string().optional(),
  company_tax_id: z.string().optional(),
  company_address: z.string().optional(),
  company_phone: z.string().optional(),
  company_email: z.string().email("Neplatný email formát").optional().or(z.literal("")),
});

type PersonalSettingsInput = z.infer<typeof personalSettingsSchema>;

export function PersonalSettings() {
  const { workspace, refreshWorkspace } = useWorkspace();
  const { profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<PersonalSettingsInput>({
    resolver: zodResolver(personalSettingsSchema),
  });

  useEffect(() => {
    if (workspace && profile) {
      reset({
        workspace_name: workspace.name || "",
        first_name: (profile as any)?.first_name || (profile.display_name?.split(' ')[0] || ""),
        last_name: (profile as any)?.last_name || (profile.display_name?.split(' ').slice(1).join(' ') || ""),
        company_name: (workspace as any)?.company_name || "",
        company_tax_id: (workspace as any)?.company_tax_id || "",
        company_address: (workspace as any)?.company_address || "",
        company_phone: (workspace as any)?.company_phone || "",
        company_email: (workspace as any)?.company_email || "",
      });
    }
  }, [workspace, profile, reset]);

  const onSubmit = async (data: PersonalSettingsInput) => {
    setSaving(true);
    
    try {
      // Update workspace
      let updatedWorkspace = null;
      if (workspace) {
        const workspaceResponse = await fetch(`/api/workspaces/${workspace.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.workspace_name,
            company_name: data.company_name || null,
            company_tax_id: data.company_tax_id || null,
            company_address: data.company_address || null,
            company_phone: data.company_phone || null,
            company_email: data.company_email || null,
          }),
        });

        const workspaceResult = await workspaceResponse.json();
        if (!workspaceResult.success) {
          throw new Error(workspaceResult.error || "Nepodarilo sa aktualizovať workspace");
        }
        updatedWorkspace = workspaceResult.data;
      }

      // Update profile
      let updatedProfile = null;
      if (profile) {
        const profileResponse = await fetch(`/api/users/${profile.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: data.first_name,
            last_name: data.last_name,
            display_name: `${data.first_name} ${data.last_name}`,
          }),
        });

        const profileResult = await profileResponse.json();
        if (!profileResult.success) {
          throw new Error(profileResult.error || "Nepodarilo sa aktualizovať profil");
        }
        updatedProfile = profileResult.data;
      }

      // Refresh data
      if (refreshWorkspace) await refreshWorkspace();
      if (refreshProfile) await refreshProfile();

      // Reset form with fresh data from API responses
      if (updatedWorkspace && (updatedProfile || profile)) {
        const finalProfile = updatedProfile || profile;
        reset({
          workspace_name: updatedWorkspace.name || "",
          first_name: (finalProfile as any)?.first_name || (finalProfile.display_name?.split(' ')[0] || ""),
          last_name: (finalProfile as any)?.last_name || (finalProfile.display_name?.split(' ').slice(1).join(' ') || ""),
          company_name: updatedWorkspace.company_name || "",
          company_tax_id: updatedWorkspace.company_tax_id || "",
          company_address: updatedWorkspace.company_address || "",
          company_phone: updatedWorkspace.company_phone || "",
          company_email: updatedWorkspace.company_email || "",
        });
      }

      toast({
        title: "Nastavenia uložené",
        description: "Vaše osobné nastavenia boli úspešne aktualizované",
      });
    } catch (error) {
      console.error("Error updating personal settings:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa uložiť nastavenia",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Osobné informácie</CardTitle>
          <CardDescription>
            Spravujte svoje osobné údaje a údaje o firme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Workspace Name */}
            <div className="space-y-2">
              <Label htmlFor="workspace_name">Názov workspace</Label>
              <Input
                id="workspace_name"
                {...register("workspace_name")}
                placeholder="Názov vášho workspace"
              />
              {errors.workspace_name && (
                <p className="text-sm text-destructive">{errors.workspace_name.message}</p>
              )}
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="first_name">Meno</Label>
              <Input
                id="first_name"
                {...register("first_name")}
                placeholder="Vaše meno"
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="last_name">Priezvisko</Label>
              <Input
                id="last_name"
                {...register("last_name")}
                placeholder="Vaše priezvisko"
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>

            {/* Company Section */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h3 className="text-lg font-semibold mb-2">Údaje o firme</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Voliteľné údaje o vašej firme/spoločnosti
                </p>
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="company_name">Názov firmy</Label>
                <Input
                  id="company_name"
                  {...register("company_name")}
                  placeholder="Názov firmy/spoločnosti"
                />
                {errors.company_name && (
                  <p className="text-sm text-destructive">{errors.company_name.message}</p>
                )}
              </div>

              {/* Company Tax ID */}
              <div className="space-y-2">
                <Label htmlFor="company_tax_id">IČO/DIČ</Label>
                <Input
                  id="company_tax_id"
                  {...register("company_tax_id")}
                  placeholder="IČO/DIČ firmy"
                />
                {errors.company_tax_id && (
                  <p className="text-sm text-destructive">{errors.company_tax_id.message}</p>
                )}
              </div>

              {/* Company Address */}
              <div className="space-y-2">
                <Label htmlFor="company_address">Adresa firmy</Label>
                <Input
                  id="company_address"
                  {...register("company_address")}
                  placeholder="Adresa firmy"
                />
                {errors.company_address && (
                  <p className="text-sm text-destructive">{errors.company_address.message}</p>
                )}
              </div>

              {/* Company Phone */}
              <div className="space-y-2">
                <Label htmlFor="company_phone">Telefón</Label>
                <Input
                  id="company_phone"
                  {...register("company_phone")}
                  placeholder="Telefón firmy"
                />
                {errors.company_phone && (
                  <p className="text-sm text-destructive">{errors.company_phone.message}</p>
                )}
              </div>

              {/* Company Email */}
              <div className="space-y-2">
                <Label htmlFor="company_email">Email firmy</Label>
                <Input
                  id="company_email"
                  type="email"
                  {...register("company_email")}
                  placeholder="Email firmy"
                />
                {errors.company_email && (
                  <p className="text-sm text-destructive">{errors.company_email.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={!isDirty || saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Ukladám..." : "Uložiť nastavenia"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

