"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateSettingsSchema, UpdateSettingsInput } from "@/lib/validations/user";
import type { UserSettings as UserSettingsType } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

export function UserSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettingsType | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<UpdateSettingsInput>({
    resolver: zodResolver(updateSettingsSchema),
  });

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/me/settings");
      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
        // Set form values
        setValue("language", result.data.language);
        setValue("theme", result.data.theme);
        setValue("default_hourly_rate", result.data.default_hourly_rate ?? null);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať nastavenia",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const onSubmit = async (data: UpdateSettingsInput) => {
    setSaving(true);
    
    try {
      const response = await fetch("/api/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
        toast({
          title: "Nastavenia uložené",
          description: "Vaše nastavenia boli úspešne aktualizované",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa uložiť nastavenia",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Načítavam nastavenia...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nastavenia účtu</CardTitle>
          <CardDescription>
            Spravujte svoje osobné nastavenia a preferencie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Language */}
            <div className="space-y-2">
              <Label htmlFor="language">Jazyk</Label>
              <Select
                value={watch("language") || settings?.language || "sk"}
                onValueChange={(value) => setValue("language", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte jazyk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sk">Slovenčina</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
              {errors.language && (
                <p className="text-sm text-red-600">{errors.language.message}</p>
              )}
            </div>

            {/* Theme */}
            <div className="space-y-2">
              <Label htmlFor="theme">Motív</Label>
              <Select
                value={watch("theme") || settings?.theme || "system"}
                onValueChange={(value) => setValue("theme", value as "light" | "dark" | "system")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte motív" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Svetlý</SelectItem>
                  <SelectItem value="dark">Tmavý</SelectItem>
                  <SelectItem value="system">Systémový</SelectItem>
                </SelectContent>
              </Select>
              {errors.theme && (
                <p className="text-sm text-red-600">{errors.theme.message}</p>
              )}
            </div>

            {/* Default Hourly Rate */}
            <div className="space-y-2">
              <Label htmlFor="default_hourly_rate">Predvolená hodinová sadzba (pre úlohy bez projektu)</Label>
              <Input
                id="default_hourly_rate"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("default_hourly_rate", { valueAsNumber: true })}
              />
              <p className="text-sm text-muted-foreground">
                Hodinová sadzba v eurách, ktorá sa použije pre úlohy bez projektu pri ukladaní času
              </p>
              {errors.default_hourly_rate && (
                <p className="text-sm text-red-600">{errors.default_hourly_rate.message}</p>
              )}
            </div>

            <div className="flex justify-end">
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
