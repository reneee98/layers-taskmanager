"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Building2, Loader2, Save, UserRound } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

const profileSchema = z
  .object({
    first_name: z.string().trim().min(1, "Meno je povinné").max(100, "Meno je príliš dlhé"),
    last_name: z
      .string()
      .trim()
      .min(1, "Priezvisko je povinné")
      .max(100, "Priezvisko je príliš dlhé"),
  })
  .refine((data) => `${data.first_name} ${data.last_name}`.length <= 50, {
    message: "Meno a priezvisko môžu mať spolu najviac 50 znakov.",
    path: ["last_name"],
  });

const workspaceSchema = z.object({
  workspace_name: z.string().trim().min(1, "Názov workspace je povinný"),
  company_name: z.string().optional(),
  company_tax_id: z.string().optional(),
  company_address: z.string().optional(),
  company_phone: z.string().optional(),
  company_email: z.string().email("Neplatný email formát").optional().or(z.literal("")),
});

type ProfileInput = z.infer<typeof profileSchema>;
type WorkspaceInput = z.infer<typeof workspaceSchema>;

export const PersonalSettings = () => {
  const { workspace, refreshWorkspace } = useWorkspace();
  const { profile, refreshProfile } = useAuth();
  const canEditWorkspace = !!profile && workspace?.owner_id === profile.id;
  const profileForm = useForm<ProfileInput>({ resolver: zodResolver(profileSchema) });
  const workspaceForm = useForm<WorkspaceInput>({ resolver: zodResolver(workspaceSchema) });
  const { reset: resetProfile } = profileForm;
  const { reset: resetWorkspace } = workspaceForm;

  useEffect(() => {
    if (!profile) return;
    const name = profile.display_name?.includes("@") ? "" : profile.display_name || "";
    resetProfile({
      first_name: profile.first_name ?? name.split(" ")[0],
      last_name: profile.last_name ?? name.split(" ").slice(1).join(" "),
    });
  }, [profile, resetProfile]);

  useEffect(() => {
    if (!workspace) return;
    resetWorkspace({
      workspace_name: workspace.name,
      company_name: workspace.company_name || "",
      company_tax_id: workspace.company_tax_id || "",
      company_address: workspace.company_address || "",
      company_phone: workspace.company_phone || "",
      company_email: workspace.company_email || "",
    });
  }, [workspace, resetWorkspace]);

  const handleSaveProfile = async (data: ProfileInput) => {
    if (!profile) return;
    try {
      const response = await fetch(`/api/users/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, display_name: `${data.first_name} ${data.last_name}` }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error || "Nepodarilo sa uložiť profil");
      await refreshProfile(true);
      resetProfile(data);
      toast({ title: "Profil uložený", description: "Vaše meno bolo aktualizované." });
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa uložiť profil",
        variant: "destructive",
      });
    }
  };

  const handleSaveWorkspace = async (data: WorkspaceInput) => {
    if (!workspace || !canEditWorkspace) return;
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
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
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error || "Nepodarilo sa uložiť firemné údaje");
      await refreshWorkspace(false);
      resetWorkspace(data);
      toast({ title: "Firemné údaje uložené" });
    } catch (error) {
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa uložiť firemné údaje",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={profileForm.handleSubmit(handleSaveProfile)}
        className="surface-panel overflow-hidden"
      >
        <section className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="border-b border-border bg-muted/[0.16] px-5 py-5 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Osobný profil</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Vaše meno v úlohách, reportoch a v navigácii.
            </p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">Meno</Label>
              <Input
                id="first_name"
                autoComplete="given-name"
                {...profileForm.register("first_name")}
                placeholder="Vaše meno"
                disabled={!profile || profileForm.formState.isSubmitting}
              />
              {profileForm.formState.errors.first_name && (
                <p className="text-xs text-destructive">
                  {profileForm.formState.errors.first_name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Priezvisko</Label>
              <Input
                id="last_name"
                autoComplete="family-name"
                {...profileForm.register("last_name")}
                placeholder="Vaše priezvisko"
                disabled={!profile || profileForm.formState.isSubmitting}
              />
              {profileForm.formState.errors.last_name && (
                <p className="text-xs text-destructive">
                  {profileForm.formState.errors.last_name.message}
                </p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile_email">Prihlasovací email</Label>
              <Input
                id="profile_email"
                type="email"
                value={profile?.email || ""}
                readOnly
                className="bg-muted/30"
              />
            </div>
          </div>
        </section>
        <div className="flex flex-col gap-3 border-t border-border bg-muted/[0.12] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {profileForm.formState.isDirty ? "Máte neuložené zmeny." : "Všetky zmeny sú uložené."}
          </p>
          <Button
            type="submit"
            disabled={
              !profile || !profileForm.formState.isDirty || profileForm.formState.isSubmitting
            }
          >
            {profileForm.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {profileForm.formState.isSubmitting ? "Ukladám..." : "Uložiť profil"}
          </Button>
        </div>
      </form>
      {canEditWorkspace && (
        <form
          onSubmit={workspaceForm.handleSubmit(handleSaveWorkspace)}
          className="surface-panel overflow-hidden"
        >
          <div className="space-y-2 border-b border-border p-5">
            <Label htmlFor="workspace_name">Názov workspace</Label>
            <Input
              id="workspace_name"
              {...workspaceForm.register("workspace_name")}
              placeholder="Názov workspace"
            />
            {workspaceForm.formState.errors.workspace_name && (
              <p className="text-xs text-destructive">
                {workspaceForm.formState.errors.workspace_name.message}
              </p>
            )}
          </div>
          <section className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="border-b border-border bg-muted/[0.16] px-5 py-5 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Firemné údaje</h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Voliteľné kontaktné a fakturačné informácie vašej spoločnosti.
              </p>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Názov firmy</Label>
                <Input
                  id="company_name"
                  {...workspaceForm.register("company_name")}
                  placeholder="Názov firmy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_tax_id">IČO/DIČ</Label>
                <Input
                  id="company_tax_id"
                  {...workspaceForm.register("company_tax_id")}
                  placeholder="IČO alebo DIČ"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company_address">Adresa firmy</Label>
                <Input
                  id="company_address"
                  {...workspaceForm.register("company_address")}
                  placeholder="Ulica, mesto a PSČ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_phone">Telefón</Label>
                <Input
                  id="company_phone"
                  {...workspaceForm.register("company_phone")}
                  placeholder="Telefón firmy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_email">Email firmy</Label>
                <Input
                  id="company_email"
                  type="email"
                  {...workspaceForm.register("company_email")}
                  placeholder="Email firmy"
                />
                {workspaceForm.formState.errors.company_email && (
                  <p className="text-xs text-destructive">
                    {workspaceForm.formState.errors.company_email.message}
                  </p>
                )}
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-border bg-muted/[0.12] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {workspaceForm.formState.isDirty
                ? "Máte neuložené zmeny."
                : "Všetky zmeny sú uložené."}
            </p>
            <Button
              type="submit"
              disabled={!workspaceForm.formState.isDirty || workspaceForm.formState.isSubmitting}
            >
              {workspaceForm.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {workspaceForm.formState.isSubmitting ? "Ukladám..." : "Uložiť firemné údaje"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
