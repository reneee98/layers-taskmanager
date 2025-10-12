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

      <Card>
        <CardHeader>
          <CardTitle>Nastavenia sú dočasne vypnuté</CardTitle>
          <CardDescription>
            Funkcia nastavení je momentálne v údržbe a bude dostupná neskôr.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Môžete pokračovať v používaní ostatných funkcií aplikácie.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
