import { UserSettings } from "@/components/settings/UserSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nastavenia</h1>
        <p className="text-muted-foreground">
          Spravujte svoje nastavenia a preferencie
        </p>
      </div>

      <UserSettings />
    </div>
  );
}
